# Processo de Engenharia com IA — Akita

Como programar como sênior usando agentes de IA: comunicação, memória, harness, modelos, Clean Code para agentes, ciclo de produção e gestão de projeto. Destilado de vídeos do canal @Akitando e posts do blog akitaonrails.com.

---

## Regras de ouro (faça isto)

| # | Regra | Por quê |
|---|---|---|
| 1 | **Solo frontier model > multi-modelo orquestrado** para greenfield | Solo Opus 4.7 em opencode bateu Tier A (97/100), 18 min, ~$4; nenhuma combinação planner/executor superou (— Benchmark de LLMs; — Planner + Executor) |
| 2 | **Escolha UM agente: Claude Code, Codex ou opencode.** Pare de colecionar agente | Melhor custo-benefício são Opus 4.7 e GPT 5.5 nos planos Pro/Plus/Max subsidiados; harness importa tanto quanto o modelo (— Dicas e Toolkit de IA) |
| 3 | **Comunique como pair programming: contexto + objetivo + restrições + validação** | Quando o modelo não entrega, o problema é a pergunta, não o modelo — "9 em cada 10 vezes a resposta recebida foi 42" (— Como falar com o Claude Code) |
| 4 | **Itere, não dispare comando único.** O prompt inicial é ponto de partida, não contrato | Pergunta estruturada retorna proposta fundamentada com trade-offs; pergunta seca retorna resposta genérica (— Como falar com o Claude Code) |
| 5 | **Você decide qual código escrever; a IA digita.** Revise tudo gerado | A IA não tem contexto operacional — pediu circuit breaker em vez de retry porque sabia que o cron triplica volume aos domingos (— Software Nunca Está Pronto) |
| 6 | **Clean Code reranqueado pro agente leitor**: arquivos pequenos, tipos explícitos, comentários com proveniência | O leitor do código agora é o agente, que tem janela de contexto finita e alucina com ambiguidade (— Clean Code pra Agentes de IA) |
| 7 | **Grep + contexto longo substitui RAG** na maioria dos casos | Modelos de 1M tokens cabem documentos inteiros; chunking quebra contexto e embeddings envelhecem (— RAG Está Morto) |
| 8 | **Memória de agente é só texto** — markdown em git + índice SQLite/FTS5. Sem vendor lock | Handoff manual entre agentes funciona pedindo "escreva o estado atual em markdown"; nenhum formato proprietário (— Memória de Agentes Karpathy) |
| 9 | **TDD, CI, small releases não são fase, são hábito** | Sem testes, cada merge é roleta russa; 99 testes em 10 dias permitiram evoluir sem quebrar (— Software Nunca Está Pronto) |
| 10 | **Software pronto não existe.** One-shot é pra demo; iteração é pra produção | 125 commits de pós-produção que nenhuma spec previa — Gmail corta email > 102KB, Steam API retorna datas em PT (— Software Nunca Está Pronto) |
| 11 | **Múltiplos experimentos descartáveis > tentar um projeto perfeito** | Perfeição paralisa; "10 ideias, 7 viram lixo, 3 valem a pena"; custo marginal de prototipagem é quase zero (— Maratona de IA) |
| 12 | **A abstração vem depois do uso, não antes.** Make it work → right → fast | ScopeResolver foi extraído de código já em produção, não inventado antecipando multi-usuário (— ai-memory arquitetura emergente) |

---

## Comunicação com o agente (o que mais quebra)

A diferença entre "Claude não funciona" e "gerou 400 mil linhas efetivas" é **metodologia de conversa**, não capacidade do modelo (— Como falar com o Claude Code). Trate como par em pair programming. **Stark + Jarvis = Homem de Ferro:** Stark não ordena, conversa, questiona, testa; Jarvis executa, pergunta, refina. Nem Stark acerta de primeira — o MCU é 85 iterações (Mark I → LXXXV).

