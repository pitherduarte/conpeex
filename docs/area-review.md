# Auditoria das áreas do conhecimento do CONPEEX 2026

O [CSV da auditoria](auditoria-classificacao-2026.csv) contém uma linha por apresentação, com título, ID, área anterior, área informada na fonte, classificação publicada, justificativa, confiança e evidência consultada. A área anterior é a que a agenda exibia, incluindo as inferências anteriores. Para os dados publicados, a referência é `src/data/presentations.json`.

## Critérios

A leitura individual começou pelos 1.776 trabalhos que apareciam sem área e incluiu os 1.072 com área já publicada. A decisão seguiu o objeto descrito em cada título e o contexto da programação. Os quatro PDFs de programação fornecem títulos, autoria e dados de sessão. A base não continha resumos e alguns títulos terminam truncados na origem. Quando a documentação institucional esclareceu o objeto de um projeto, ela foi registrada na coluna de evidência.

Uma área claramente sustentada pelo título recebeu confiança alta. O nível médio indica recortes interdisciplinares, evidência parcial ou mudança de área em relação à fonte. Casos de baixa confiança permaneceram sem área atribuída. Quando o título admitia mais de uma leitura e a programação já informava uma área compatível, a classificação da fonte foi mantida. As inferências aparecem identificadas nos detalhes da apresentação. Se a auditoria mudou a área da fonte, o valor anterior também foi preservado em `sourceKnowledgeArea`.

A hierarquia segue a [tabela de áreas do conhecimento](https://rondonia.ro.gov.br/wp-content/uploads/2014/11/Tabela-de-Areas-do-Conhecimento.pdf) e a [referência do Comitê de Ciência da Computação do CNPq](https://www.gov.br/cnpq/pt-br/assuntos/comites-assessoramento/renovacao-dos-cas). Ciência da Computação integra Ciências Exatas e da Terra. Engenharia de Software é uma especialidade de Metodologia e Técnicas da Computação. Foram atribuídos níveis mais específicos quando o objeto os sustentava, com prioridade para Computação. As etiquetas temáticas ficam em um campo separado. A busca inclui grande área, área específica, subárea, especialidade e tema. O filtro Subárea apresenta os valores disponíveis e pode ser combinado com o filtro Área.

## Atualizações

Para complementar a programação de 2026, use o [fluxo de importação](../README.md) com `--base src/data/presentations.json` para carregar as classificações já revisadas. Se for necessário reconstruir a base a partir dos documentos, confira a correspondência entre ID e título com o CSV e revise eventuais divergências antes de reaplicar as decisões. Registre novas decisões editoriais na auditoria e no JSON publicado. Trabalhos de outra edição precisam de uma revisão própria.

## Totais

Dos 2.848 registros, 1.763 ganharam uma área, 146 mudaram de área e 13 permaneceram sem classificação. Entre as mudanças, 51 revisaram uma área que constava na fonte. A auditoria registrou 2.696 decisões de confiança alta, 139 de confiança média e 13 de confiança baixa.

A área de Ciência da Computação reúne 88 trabalhos. São 56 em Metodologia e Técnicas da Computação, 22 em Teoria da Computação, 6 em Sistemas de Computação e 4 sem subárea definida. Um trabalho foi identificado especificamente como Engenharia de Software.
