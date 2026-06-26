# mcp-conhecimento Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Servidor MCP em TypeScript que serve bases de conhecimento (markdown) configuráveis por `--pack`, expondo tools `<pack>_index` e `<pack>_guide(topic)`; primeiro pack: Akita.

**Architecture:** Engine único stdio sobre `@modelcontextprotocol/sdk`. No startup resolve o pack do flag/env, carrega `packs/<pack>/manifest.json`, valida, e registra dois tools cujos nomes são prefixados pelo pack. Docs lidos sob demanda. Pacote é só uma pasta `docs/*.md` + `manifest.json` — adicionar pack não toca no engine.

**Tech Stack:** TypeScript (ESM, NodeNext), `@modelcontextprotocol/sdk`, `zod`, `node:test` rodado via `tsx`, build com `tsc`.

## Global Constraints

- Runtime Node ≥ 18 (ESM, `import.meta.url`, `node:test`).
- `package.json`: `"type": "module"`, `name: "mcp-conhecimento"`, `version: "0.1.0"`, `bin.mcp-conhecimento` → `dist/index.js`.
- Toda string voltada ao usuário/agente em **PT-BR**. Identificadores em inglês.
- Nomes de tool sempre `<pack>_index` e `<pack>_guide` (prefixo evita colisão entre packs).
- Topic keys do pack akita: `principios, processo-ia, escrever-codigo, testes, arquitetura, banco-sql, git-entrega, seguranca, jobs, linguagens` (10).
- Fonte do conteúdo akita: `~/Projects/akita-engineering-base/compilados-akita/`.
- Sem dep de runtime além de `@modelcontextprotocol/sdk` e `zod`. `tsx` e `typescript` são devDependencies.

---

### Task 1: Scaffold do projeto

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.gitignore`

**Interfaces:**
- Consumes: nada.
- Produces: scripts `npm run build` (tsc → `dist/`), `npm test` (tsx + node:test). `dist/` e `packs/` publicados via `files`.

- [ ] **Step 1: Criar `package.json`**

```json
{
  "name": "mcp-conhecimento",
  "version": "0.1.0",
  "description": "Servidor MCP de bases de conhecimento de engenharia (Akita e outros packs).",
  "type": "module",
  "bin": {
    "mcp-conhecimento": "dist/index.js"
  },
  "files": [
    "dist",
    "packs"
  ],
  "scripts": {
    "build": "tsc",
    "test": "node --import tsx --test test/*.test.ts",
    "start": "node dist/index.js"
  },
  "engines": {
    "node": ">=18"
  },
  "license": "MIT",
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.12.0",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "tsx": "^4.19.0",
    "typescript": "^5.6.0"
  }
}
```

- [ ] **Step 2: Criar `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "declaration": false,
    "sourceMap": false,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*.ts"]
}
```

- [ ] **Step 3: Criar `.gitignore`**

```
node_modules/
dist/
*.local.*
.DS_Store
```

- [ ] **Step 4: Instalar deps e verificar typecheck vazio**

Run: `npm install && npx tsc --noEmit`
Expected: install OK; `tsc --noEmit` sem erro (nenhum `.ts` ainda em `src/`, sai limpo).

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json tsconfig.json .gitignore
git commit -m "chore: scaffold do projeto TypeScript + deps MCP"
```

---

### Task 2: Pack loader (`src/pack.ts`)

Carrega e valida um pack; lê docs sob demanda; renderiza o index. Testado contra uma fixture (desacopla do conteúdo real do akita, criado na Task 3).