**Estrutura de um pedido bom (4 componentes):**
1. **Objetivo final** — resultado desejado em linguagem clara.
2. **Método preferido** — como gostaria que fosse feito, deixando espaço pra sugestões melhores.
3. **O que NÃO fazer** — restrições e pressupostos implícitos. "Nunca deduplica por nome de arquivo, apenas por sha1+tamanho" vale mais que deixar adivinhar.
4. **Validação** — como medir sucesso, qual o teste de aceitação.

Não é spec de 10 páginas — é o que você diria a um dev sênior. O diferencial é velocidade: o LLM devolve em segundos o que um humano levaria dias.

**Durante a execução, acompanhe:** interrompa se a ETA estiver suspeita, ajuste paralelismo/performance, corrija fatos em tempo real, adicione contexto esquecido.

### Faça / Não faça — comunicação
- ✅ Estabeleça o contexto antes; depois passe ao modo perguntas ("Qual a melhor abordagem aqui?").
- ✅ Mostre código já escrito no projeto, mencione versões específicas, explique decisões anteriores, dê feedback negativo claro.
- ❌ Specs genéricas esperando resultado perfeito de primeira.
- ❌ Ignorar quando o modelo diz "não tenho informação suficiente".
- ❌ Tratar como automação — é parceria. "Contexto não se gera por osmose": se a info não está no código, docs ou pergunta, o modelo não a possui (— Como falar com o Claude Code).
- ❌ Achar que SDD, templates de 15 seções ou frameworks resolvem — tratam o sintoma; a causa é comunicação ruim, e volume só amplifica o ruído.

> Qualidade entregue é diretamente proporcional ao esforço de pedir bem. Escopo vago → entrega vaga, igual a terceirizado, só que mais rápido e paciente (— Como falar com o Claude Code).

---

## Escolha de modelo e harness

**Pare de colecionar agente.** Foque em Claude Code, Codex ou opencode. Gemini CLI/Cursor/Windsurf existem, mas o melhor custo-benefício é Opus 4.7 e GPT 5.5 nos planos subsidiados (— Dicas e Toolkit de IA).

### Benchmark de coding (Mai/2026)
| Modelo | Pontos | Nota |
|---|---|---|
| GPT 5.5 xHigh (Codex) | 96/100 | Mais rápido e barato que 5.4 |
| Claude Opus 4.7 | 94/100 | Raciocínio profundo |
| Claude Opus 4.6 | 93/100 | Baseline de referência |
| DeepSeek V4 Pro (DeepClaude) | 89/100 | Código limpo destravado |
| Kimi K2.6 | 87/100 | — |
| Gemini 3.1 Pro | 82/100 | "Surpresa discreta" |
| Claude Sonnet 4.6 | 81/100 | — |
| DeepSeek V4 Flash | 78/100 | Melhor custo-benefício do Tier B |
| GLM 4.7 Flash bf16 (local) | 52/100 | Precisa 96GB VRAM + KV Cache; gap de 30-40 pts |

(— Benchmark de LLMs pra Coding)

### Recomendação por cenário
| Cenário | Use |
|---|---|
| Coding rápido e iterativo | GPT 5.5 xHigh (Codex) |
| Alta complexidade / raciocínio | Claude Opus 4.7 ou 4.6 |
| Baixo custo viável | DeepSeek V4 Flash |
| Custo restrito mas qualidade | DeepClaude (Opus orquestra, DeepSeek V4 Pro executa) |
| Privacidade total | GLM 4.7 Flash local (perde ~40 pts) |

