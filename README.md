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