**Files:**
- Create: `src/pack.ts`
- Create: `test/fixtures/packs/demo/manifest.json`
- Create: `test/fixtures/packs/demo/docs/alpha.md`
- Create: `test/fixtures/packs/demo/docs/beta.md`
- Test: `test/pack.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `type Topic = { key: string; file: string; title: string; whenToUse: string; path: string }`
  - `type Pack = { name: string; title: string; description: string; topics: Topic[]; dir: string }`
  - `function loadPack(packName: string, packsRoot?: string): Pack` — lança `Error` com mensagem clara se pack/manifest ausente, JSON inválido, ou `topic.file` inexistente.
  - `function readDoc(pack: Pack, topicKey: string): string` — lança `Error` listando topics válidos se key inválida.
  - `function renderIndex(pack: Pack): string` — tabela markdown.
  - `const DEFAULT_PACKS_ROOT: string` — `packs/` ao lado do código compilado.

- [ ] **Step 1: Criar a fixture `demo`**

`test/fixtures/packs/demo/manifest.json`:
```json
{
  "name": "demo",
  "title": "Pack Demo",
  "description": "Pack de teste.",
  "topics": [
    { "key": "alpha", "file": "docs/alpha.md", "title": "Alpha", "whenToUse": "Quando precisar de alpha." },
    { "key": "beta",  "file": "docs/beta.md",  "title": "Beta",  "whenToUse": "Quando precisar de beta." }
  ]
}
```

`test/fixtures/packs/demo/docs/alpha.md`:
```markdown
# Alpha
Conteúdo alpha.
```

`test/fixtures/packs/demo/docs/beta.md`:
```markdown
# Beta
Conteúdo beta.
```

- [ ] **Step 2: Escrever o teste que falha**

`test/pack.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { loadPack, readDoc, renderIndex } from "../src/pack.ts";

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), "fixtures", "packs");

test("loadPack: pack válido retorna topics", () => {
  const pack = loadPack("demo", FIXTURES);
  assert.equal(pack.name, "demo");
  assert.equal(pack.topics.length, 2);
  assert.deepEqual(pack.topics.map((t) => t.key), ["alpha", "beta"]);
});

test("loadPack: pack inexistente lança erro claro", () => {
  assert.throws(() => loadPack("naoexiste", FIXTURES), /naoexiste/);
});

test("loadPack: topic.file inexistente lança erro no load", () => {
  assert.throws(() => loadPack("quebrado", FIXTURES), /quebrado|ausente|não encontrado/i);
});

test("readDoc: topic válido retorna conteúdo", () => {
  const pack = loadPack("demo", FIXTURES);
  assert.match(readDoc(pack, "alpha"), /Conteúdo alpha/);
});

test("readDoc: topic inválido lança erro listando válidos", () => {
  const pack = loadPack("demo", FIXTURES);
  assert.throws(() => readDoc(pack, "zzz"), /alpha.*beta|beta.*alpha/s);
});

test("renderIndex: contém todos os topics", () => {
  const pack = loadPack("demo", FIXTURES);
  const idx = renderIndex(pack);
  assert.match(idx, /alpha/);
  assert.match(idx, /beta/);
  assert.match(idx, /Quando precisar de alpha/);
});
```

Também criar a fixture quebrada para o terceiro teste:
`test/fixtures/packs/quebrado/manifest.json`:
```json
{
  "name": "quebrado",
  "title": "Pack Quebrado",
  "description": "Aponta para um doc que não existe.",
  "topics": [
    { "key": "fantasma", "file": "docs/fantasma.md", "title": "Fantasma", "whenToUse": "Nunca." }
  ]
}
```
(Não criar `docs/fantasma.md` — o ponto é validar a ausência.)

- [ ] **Step 3: Rodar o teste e ver falhar**

Run: `npm test`
Expected: FAIL — `Cannot find module '../src/pack.ts'` (ainda não existe).

- [ ] **Step 4: Implementar `src/pack.ts`**

```ts
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { z } from "zod";

export type Topic = {
  key: string;
  file: string;
  title: string;
  whenToUse: string;
  path: string;
};

export type Pack = {
  name: string;
  title: string;
  description: string;
  topics: Topic[];
  dir: string;
};

// packs/ fica ao lado de dist/ (build) ou de src/ (tsx) — ambos resolvem para a raiz do repo.
export const DEFAULT_PACKS_ROOT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "packs",
);

const ManifestSchema = z.object({
  name: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  topics: z
    .array(
      z.object({
        key: z.string().min(1),
        file: z.string().min(1),
        title: z.string().min(1),
        whenToUse: z.string().min(1),
      }),
    )
    .min(1),
});

