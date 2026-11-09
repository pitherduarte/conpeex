"""Consolidate source documents locally and stage a program for review."""

import argparse
import csv
from datetime import date, datetime, time
import hashlib
import json
from pathlib import Path
import re
import sys
import unicodedata

FIELDS = (
    'title', 'authors', 'description', 'date', 'startTime', 'endTime',
    'knowledgeArea', 'modality', 'session', 'table', 'workNumber', 'location',
)
SCOPE = ('date', 'modality', 'session', 'table', 'workNumber')
SLOT_FIELDS = ('date', 'startTime', 'endTime', 'session', 'table', 'modality')


def key(value):
    normalized = unicodedata.normalize('NFC', str(value or '')).casefold()
    return ' '.join(normalized.split())


def scoped_number(row):
    parts = tuple(key(row.get(field)) for field in SCOPE)
    return parts if all(parts) else None


def names(row):
    return {key(author) for author in row.get('authors', [])}


def same_work(left, right):
    return key(left.get('title')) == key(right.get('title')) and bool(names(left) & names(right))


def clean(raw):
    result = {}
    for field in (*FIELDS, 'workId'):
        value = raw.get(field)
        if field == 'authors':
            entries = value if isinstance(value, list) else str(value or '').split(';')
            result[field] = [str(author).strip() for author in entries if str(author).strip()]
        elif field == 'date' and value:
            result[field] = (value.date() if isinstance(value, datetime) else date.fromisoformat(str(value))).isoformat()
        elif field in ('startTime', 'endTime') and value:
            parsed = value if isinstance(value, time) else time.fromisoformat(str(value))
            if parsed.second or parsed.microsecond or parsed.tzinfo:
                raise ValueError(f'{field} deve conter somente horas e minutos')
            result[field] = parsed.strftime('%H:%M')
        else:
            result[field] = str(value).strip() if value is not None and str(value).strip() else None
    start, end = result['startTime'], result['endTime']
    if start and end and start >= end:
        raise ValueError('Horário final deve ser posterior ao inicial')
    return result


def sheet_rows(values, source, headers_map, defaults):
    iterator = iter(values)
    first = next(iterator, None)
    if first is None:
        return
    headings = [str(cell or '').strip() for cell in first]
    columns = [headers_map.get(name, name) for name in headings]
    recognized = [name for name in columns if name in (*FIELDS, 'workId')]
    if not recognized or len(set(recognized)) != len(recognized):
        raise ValueError(f'Cabeçalhos ausentes ou repetidos em {source}')
    for number, cells in enumerate(iterator, 2):
        if not any(cell is not None and str(cell).strip() for cell in cells):
            continue
        values_by_field = {field: value for field, value in zip(columns, cells)
                           if field in recognized and value is not None and str(value).strip()}
        yield {**defaults, **values_by_field, '_source': {**source, 'row': number}}


def input_rows(path, settings, year):
    source = {'file': path.name, 'page': None}
    if path.suffix.lower() == '.pdf':
        from conpeex_pdf import read_pdf
        return read_pdf(path, year)

    if path.suffix.lower() == '.csv':
        with path.open(encoding='utf-8-sig', newline='') as handle:
            rows = csv.reader(handle, delimiter=settings.get('delimiter', ','))
            return list(sheet_rows(rows, source, settings.get('columns', {}), settings.get('defaults', {}))), []
    if path.suffix.lower() != '.xlsx':
        raise ValueError(f'Formato não reconhecido em {path.name}')

    from openpyxl import load_workbook
    book = load_workbook(path, read_only=True, data_only=True)
    rows = []
    try:
        for sheet in book:
            per_sheet = settings.get('sheets')
            if per_sheet is not None and sheet.title not in per_sheet:
                continue
            overrides = (per_sheet or {}).get(sheet.title, {})
            options = {**settings, **overrides}
            defaults = {**settings.get('defaults', {}), **overrides.get('defaults', {})}
            rows.extend(sheet_rows(sheet.values, {**source, 'sheet': sheet.title}, options.get('columns', {}), defaults))
    finally:
        book.close()
    return rows, []


