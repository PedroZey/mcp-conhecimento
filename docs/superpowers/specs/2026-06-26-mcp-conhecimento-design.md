# Design — `mcp-conhecimento`

**Data:** 2026-06-26
**Status:** aprovado (pendente review do spec escrito)

## 1. Problema e objetivo

Há bases de conhecimento de engenharia destiladas em markdown acionável (hoje a do Fabio
Akita em `~/Projects/akita-engineering-base/compilados-akita/`). Elas só são consumíveis por
quem tem os arquivos locais, referenciados via paths absolutos no `CLAUDE.md`.

Objetivo: empacotar esse conhecimento como um **servidor MCP** que qualquer pessoa instala no
próprio Claude Code (ou outro client MCP) e passa a ter o conhecimento — sem possuir os
arquivos. Primeiro pacote: **Akita**. Depois: **Galego** (SQL/DB) e **DevOps** (conteúdo a ser
autorado mais tarde, fora do escopo deste spec).

## 2. Decisões fechadas (brainstorming)

- **Interface MCP — Index + Get (tools).** Um tool `<pack>_guide(topic)` cuja *descrição embute
  a tabela "quando consultar o quê"* e cujo `topic` é um **enum** dos docs do pacote; retorna o
  doc inteiro. Mais um `<pack>_index()` que devolve a tabela. Sem busca full-text no MVP.
- **Topologia — 1 servidor configurável.** Uma única base de código (engine) que serve **um**
  pacote por instância, selecionado por flag `--pack=<nome>`/env. Pacotes são *conteúdo
  separado*; o engine é *compartilhado*. (Reconcilia o "separar": packs separados, engine único.)
- **Runtime — TypeScript + `npx`.** SDK oficial `@modelcontextprotocol/sdk`, transporte stdio.
  Publicado no npm público como `mcp-conhecimento`, rodável via `npx -y mcp-conhecimento`.
- **Conteúdo bundled.** Os docs são copiados para dentro do pacote npm (`packs/<nome>/`).
  Source-of-truth segue em `akita-engineering-base`; um `sync-packs.sh` re-sincroniza.
- **Repo renomeado** de `mcp-akita-conhecimento` para `mcp-conhecimento` (engine genérico).

## 3. Arquitetura

Servidor MCP stdio em TypeScript. No startup lê **qual pacote** servir (`--pack=akita` ou env
`PACK`), carrega `packs/<pack>/manifest.json`, registra os tools e atende chamadas lendo os docs
sob demanda (lazy — nada de carregar todos os docs na memória).

Instalação típica (uma entrada por pacote; nomes de tool prefixados pelo pack evitam colisão,
então os três coexistem no mesmo client):

```jsonc
"mcpServers": {
  "akita":  { "command": "npx", "args": ["-y", "mcp-conhecimento", "--pack=akita"] },
  "galego": { "command": "npx", "args": ["-y", "mcp-conhecimento", "--pack=galego"] },
  "devops": { "command": "npx", "args": ["-y", "mcp-conhecimento", "--pack=devops"] }
}
```

## 4. Formato de um pacote

Adicionar um pacote = soltar uma pasta + manifest. Sem tocar no engine.

```
packs/akita/
  manifest.json     # metadados do pacote: nome, descrição, lista de tópicos
  docs/
    principios.md
    processo-ia.md
    escrever-codigo.md
    testes.md
    arquitetura.md
    banco-sql.md
    git-entrega.md
    seguranca.md
    jobs.md
    linguagens.md
```

`manifest.json` (fonte única dos topic keys + blurbs que alimentam o enum e as descrições):

```jsonc
{
  "name": "akita",
  "title": "Base de Conhecimento Akita",
  "description": "Engenharia de software destilada do Fabio Akita (@Akitando + akitaonrails.com).",
  "topics": [
    {
      "key": "testes",
      "file": "docs/testes.md",
      "title": "Testes",
      "whenToUse": "Escrever ou decidir testes: TDD com IA, 7 camadas, o que mocks não pegam, F.I.R.S.T, ratio teste/código."
    }
    // ...demais tópicos derivados de 00-INDEX.md + filenames
  ]
}
```

Mapa de tópicos do pacote Akita (key → arquivo origem em `compilados-akita/`):

