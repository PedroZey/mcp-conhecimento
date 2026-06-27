# Design — Server `instructions` + MCP prompts data-driven

**Data:** 2026-06-26
**Status:** Aprovado (aguardando review do spec)
**Contexto:** Estende o `mcp-conhecimento` (engine MCP por pack) para que o conhecimento Akita seja
aplicado de forma produtiva por **qualquer** usuário que conecte ao MCP — sem depender de um
CLAUDE.md local nem de o usuário lembrar de consultar a base.

## Problema

Hoje o pack expõe só dois tools (`<pack>_index`, `<pack>_guide`). Para o agente realmente usar a
base "antes de decidir", o disparo depende de uma instrução *standing* no `~/.claude/CLAUDE.md`
**local** de cada máquina. Isso não viaja com o deploy (Coolify): quem conecta de outra máquina /
outro projeto não ganha nada além dos dois tools, e precisa ser orientado manualmente.

Um **hook** do Claude Code resolveria o "não depender de lembrar", mas hook é config local
(`settings.json`) na máquina do cliente — **não viaja pelo MCP**. O servidor não enxerga nem
escreve o `settings.json` de quem conecta. Portanto hook está fora de escopo aqui.

## Objetivo

Dois mecanismos **nativos do MCP** que viajam com o deploy e valem para todo cliente que conecta:

1. **Server `instructions`** — lembrete *passivo*, sempre ligado. O servidor devolve uma string no
   `initialize`; o cliente injeta no contexto automaticamente (é o mesmo mecanismo que aparece como
   "MCP Server Instructions" para context7/playwright). É "soft" (contexto, não um gate duro como
   hook), mas é o lembrete mais forte que viaja pelo protocolo.
2. **MCP prompts** (`registerPrompt`) — ações *ativas*. Viram slash-commands no cliente
   (`/mcp__mcp-conhecimento-akita__<nome>`), permitindo que o usuário enriqueça o projeto dele com
   base no Akita sob demanda.

**Não-objetivos:** hook local (fora do que o MCP entrega); documentar hook como opt-in (descartado
por YAGNI); endurecer o gate além de `instructions`.

## Princípio de arquitetura

Estender o modelo **data-driven** existente (`manifest.json` + `docs/`). O engine (`src/`)
permanece genérico e não conhece "akita": só lê e registra o que o pack declara. Os campos novos
são **opcionais**, então as fixtures `demo`/`quebrado` e futuros packs não-eng (ex.: galego)
continuam válidos sem declarar prompts/instructions.

## Componentes (cada unidade, um propósito)

| Unidade | Arquivo | Responsabilidade |
|---|---|---|
| `ManifestSchema` | `src/pack.ts` | Validar os campos novos `instructions` e `prompts`. |
| `loadPack` | `src/pack.ts` | Resolver e validar os arquivos de template (fail-fast no boot, igual aos docs). |
| `renderPrompt(template, args)` | `src/pack.ts` (nova fn) | Substituir `{{arg}}` no template. Testável isolada. |
| `buildServer` | `src/server.ts` | Passar `instructions` no `McpServer`; `registerPrompt` por item. |
| `packs/akita/manifest.json` | dados | Declarar `instructions` + 4 prompts. |
| `packs/akita/prompts/*.md` | dados | Conteúdo dos 4 templates. |

## Schema do manifest (campos novos, ambos opcionais)

```jsonc
{
  // ...campos existentes...
  "instructions": "Base de Conhecimento Akita. Consulte akita_index ANTES de qualquer decisão de engenharia (testes, arquitetura, SQL, segurança, deploy, jobs, escolha de stack); depois akita_guide no tópico certo.",
  "prompts": [
    { "name": "setup-claude-md", "title": "Setup CLAUDE.md (Akita)", "description": "...", "file": "prompts/setup-claude-md.md" },
    { "name": "audit",           "title": "Auditar projeto (Akita)", "description": "...", "file": "prompts/audit.md",
      "arguments": [{ "name": "path", "description": "Caminho a auditar (vazio = projeto inteiro)", "required": false }] },
    { "name": "review-diff",     "title": "Revisar diff (Akita)",    "description": "...", "file": "prompts/review-diff.md" },
    { "name": "decidir",         "title": "Decidir (Akita)",         "description": "...", "file": "prompts/decidir.md",
      "arguments": [{ "name": "dilema", "description": "O dilema de engenharia a decidir", "required": true }] }
  ]
}
```

Validação (zod):
- `instructions`: `z.string().min(1).optional()`.
- `prompts`: `z.array(PromptSchema).optional()`, onde `PromptSchema` = `{ name, title, description,
  file }` (todos string min(1)) + `arguments?: z.array({ name, description, required:boolean })`.

## Tipos (pack.ts)