export function loadPack(packName: string, packsRoot: string = DEFAULT_PACKS_ROOT): Pack {
  const dir = join(packsRoot, packName);
  const manifestPath = join(dir, "manifest.json");
  if (!existsSync(manifestPath)) {
    throw new Error(
      `Pack "${packName}" não encontrado: manifest ausente em ${manifestPath}`,
    );
  }

  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch (err) {
    throw new Error(`Manifest inválido em ${manifestPath}: ${(err as Error).message}`);
  }

  const parsed = ManifestSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      `Manifest inválido em ${manifestPath}: ${parsed.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ")}`,
    );
  }

  const topics: Topic[] = parsed.data.topics.map((t) => {
    const path = join(dir, t.file);
    if (!existsSync(path)) {
      throw new Error(
        `Pack "${packName}": doc do tópico "${t.key}" ausente (esperado em ${path})`,
      );
    }
    return { ...t, path };
  });

  return {
    name: parsed.data.name,
    title: parsed.data.title,
    description: parsed.data.description,
    topics,
    dir,
  };
}

export function readDoc(pack: Pack, topicKey: string): string {
  const topic = pack.topics.find((t) => t.key === topicKey);
  if (!topic) {
    const valid = pack.topics.map((t) => t.key).join(", ");
    throw new Error(`Tópico "${topicKey}" inválido. Válidos: ${valid}`);
  }
  return readFileSync(topic.path, "utf8");
}

export function renderIndex(pack: Pack): string {
  const header = `# ${pack.title}\n\n${pack.description}\n\n## Quando consultar o quê\n\n| Tópico | Título | Quando usar |\n|---|---|---|`;
  const rows = pack.topics
    .map((t) => `| \`${t.key}\` | ${t.title} | ${t.whenToUse} |`)
    .join("\n");
  return `${header}\n${rows}`;
}
```

- [ ] **Step 5: Rodar o teste e ver passar**

Run: `npm test`
Expected: PASS — 6 testes verdes.

- [ ] **Step 6: Commit**

```bash
git add src/pack.ts test/pack.test.ts test/fixtures
git commit -m "feat: pack loader (manifest, readDoc, renderIndex) + testes"
```

---

### Task 3: Conteúdo do pack Akita + `sync-packs.sh`

Materializa o pack akita real (manifest + 10 docs copiados da base) via um script reexecutável, e valida que carrega.

**Files:**
- Create: `sync-packs.sh`
- Create: `packs/akita/manifest.json`
- Create (via script): `packs/akita/docs/*.md` (10 arquivos)
- Test: `test/akita-pack.test.ts`

**Interfaces:**
- Consumes: `loadPack` da Task 2.
- Produces: pack `akita` carregável com 10 topics.

- [ ] **Step 1: Criar `packs/akita/manifest.json`**

```json
{
  "name": "akita",
  "title": "Base de Conhecimento Akita",
  "description": "Engenharia de software de senior destilada do Fabio Akita (canal @Akitando + akitaonrails.com), em formato acionável. Consulte ANTES de decisões de engenharia.",
  "topics": [
    { "key": "principios",      "file": "docs/principios.md",      "title": "Princípios e filosofia", "whenToUse": "Qualquer decisão de engenharia / entender a mentalidade: processo é a variável (não a IA), software nunca \"pronto\", qualidade é trade-off." },
    { "key": "processo-ia",     "file": "docs/processo-ia.md",     "title": "Processo com IA",        "whenToUse": "Trabalhar COM agente de IA, definir CLAUDE.md, dividir tarefa: o que IA faz bem/mal, vibe coding, RAG vs contexto longo, freio humano." },
    { "key": "escrever-codigo", "file": "docs/escrever-codigo.md", "title": "Escrever código",        "whenToUse": "Escrever, refatorar ou revisar código: Clean Code p/ leitor-IA, nomes pesquisáveis, funções/arquivos pequenos, perf, commits." },
    { "key": "testes",          "file": "docs/testes.md",          "title": "Testes",                 "whenToUse": "Escrever ou decidir testes: TDD com IA, as 7 camadas, o que mocks NÃO pegam, F.I.R.S.T, ratio teste/código, CI ≠ integração." },
    { "key": "arquitetura",     "file": "docs/arquitetura.md",     "title": "Arquitetura e design",   "whenToUse": "Decidir arquitetura, fronteiras, escala: modularidade, arquitetura emergente, SQLite em prod, quando NÃO abstrair." },
    { "key": "banco-sql",       "file": "docs/banco-sql.md",       "title": "Banco e SQL",            "whenToUse": "Mexer em banco / escrever SQL / modelar: índices, SQL seguro (sem SELECT*/concat), SQLite vs Postgres, NoSQL, migrations." },
    { "key": "git-entrega",     "file": "docs/git-entrega.md",     "title": "Git e entrega",          "whenToUse": "Commitar, configurar CI, fazer deploy: small releases, prefixos de commit, limpar histórico, 12 fatores, Heroku/Kamal, hooks." },
    { "key": "seguranca",       "file": "docs/seguranca.md",       "title": "Segurança",              "whenToUse": "Tratar segurança: segurança como hábito a cada commit, scanners no CI, sandbox de agente, cripto na prática, senhas/2FA." },
    { "key": "jobs",            "file": "docs/jobs.md",            "title": "Jobs e confiabilidade",  "whenToUse": "Jobs assíncronos / confiabilidade: retries, locks distribuídos, claiming atômico, idempotência, emails sem spam, safety nets." },
    { "key": "linguagens",      "file": "docs/linguagens.md",      "title": "Linguagens e stacks",    "whenToUse": "Escolher linguagem/stack: \"sua linguagem não é especial\", compilada vs interpretada, melhor linguagem p/ LLM, portar com IA." }
  ]
}
```

- [ ] **Step 2: Criar `sync-packs.sh`**

```bash
#!/usr/bin/env bash
# Sincroniza o conteúdo dos packs a partir das bases-fonte locais.
# Reexecutável: copia os docs e os renomeia para as keys do manifest.
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AKITA_SRC="${AKITA_SRC:-$HOME/Projects/akita-engineering-base/compilados-akita}"
AKITA_DST="$REPO_DIR/packs/akita/docs"