### Harness: por que importa
- **Cada modelo é fine-tuned para um harness diferente.** Codex usa `apply_patch` (sem números de linha), `rg` em vez de grep, obedece `AGENTS.md`, nunca commita sem ordem explícita. O system prompt do Codex é público (— AI Agents: Qual é o melhor?).
- **Claude Code** funciona melhor com Opus (família própria): planejamento visual (to-do list visível), execução paralela sem interromper frentes anteriores. **Codex interrompe a primeira tarefa pra atender a segunda** — exige abordagem serial, uma pergunta por vez (— Como falar com o Claude Code).
- **Agent Skills consomem tokens** (~80-250 cada). 50 skills = 4k-12,5k tokens por sessão nova. "Skills automáticas são facas de dois gumes: não instale tudo que ver pela frente" (— AI Agents: Qual é o melhor?).
- **Planner + Executor NÃO compensa.** Quando o planner é proibido de codificar, a qualidade cai (executor sem contexto). Única exceção: GPT 5.4 xHigh + medium reduz $16 → $1-3 perdendo só 3 pontos, se ultra-restrito de orçamento (— Vale Misturar 2 Modelos?).
- **Decida com dados, não opinião.** "Você deveria ser um dev de verdade e testar tecnicamente, e não seguir opiniões." Para "mas testou o Pi?": rode benchmark reprodutível (llm-coding-benchmark) (— Dicas e Toolkit; — AI Agents).

---

## VS Code é o novo cartão perfurado

Editor de texto para *digitação* virou obsoleto, como compiladores eliminaram o binário. A habilidade crítica vira **ler, questionar, corrigir** — não escrever (— VS Code é o Novo Cartão Perfurado).

| Antes | Agora |
|---|---|
| decidir → digitar → testar → debugar | decidir → descrever intenção → revisar → testar |
| Executor manual | Diretor e validador |

O IDE não desaparece, **muda de papel** — de instrumento de escrita para painel de controle: navegação, diff visual, testes locais, git, terminal. Programação **nunca foi "digitar código"** — isso sempre foi o braçal. Engenharia é decisão, trade-off, arquitetura; o resto continua 100% humano. **Programador é arquiteto, não pedreiro**: cada linha é decisão de projeto (framework, API, impacto de longo prazo); o compilador é o pedreiro (— Rant: Projetos, TESTES e Estimativa).

---

## Clean Code para agentes (re-ranqueamento)

O leitor mudou: era humano, agora é agente com janela finita, erros sistemáticos próprios e dificuldade com implícito (— Clean Code pra Agentes de IA).

| Aspecto | Clássico | + Agentes |
|---|---|---|
| Tamanho de arquivo | Importa | **CRÍTICO** (limite de contexto) |
| Comentários | "Código expressivo basta" | Necessários e estruturados (com proveniência) |
| Tipos | Opcional em dinâmicas | Praticamente mandatórios (alucina menos) |
| Testes | Validação | + executáveis pelo agente, sem setup manual |
| Nomes genéricos | OK em escopo local | Perigosos (ambiguidade) |
| Implicitismo | Às vezes ok | Sempre explícito |

**Padrões concretos:** funções/arquivos pequenos, SRP, nomes únicos no projeto inteiro, comentários explicando *por quê* e referenciando spec/issue, DRY, DI explícita (pra mockar), guard clauses (evitar aninhamento), erros com contexto suficiente pra debugar, formatter sempre, **não comentar o óbvio** (polui contexto).

**Anti-patterns que confundem o agente:** arquivos > 1000 linhas; `utils.js`/`helpers.js` com coisas não relacionadas; comentários outdated (pior que nenhum — o agente acredita); metaprogramação/monkey-patching/"mágica"; testes com setup manual; `Exception("error")` genérico; código duplicado com pequenas variações.

```
❌ # increment counter
✅ # Track failed login attempts for rate limiting (ref: SECURITY-123, max 5/15min)
```

**Linguagem importa:** LLMs não tratam todas igual. Rails/Python fluem; Crystal, Tauri, Flutter, Zig sofrem. Treinamento e popularidade impactam a qualidade direto (— Maratona de IA).

---

## RAG está morto — contexto longo + grep

Modelos de 1M tokens (Opus 4.7, Gemini 3.1 Pro) cabem documentos inteiros (— RAG Está Morto).

**Problemas do RAG tradicional:** falsos vizinhos; chunking arbitrário parte definição do uso; embeddings envelhecem mal; quando falha, zero transparência da causa raiz.

