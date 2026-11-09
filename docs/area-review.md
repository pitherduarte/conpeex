# Revisão editorial das áreas

O arquivo `src/data/presentations.json` contém a programação de origem. Suas classificações oficiais têm precedência. A interface cruza as áreas inferidas do arquivo `src/data/area-review.json` pelo identificador do trabalho e sinaliza a inferência nos detalhes.

## Critério e reprodução

Execute `python scripts/review_areas.py`. O script analisa individualmente os registros sem área com base nos títulos e nas descrições disponíveis. A edição atual tem títulos e modalidades, mas nenhuma descrição. O script exige termos ou combinações que identifiquem um objeto ou uma disciplina. Modalidades amplas, como PIP, e termos isolados como “tecnologia” e “dados” não atribuem área. A segunda passagem incorpora expressões específicas verificadas em uma leitura direcionada do corpus, especialmente trabalhos de computação. Sinais concorrentes ficam em revisão quando o contexto não distingue uma área principal. Cada inferência guarda a área, o critério e a expressão encontrada.

A convenção segue as [grandes áreas da CAPES](https://www.gov.br/capes/pt-br/acesso-a-informacao/acoes-e-programas/avaliacao/instrumentos/documentos-de-apoio/tabela-de-areas-de-conhecimento-avaliacao), incluindo Ciência da Computação em Ciências Exatas e da Terra. Desenvolvimento computacional e outra disciplina explicitamente integrados podem receber Multidisciplinar.

## Resultado da edição de 2026

Dos 2.525 trabalhos sem área oficial, 749 receberam uma área inferida e 1.776 permanecem sem área atribuída. As 323 classificações oficiais permanecem prioritárias.

- “Computação Quântica: All-quantum teleportation” → Ciências Exatas e da Terra.
- “Segurança cibernética aplicada a sistemas supervisórios em subestações de energia elétrica” → Engenharias, pelo objeto da aplicação.
- “Desenvolvimento de um sistema web para acesso a dados de identificação de sementes” → Multidisciplinar, pela integração explícita de software e identificação de sementes.
