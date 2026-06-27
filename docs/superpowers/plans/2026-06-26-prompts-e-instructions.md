# Server `instructions` + MCP prompts data-driven — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer o pack MCP entregar, de forma portável (viaja com o deploy), um lembrete passivo (`instructions`) e slash-commands ativos (MCP prompts) que aplicam a base Akita no projeto de qualquer usuário.

**Architecture:** Estende o modelo data-driven existente (`manifest.json` + `docs/`). O engine (`src/`) permanece genérico: lê os campos novos opcionais (`instructions`, `prompts`) e registra o que o pack declara. Templates de prompt viram arquivos em `packs/<pack>/prompts/*.md`, carregados/validados igual aos docs. `buildServer` passa `instructions` no `McpServer` e faz `registerPrompt` por item.

**Tech Stack:** TypeScript (ESM), `@modelcontextprotocol/sdk` ^1.12, `zod` ^3.23, runner `node --import tsx --test`.

## Global Constraints

- Campos `instructions` e `prompts` são **opcionais** no manifest — packs/fixtures sem eles continuam válidos (backward-compat).
- Engine genérico: nenhum conteúdo "akita" hardcoded em `src/`. Tudo vem do pack.
- Nome do prompt: **verbatim do manifest** (sem prefixo `akita_`).
- Identificadores de código em inglês; texto/conteúdo em PT-BR.
- Argumentos de prompt MCP são sempre strings: `required` → `z.string()`, opcional → `z.string().optional()`.
- Arg opcional ausente → substituído por string vazia (normalizado no handler, não no `renderPrompt`).
- Rodar testes: `npm test`. O `test/e2e.test.ts` importa `dist/` → precisa de `npm run build` antes.
- Mensagem de commit termina com: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`

---

### Task 1: `renderPrompt` (substituição pura de `{{arg}}`)

**Files:**
- Modify: `src/pack.ts` (adicionar função exportada `renderPrompt`)
- Test: `test/pack.test.ts` (adicionar testes)

**Interfaces:**
- Consumes: nada.
- Produces: `export function renderPrompt(template: string, args: Record<string, string>): string` — substitui cada `{{name}}` cujo `name` esteja presente em `args` pelo valor; `{{name}}` não presente em `args` permanece literal.

- [ ] **Step 1: Escrever os testes que falham**

Adicionar ao final de `test/pack.test.ts`:

```ts
import { loadPack, readDoc, renderIndex, renderPrompt } from "../src/pack.ts";
// (substituir a linha de import existente por esta, que inclui renderPrompt)

test("renderPrompt: substitui arg presente", () => {
  assert.equal(renderPrompt("Olá, {{nome}}!", { nome: "Akita" }), "Olá, Akita!");
});

test("renderPrompt: arg vazio vira string vazia", () => {
  assert.equal(renderPrompt("Audite o alvo: {{path}}.", { path: "" }), "Audite o alvo: .");
});

test("renderPrompt: placeholder sem arg correspondente fica literal", () => {
  assert.equal(renderPrompt("{{a}} e {{b}}", { a: "1" }), "1 e {{b}}");
});