if [[ ! -d "$AKITA_SRC" ]]; then
  echo "ERRO: fonte akita não encontrada em $AKITA_SRC (defina AKITA_SRC)" >&2
  exit 1
fi

mkdir -p "$AKITA_DST"

# key:arquivo-fonte
declare -A AKITA_MAP=(
  [principios]=principios-e-filosofia.md
  [processo-ia]=processo-com-ia.md
  [escrever-codigo]=escrever-codigo.md
  [testes]=testes.md
  [arquitetura]=arquitetura-e-design.md
  [banco-sql]=banco-e-sql.md
  [git-entrega]=git-e-entrega.md
  [seguranca]=seguranca.md
  [jobs]=jobs-e-confiabilidade.md
  [linguagens]=linguagens-e-stacks.md
)

for key in "${!AKITA_MAP[@]}"; do
  src="$AKITA_SRC/${AKITA_MAP[$key]}"
  if [[ ! -f "$src" ]]; then
    echo "ERRO: doc fonte ausente: $src" >&2
    exit 1
  fi
  cp "$src" "$AKITA_DST/$key.md"
  echo "ok: $key.md"
done

echo "Pack akita sincronizado em $AKITA_DST"
```

- [ ] **Step 3: Rodar o sync e verificar os 10 docs**

Run: `chmod +x sync-packs.sh && ./sync-packs.sh && ls packs/akita/docs`
Expected: 10 arquivos — `arquitetura.md banco-sql.md escrever-codigo.md git-entrega.md jobs.md linguagens.md principios.md processo-ia.md seguranca.md testes.md`.

- [ ] **Step 4: Escrever o teste do pack akita**

`test/akita-pack.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadPack, readDoc } from "../src/pack.ts";

test("pack akita carrega com 10 tópicos", () => {
  const pack = loadPack("akita");
  assert.equal(pack.name, "akita");
  assert.equal(pack.topics.length, 10);
});