| Dimensão | Vector DB / RAG | Grep + contexto longo |
|---|---|---|
| Custo de indexação | Alto | Negligível |
| Qualidade | Chunking quebra contexto | Documento inteiro |
| Latência | Busca + embed + rede | Previsível |

**Padrão "lazy retrieval" em 3 camadas:** índice leve (≈150 char/linha) → memória intermediária (KB) → carregamento sob demanda do conteúdo completo. **Ferramentas:** grep, full-text em SQLite, indexação leve. **Evite** LangChain, LlamaIndex, vector DBs complexos.

**RAG ainda faz sentido** só para: corpora de bilhões de docs, latência crítica, ou quando rastreabilidade << velocidade.

---

## Memória de agentes — o problema do contexto

LLM não tem memória persistente: tudo que "lembra" são os tokens da janela (system prompt, histórico, outputs, respostas). Mesmo com 1M tokens há 3 problemas: performance cai perto do limite (info importante fica enterrada), custo dispara, latência aumenta (— Memória de Agentes Karpathy).

Por isso todo agente faz **compaction** (chama o LLM pra resumir e descarta o histórico bruto). O efeito colateral: **a info do início da sessão é eliminada primeiro** — um trade-off explorado no turno 5 vira um bullet no turno 50.

### Compaction comparado entre harnesses
| Aspecto | Claude Code | Codex | opencode |
|---|---|---|---|
| Buffer pré-compaction | 13K + 20K saída | por modelo | 20K |
| Tipos de compaction | 3 (micro, auto, session) | 1 | 1 (ancorado) |
| Preservação verbatim | Todas as mensagens do usuário | Não | Turnos recentes |
| Circuit breaker | Sim (3 falhas) | Não | Não |
| Hooks | PreCompact/PostCompact | pre_compact/post_compact | Sem hooks |
| Microcompact temporal | Sim (60min) | Não | Não |

Claude Code preserva a narrativa do usuário (9 seções, inclui lista verbatim de cada msg do usuário); Codex prioriza handoff entre modelos; opencode faz summarização incremental ancorada (— Memória de Agentes Karpathy).

### Estratégia em camadas (escolha pelo esforço que vale)
1. **Markdown manual em `./docs/`** — fallback sempre funcional. Custo: disciplina (lembrar de pedir "salva em `./docs/<topico>.md`").
2. **Padrão LLM Wiki (Karpathy)** — em vez de *recuperar* (RAG), *compilar* conhecimento ao longo do tempo, como código. 3 camadas (raw sources / wiki markdown / schema) + 3 operações (ingest / query / lint). Vantagem: **conhecimento compõe** — a pegadinha de timezone descoberta uma vez vira página; na segunda o agente lê, não re-descobre.
3. **Sistema automatizado (ai-memory)** via MCP — automatiza a wiki, consolidação em tiers, handoff entre agentes.

**Quando subir de nível:** sessões > 4-5h, projetos multi-sessão, múltiplos agentes na mesma codebase. **Custo invisível:** memória é texto, e texto precisa ser gerido — sem limpeza periódica (~5% da execução / `lint`), vira lixão (— LLM Wiki / Memória de Agentes Karpathy).

> Memória de agente é texto, fica em disco, indexa com SQLite, compila com LLM quando vale, esquece quando ninguém olha, sai do caminho. Troca de agente no meio do projeto → o próximo já sabe onde parou (— ai-memory).

### ai-memory (sistema do Akita)
Substituto open-source do agentmemory, que tinha bugs estruturais: reindex BM25 de ~5 min a cada restart, janela de perda de dados de 5s (debounce), hook lia `tool_output` mas Claude Code manda `tool_response` (~47% de tool calls perdidas), state store em path diferente por terminal no Windows (— Criei um Sistema de Memória).

**Arquitetura:** Rust em binário único; **markdown puro como source of truth** (Obsidian/grep/git); SQLite + FTS5 como índice derivado (WAL); writer único em thread via mpsc (sem janela de perda); isolamento por UUID (`<wiki_root>/<workspace_id>/<project_id>/`); embedding e LLM **opcionais** (funciona só com FTS5).