test("renderPrompt: múltiplas ocorrências do mesmo arg", () => {
  assert.equal(renderPrompt("{{x}}-{{x}}", { x: "z" }), "z-z");
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npm test`
Expected: FAIL — `renderPrompt is not a function` / não exportado por `../src/pack.ts`.

- [ ] **Step 3: Implementar `renderPrompt`**

Adicionar ao final de `src/pack.ts`:

```ts
export function renderPrompt(template: string, args: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, name) =>
    name in args ? args[name] : match,
  );
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npm test`
Expected: PASS (todos os testes, incluindo os 4 novos de `renderPrompt`).

- [ ] **Step 5: Commit**

```bash
git add src/pack.ts test/pack.test.ts
git commit -m "feat: renderPrompt para substituir {{arg}} em templates de prompt

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Manifest schema + `loadPack` para `instructions` e `prompts`

**Files:**
- Modify: `src/pack.ts` (tipos `PromptArg`/`PromptDef`, `Pack`; `ManifestSchema`; `loadPack`)
- Create: `test/fixtures/packs/comprompts/manifest.json`
- Create: `test/fixtures/packs/comprompts/docs/alpha.md`
- Create: `test/fixtures/packs/comprompts/prompts/greet.md`
- Create: `test/fixtures/packs/comprompts/prompts/ping.md`
- Create: `test/fixtures/packs/promptquebrado/manifest.json`
- Create: `test/fixtures/packs/promptquebrado/docs/alpha.md`
- Test: `test/pack.test.ts`

**Interfaces:**
- Consumes: `renderPrompt` (Task 1, não usado aqui diretamente).
- Produces:
  - `export type PromptArg = { name: string; description: string; required: boolean }`
  - `export type PromptDef = { name: string; title: string; description: string; file: string; path: string; arguments: PromptArg[] }`
  - `Pack` ganha `instructions?: string` e `prompts: PromptDef[]` (sempre array; `[]` se ausente).
  - `loadPack` resolve `path` de cada prompt e valida existência (throw no boot, igual docs). `arguments` ausente → `[]`.

- [ ] **Step 1: Criar as fixtures**

`test/fixtures/packs/comprompts/manifest.json`:

```json
{
  "name": "comprompts",
  "title": "Pack Com Prompts",
  "description": "Pack de teste com prompts e instructions.",
  "instructions": "Instruções de teste do pack comprompts.",
  "topics": [
    { "key": "alpha", "file": "docs/alpha.md", "title": "Alpha", "whenToUse": "Quando precisar de alpha." }
  ],
  "prompts": [
    { "name": "greet", "title": "Saudar", "description": "Saúda alguém.", "file": "prompts/greet.md",
      "arguments": [{ "name": "nome", "description": "Quem saudar", "required": true }] },
    { "name": "ping", "title": "Ping", "description": "Sem argumentos.", "file": "prompts/ping.md" }
  ]
}
```

`test/fixtures/packs/comprompts/docs/alpha.md`:

```markdown
Conteúdo alpha do comprompts.
```

`test/fixtures/packs/comprompts/prompts/greet.md`:

```markdown
Olá, {{nome}}! Bem-vindo.
```

`test/fixtures/packs/comprompts/prompts/ping.md`:

```markdown
pong
```

`test/fixtures/packs/promptquebrado/manifest.json` (aponta para template inexistente):

```json
{
  "name": "promptquebrado",
  "title": "Prompt Quebrado",
  "description": "Pack com prompt cujo template não existe.",
  "topics": [
    { "key": "alpha", "file": "docs/alpha.md", "title": "Alpha", "whenToUse": "x" }
  ],
  "prompts": [
    { "name": "fantasma", "title": "Fantasma", "description": "Template ausente.", "file": "prompts/naoexiste.md" }
  ]
}
```

`test/fixtures/packs/promptquebrado/docs/alpha.md`:

```markdown
Conteúdo alpha.
```

- [ ] **Step 2: Escrever os testes que falham**

Adicionar ao final de `test/pack.test.ts`:

```ts
test("loadPack: pack sem prompts/instructions continua válido (backward-compat)", () => {
  const pack = loadPack("demo", FIXTURES);
  assert.equal(pack.instructions, undefined);
  assert.deepEqual(pack.prompts, []);
});

test("loadPack: carrega instructions e prompts", () => {
  const pack = loadPack("comprompts", FIXTURES);
  assert.equal(pack.instructions, "Instruções de teste do pack comprompts.");
  assert.equal(pack.prompts.length, 2);
  const greet = pack.prompts.find((p) => p.name === "greet")!;
  assert.equal(greet.arguments.length, 1);
  assert.equal(greet.arguments[0].name, "nome");
  assert.equal(greet.arguments[0].required, true);
});

test("loadPack: prompt sem arguments normaliza para []", () => {
  const pack = loadPack("comprompts", FIXTURES);
  const ping = pack.prompts.find((p) => p.name === "ping")!;
  assert.deepEqual(ping.arguments, []);
});

test("loadPack: template de prompt inexistente lança no load", () => {
  assert.throws(() => loadPack("promptquebrado", FIXTURES), /naoexiste|ausente|não encontrado/i);
});
```

- [ ] **Step 3: Rodar e confirmar que falha**

Run: `npm test`
Expected: FAIL — `pack.prompts` undefined / `instructions` não parseado / `promptquebrado` não lança.

- [ ] **Step 4: Implementar schema, tipos e loadPack**

Em `src/pack.ts`, adicionar os tipos após `type Topic`:

```ts
export type PromptArg = { name: string; description: string; required: boolean };

export type PromptDef = {
  name: string;
  title: string;
  description: string;
  file: string;
  path: string;
  arguments: PromptArg[];
};
```

Estender `Pack`:

```ts
export type Pack = {
  name: string;
  title: string;
  description: string;
  topics: Topic[];
  dir: string;
  instructions?: string;
  prompts: PromptDef[];
};
```

Estender `ManifestSchema` (adicionar campos após `topics`):

```ts
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
  instructions: z.string().min(1).optional(),
  prompts: z
    .array(
      z.object({
        name: z.string().min(1),
        title: z.string().min(1),
        description: z.string().min(1),
        file: z.string().min(1),
        arguments: z
          .array(
            z.object({
              name: z.string().min(1),
              description: z.string().min(1),
              required: z.boolean(),
            }),
          )
          .optional(),
      }),
    )
    .optional(),
});
```

No `loadPack`, após montar `topics` e antes do `return`, adicionar a resolução dos prompts:

```ts
  const prompts: PromptDef[] = (parsed.data.prompts ?? []).map((p) => {
    const path = join(dir, p.file);
    if (!existsSync(path)) {
      throw new Error(
        `Pack "${packName}": template do prompt "${p.name}" ausente (esperado em ${path})`,
      );
    }
    return {
      name: p.name,
      title: p.title,
      description: p.description,
      file: p.file,
      path,
      arguments: p.arguments ?? [],
    };
  });
```

E o `return` passa a incluir os campos novos:

```ts
  return {
    name: parsed.data.name,
    title: parsed.data.title,
    description: parsed.data.description,
    topics,
    dir,
    instructions: parsed.data.instructions,
    prompts,
  };
```

- [ ] **Step 5: Rodar e confirmar que passa**

Run: `npm test`
Expected: PASS (incluindo os 4 testes novos de Task 2; demo/quebrado continuam passando).

- [ ] **Step 6: Commit**

```bash
git add src/pack.ts test/pack.test.ts test/fixtures/packs/comprompts test/fixtures/packs/promptquebrado
git commit -m "feat: loadPack carrega instructions e prompts do manifest

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: `buildServer` registra `instructions` + prompts

**Files:**
- Modify: `src/server.ts` (`buildServer`)
- Test: `test/server.test.ts` (verificação end-to-end via `InMemoryTransport` + fixture comprompts)

**Interfaces:**
- Consumes: `loadPack` → `Pack` com `instructions?`/`prompts` (Task 2); `renderPrompt` (Task 1).
- Produces: servidor MCP que devolve `instructions` no initialize e expõe os prompts do pack via `prompts/list` e `prompts/get`.

> Decisão: o `comprompts` é uma fixture fora de `packs/`, e o CLI (`src/index.ts`) **não** tem flag de packs-root (confirmado: só `--pack`, com `DEFAULT_PACKS_ROOT` fixo). Logo, testa-se o wiring com `InMemoryTransport.createLinkedPair()` ligando um `Client` direto ao `buildServer(comprompts)` — sem build, sem subprocess, sem flag nova. A cobertura via stdio/dist fica na Task 4, usando o pack akita real.

- [ ] **Step 1: Escrever o teste que falha**

Ajustar imports no topo de `test/server.test.ts` (adicionar Client e InMemoryTransport):

```ts
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
```

Adicionar ao final de `test/server.test.ts`:

```ts
const comprompts = loadPack("comprompts", FIXTURES);

test("buildServer com pack que tem prompts não lança", () => {
  assert.ok(buildServer(comprompts));
});

test("buildServer expõe instructions, lista e resolve prompts (in-memory)", async () => {
  const server = buildServer(comprompts);
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  const client = new Client({ name: "test", version: "0.0.0" });
  await client.connect(clientTransport);

  assert.equal(client.getInstructions(), "Instruções de teste do pack comprompts.");

  const { prompts } = await client.listPrompts();
  assert.deepEqual(prompts.map((p) => p.name).sort(), ["greet", "ping"]);

  const res = await client.getPrompt({ name: "greet", arguments: { nome: "Akita" } });
  const text = (res.messages[0].content as { type: string; text: string }).text;
  assert.match(text, /Olá, Akita!/);

  await client.close();
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npm test`
Expected: FAIL — `getInstructions()` undefined / `listPrompts` vazio / `getPrompt` rejeita "greet".

- [ ] **Step 3: Implementar wiring em buildServer**

Em `src/server.ts`: ajustar imports e a função.

Import (topo):

```ts
import { readFileSync } from "node:fs";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { type Pack, readDoc, renderIndex, renderPrompt } from "./pack.js";
```

Construir o servidor com `instructions` e registrar prompts (substituir o início/fim de `buildServer`):

```ts
export function buildServer(pack: Pack): McpServer {
  const server = new McpServer(
    { name: `mcp-conhecimento-${pack.name}`, version: "0.1.0" },
    pack.instructions ? { instructions: pack.instructions } : undefined,
  );

  // ...registerTool index/guide existentes permanecem iguais...

  for (const p of pack.prompts) {
    const argsSchema = Object.fromEntries(
      p.arguments.map((a) => [a.name, a.required ? z.string() : z.string().optional()]),
    );
    server.registerPrompt(
      p.name,
      { title: p.title, description: p.description, argsSchema },
      async (args: Record<string, string | undefined> = {}) => {
        const filled = Object.fromEntries(
          p.arguments.map((a) => [a.name, args[a.name] ?? ""]),
        );
        return {
          messages: [
            {
              role: "user",
              content: { type: "text", text: renderPrompt(readFileSync(p.path, "utf8"), filled) },
            },
          ],
        };
      },
    );
  }

  return server;
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npm test`
Expected: PASS (server.test novo in-memory + demais intactos).

- [ ] **Step 5: Commit**

```bash
git add src/server.ts test/server.test.ts
git commit -m "feat: buildServer registra instructions e prompts MCP

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Conteúdo do pack akita — `instructions` + 4 prompts

**Files:**
- Modify: `packs/akita/manifest.json` (adicionar `instructions` + `prompts`)
- Create: `packs/akita/prompts/setup-claude-md.md`
- Create: `packs/akita/prompts/audit.md`
- Create: `packs/akita/prompts/review-diff.md`
- Create: `packs/akita/prompts/decidir.md`
- Test: `test/akita-pack.test.ts`

**Interfaces:**
- Consumes: `loadPack` (Task 2).
- Produces: pack akita com `instructions` não-vazio e 4 prompts (`setup-claude-md`, `audit`, `review-diff`, `decidir`), todos com template em disco.

- [ ] **Step 1: Escrever os testes que falham**

Ajustar imports no topo de `test/akita-pack.test.ts` (adicionar leitura de arquivo):

```ts
import { readFileSync } from "node:fs";
```

Adicionar ao final de `test/akita-pack.test.ts`:

```ts
test("pack akita: tem instructions não-vazio", () => {
  const pack = loadPack("akita");
  assert.ok(pack.instructions && pack.instructions.length > 20);
  assert.match(pack.instructions!, /akita_index/);
});

test("pack akita: tem os 4 prompts esperados", () => {
  const pack = loadPack("akita");
  assert.deepEqual(
    pack.prompts.map((p) => p.name).sort(),
    ["audit", "decidir", "review-diff", "setup-claude-md"],
  );
});

test("pack akita: todos os templates de prompt leem não-vazio", () => {
  const pack = loadPack("akita");
  for (const p of pack.prompts) {
    assert.ok(readFileSync(p.path, "utf8").trim().length > 20, `template ${p.name} muito curto`);
  }
});

test("pack akita: decidir tem arg obrigatório dilema; audit tem path opcional", () => {
  const pack = loadPack("akita");
  const decidir = pack.prompts.find((p) => p.name === "decidir")!;
  assert.equal(decidir.arguments[0].name, "dilema");
  assert.equal(decidir.arguments[0].required, true);
  const audit = pack.prompts.find((p) => p.name === "audit")!;
  assert.equal(audit.arguments[0].name, "path");
  assert.equal(audit.arguments[0].required, false);
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npm test`
Expected: FAIL — akita sem `instructions`/`prompts`.

- [ ] **Step 3: Criar os 4 templates**

`packs/akita/prompts/setup-claude-md.md`:

```markdown
Você vai criar ou enriquecer o `CLAUDE.md` deste projeto seguindo a Base de Conhecimento Akita.

1. Leia o `CLAUDE.md` atual se existir. Detecte a stack (ex.: `package.json`, `Gemfile`,
   `pyproject.toml`, `go.mod`) e o domínio do projeto.
2. Chame `akita_index` e depois `akita_guide` nos tópicos relevantes — sempre `principios` e
   `processo-ia`, mais os específicos da stack (ex.: `banco-sql` se há banco, `testes`, `seguranca`).
3. Escreva no `CLAUDE.md` diretrizes **curtas e acionáveis** alinhadas ao Akita (testes a cada PR,
   SQL seguro, commits pequenos, fronteiras claras). Adapte à stack real do projeto.
4. NÃO duplique o que o código/README já deixa óbvio. Mantenha enxuto — isso entra em todo contexto.

Ao final, mostre o diff do `CLAUDE.md` e peça confirmação antes de salvar.
```

`packs/akita/prompts/audit.md`:

```markdown
Audite o alvo: {{path}}. Se o alvo estiver vazio, audite o projeto inteiro.

Para cada área relevante, chame `akita_guide` e compare o código com o guia:
`testes`, `banco-sql`, `seguranca`, `arquitetura`, `jobs`.

Liste os desvios encontrados no formato, um por linha:
`arquivo:linha — problema — tópico-fonte — fix sugerido`

Regras: só reporte o que existe de fato no código; não invente. Priorize problemas reais
(segurança, SQL inseguro, ausência de teste em caminho crítico) sobre nits de estilo.
```

`packs/akita/prompts/review-diff.md`:

```markdown
Revise o diff atual sob a lente da Base de Conhecimento Akita.

1. Rode `git diff` e `git diff --staged` para ver as mudanças pendentes.
2. Chame `akita_guide` em `escrever-codigo`, `git-entrega` e `seguranca`.
3. Aponte achados, um por linha: `arquivo:linha — problema — fix`.

Foque em: nomes pesquisáveis, funções/arquivos pequenos, SQL seguro, segurança a cada commit,
commit pequeno e coeso. Pule nits de formatação que não mudam o significado.
```

`packs/akita/prompts/decidir.md`:

```markdown
Dilema de engenharia a decidir: {{dilema}}

1. Escolha o(s) tópico(s) Akita relevante(s) e chame `akita_guide` neles.
2. Responda no estilo Akita: recomendação clara, o trade-off envolvido, e em que situação o
   caminho oposto seria o certo.

Seja direto. Cite o tópico-fonte usado.
```

- [ ] **Step 4: Adicionar `instructions` + `prompts` ao manifest akita**

Em `packs/akita/manifest.json`, adicionar (após o array `topics`, dentro do objeto raiz):

```json
  "instructions": "Base de Conhecimento Akita: engenharia de software de senior, acionável. Consulte akita_index ANTES de qualquer decisão de engenharia (testes, arquitetura, SQL, segurança, deploy, jobs, escolha de stack) e depois akita_guide no tópico certo. Prompts disponíveis: setup-claude-md, audit, review-diff, decidir.",
  "prompts": [
    { "name": "setup-claude-md", "title": "Setup CLAUDE.md (Akita)", "description": "Cria ou enriquece o CLAUDE.md do projeto com diretrizes Akita conforme a stack.", "file": "prompts/setup-claude-md.md" },
    { "name": "audit", "title": "Auditar projeto (Akita)", "description": "Audita o projeto (ou um caminho) contra os princípios Akita e lista desvios.", "file": "prompts/audit.md",
      "arguments": [{ "name": "path", "description": "Caminho a auditar (vazio = projeto inteiro)", "required": false }] },
    { "name": "review-diff", "title": "Revisar diff (Akita)", "description": "Revisa o diff atual sob a lente Akita antes do commit.", "file": "prompts/review-diff.md" },
    { "name": "decidir", "title": "Decidir (Akita)", "description": "Recebe um dilema de engenharia e responde no estilo Akita usando os guias.", "file": "prompts/decidir.md",
      "arguments": [{ "name": "dilema", "description": "O dilema de engenharia a decidir", "required": true }] }
  ]
```

> Atenção à vírgula: o array `topics` precisa terminar com `,` antes de `"instructions"`.

- [ ] **Step 5: Rodar e confirmar que passa**

Run: `npm test`
Expected: PASS (4 testes novos de akita + todos os anteriores).

- [ ] **Step 6: Adicionar cobertura e2e (stdio) no pack akita real**

Adicionar ao final de `test/e2e.test.ts` (reusa o helper `connect()` existente, que já sobe `--pack=akita`):

```ts
test("e2e: akita expõe instructions", async () => {
  const client = await connect();
  assert.match(client.getInstructions() ?? "", /akita_index/);
  await client.close();
});

test("e2e: akita lista os 4 prompts", async () => {
  const client = await connect();
  const { prompts } = await client.listPrompts();
  assert.deepEqual(
    prompts.map((p) => p.name).sort(),
    ["audit", "decidir", "review-diff", "setup-claude-md"],
  );
  await client.close();
});

test("e2e: akita getPrompt(decidir) injeta o dilema no template", async () => {
  const client = await connect();
  const res = await client.getPrompt({ name: "decidir", arguments: { dilema: "NoSQL ou Postgres?" } });
  const text = (res.messages[0].content as { type: string; text: string }).text;
  assert.match(text, /NoSQL ou Postgres\?/);
  await client.close();
});
```

Run: `npm run build && npm test`
Expected: PASS (e2e precisa do `dist/` atualizado, por isso o build antes).

- [ ] **Step 7: Commit**

```bash
git add packs/akita/manifest.json packs/akita/prompts test/akita-pack.test.ts test/e2e.test.ts
git commit -m "feat: pack akita ganha instructions + 4 prompts (setup-claude-md, audit, review-diff, decidir)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Documentar no README

**Files:**
- Modify: `README.md`
- Test: nenhum automatizado (doc). Verificação manual abaixo.

**Interfaces:**
- Consumes: comportamento das Tasks 3 e 4.
- Produces: seção do README descrevendo `instructions` (lembrete passivo) e os slash-commands.

- [ ] **Step 1: Adicionar seção ao README**

Adicionar uma seção no `README.md` (após a descrição dos tools, mantendo o tom/estilo existente):

```markdown
## Lembrete automático e slash-commands

Ao conectar, o server envia **instructions** (lembrete passivo) pedindo para consultar a base
antes de decisões de engenharia — vale para qualquer cliente, sem configuração local.

O pack akita também expõe **slash-commands** (MCP prompts), que aparecem no cliente como
`/mcp__mcp-conhecimento-akita__<nome>`:
> Correção pós-implementação: o prefixo real vem da chave em mcpServers (ex.: akita → /mcp__akita__<nome>), não do nome interno do server.

- `setup-claude-md` — cria ou enriquece o `CLAUDE.md` do projeto com diretrizes Akita.
- `audit [path]` — audita o projeto contra os princípios Akita e lista desvios.
- `review-diff` — revisa o diff atual antes do commit, sob a lente Akita.
- `decidir <dilema>` — responde um dilema de engenharia usando os guias.

Clientes que não suportam prompts MCP ainda recebem as instructions.
```

- [ ] **Step 2: Verificação manual**

Run: `grep -n "slash-commands\|setup-claude-md\|instructions" README.md`
Expected: linhas da nova seção presentes.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: README descreve instructions e slash-commands do pack

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Notas de finalização (pós-tasks)

- Build limpo: `npm run build` sem erros de tipo.
- Suíte verde: `npm test` (todos os arquivos).
- Deploy: rebuild da imagem Docker + redeploy no Coolify (`mcp-akita.konfig.com.br/mcp`). Sem mudança de infra/env/token. (Fora do escopo de código deste plano — fazer só após merge e aprovação.)