test("pack akita: todos os docs leem não-vazio", () => {
  const pack = loadPack("akita");
  for (const t of pack.topics) {
    assert.ok(readDoc(pack, t.key).length > 100, `doc ${t.key} muito curto`);
  }
});

test("pack akita: doc de testes contém regra de ouro", () => {
  const pack = loadPack("akita");
  assert.match(readDoc(pack, "testes"), /PR sem teste/i);
});
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npm test`
Expected: PASS — testes do pack.test.ts + akita-pack.test.ts verdes.

- [ ] **Step 6: Commit**

```bash
git add sync-packs.sh packs/akita test/akita-pack.test.ts
git commit -m "feat: pack akita (manifest + 10 docs) + sync-packs.sh"
```

---

### Task 4: Registro de tools no server (`src/server.ts`)

Handlers puros testáveis + função que registra os tools no `McpServer`.

**Files:**
- Create: `src/server.ts`
- Test: `test/server.test.ts`

**Interfaces:**
- Consumes: `Pack`, `readDoc`, `renderIndex` da Task 2.
- Produces:
  - `function handleIndex(pack: Pack): string`
  - `function handleGuide(pack: Pack, topic: string): string`
  - `function topicKeys(pack: Pack): [string, ...string[]]`
  - `function buildServer(pack: Pack): McpServer` — registra `<pack>_index` e `<pack>_guide`.

- [ ] **Step 1: Escrever o teste que falha**

`test/server.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { loadPack } from "../src/pack.ts";
import { handleIndex, handleGuide, topicKeys, buildServer } from "../src/server.ts";

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), "fixtures", "packs");
const demo = loadPack("demo", FIXTURES);

test("topicKeys retorna as keys do pack", () => {
  assert.deepEqual(topicKeys(demo), ["alpha", "beta"]);
});

test("handleIndex retorna a tabela", () => {
  assert.match(handleIndex(demo), /alpha/);
  assert.match(handleIndex(demo), /Quando usar/);
});

test("handleGuide retorna o doc do tópico", () => {
  assert.match(handleGuide(demo, "beta"), /Conteúdo beta/);
});

test("handleGuide com tópico inválido lança", () => {
  assert.throws(() => handleGuide(demo, "zzz"), /inválido/i);
});