def consolidate(base, raw_rows):
    records = list(base)
    title_index, number_index, id_index = {}, {}, {}

    def index(entry):
        keys = ((title_index, key(entry['title'])), (number_index, scoped_number(entry)),
                (id_index, entry.get('workId')))
        for lookup, value in keys:
            if value:
                lookup.setdefault(value, {})[entry['id']] = entry

    for entry in records:
        index(entry)

    issues = []
    prepared = []
    for raw in raw_rows:
        try:
            prepared.append((clean(raw), raw['_source']))
        except (TypeError, ValueError) as error:
            issues.append({'source': raw['_source'], 'reason': str(error), 'record': raw})
    # Complete rows establish presentations before enrichment. A title-only row
    # can establish a provisional record if the schedule shares its explicit ID.
    prepared.sort(key=lambda pair: (not bool(pair[0]['title']), not bool(pair[0]['date'])))
    provisional = {}
    for row, source in prepared:
        number = scoped_number(row)
        by_id = id_index.get(row['workId'], {})
        by_number = number_index.get(number, {})
        same_title_author = [entry for entry in title_index.get(key(row['title']), {}).values() if same_work(row, entry)]
        compatible = [
            entry for entry in same_title_author
            if all(not entry.get(field) or not row.get(field) or key(entry[field]) == key(row[field])
                   for field in SLOT_FIELDS)
        ]
        competing_venues = [
            entry for entry in same_title_author
            if entry.get('table') and row['table'] and key(entry['table']) != key(row['table'])
            and all(row[field] and key(entry.get(field)) == key(row[field])
                    for field in ('date', 'startTime', 'session', 'modality'))
        ]
        candidates = {**by_id, **by_number, **{entry['id']: entry for entry in compatible + competing_venues}}
        if len(candidates) > 1 or (not candidates and not (row['title'] and (row['date'] or row['workId']))):
            issues.append({'source': source, 'reason': 'Correspondência ambígua ou incompleta',
                           'record': row, 'candidates': list(candidates) or [entry['id'] for entry in same_title_author]})
            continue
        if candidates:
            entry = next(iter(candidates.values()))
            conflicts = [field for field in (*FIELDS, 'workId') if field != 'authors' and entry.get(field) and row[field] and
                         key(entry[field]) != key(row[field])]
            old_names, new_names = names(entry), names(row)
            if not (old_names <= new_names or new_names <= old_names):
                conflicts.append('authors')
            if conflicts:
                issues.append({'source': source, 'reason': 'Conflito entre fontes',
                               'record': row, 'candidate': entry['id'], 'fields': conflicts})
                continue
            for field in (*FIELDS, 'workId'):
                if not entry.get(field) and row[field]:
                    entry[field] = row[field]
            if old_names < new_names:
                entry['authors'] = row['authors']
            origins = entry.setdefault('sources', [{'file': entry['sourceFile'], 'page': entry['sourcePage']}])
            if source not in origins:
                origins.append(source)
            index(entry)
            continue

        identity = [row['workId'], number, [key(row[field]) for field in SLOT_FIELDS],
                    key(row['title']), sorted(names(row))]
        stable_id = hashlib.sha256(json.dumps(identity, ensure_ascii=False).encode('utf-8')).hexdigest()[:20]
        record = {field: row[field] for field in FIELDS}
        if row['workId']:
            record['workId'] = row['workId']
        entry = {'id': stable_id, **record, 'sourceFile': source['file'],
                 'sourcePage': source['page'], 'sources': [source]}
        records.append(entry)
        index(entry)
        if not row['date']:
            provisional[stable_id] = source
    incomplete = [entry for entry in records if entry['id'] in provisional and not entry['date']]
    for entry in incomplete:
        issues.append({'source': provisional[entry['id']], 'reason': 'Trabalho sem programação correspondente',
                       'record': entry})
    records = [entry for entry in records if entry not in incomplete]
    records.sort(key=lambda entry: tuple(entry.get(field) or '' for field in ('date', 'startTime', 'table', 'title')))
    return records, issues


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(path.suffix + '.tmp')
    temp.write_text(json.dumps(value, ensure_ascii=False, indent=2, default=str) + '\n', encoding='utf-8')
    temp.replace(path)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('sources', type=Path, nargs='+')
    parser.add_argument('--year', type=int, required=True)
    parser.add_argument('--mapping', type=Path)
    parser.add_argument('--base', type=Path, help='JSON publicado a ser complementado')
    parser.add_argument('--staged', type=Path, default=Path('import-local/presentations.json'))
    parser.add_argument('--review', type=Path, default=Path('import-local/review.json'))
    args = parser.parse_args()
    published = Path(__file__).resolve().parents[1] / 'src/data/presentations.json'
    protected = {published, *(source.resolve() for source in args.sources)}
    if args.base:
        protected.add(args.base.resolve())
    if args.mapping:
        protected.add(args.mapping.resolve())
    outputs = {args.staged.resolve(), args.review.resolve()}
    if len(outputs) != 2 or outputs & protected:
        parser.error('Use caminhos distintos para os arquivos de saída e as fontes')
    settings = json.loads(args.mapping.read_text(encoding='utf-8-sig')) if args.mapping else {}
    base = json.loads(args.base.read_text(encoding='utf-8-sig')) if args.base else []
    raw_rows, issues = [], []
    for path in args.sources:
        try:
            rows, warnings = input_rows(path, settings.get(path.name, {}), args.year)
            raw_rows.extend(rows)
            issues.extend(warnings)
        except (ValueError, OSError) as error:
            issues.append({'source': {'file': path.name}, 'reason': str(error)})
    records, conflicts = consolidate(base, raw_rows)
    issues.extend(conflicts)
    write_json(args.staged, records)
    write_json(args.review, issues)
    print(f'{len(raw_rows)} linhas importadas, {len(records)} registros na base candidata, {len(issues)} itens para revisão.')
    return bool(issues)


if __name__ == '__main__':
    sys.exit(main())
