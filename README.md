# mcp-conhecimento

Servidor MCP que serve bases de conhecimento de engenharia (markdown acionável) para o
Claude Code e outros clients MCP. Um servidor, vários **packs** de conteúdo selecionáveis por
`--pack`. Primeiro pack: **Akita** (engenharia destilada do Fabio Akita).

Dois modos de transporte:
- **http** (produção) — hospedado na sua infra; clientes conectam por URL, sem instalar nada.
- **stdio** (dev local) — o client lança o processo.

Tools expostos (por pack): `<pack>_index` (tabela "quando consultar o quê") e
`<pack>_guide(topic)` (guia completo de um tópico). Para akita: `akita_index` /
`akita_guide(topic)` com topic ∈ `principios, processo-ia, escrever-codigo, testes,
arquitetura, banco-sql, git-entrega, seguranca, jobs, linguagens`.

## Conectar num servidor remoto (recomendado)

Se já há uma instância hospedada, adicione ao seu `~/.claude.json` (ou `.mcp.json` do projeto):

```jsonc
{
  "mcpServers": {
    "akita": {
      "type": "http",
      "url": "https://<host>/mcp",
      "headers": { "Authorization": "Bearer <MCP_TOKEN>" }
    }
  }
}
```

Ou via CLI:

```bash
claude mcp add --transport http akita https://<host>/mcp \
  --header "Authorization: Bearer <MCP_TOKEN>"
```

## Hospedar (Docker / Coolify)

O servidor roda em http com auth Bearer obrigatória.

```bash
docker build -t mcp-conhecimento .
docker run -p 3000:3000 -e MCP_TOKEN=<token-secreto> mcp-conhecimento
# endpoint: http://localhost:3000/mcp  | health: http://localhost:3000/health
```

Variáveis de ambiente:

| env | default | o quê |
|---|---|---|
| `MCP_TOKEN` | — (obrigatório em http) | token Bearer; sem ele em http o server **não sobe** |
| `PACK` | `akita` | pack servido |
| `TRANSPORT` | `http` (no Docker) | `http` ou `stdio` |
| `PORT` | `3000` | porta http |

**Coolify:** crie um recurso a partir deste repositório (build via Dockerfile), defina
`MCP_TOKEN` como secret, exponha a porta `3000` e mapeie o domínio. O healthcheck usa `/health`.

## Uso local via stdio (dev)

```jsonc
{
  "mcpServers": {
    "akita": {
      "command": "node",
      "args": ["/caminho/para/dist/index.js", "--pack=akita"]
    }
  }
}
```

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