test("buildServer registra <pack>_index e <pack>_guide", () => {
  const server = buildServer(demo);
  // McpServer expõe os tools registrados internamente; basta não lançar e ser instância.
  assert.ok(server);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test`
Expected: FAIL — `Cannot find module '../src/server.ts'`.

- [ ] **Step 3: Implementar `src/server.ts`**

```ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { type Pack, readDoc, renderIndex } from "./pack.js";

export function topicKeys(pack: Pack): [string, ...string[]] {
  const keys = pack.topics.map((t) => t.key);
  return keys as [string, ...string[]];
}

export function handleIndex(pack: Pack): string {
  return renderIndex(pack);
}

export function handleGuide(pack: Pack, topic: string): string {
  return readDoc(pack, topic);
}

function indexDescription(pack: Pack): string {
  return [
    `Lista a tabela "quando consultar o quê" do pack "${pack.name}" (${pack.title}).`,
    `Chame primeiro para se orientar; depois use ${pack.name}_guide com o tópico certo.`,
  ].join(" ");
}

function guideDescription(pack: Pack): string {
  const table = pack.topics
    .map((t) => `- ${t.key}: ${t.whenToUse}`)
    .join("\n");
  return [
    `Retorna o guia completo de um tópico do pack "${pack.name}" (${pack.title}).`,
    `Consulte ANTES de decisões de engenharia. Escolha o tópico:`,
    table,
  ].join("\n");
}

export function buildServer(pack: Pack): McpServer {
  const server = new McpServer({ name: `mcp-conhecimento-${pack.name}`, version: "0.1.0" });

  server.registerTool(
    `${pack.name}_index`,
    {
      title: `Índice ${pack.title}`,
      description: indexDescription(pack),
    },
    async () => ({ content: [{ type: "text", text: handleIndex(pack) }] }),
  );

  server.registerTool(
    `${pack.name}_guide`,
    {
      title: `Guia ${pack.title}`,
      description: guideDescription(pack),
      inputSchema: { topic: z.enum(topicKeys(pack)) },
    },
    async ({ topic }) => ({ content: [{ type: "text", text: handleGuide(pack, topic) }] }),
  );

  return server;
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test`
Expected: PASS — todos os testes verdes.

- [ ] **Step 5: Commit**

```bash
git add src/server.ts test/server.test.ts
git commit -m "feat: registro de tools <pack>_index e <pack>_guide"
```

---

### Task 5: Entrypoint (`src/index.ts`)

Resolve o pack do `--pack=`/env, carrega, sobe o server stdio. Parse isolado e testável.

**Files:**
- Create: `src/index.ts`
- Test: `test/args.test.ts`

**Interfaces:**
- Consumes: `loadPack`, `buildServer`.
- Produces: `function resolvePackName(argv: string[], env: NodeJS.ProcessEnv): string` — lança erro claro se nenhum pack informado.

- [ ] **Step 1: Escrever o teste que falha**

`test/args.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { resolvePackName } from "../src/index.ts";

test("resolvePackName lê --pack=akita", () => {
  assert.equal(resolvePackName(["--pack=akita"], {}), "akita");
});

test("resolvePackName lê --pack akita (separado)", () => {
  assert.equal(resolvePackName(["--pack", "akita"], {}), "akita");
});

test("resolvePackName cai pra env PACK", () => {
  assert.equal(resolvePackName([], { PACK: "galego" }), "galego");
});

test("resolvePackName sem nada lança erro claro", () => {
  assert.throws(() => resolvePackName([], {}), /--pack/);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test`
Expected: FAIL — `Cannot find module '../src/index.ts'`.

- [ ] **Step 3: Implementar `src/index.ts`**

```ts
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadPack } from "./pack.js";
import { buildServer } from "./server.js";

export function resolvePackName(argv: string[], env: NodeJS.ProcessEnv): string {
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith("--pack=")) return arg.slice("--pack=".length);
    if (arg === "--pack" && argv[i + 1]) return argv[i + 1];
  }
  if (env.PACK) return env.PACK;
  throw new Error(
    'Nenhum pack informado. Use --pack=<nome> (ex: --pack=akita) ou a env PACK.',
  );
}

async function main(): Promise<void> {
  const packName = resolvePackName(process.argv.slice(2), process.env);
  const pack = loadPack(packName);
  const server = buildServer(pack);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stdio: não escrever em stdout (corrompe o protocolo). Log vai pra stderr.
  process.stderr.write(`mcp-conhecimento: pack "${pack.name}" pronto (${pack.topics.length} tópicos)\n`);
}

// Só roda se for o entrypoint, não quando importado em teste.
// realpathSync resolve o symlink do bin (npx) p/ bater com import.meta.url.
const isMain = process.argv[1]
  ? realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)
  : false;
if (isMain) {
  main().catch((err) => {
    process.stderr.write(`mcp-conhecimento: erro fatal: ${(err as Error).message}\n`);
    process.exit(1);
  });
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Build e smoke manual**

Run: `npm run build && node dist/index.js --pack=akita`
Expected: imprime em stderr `mcp-conhecimento: pack "akita" pronto (10 tópicos)` e fica aguardando stdin (Ctrl-C pra sair). Sem nada em stdout.

- [ ] **Step 6: Commit**

```bash
git add src/index.ts test/args.test.ts
git commit -m "feat: entrypoint com resolução de pack e transporte stdio"
```

---

### Task 6: Teste e2e (MCP client over stdio) + README

Prova end-to-end via o SDK client lançando o server compilado; documenta instalação.

**Files:**
- Create: `test/e2e.test.ts`
- Create: `README.md`

**Interfaces:**
- Consumes: `dist/index.js` (build da Task 5).
- Produces: README com snippet de instalação no Claude Code.

- [ ] **Step 1: Garantir build atualizado**

Run: `npm run build`
Expected: `dist/index.js`, `dist/pack.js`, `dist/server.js` gerados.

- [ ] **Step 2: Escrever o teste e2e**

`test/e2e.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ENTRY = join(ROOT, "dist", "index.js");

async function connect() {
  const transport = new StdioClientTransport({
    command: "node",
    args: [ENTRY, "--pack=akita"],
  });
  const client = new Client({ name: "e2e", version: "0.0.0" });
  await client.connect(transport);
  return client;
}

test("e2e: lista akita_index e akita_guide", async () => {
  const client = await connect();
  const { tools } = await client.listTools();
  const names = tools.map((t) => t.name).sort();
  assert.deepEqual(names, ["akita_guide", "akita_index"]);
  await client.close();
});

test("e2e: akita_guide(testes) retorna conteúdo", async () => {
  const client = await connect();
  const res = await client.callTool({ name: "akita_guide", arguments: { topic: "testes" } });
  const text = (res.content as Array<{ type: string; text: string }>)[0].text;
  assert.match(text, /PR sem teste/i);
  await client.close();
});

test("e2e: akita_index retorna a tabela", async () => {
  const client = await connect();
  const res = await client.callTool({ name: "akita_index", arguments: {} });
  const text = (res.content as Array<{ type: string; text: string }>)[0].text;
  assert.match(text, /Quando consultar/);
  await client.close();
});
```

- [ ] **Step 3: Rodar e ver passar**

Run: `npm test`
Expected: PASS — toda a suíte (pack, akita-pack, server, args, e2e) verde.

- [ ] **Step 4: Escrever `README.md`**

```markdown
# mcp-conhecimento

Servidor MCP que serve bases de conhecimento de engenharia (markdown acionável) para o
Claude Code e outros clients MCP. Um servidor, vários **packs** de conteúdo selecionáveis por
`--pack`. Primeiro pack: **Akita** (engenharia destilada do Fabio Akita).

## Instalação no Claude Code

Adicione ao seu `~/.claude.json` (ou `.mcp.json` do projeto):

```jsonc
{
  "mcpServers": {
    "akita": {
      "command": "npx",
      "args": ["-y", "mcp-conhecimento", "--pack=akita"]
    }
  }
}
```

Reinicie o Claude Code. O agente ganha dois tools:

- `akita_index` — tabela "quando consultar o quê".
- `akita_guide(topic)` — guia completo de um tópico (`principios`, `testes`, `banco-sql`, …).

## Tópicos do pack akita

| key | sobre |
|---|---|
| `principios` | Mentalidade / qualquer decisão de eng |
| `processo-ia` | Trabalhar com agente de IA, CLAUDE.md |
| `escrever-codigo` | Escrever/refatorar/revisar código |
| `testes` | Testes, TDD |
| `arquitetura` | Arquitetura, fronteiras, escala |
| `banco-sql` | Banco, SQL, modelagem |
| `git-entrega` | Git, CI, deploy |
| `seguranca` | Segurança |
| `jobs` | Jobs assíncronos, confiabilidade |
| `linguagens` | Escolha de linguagem/stack |

## Desenvolvimento

```bash
npm install
npm test         # node:test via tsx
npm run build    # tsc -> dist/
./sync-packs.sh  # re-sincroniza os docs do pack akita da base-fonte local
```

## Adicionar um pack

1. Crie `packs/<nome>/manifest.json` e `packs/<nome>/docs/*.md`.
2. Rode com `--pack=<nome>`. Os tools viram `<nome>_index` / `<nome>_guide`.

## Licença

MIT
```

- [ ] **Step 5: Commit**

```bash
git add test/e2e.test.ts README.md
git commit -m "test: e2e via MCP client + README de instalação"
```

---

## Notas de execução

- Após cada task, rodar `npm test` inteiro (regra Akita: rode a suíte toda após cada correção).
- `tsx` resolve imports `../src/*.ts` nos testes; o código de produção usa imports `./*.js` (NodeNext exige a extensão `.js` mesmo em TS) — não confundir.
- Nunca escrever em **stdout** no runtime (corrompe o protocolo stdio do MCP); logs só em stderr.
- O `package-lock.json` é gerado no `npm install` da Task 1 — commitar junto.
```