**Como funciona:** hooks fire-and-forget (POST pra `127.0.0.1:49374`, agente nunca espera; se cair, sessão segue) + MCP para consulta sob demanda. Tools: `memory_query`, `memory_explore` (verbosidade escalada por tempo de inatividade — <1h = uma linha, >30d = resumo completo), `memory_handoff_begin`, `memory_consolidate`, `memory_lint`, `memory_status`. Suporta Claude Code, Codex, opencode, Cursor, Gemini CLI, OMP/Pi.

**Bootstrap em projeto existente:** `ai-memory bootstrap` coleta git log + README + docs/ + `CLAUDE.md`/`AGENTS.md`, gera páginas-semente via LLM. Custa ~$0.05 com Haiku 4.5 (limite 50K input). Rode `--dry-run` antes.

**LLM de consolidação:** texto entra, texto sai — sem raciocínio complexo. Opus/GPT-5.5 thinking são overkill.
| Modelo | Custo/run | Latência | Veredicto |
|---|---|---|---|
| Claude Haiku 4.5 | ~$0.02 | 7s | **Default.** Melhor classificação e restrição, sem alucinação |
| GPT-5.4-mini | ~$0.005 | 4s | Mais barato/rápido; over-classifica em sessões triviais |
| qwen3:32b (Ollama) | $0 | 92s | Grátis local; latência invisível em background (~20GB RAM/VRAM) |
| DeepSeek V4 Flash | ~$0.005 | 22s | Funciona, sem vantagem |
| Kimi-K2.6 | n/a | trava | **Inelegível** — raciocínio consome budget antes de emitir |

(— Criei um Sistema de Memória ai-memory)

**Limites:** ainda beta. Documentação canônica curada por humano vai em `docs/` do projeto; ai-memory cobre a faixa intermediária (bugs estranhos, gotchas de ambiente, resumos de sessão). Web UI é read-only (LLM escreve, humano lê).

---

## Toolkit do Akita (acionável)

- **ai-jail** — sandbox para agentes (Linux: bubblewrap + Landlock; macOS: sandbox-exec). Use só ao mexer em áreas perigosas; filesystem fica read-only. Padrão preferido: `ai-jail claude --dangerously-allow-permissions` / `ai-jail codex --dangerously-bypass-approvals-and-sandbox` — remove fricção do agente com filesystem protegido. Não substitui VM para workloads hostis (— Dicas e Toolkit).
- **ai-memory** — contexto que sobrevive à troca de harness (acima).
- **ai-usagebar** — monitora uso de Claude/Codex/GLM/OpenRouter em Waybar ou TUI Rust. Saber quando fazer handoff de Claude → Codex ou recarregar crédito (— Dicas e Toolkit).
- **ghpending** — digest de issues/PRs sem ritual (60 req/h sem auth, 5000 com `GITHUB_TOKEN`). Claude/Codex fazem triage bem: revisar, compilar, testar, rebase, merge, fechar.
- **Backup real em camadas:** snapshots Btrfs (Snapper), restic pro NAS, offsite AWS Glacier, Git remoto, Bitwarden pra secrets.

---

## Ciclo de produção: software nunca está pronto

One-shot é mito. A spec perfeita exigiria saber de antemão tudo que vai dar errado — e se você soubesse, não precisaria da spec (— Software Nunca Está Pronto).

