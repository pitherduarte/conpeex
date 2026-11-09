"""Read the ruled schedule tables used in the CONPEEX slide PDFs."""

import re
from datetime import date
from pathlib import Path

import pymupdf


TIME = re.compile(r'(?<!\d)(\d{1,2})\s*[:h]\s*(\d{2})(?!\d)', re.I)
MONTHS = ('janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
          'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro')
DAY = re.compile(r'(\d{1,2})\s+de\s+(' + '|'.join(MONTHS) + r')\b', re.I)
SESSION = re.compile(r'Sessão\s+(\d+)', re.I)
VENUE = re.compile(r'((?:Mesa|TV)\s*\d+)\s*[-–]\s*(?:Modalidade:?\s*)?(.+)', re.I)


def read_pdf(path: Path, year: int):
    """Return normalized source rows and review issues. Page numbers start at 1."""
    records, issues = [], []
    with pymupdf.open(path) as document:
        for page in document:
            source = {'file': path.name, 'page': page.number + 1}
            spans_by_line = [
                [(pymupdf.Rect(span['bbox']), span['text']) for span in line['spans']]
                for block in page.get_text('dict', flags=pymupdf.TEXTFLAGS_TEXT)['blocks']
                for line in block.get('lines', [])
            ]
            lines = [(pymupdf.Rect(spans[0][0]), ''.join(text for _, text in spans).strip())
                     for spans in spans_by_line if spans]
            header = ' '.join(text for box, text in lines if box.y1 < 49 and box.x0 < 55)
            day, session, venue = DAY.search(header), SESSION.search(header), VENUE.search(header)
            session_times = [f'{int(h):02d}:{m}' for h, m in TIME.findall(header)]

            def issue(reason, **details):
                issues.append({'source': source, 'reason': reason, **details})

            try:
                date_iso = date(year, MONTHS.index(day.group(2).lower()) + 1, int(day.group(1))).isoformat() if day else None
            except ValueError:
                issue('Data inválida no cabeçalho', header=header)
                date_iso = None

            tables = [table for table in page.find_tables(strategy='lines_strict').tables
                      if table.col_count in (4, 5) and table.row_count >= 2]
            if not tables:
                issue('Tabela de programação não reconhecida')
                continue
            if not all((day, session, venue)):
                issue('Cabeçalho incompleto', header=header)
            if len(tables) > 1:
                issue('Mais de uma tabela candidata na página', count=len(tables))

            def cell_text(cell):
                if cell is None:
                    return ''
                bounds = pymupdf.Rect(cell)
                # A PDF text line can combine independent spans from adjacent columns.
                content = []
                for spans in spans_by_line:
                    fragments = [(box, text) for box, text in spans
                                 if bounds.y0 <= (box.y0 + box.y1) / 2 < bounds.y1
                                 and bounds.x0 - 1 <= box.x0 < bounds.x1 - 1]
                    if fragments:
                        text = ''.join(fragment for _, fragment in fragments).strip()
                        if text:
                            content.append((fragments[0][0], text))
                return ' '.join(text for _, text in sorted(content, key=lambda line: (round(line[0].y0, 1), line[0].x0)))

            captured = []
            printed = []
            for table in tables:
                headings = [cell_text(cell) for cell in table.rows[0].cells]
                if headings[0].casefold() != 'horário' or headings[-1].casefold() != 'título':
                    issue('Colunas de programação não reconhecidas', headings=headings)
                    continue
                time_column = pymupdf.Rect(table.rows[0].cells[0])
                printed.extend(text for box, text in lines if time_column.x0 <= box.x0 < time_column.x1
                               and time_column.y1 <= (box.y0 + box.y1) / 2 <= table.bbox[3]
                               and len(TIME.findall(text)) == 2)
                for row in table.rows[1:]:
                    time, number, *content = [cell_text(cell) for cell in row.cells]
                    area = content.pop(0) if len(content) == 3 else None
                    author, title = content
                    if not any((time, number, author, title, area)):
                        continue
                    hours = [f'{int(h):02d}:{m}' for h, m in TIME.findall(time)]
                    if hours:
                        captured.append(time)
                    if not title:
                        issue('Linha sem título', cells=[time, number, area, author, title])
                        continue
                    if len(hours) != 2 or not number.isdigit() or not author:
                        issue('Linha com campos incompletos', cells=[time, number, area, author, title])
                    if len(hours) == 2 and len(session_times) == 2 and not (
                        session_times[0] <= hours[0] < hours[1] <= session_times[1]
                    ):
                        issue('Horário fora do intervalo da sessão', time=time, number=number, sessionTimes=session_times)
                    records.append({
                        'title': title,
                        'authors': [author] if author else [],
                        'date': date_iso,
                        'startTime': hours[0] if hours else None,
                        'endTime': hours[1] if len(hours) > 1 else None,
                        'knowledgeArea': area or None,
                        'modality': venue.group(2).strip() if venue else None,
                        'session': f'Sessão {int(session.group(1)):02d}' if session else None,
                        'table': venue.group(1) if venue else None,
                        'workNumber': number or None,
                        '_source': source,
                    })
            if len(printed) != len(captured):
                issue('Quantidade de horários fora das células reconhecidas', printed=len(printed), captured=len(captured))
    return records, issues