```ts
type PromptArg = { name: string; description: string; required: boolean };
type PromptDef = { name: string; title: string; description: string; file: string; path: string; arguments: PromptArg[] };
type Pack = { /* existente */ instructions?: string; prompts: PromptDef[] };
```

`loadPack` resolve `path` de cada prompt (join com `dir`) e faz `existsSync`-or-throw, idêntico ao
tratamento dos docs. `arguments` ausente normaliza para `[]`.

## `renderPrompt(template, args)`

Função pura. Para cada `arg` fornecido, substitui todas as ocorrências de `{{name}}` pelo valor.
Arg opcional ausente → substitui por string vazia. Os templates são redigidos para ler bem mesmo
com o valor vazio: o `audit.md` usa "Audite o alvo: {{path}}" seguido de "se o alvo estiver vazio,
audite o projeto inteiro", de modo que o resultado faz sentido com ou sem `path`.

## `buildServer` (server.ts)

```ts
const server = new McpServer(
  { name: `mcp-conhecimento-${pack.name}`, version: "0.1.0" },
  pack.instructions ? { instructions: pack.instructions } : undefined,
);
// ...registerTool index/guide existentes...
for (const p of pack.prompts) {
  const argsSchema = Object.fromEntries(
    p.arguments.map((a) => [a.name, a.required ? z.string() : z.string().optional()]),
  );
  server.registerPrompt(p.name, { title: p.title, description: p.description, argsSchema },
    async (args) => ({
      messages: [{ role: "user", content: { type: "text", text: renderPrompt(readFileSync(p.path, "utf8"), args) } }],
    }),
  );
}
```

Nome do prompt: **verbatim do manifest** (sem prefixo `akita_` extra; o cliente já namespaceia pelo
nome do server).

## Conteúdo dos 4 templates

- **setup-claude-md** — Instrui o agente a: (1) ler o CLAUDE.md atual se existir e detectar a stack
  (package.json, etc.); (2) chamar `akita_index` e `akita_guide` nos tópicos relevantes (sempre
  `principios` + `processo-ia`, mais os da stack); (3) escrever diretrizes curtas e acionáveis no
  CLAUDE.md do projeto, sem duplicar o que o código já diz. Sem argumentos.
- **audit** `{{path}}` — Varre o código (ou `path`) e cruza com os guias (`testes`, `banco-sql`,
  `seguranca`, `arquitetura`, `jobs`), listando desvios no formato `arquivo:linha — problema —
  tópico-fonte — fix`. Só o que existe no código; não inventa.
- **review-diff** — `git diff` / `git diff --staged` sob a lente `escrever-codigo`, `git-entrega`,
  `seguranca`. Saída de uma linha por achado (`path:linha — problema — fix`). Pula nits de formato.
- **decidir** `{{dilema}}` — Escolhe o(s) tópico(s) relevante(s), chama `akita_guide` e responde no
  estilo Akita: recomendação clara + trade-off + quando o contrário se aplica.

## Fluxo de dados

```
initialize ──> server devolve instructions ──> cliente injeta no contexto (passivo, sempre ligado)
slash-command ──> prompts/get ──> handler lê template + renderPrompt(args) ──> mensagem
              ──> agente do cliente executa (lê arquivos dele, chama akita_index/akita_guide)
```

O servidor **não** toca disco do usuário; o template é uma *instrução* que o agente do cliente
executa com as ferramentas dele.

## Tratamento de erros

- Template ausente ou manifest mal-formado → `loadPack` lança erro descritivo no boot (fail-fast).
- Argumento `required` faltando → zod rejeita no `prompts/get`.
- Placeholder `{{x}}` sem arg correspondente declarado → permanece literal (não é erro; nenhum
  template em produção depende disso).

## Testes (segue o estilo atual do repo)

- `pack.test`: manifest com prompts carrega; template ausente lança; `instructions` parseado;
  `arguments` ausente vira `[]`.
- `renderPrompt` (novo): substitui arg; opcional ausente → vazio; múltiplas ocorrências.
- `server.test`: `buildServer` registra os prompts (listáveis); `instructions` presente no server.
- `akita-pack.test`: pack akita tem os 4 prompts + `instructions`; os 4 templates existem em disco.
- Backward-compat: fixtures `demo`/`quebrado` (sem os campos novos) continuam carregando.

## Compatibilidade / degradação

Campos opcionais → packs e fixtures existentes intactos. Cliente que não suporta prompts MCP ainda
recebe `instructions`. Cliente que suporta ganha os dois. Degrada bem.

## Impacto no deploy

Mudança só de código + dados do pack. Após merge: rebuild da imagem Docker e redeploy no Coolify
(`mcp-akita.konfig.com.br/mcp`). Sem mudança de infra, env ou token.