**Bugs que só existem em produção (exemplos reais):** Gmail corta email > 102KB; Steam API retorna datas em PT-BR e quebra o parser; usuários de macOS sobem `.dmg`/`.deb`/`.msi` cujos MIME types não estavam no seed; Windows usa UNC paths `\\?\` e o CI explode; macOS exige entitlements pra hardened runtime; TTS em "Auto" gera sotaque misturado. Nada disso cabe numa spec — "software bom é resultado de centenas de micro-decisões com o sistema rodando."

**Decisões que a IA não toma sozinha (falta contexto operacional):** trocar de modelo porque está fraco num domínio; benchmarkear antes de implementar; hardening de +163 linhas depois de mergear PR porque viu onde ia quebrar; pedir **circuit breaker** em vez de retry/backoff porque o cron triplica volume aos domingos (manada de retries é pior que resultado vazio).

> "O agente escreve o código. Eu decido qual código escrever. Essa decisão exige experiência que nenhum prompt substitui."

**Disciplina = freio e direção; IA = acelerador.** Aceleração sem direção é só entropia mais rápida. As técnicas de XP (TDD, small releases, pair programming, refactoring contínuo) são o que torna o output software de produção, não dívida técnica acumulada rápido. Feature nova vem com teste; bug fix vem com teste de regressão.

**Lições:**
1. Software em produção diverge da spec em **horas, não meses**.
2. Pós-produção não é "manutenção" — é desenvolvimento (features, refactoring de arquitetura, hardening).
3. TDD protege a evolução; testes verdes permitem mergear PRs de estranhos sem medo.
4. Small releases mantêm a sanidade — deu problema, reverte uma versão.
5. Comunidade aparece pra projetos reais (CI verde, docs, releases), não pra "funciona na minha máquina".
6. **O gargalo é a experiência do desenvolvedor, não a velocidade da IA.**

**Números reais (fev/2026, 1 pessoa + agente):** 4 projetos do zero à produção, 692 commits, 4.057 testes, ~500k linhas em 3 meses / 500+ horas. M.Akita Chronicles: ~200 user stories em 8 dias (vs 10-15 semanas em Scrum com 2-3 sêniores). Frank Sherlock: app Tauri Rust+React, 103 commits, 621 testes, 7 releases em 3 OS, em 7 dias (vs 3-4 semanas pra um sênior bom) (— Software Nunca Está Pronto; — Maratona de IA).

### Pro sênior de braços cruzados
A IA já está boa o suficiente. Quando ela erra, você pega nos testes e corrige em minutos; quando você erra sozinho, leva tempo pra cometer e mais pra achar. "Se você é sênior e ainda tá esperando a IA melhorar pra começar, o gargalo agora é você aprender a trabalhar com ela." Mas **o nível de empolgação com IA é inversamente proporcional ao conhecimento** — quem sabe pouco se impressiona demais; quem sabe muito acha útil com ressalvas (— ChatGPT Consegue te Substituir?).

---

## Experimentos descartáveis

Código ficou barato — prototipagem custa quase nada (— Maratona de IA; — Dicas e Toolkit).
- Crie `experiments/` antes de escolher biblioteca/arquitetura. Decisão de engenharia deixa de ser opinião e passa a ser teste (ex.: `decision-qwen-vs-deepseek.md` documentando custo/latência/qualidade).
- "Descartabilidade como feature": múltiplos experimentos > um projeto perfeito. Ranking natural emerge (uns viralizam, outros morrem); contribuições atraem contribuições.
- Prefixe experimentos (`Frank_`, `Exp_`) pra reduzir fricção mental e não nomear como eterno.
- **Anti-padrões:** perfeição paralisa (aprendizado zero); não medir = não saber o que funcionou (defina critérios antes); 24 projetos em 3 meses é disperso — 8-12 com profundidade gera insights mais acionáveis.
- Protótipo barato **não** é one-shot: prompts bons envolvem iteração (contexto → referência → restrição → leitura → correção de direção).

---

## Boas práticas de OSS com LLM — o mínimo

Gerar código é a parte fácil; o difícil é tudo depois do `git init`. Três pilares, em ordem (— Boas Práticas de OSS com LLM):

1. **Superfície de instalação** — instalação com mínimo atrito, idealmente um comando. Ofereça múltiplos caminhos (ai-jail: Homebrew, AUR `-bin`+source, cargo, mise, curl direto). Segredo: **compile uma vez por arquitetura, reempacote várias** (o binário é o artefato; RPM/DEB/AppImage/Docker são embalagens). Use nfpm pra RPM+DEB de um arquivo só; assine/notarize no macOS; Windows code signing é caro e dispensável pra projeto pessoal.
2. **Testes e CI** — rede de segurança pra aceitar PR de estranho sem medo. Rust: `cargo fmt --check`, `clippy -D warnings`, `test`, `audit`. Rails: `rubocop`, `brakeman`, `bundler-audit`, Minitest. Release dispara por tag (`v*.*.*`); pipeline extrai seção do `CHANGELOG.md` (Keep a Changelog) e gera checksums SHA256. Use cache de build (`Swatinem/rust-cache`).
3. **Documentação** — README conciso + `docs/` detalhada. Sem os três, o projeto é "arquivo morto público".

**Revisão de PR com LLM** (decisão de merge continua humana):
> "audita o código a fundo pra ver se faz sentido, garante que não tem regressão nem queda na qualidade"
> "procura código morto, duplicação, valores mágicos hardcoded"

**Refatoração: peça explícito, várias vezes.** O agente não presume seu estilo. Estabeleça desde o início ("Use as melhores práticas de Rust. Evite duplicação. Modularize só onde fizer sentido. Adicione unit tests pra toda feature nova"). Após features grandes, interrompa e peça reavaliação. Antes de release, **auditoria de segurança**: vazamento de secrets, permissões perigosas, command injection, path traversal, unwraps desnecessários.

**Deploy automatizado ou você para de manter.** Não precisa de Kubernetes/Kamal — um `bin/deploy` (build Docker → push pro registry → `compose pull/down/up` via ssh) num home server simples basta. Quanto mais automatizado, melhor pra dezenas de projetos.

> A lição: **ninguém liga pra sua stack.** "Memória de longo prazo compartilhada entre Claude Code e Cursor" vence "Servidor MCP em Rust com FTS5". Se não consegue dizer que problema resolve numa frase, está construindo solução em busca de problema.

---

## Arquitetura emergente

- **A falácia do Lego:** dá pra planejar a arquitetura completa antes de codar. Resultado: engenharia em excesso no começo, abstrações cristalizadas que não batem com necessidade real. "Quanto mais cedo você cristaliza uma estrutura, mais cedo ela vira camisa de força." Software bom é escultura de barro: maleável, sempre úmida (— ai-memory arquitetura emergente).
- **Ordem (Kent Beck): make it work → make it right → make it fast.** Inexperientes tentam "right" e "fast" antes de "work", inventando regras sem código que as justifique. **KISS não é escrever pouco código — é não resolver problema inexistente.**
- **Consolide só depois que roda em produção.** O `ScopeResolver` de 601 linhas do ai-memory foi *extraído* de código já funcionando em dezenas de máquinas/3 SOs, não inventado antecipando multi-usuário. "A abstração veio depois do uso, não antes."
- Prova: ai-memory em 24 dias — 482 commits, 26 contribuidores, sem nenhum diagrama do dia 1, e funcionou exatamente por isso. Contribuidores construíram multi-usuário, multiplataforma, multi-provider — nada disso estava num "plano original", porque não havia plano.

---

## Gestão de projeto (fundamentos que valem com ou sem IA)

- **Lei de Parkinson:** o projeto ocupa todo o tempo dado. Delimitar teto de custo e tempo é a coisa mais importante (— Projetos: Aprendendo a Priorizar).
- **Não mude a data; mude escopo/equipe/arquitetura.** Milestones concretos e mensuráveis (definition of done). "Como um projeto atrasa um ano? Um dia de cada vez" (Brooks) (— The MM-M).
- **Sprints curtos:** semanal ideal, quinzenal máximo. Sprint de 3 semanas é sintoma de reuniões demais / backlog mal definido / falta de decisão — e esconde problemas graves. Erro em sprint longo gera cascata de 6+ semanas antes de ser percebido (— Discutindo Gestão; — Projetos: Aprendendo a Priorizar; — Guia DEFINITIVO de Organizações).
- **Estimativa ≠ previsão.** "Você finge que fala a verdade e eu finjo que acredito." É pacto de boa fé sobre ordem de grandeza, não promessa precisa. Use escala assimétrica (P/M/G, 1/2/5/8) — uma story de 8 já quebra o cronograma; as de 1-2 são irrelevantes diante dela. Stories devem ter tamanhos similares (menor = meio dia, maior ≤ 2-3 dias; acima disso é épico a dividir) (— Discutindo Gestão; — Projetos: Aprendendo a Priorizar).
- **Planeje só o que dá pra prever**, execute em ciclos curtos, meça, ajuste a hipótese, repita. Planejar todos os detalhes antes é o maior desperdício (— Rant: Aprendizado na Beira do Caos).
- **Ritmo sustentável > horas extras.** "Go Horse" tem pico inicial seguido de bugs, conserto, produtividade zero/negativa e burnout (— 10 Mitos sobre Tech Startups).
- **Diagnóstico por eliminação:** liste sintomas, elimine hipóteses por probabilidade. Falar em voz alta com alguém (ou no papel) organiza as hipóteses (— Refletindo sobre RESOLUÇÃO de Problemas).
- **Comunicação é diálogo, não transmissão.** Ordem sem abertura a retorno é transmitir info, não comunicar. Chat (Slack) não é pra uso contínuo; info não urgente vai por e-mail (— Discutindo Gestão).

---

## DevOps com agente (declarativo)

Padrão que generaliza: **descrever estado final desejado → agente gera IaC/scripts → iterar**. Funciona pra qualquer DevOps com componentes heterogêneos. O ganho real não é só automação — força documentação explícita, reprodutibilidade e elimina rituais repetidos a cada upgrade de máquina (— Distrobox de Emulação; — Migrando Home Server).

| Aspecto | Agente | Manual |
|---|---|---|
| Setup inicial | Dias → horas | Dias |
| Reprodutibilidade | Alta | Baixa |
| Debugging | Requer prompts bons | Direto |
| Customização edge-cases | Iterativo | Rápido |

**Limite:** excelente pra infra declarativa (Dockerfile, scripts); ainda requer humano pra troubleshooting tático. **O Claude não sabe o que você não disser:** que `:Z` quebra SQLite, que Fulcrum não aceita env vars, que Plex guarda paths absolutos no banco. Na migração do home server, dar 7 instruções específicas na primeira mensagem teria evitado 80% dos problemas. **Para produção real:** review rigoroso de cada compose/comando, backups testados antes. "Claude é bom pra gerar primeira versão e diagnosticar erros, mas decisões de arquitetura e validações de segurança são suas" (— Migrando Home Server).

---

## Apêndice: quem se beneficia da IA

A IA substitui quem não sabe fazer as perguntas certas nem validar resultados — esse perfil sempre foi substituível; agora o substituto é mais barato. O bom profissional vira **mais produtivo** (— Como falar com o Claude Code; — ChatGPT Consegue te Substituir?).

- A IA dá a solução mais simples e **não pergunta** sobre contexto, escala ou restrições — um sênior pergunta antes de codar (volume de usuários, tamanho de arquivos, onde gravar, barra de progresso).
- **Responde com convicção mesmo errada**, sem sinalizar incerteza — sem conhecimento de domínio é impossível distinguir certo de errado. Nunca use output em contexto crítico sem validação (exemplo: ChatGPT respondeu "neovascularização coroidal" com confiança, mas o correto era "retinopatia serosa central").
- Bom pra acelerar boilerplate, testes simples, código trivial — sempre lendo o que foi gerado pelo risco de alucinação.

> A ferramenta muda, a engenharia não. LLM aumenta a alavanca: com bons hábitos, produz mais; sem eles, só bagunça mais rápida (— Dicas e Toolkit).

---

*Compilado por Claude (Anthropic) a partir de nuggets de vídeos do canal @Akitando e posts de akitaonrails.com (jan/2026–jun/2026). Funde e dedup o legado `03-agentes-ia-q2-2026.md` com os deltas de blog mais recentes.*
