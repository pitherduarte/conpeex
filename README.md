# Agenda acadêmica do CONPEEX

Consulta pública à programação da 23ª edição do Congresso de Pesquisa, Ensino e Extensão da Universidade Federal de Goiás.

[Abrir a agenda](https://pitherduarte.github.io/conpeex/)

A agenda abre no primeiro dia com apresentações dos documentos importados. No computador, a grade semanal organiza os trabalhos pelo horário de início e abre todos os trabalhos de um horário pelo botão de apresentações adicionais. No celular, a agenda mostra um dia por vez. A altura de cada linha depende do conteúdo, para preservar a leitura de apresentações curtas. Os horários dos cartões e dos detalhes são os horários da fonte.

## Desenvolvimento

Requisitos: Node.js 24 e npm.

```sh
npm ci
npm run dev
```

Abra `http://localhost:5173/conpeex/`.

```sh
npm run build
npx playwright install chromium
npm test
```

Os testes usam o build de produção em `http://127.0.0.1:4173/conpeex/`. A variável opcional `CONPEEX_BROWSER` aceita o caminho de um navegador Chromium já instalado.

## Atualização da programação

- `src/data/event.json` contém nome, edição, instituição, datas e o rótulo de fuso do evento.
- `src/data/presentations.json` contém os trabalhos publicados. Cada registro tem um ID estável, título, lista de autores, datas ISO e horários de 24 horas. Campos ausentes usam `null` ou uma lista vazia para autores. A origem fica em `sourceFile`, `sourcePage` e `sources`, com planilha e linha quando disponíveis.
- `scripts/import_program.py` importa os documentos localmente. Guarde as fontes e o relatório de revisão fora do repositório ou em `import-local/`, pasta ignorada pelo Git. Confira se os dados derivados são públicos antes de atualizar o JSON.

Instale as dependências de importação em um ambiente Python separado.

```sh
python -m venv .venv
# Windows
.venv/Scripts/python -m pip install -r scripts/requirements.txt
# macOS ou Linux
.venv/bin/python -m pip install -r scripts/requirements.txt
```

Execute com o Python do ambiente criado. Para gerar uma base completa, forneça todos os documentos aprovados. Para acrescentar ou complementar registros, use `--base src/data/presentations.json`.

```sh
python scripts/import_program.py --year 2026 --mapping import-local/mapeamento.json import-local/programacao.pdf import-local/trabalhos.xlsx import-local/horarios.csv
```

1. Confira `import-local/review.json` e `import-local/presentations.json`. O comando retorna código 1 quando há itens para revisar. O relatório local pode conter dados das fontes.
2. Resolva as divergências consultando os documentos. O importador usa `workId` quando fornecido, número do trabalho no contexto de data, modalidade, sessão e mesa, ou título com autor em um único registro compatível. Horários semelhantes jamais servem como identificador. Os números impressos nas apresentações reiniciam em cada mesa ou TV.
3. Compare a base candidata com as fontes. Depois da revisão, copie apenas a base aprovada para `src/data/presentations.json`. Atualize `event.json` se a edição mudar e execute o build e os testes.

### Formatos de origem

CSV em UTF-8 e XLSX usam cabeçalhos na primeira linha. Os campos reconhecidos são `title`, `authors`, `description`, `date`, `startTime`, `endTime`, `knowledgeArea`, `modality`, `session`, `table`, `workNumber`, `location` e `workId`. Separe autores por ponto e vírgula. Use `AAAA-MM-DD` e `HH:MM`. Em XLSX, células com tipos de data e hora também funcionam.

O mapeamento opcional permite traduzir cabeçalhos, escolher planilhas e aplicar valores de contexto quando a informação vem do cabeçalho geral de uma tabela. Use valores que constem na fonte.

```json
{
  "trabalhos.xlsx": {
    "sheets": {
      "Trabalhos": {
        "columns": { "Código": "workId", "Título": "title", "Autores": "authors", "Resumo": "description" }
      }
    }
  },
  "horarios.csv": {
    "delimiter": ";",
    "columns": { "Código": "workId", "Dia": "date", "Início": "startTime", "Fim": "endTime" },
    "defaults": { "session": "Sessão 01", "table": "TV 01", "modality": "PIP" }
  }
}
```

O leitor de PDF reconhece tabelas com texto selecionável e bordas no layout dos slides do CONPEEX. Para PDFs digitalizados ou com outro layout, revise as tabelas e transcreva os registros para CSV ou adapte o leitor antes de aprovar a importação. Quando houver transcrição intermediária, preserve a referência ao PDF e à página na base aprovada.

## Publicação

Em **Settings → Pages → Build and deployment**, a origem deve ser **GitHub Actions**. O workflow [deploy.yml](.github/workflows/deploy.yml) instala as dependências, compila o projeto e publica `dist/` após atualizações em `main`. Também é possível executar o workflow manualmente pela aba **Actions**. O Vite usa `base: '/conpeex/'`.

## Conferência da carga inicial

- Os quatro PDFs somam 336 páginas, com 2.881 linhas identificadas como apresentações e um horário sem título nem autoria (Mesa 05, Sessão 05, p. 56 da programação de mesas).
- A retificação oficial da Sessão 08 muda 33 trabalhos das TVs 01–05 para as TVs 12–16. A carga usa a numeração retificada e registra os dois PDFs em cada trabalho. [Programação oficial da UFG](https://23conpeex.plateia.ufg.br/p/59956-apresentacao-de-trabalhos)
- A Sessão 02 da programação de mesas (pp. 14–26) registra o trabalho 6 de 13 mesas como 10:55–10:00. A carga preserva o início e indica término a confirmar.
- A Sessão 11 da programação de mesas (p. 107) registra o trabalho 12 da Mesa 01 com início às 06:55, fora do intervalo de 16:00–17:30 do cabeçalho. A carga preserva o término publicado e indica início a confirmar.
- A base publicada tem 2.848 apresentações. Preserva a área informada na fonte em 323 trabalhos. Os demais aparecem como “Não classificada”. Os PDFs trazem a coluna de autor sem resumos ou listagens separadas de coautoria.
