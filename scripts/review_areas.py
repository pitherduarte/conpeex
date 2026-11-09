"""Produce a separate, auditable editorial area index from the published metadata."""
import json
import re
import unicodedata
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

# Signals identify disciplines or substantive objects, rather than generic words
# such as "dados", "tecnologia", "projeto", "ensino" and "análise".
RULES = {
    'Ciências Exatas e da Terra': {
        'Computação': r'ciencia da computacao|engenharia de software|inteligencia artificial|aprendizado de maquina|machine learning|deep learning|redes neurais|visao computacional|processamento de linguagem natural|modelos de linguagem|banco de dados|desenvolvimento (?:de (?:software|sistemas|aplicativos|uma aplicacao)|web)|seguranca cibernetica|algoritmos?|programacao em (?:python|java|c\b)|software livre|computacao (?:em nuvem|aplicada|grafica)|arquitetura de software|reconhecimento de padroes',
        'Matemática, física, química e geociências': r'matematica|geometria|equacoes diferenciais|algebra|calculo diferencial|fisica quantica|mecanica quantica|espectroscopia|quimica (?:analitica|organica|inorganica|computacional)|catalisadores?|cristalografia|astrofisica|astronomia|geologia|petrografia|geomorfologia|geoprocessamento|sensoriamento remoto',
    },
    'Engenharias': {
        'Engenharias e infraestrutura': r'engenharia (?:civil|eletrica|mecanica|quimica|de producao|de controle|de materiais|ambiental|de alimentos)|concreto (?:armado|estrutural|permeavel)|pavimentacao|estruturas metalicas|eficiencia energetica|energia fotovoltaica|geracao fotovoltaica|subestacoes|sistemas eletricos|controle de processos|automacao (?:industrial|residencial)|robotica|microcontroladores?|arduino|turbinas?|impressao 3d|biomateriais|saneamento basico',
    },
    'Ciências Biológicas': {
        'Biologia e biodiversidade': r'filogenia|taxonomia|ecologia|biodiversidade|entomologia|avifauna|herpetofauna|fitofisionomias|botanica|micologia|citogenetica|biologia (?:molecular|celular)|expressao genica|fungos (?:endofiticos|micorrizicos)|diversidade genetica|conservacao (?:da biodiversidade|de especies)|germoplasma|genomica',
    },
    'Ciências da Saúde': {
        'Saúde e prática clínica': r'fisioterapia|enfermagem|odontologia|endodontia|odontopediatria|periodontia|terapia ocupacional|farmacovigilancia|farmacoterapia|saude (?:publica|mental|coletiva|bucal|da mulher|digital)|atencao (?:primaria|basica) (?:a|em) saude|sus\b|pacientes?|diagnostico (?:clinico|tardio)|tratamento (?:clinico|odontologico)|oncologia|epidemiologi[ac]|diabetes|hipertensao|neonatal|proteses? dentarias?|triagem neonatal|reabilitacao (?:pulmonar|cardiaca|funcional)|nutricao (?:clinica|materno)|covid-19',
    },
    'Ciências Agrárias': {
        'Agronomia, produção animal e veterinária': r'agronomia|fitopatologia|fitossanidade|herbicidas?|adubacao|fertilizantes|produtividade (?:agricola|da soja|do milho)|plantas daninhas|pastagens|forrageiras|cultivares?|manejo (?:agricola|do solo|da irrigacao)|ovinos|bovinos|suinos|avicultura|bovinocultura|zootecnia|medicina veterinaria|veterinari[ao]|equinos|equideocultura|caninos|felinos|gado leiteiro|embrioes bovinos|bem-estar animal',
    },
    'Ciências Sociais Aplicadas': {
        'Direito, gestão, comunicação e economia': r'direito (?:civil|penal|constitucional|trabalhista|tributario|ambiental)|processo penal|jurisprudencia|acesso a justica|contabilidade|ciencias contabeis|administracao publica|gestao (?:empresarial|financeira|publica)|economia (?:solidaria|brasileira)|mercado (?:financeiro|de capitais)|jornalismo|publicidade|marketing|biblioteconomia|arquivologia|ciencia da informacao|arquitetura e urbanismo|planejamento urbano',
    },
    'Ciências Humanas': {
        'Educação, sociedade, história e psicologia': r'formacao (?:docente|de professores)|educacao (?:infantil|basica|inclusiva|antirracista|de jovens e adultos)|ensino fundamental|alfabetizacao|praticas pedagogicas|pedagogia|sociologia|antropologia|historiografia|historia (?:oral|da educacao)|filosofia|psicologia|psicanalise|geografia (?:humana|escolar)|memoria coletiva|politica educacional',
    },
    'Linguística, Letras e Artes': {
        'Linguagem, literatura e artes': r'linguistica|literatura|letramento literario|poetica|poesia|narrativa literaria|teoria literaria|lingua (?:portuguesa|inglesa|espanhola)|fonologia|semantica|traducao literaria|artes (?:visuais|cenicas)|dramaturgia|teatro|coreografia|performance artistica|composicao musical|educacao musical|musicologia|violonista|danca contemporanea',
    },
}
PATTERNS = [(area, label, re.compile(r'\b(?:' + pattern + r')\b'))
            for area, signals in RULES.items() for label, pattern in signals.items()]