| key | origem | whenToUse (resumo) |
|---|---|---|
| `principios` | `principios-e-filosofia.md` | Qualquer decisão de eng / mentalidade |
| `processo-ia` | `processo-com-ia.md` | Trabalhar COM agente de IA, CLAUDE.md, dividir tarefa |
| `escrever-codigo` | `escrever-codigo.md` | Escrever/refatorar/revisar código |
| `testes` | `testes.md` | Escrever ou decidir testes |
| `arquitetura` | `arquitetura-e-design.md` | Arquitetura, fronteiras, escala |
| `banco-sql` | `banco-e-sql.md` | Banco, SQL, modelagem |
| `git-entrega` | `git-e-entrega.md` | Commit, CI, deploy |
| `seguranca` | `seguranca.md` | Segurança |
| `jobs` | `jobs-e-confiabilidade.md` | Jobs assíncronos, confiabilidade |
| `linguagens` | `linguagens-e-stacks.md` | Escolha de linguagem/stack |

## 5. Tools (por instância = 1 pacote)

- **`<pack>_index()`** → retorna a tabela "quando consultar o quê" (montada do manifest).
  Barato; o agente chama primeiro para se orientar.
- **`<pack>_guide(topic)`** → `topic` é enum das `key`s do pacote; retorna o doc inteiro.
  A *descrição* do tool embute a tabela do index, então o agente quase sempre já chama direto
  no tópico certo. Cada valor do enum traz seu `whenToUse` como descrição.

Para o pacote akita: `akita_index`, `akita_guide` com
`topic ∈ {principios, processo-ia, escrever-codigo, testes, arquitetura, banco-sql, git-entrega, seguranca, jobs, linguagens}`.

## 6. Fluxo de dados

```
startup
  ├─ lê --pack / env PACK            (falta → erro de startup claro)
  ├─ lê packs/<pack>/manifest.json   (inválido/ausente → erro de startup claro)
  ├─ valida que cada topic.file existe
  └─ registra <pack>_index + <pack>_guide(enum derivado do manifest)

chamada index  → serializa a tabela do manifest → texto
chamada guide  → lê packs/<pack>/<topic.file> sob demanda → texto
```

## 7. Tratamento de erro

- Pacote ausente / `--pack` não informado → falha no startup com mensagem listando pacotes válidos.
- `manifest.json` ausente ou JSON inválido → falha no startup nomeando o arquivo e o erro.
- `topic.file` referenciado mas inexistente → falha no startup (valida tudo no load).
- `topic` inválido em runtime → erro de tool listando os tópicos válidos.

## 8. Testes (PR sem teste = rejeitado — regra Akita)

`node:test` (built-in, zero dep), rodado sobre TS via loader (`node --import tsx`) ou contra o
`dist/` compilado. Cobrir:

- carregar manifest válido → topics esperados.
- manifest ausente / JSON inválido → erro claro.
- `topic.file` inexistente → erro no load.
- registro de tools → `<pack>_index` e `<pack>_guide` presentes; enum = keys do manifest.
- `guide(topic)` válido → conteúdo do doc certo.
- `guide(topic)` inválido → erro listando válidos.
- `index()` → tabela contém todos os tópicos.

## 9. Distribuição

- `package.json` `name: "mcp-conhecimento"`, `bin` apontando para o entrypoint compilado.
- Build TS → JS (`tsc`). `files` inclui `dist/` e `packs/`.
- README com snippet de instalação no Claude Code e como rodar via `npx`.
- `sync-packs.sh`: copia/atualiza os docs de `akita-engineering-base/compilados-akita/` para
  `packs/akita/docs/` com os nomes-key (transformação reexecutável).

## 10. Fora de escopo (MVP)

- Busca full-text (`<pack>_search`).
- Pacotes `galego` e `devops` (conteúdo precisa ser autorado; só o engine fica pronto).
- Carregar pacote de diretório externo (`--pack-dir`). Extensão fácil depois.
- MCP Resources / Prompts.

## 11. Estrutura final do repo

```
mcp-conhecimento/
├── package.json
├── tsconfig.json
├── README.md
├── sync-packs.sh
├── src/
│   ├── index.ts          # entrypoint: parse flag, carrega pack, sobe server stdio
│   ├── pack.ts           # carregar/validar manifest + ler docs
│   └── server.ts         # registrar tools no SDK
├── packs/
│   └── akita/
│       ├── manifest.json
│       └── docs/*.md
├── test/
│   └── *.test.ts
└── docs/superpowers/specs/2026-06-26-mcp-conhecimento-design.md
```