# Second pass: explicit objects observed in the corpus, including titles with
# strong context that would otherwise yield competing signals.
CONTEXT = {
    'Ciências Exatas e da Terra': r'computacao (?:e sociedade|quantica)|ensino de computacao|extensao universitaria em computacao|programacao competitiva|linguagem de programacao|edgecloudsim|grobman-hartman|bases de grobner|teoria (?:qualitativa dos sistemas dinamicos|de bifurcacoes)|fortran para simulacoes|propriedades (?:termo-opticas|opticas lineares)|interacao humano-computador|teclado virtual braille|visualizacao de indicadores de producao cientifica|business intelligence para gestao academica|mineração de dados|google earth engine|spintronica',
    'Engenharias': r'subestacoes de energia eletrica|conversores cc/cc|sistemas de energia eletrica|interruptor acessivel utilizando sistemas embarcados|mecanismos de controle de fluxo|mada-cmt|mada-mig/mag|parametros aerodinamicos|microdrenagem urbana|gateway com raspberry pi|sistemas de esgotamento sanitario|automati[zz]acao da obtencao da extensao de vias urbanas|manufatura avancada|reuso hidrico na industria',
    'Ciências Biológicas': r'perspectiva paleobiologica|anatomia do sistema subterraneo de especies|vocalizacoes de anfibios|fungos de cavernas|inventario florestal das areas de preservacao',
    'Ciências da Saúde': r'programacao anual de saude|retinografia digital|avaliacao de tecnologias em saude|vigilancia em saude|atencao psicossocial|fibrose pulmonar idiopatica|fratura de quadril|servico odontologico|insuficiencia renal|retinopatia diabetica|sifilis congenita|virus da hepatite c|puérpera e ao recem-nascido|doenca de parkinson|planejamento radioterapico|promocao da saude|fibrose cistica|equipamentos? em uma unidade de terapia intensiva',
    'Ciências Agrárias': r'dados agrometeorologicos|aptidao agricola|compost barn|cachacos ao resfriamento seminal|biotecnologia reprodutiva|coccidiose aviaria|pequenos animais|caes saudaveis|germinacao e contaminacao de sementes|calos das variedades|criacao de banco de dados com informacoes sobre as especies arboreas',
    'Ciências Sociais Aplicadas': r'centro de analise de dados economicos|transformacao digital (?:nas agencias bancarias|em pequenos negocios)|importancia da inteligencia artificial na contabilidade|planejamento sucessorio|biblioteca digital|catalogos de biblioteca|seletividade penal',
    'Ciências Humanas': r'formacao docente|reflexoes sobre o uso critico da inteligencia artificial na educacao linguistica|uso de “reels” na rede social instagram como forma de educacao ambiental|escola publica periferica|ensino secundario a partir da reforma|formacao sindical|permanencia de estudantes nos cursos de licenciatura|processos educativos',
    'Linguística, Letras e Artes': r'releituras pictoricas|quadrilha junina|poetica visual de beyonce|ensino de producao textual',
    'Multidisciplinar': r'modelagem matematica e computacional de movimentos funcionais|paciente virtual e inteligencia artificial|tecnica smote aplicada ao desbalanceamento|llm de conhecimento especifico utilizando rag|interface grafica para interpretacao de dados de cuidados paliativos|sistema web para acesso a dados de identificacao de sementes|mapeamento de epidemias: geotecnologias|robotica para a educacao infantil em criancas cegas',
}

def normalize(text):
    return ''.join(char for char in unicodedata.normalize('NFD', text.casefold())
                   if unicodedata.category(char) != 'Mn')

def classify(title, description):
    text = normalize(' '.join(filter(None, (title, description))))
    contextual = [(area, match[0]) for area, pattern in CONTEXT.items()
                  if (match := re.search(normalize(pattern), text))]
    if len(contextual) == 1:
        area, evidence = contextual[0]
        return dict(area=area, criterion='Objeto e contexto explícitos no título', evidence=evidence)

    matches = [(area, label, match[0]) for area, label, pattern in PATTERNS
               if (match := pattern.search(text))]
    areas = {area for area, _, _ in matches}
    if len(areas) == 1:
        area, label, evidence = matches[0]
        return dict(area=area, criterion=label, evidence=evidence)

    # Explicit disciplinary combinations must be meaningful. Ordinary overlaps
    # (for example veterinary medicine and clinical vocabulary) require care.
    veterinary = re.search(r'\b(?:veterinari[ao]|caninos|felinos|equinos|bovinos|ovinos)\b', text)
    if veterinary and areas == {'Ciências Agrárias', 'Ciências da Saúde'}:
        return dict(area='Ciências Agrárias', criterion='Contexto clínico veterinário', evidence=veterinary[0])

    rehabilitation = re.search(r'\b(?:pilates|exercicio terapeutico|reabilitacao motora)\b', text)
    if rehabilitation and not areas:
        return dict(area='Ciências da Saúde', criterion='Prática de exercício e reabilitação', evidence=rehabilitation[0])

    integration = re.search(r'\b(?:visao computacional|aprendizado de maquina|redes neurais|inteligencia artificial)\b', text)
    technical = re.search(r'\b(?:implementacao|desenvolvimento|treinamento|comparacao de modelos|classificacao automatica|deteccao automatica|predicao|algoritmo)\b', text)
    if integration and technical and 'Ciências Exatas e da Terra' in areas and len(areas) == 2:
        return dict(area='Multidisciplinar', criterion='Desenvolvimento computacional aplicado a outra área',
                    evidence=f'{integration[0]} + {technical[0]}')

def main():
    records = json.loads((ROOT / 'src/data/presentations.json').read_text(encoding='utf-8'))
    pending = [row for row in records if not row['knowledgeArea']]
    derived = {}
    for row in pending:
        result = classify(row['title'], row['description'])
        if result:
            derived[row['id']] = result
    path = ROOT / 'src/data/area-review.json'
    path.write_text(json.dumps(derived, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')
    print(f'Antes: {len(pending)}. Inferidas: {len(derived)}. Pendentes: {len(pending) - len(derived)}.')
    print(dict(Counter(entry['area'] for entry in derived.values())))

if __name__ == '__main__':
    main()
