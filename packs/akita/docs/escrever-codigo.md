# Escrever Código — Guia Acionável (Akita)

> Como decidir igual a um sênior na hora de escrever, refatorar e testar código. Funde falas do canal @Akitando, posts do AkitaOnRails e dados de 10 projetos reais com IA. Tudo aqui é rastreável a uma fonte; nada é inventado.

---

## Regras de ouro (leia primeiro)

- **Faça funcionar primeiro, depois refatore.** A sequência é: coisa mais simples que funciona → identificar padrões/repetição → refatorar. Vale de assembly a alto nível. (— O Guia +Hardcore de Introdução à COMPUTAÇÃO)
- **Código que roda mas é sujo é lixo.** Não basta funcionar: código com nomes ruins e alta complexidade tem mantenabilidade baixa e atrapalha mais do que ajuda quando você for estender/consertar/reusar. O mínimo é deixá-lo limpo o suficiente pra outro programador trabalhar nele. (— Recomendação de Livros - Introdução a Design Emergente)
- **Legibilidade antes de otimização prematura.** Otimize só depois de medir e confirmar que o ganho justifica perder manutenibilidade. (— O Guia +Hardcore de Introdução à COMPUTAÇÃO)
- **Refatorar NÃO é reescrever.** Refatorar = mudar a estrutura interna SEM alterar o comportamento externo, de forma disciplinada, minimizando bugs. Jogar fora e refazer com comportamento diferente é reescrita, não refatoração (def. de Martin Fowler, *Refactoring* 1999). (— Recomendação de Livros - Introdução a Design Emergente)
- **Humano decide O QUE e POR QUE; IA decide O COMO.** Inverter piora dramaticamente o resultado. (— legado q1-2026)
- **Software pronto é software morto.** Em produção o código diverge da spec em horas, não meses; planejar pra "pronto" é planejar pra fracasso. (— legado q1-2026)
- **O público do código mudou: agora é o agente de IA.** Em 2026 o leitor primário não é mais o humano que mantém amanhã, é o agente que lê, edita e estende. As "opiniões" do Clean Code viraram restrições técnicas mensuráveis. (— Clean Code pra Agentes de IA)

---

## Qualidade é trade-off, não um eixo só

Qualidade não é "fazer o que foi pedido". Inclui performance, escalabilidade, segurança, mantenabilidade, flexibilidade, portabilidade, reusabilidade, legibilidade, testabilidade. **Não dá pra ter 100% em todos ao mesmo tempo** — não existe almoço grátis; otimizar um eixo costuma piorar outro (ex: mais seguro → menos flexível). E os requisitos mudam no tempo: o que hoje precisa ser eficiente amanhã precisa ser seguro. Por isso nenhum código está "pronto e congelado". O trabalho é achar o ponto ótimo de custo-benefício — e isso exige experiência em projetos reais. (— Entendendo Conceitos Básicos de CRIPTOGRAFIA Parte 1/2; Recomendação de Livros - Introdução a Design Emergente)

---

## Clean Code re-ranqueado para agentes

Por que isto importa quando uma IA escreve/lê o código: CLIs de agente truncam leitura (Claude Code lê ~2000 linhas por vez), a atenção degrada antes do limite de tokens, grep é mais barato que read, cada tool call custa token e latência. (— Clean Code pra Agentes de IA)

| Prática | Regra concreta | Por que (para o agente) |
|---|---|---|
| Funções pequenas | 4–20 linhas | Cabe numa tool call sem truncamento → raciocínio com atenção completa |
| Arquivos pequenos | < 500 linhas (ideal 200–300) | Cabe numa única leitura |
| SRP | 1 coisa por módulo, 1 razão pra mudar | Agente isola a unidade, testa e edita sem medo de efeito colateral; grep previsível |
| Nomes pesquisáveis | Específicos/únicos; se grep retorna muito lixo, o nome é ruim. Prefira nomes com <5 hits | `data`/`process`/`handler` = ruído; `UserRegistrationValidator` = só o necessário |
| Tipos explícitos | Sem `any`, sem função sem tipo (use TS/RBS/type hints) | A assinatura é gabarito: entrada, saída, estados válidos. Sem tipos o agente infere e erra |
| DRY | Extrair lógica duplicada | A janela de atenção do agente não "alerta" sobre cópias em outros arquivos; ele atualiza uma e esquece as outras |
| Aninhamento raso | Guard clauses, early returns, máx ~2 níveis | Cada nível de indentação custa atenção do modelo |
| Erro com contexto | Inclua valor ofensor + forma esperada | `ValueError("invalid input")` não ajuda; `f"received {repr(x)}, expected ..."` ajuda no debug |
| Formatação | Use o formatador default/mais popular (`gofmt`, `prettier`, `black`/`ruff`, `rubocop -A`, `cargo fmt`) | Estilo consistente reduz custo cognitivo de grep visual |
| Estrutura previsível | Siga convenção de framework (Rails/Django/Next/Laravel) | Agente antecipa paths sem listar diretório |
| Dependency Injection | Injete deps via construtor/parâmetro | Agente troca real por fake sem tocar na lógica |

**Inversão importante sobre comentários:** Uncle Bob dizia "código bom se explica sozinho". Para agentes, **comentários ajudam** — mas só os de *por quê*: qual bug de produção motivou a lógica estranha, qual constraint de negócio força a ordem, qual workaround existe por bug de lib upstream, qual issue/commit é referência. Comentário que descreve o óbvio (`// increment i` acima de `i++`) desperdiça token. (— Clean Code pra Agentes de IA)

**Nenhum LLM escreve assim por default** — você precisa escrever essas regras em `CLAUDE.md` / `AGENTS.md` / `.cursor/rules` / `.github/copilot-instructions.md`. (— Clean Code pra Agentes de IA)

> "Código limpo nunca foi moda. Virou infraestrutura." Práticas que caíram em desuso nos anos 2010 (XP, TDD, SOLID, SRP, DI, código pequeno, testes abundantes) viraram exatamente o diferencial técnico de trabalhar com agentes. (— Clean Code pra Agentes de IA)

---

## Testes

- **Testes são compaixão com você do futuro, não formalidade pro time.** Código sem teste vira incompreensível até pro próprio autor — Akita olhou seu código de 2001 e nem ele entendia mais. (— Sua Linguagem É Especial? Parte 2 em 2001)
- **Com IA, testes importam MAIS, não menos.** Sem teste, cada mudança da IA é uma aposta; com teste forte o agente vira multiplicador. Em 274 commits, o CI pegou 50+ bugs reais que iriam pra produção. (— legado q1-2026; Clean Code pra Agentes de IA)
- **Mais linhas de teste que de código.** Nos projetos do Akita o ratio teste/código ficou em ~1.5x.
- **Mockar tudo = 100% coverage e zero confiança.** Teste com dados reais é a verdade. (— legado q1-2026)
- **Teste tem que rodar sem setup humano** (F.I.R.S.T: fast, independent, repeatable, self-validating, timely): comando no README/CLAUDE.md, output previsível, sem seed manual de banco nem credencial secreta. (— Clean Code pra Agentes de IA)

| Nível | O que prova | Tempo | Custo |
|---|---|---|---|
| Unitários | Peças funcionam isoladas | ~7s | $0 |
| CI pipeline | Código está saudável | ~22s | $0 |
| Integração | Sistema funciona | ~3min | ~$0.40 |
| E2E | Usuário consegue fazer o que precisa | — | — |

> CI != Integração. CI roda em todo commit; integração roda antes de deploy. Os dois são necessários. (— legado q1-2026)

**Bugs que SÓ dados reais pegaram** (mocks nunca revelam): títulos em japonês quebrando slugify; RSS virando Atom e o parser mockado não pegou; rate limit (HTTP 429) ausente nos mocks; CDN devolvendo 200 com HTML de erro em vez de imagem. (— legado q1-2026)

---

## Performance e dados

- **Nunca carregue dados externos sem checar o tamanho antes.** Arquivo pequeno (poucos KB) lê inteiro; arquivo grande lê como stream em pedaços. Query SEMPRE com `WHERE` adequado e `LIMIT`. **Nunca `SELECT *`.** É o clássico "na minha máquina funciona": testou com 10 linhas, em produção o heap incha e não volta. (— Gerenciamento de Memória Parte 2)
- **Teste com volume real.** Complexidade ruim (quadrática/exponencial) é imperceptível com 10–1000 itens; só aparece a partir de dezenas de milhares. Quem não entende complexidade culpa a linguagem/framework. (— O que vem DEPOIS do Hello World)
- **Escolha o algoritmo pelo pior caso, não pela média.** Quick sort é O(n log n) na média mas O(n²) no pior (lista já ordenada); por isso Python usa TimSort, com pior caso estável. Se o pior caso derruba o sistema, prefira algo um pouco mais lento na média. (— O que vem DEPOIS do Hello World)
- **Boa parte da programação é retrabalhar dados pra facilitar a computação.** A representação dos dados muda a complexidade do código: data em `DD/MM/AAAA` quebra um sort simples; `AAAA/MM/DD` (formato japonês) ordena certo. Antes de escrever algoritmo complexo, veja se outra representação não resolve. (— O Guia +Hardcore de Introdução à COMPUTAÇÃO)
- **Inicialize arrays com o tamanho esperado** quando souber a contagem — evita ciclos de alocar/copiar/liberar do crescimento dinâmico. Tamanho imprevisível → considere lista ligada. (— O que vem DEPOIS do Hello World)
- **Para caçar gargalo: zere e reintroduza linha a linha.** Troque a implementação por uma constante mínima (sem banco/processamento), confirme performance máxima, e devolva o código real medindo após cada linha. Foi assim que Akita achou que gerar URL com `.url` (em vez de `.path`) degradava o Crystal/Lucky na Rinha. (— 16 Linguagens em 16 Dias: Rinha de Backend)
- **Validar na aplicação é mais rápido que deixar o banco devolver erro** — cada roundtrip custa. Na Rinha, trocar libs pesadas de validação de data por checagens nativas e devolver só o código HTTP (sem JSON de erro) melhorou sob carga. (— 16 Linguagens em 16 Dias)
- **Comprima assets e respostas.** Minificação remove espaços, encurta nomes de variáveis e une arquivos → menos bytes e menos requisições HTTP (crítico em mobile/conexão lenta). No servidor, sirva texto (HTML/CSS/JS/JSON) com **GZIP** (Deflate = LZ77 + Huffman) — toda linguagem tem biblioteca, é trivial e o ganho é grande. (— A História do Front-End para Iniciantes; De 5 Tera a 25 Giga - Compressão de Dados)

---

## Memória e baixo nível (C / assembly)

- **Chame `free()` após `malloc()` em processos de longa duração** (servidores, navegadores). Programa curto não precisa — o SO libera tudo ao terminar. Em processo longo, vazamento esgota o heap e o **OOM Killer** mata o processo. (— O que vem DEPOIS do Hello World)
- **Inicialize ponteiros alocados com NULL** (ou use `calloc()`, que zera). `malloc()` devolve lixo de uso anterior; `left`/`right`/`next` não inicializados apontam pra endereços aleatórios. (— Árvores: O Começo de TUDO)
- **Nunca use float pra dinheiro.** Float acumula erro de precisão (base 2) e em alto volume vira discrepância real. Use centavos em inteiro (×100 nas contas, ÷ no fim) ou BigDecimal. JS só tem float binary64 (max safe int = 2^53) e não tem BigDecimal nativo — importe lib. (— Hello World Como Você Nunca Viu! - Entendendo C)
- **Bits ÷ 8 = bytes.** 32 bits = 4 bytes; 64 bits = 8 bytes. Memória muscular de 32 bits induz erro mesmo quem sabe. (— O que vem DEPOIS do Hello World)
- **Evite números mágicos hardcoded, mesmo em baixo nível.** Endereço fixo quebra quando você insere instrução antes; use labels/constantes e deixe o assembler/compilador calcular. (— O Guia +Hardcore de Introdução à COMPUTAÇÃO)
- **Bitfields:** empacote flags num único byte com OR (`|`) pra combinar e AND (`&`) com máscara pra extrair — comum em protocolos de rede e drivers. (— O Guia +Hardcore de Introdução à COMPUTAÇÃO)

---

## Ferramentas, deps e containers

- **Gerenciador de dependências é obrigatório — nunca baixe lib manualmente pro repo.** Declare no arquivo padrão e use o gerenciador: Bundler/Gemfile, npm/package.json, Maven·Gradle/pom·build.gradle, pip/requirements.txt, go mod/go.mod, Cargo/Cargo.toml, Composer/composer.json. (— Subindo Aplicações Web em Produção - Heroku)
- **Commite o lockfile** (`package-lock.json`, `Gemfile.lock`, `composer.lock`...) e nunca o edite à mão. Sem ele, máquinas diferentes instalam versões diferentes (1.0.0 ≠ 1.0.2) e introduzem bug silencioso. (— Subindo Aplicações Web em Produção - Heroku)
- **Dockerfile — 3 regras:** (1) concatene comandos num único `RUN` (cada `RUN` é um layer; `apt install` + `rm -rf` separados gravam o tamanho antes da limpeza); (2) ponha o que muda raramente no início (deps) e o código no fim, pra aproveitar cache; (3) use `.dockerignore` pra não copiar `node_modules` do host (você roda `npm install` dentro). (— Entendendo Funcionamento de Containers)
- **Documente cada microserviço** com README (como rodar/testar local), Dockerfile (container local) e scripts de build/`Makefile`. Facilita onboarding. (— Examinando o Vazamento do Twitch)
- **Indexe volumes enormes de arquivos com SQLite + script.** Ferramenta gráfica não aguenta milhões de arquivos: use `find` pra indexar (caminho, extensão, tamanho) em SQLite e responda com SQL em milissegundos. (Akita: 3.5M arquivos, ~30h pra indexar, SQLite de ~2GB.) (— Examinando o Vazamento do Twitch)
- **Inspecione binários** com `xxd` (bytes em hex), `objdump` (bytes → mnemônicos assembly) e `file` (tipo pelo cabeçalho) pra entender o que o sistema realmente processa. (— Qual a REAL diferença entre Arquivos Binário e Texto?)
- **Imagens:** PNG pra bordas nítidas/texto/pixel art (JPEG cria "quadradinhos" por DCT em blocos 8×8); JPEG só pra fotos/gradientes e **nunca reedite** JPEG (lossy reaplicado degrada acumulado — edite em lossless e exporte JPEG só no final). (— De 5 Tera a 25 Giga - Compressão de Dados)
- **Editor:** NeoVim+LunarVim entrega LSP/autocomplete/refactor/fuzzy finder com <150MB RAM (vs 250–300MB do VS Code); aprender atalhos de Tmux/Vim reduz o mouse, previne tendinite e funciona igual via SSH. Mas **não crie macros/remaps de teclado** se você usa vários teclados em ambientes diferentes — memória muscular não transfere. (— O Melhor Setup Dev com Arch e WSL2; O Guia DEFINITIVO de UBUNTU para Devs Iniciantes; Teclados Mecânicos Exóticos Parte 2)

---

## APIs REST

- **Criou recurso? Retorne `201 Created` + header `Location`** com a URL completa do recurso, pra o cliente acessar direto sem nova consulta. (— Setting up Docker Compose and Postgres for Stress Testing - Rinha Final)

---

## Segurança (hábito a cada commit, não fase no fim)

- **Nunca passe input do usuário direto pra `exec`/shell.** Sanitize antes: regex que aceita só o esperado (ex: `/[^a-zA-Z0-9]/g` → ''). (— Burlando Proxies e Firewalls - SSH)
- **Nunca concatene input em SQL** — use bindings/parâmetros do ORM; `orderBy`/`sort` com whitelist de campos. (— legado q1-2026)
- **Upload:** valide MIME no servidor (não confie na extensão), guarde fora do diretório público, renomeie com UUID/hash. **Redirect:** nunca pra URL vinda do input; whitelist de rotas internas. **Models:** defina explicitamente o que pode ser setado em massa; campos sensíveis nunca no JSON. **Jobs:** payload só com IDs, jobs idempotentes, timeout. (— legado q1-2026)
- Scanner de segurança no CI pega automaticamente SQL injection, path traversal, redirect aberto, XSS, mass assignment, CSRF — e corrige no mesmo commit que flaggou. (— legado q1-2026)

---

## Trabalhando com IA pra escrever código

- **Copilot = automação do copy-paste de Stack Overflow** que você já fazia. Bom pra repetitivo/previsível (autocomplete de sintaxe, HTML/CSS básico, testes unitários); não é substituto de raciocínio. (— What can AIs do? - Examples of Tools)
- **Nunca cole código de IA ou Stack Overflow sem adaptar ao contexto.** Código gerado é genérico/simplificado: o ChatGPT assumiu crop 200×200 (inútil pra fotógrafo em 8K) e omitiu o Producer Factory necessário pro Kafka. (— ChatGPT Consegue te Substituir? - Jobs Assíncronos)
- **O processo é a variável, não a IA.** Mesmo dev + mesma IA: sem disciplina → arquivo de 5.000 linhas e 6 cirurgias de emergência; com XP/TDD/CI a cada commit → zero paradas, 1.323 testes. (— legado q1-2026)

| A IA faz BEM | A IA faz MAL |
|---|---|
| Boilerplate/scaffolding | Decisões de arquitetura (over-engineer) |
| Testes (boa em edge cases) | Conhecimento de domínio (só se aprende falhando) |
| Refactoring mecânico (renomear, extrair) | Segurança proativa (implementa o que você pede) |
| Pesquisa contextual | Priorização (faz tudo com igual entusiasmo) |
| Consistência com os padrões do projeto | Nunca diz "não" — implementa até o over-engineered |

(— legado q1-2026)

**Exemplo de freio humano:** IA propôs state machine de email com 8 estados + retry queues + dead letter; Akita cortou pra 4 estados (`pending`, `sending`, `sent`, `unknown`) → 40 linhas resolveram tudo. (— legado q1-2026)

---

## Commits e refatoração contínua

- **Cada commit faz UMA coisa e é production-ready.** Nenhum commit em `main` quebra o build. Prefixos: `Add`/`Fix`/`Refactor`/`Harden`/`Security`/`Test`/`Docs`/`Infra`. Nunca `wip`, `update`, `ajustes`. (— legado q1-2026)
- **Refatore a cada 3–5 features.** Sinais de refatorar JÁ: arquivo > 200 linhas, lógica duplicada em 2+ lugares, service fazendo mais de uma coisa, componente com 3+ responsabilidades. (— legado q1-2026)
- **Nunca refatore e adicione feature no mesmo commit.** Padrão: testes verdes → refatorar → testes verdes. (— legado q1-2026)
- **Distribuição saudável de commits:** ~37% features, 63% "o resto" (bugs, testes, infra, refactoring, docs). Se >50% são features, você está negligenciando o resto. (— legado q1-2026)
- **Prototipagem descartável:** programar é jogar fora a maior parte do que se digita. Comece com protótipo que vai descartar; a coragem de refazer do zero diferencia bons programadores. (— Rant: Aprendizado na Beira do Caos)
- **Ler código sem o `git log` leva a conclusão errada.** Um trecho suspeito pode ser de outra equipe com propósito diferente (o "author is Elon" do Twitter era só código de log/métrica, sem efeito no ranking). (— Desbloqueando o "Algoritmo" do Twitter - Grafos)

---

## Quando abandonar uma abordagem

Sinais de que está num beco sem saída: você "conserta o fix que consertou outro fix"; mexer numa peça quebra outra; cada threshold ajustado cria novo edge case; o código é um castelo de cartas. (— legado q1-2026)

A pergunta do dia 1: **"já existe modelo pré-treinado / solução pronta pra isso?"** No Frank Yomik, 551 linhas de detector OpenCV (7 filtros, 20+ magic numbers) viraram ~50 linhas com um modelo do HuggingFace; rebuild em 1 dia. Lições: pesquisar antes de implementar; vibe coding torna o fracasso barato mas não o previne; prompting não substitui pensar; mate seus xodós cedo. (— legado q1-2026)

---

## Faça / Não faça

**Faça**
- Faça a menor coisa que funciona, depois refatore.
- Escreva testes — pelo seu eu do futuro — e teste com dados reais e volume real.
- Use lockfile, gerenciador de deps e formatador default.
- Escreva as regras de estilo num `CLAUDE.md`/`AGENTS.md` pra o agente seguir.
- Pesquise solução pronta antes de implementar do zero.
- Conserte primeiro o ponto de dor real do usuário, não reescreva tudo. No projeto ASP legado, Akita consertou um botão de relatório específico em 1 semana — a consultoria anterior não conseguiu em 1 mês. (— O que eu devo estudar? Vou conseguir emprego?)

**Não faça**
- Não use `SELECT *`, float pra dinheiro, ou `malloc` sem `free`/NULL em processo longo.
- Não cole código de IA/SO sem adaptar; não deixe valor hardcoded após copy-paste (Akita copiou bloco de init pra `createPerson` e esqueceu de trocar os args → função ignorava os parâmetros). (— O que vem DEPOIS do Hello World)
- Não otimize antes de medir; não deixe segurança/refactoring "pro fim".
- Não mande crítica de código por e-mail pra empresa toda na primeira semana: na PSN, Akita fez isso e todos o odiaram no início — a equipe já estava refatorando de qualquer forma. Falta contexto e cria inimigos. (— Meu Começo de Carreira Durante a Bolha)
- Não crie reuso/gambiarra em plataforma que não suporta o conceito sem documentar o custo: o objeto de menu reutilizável no Director (CD do Fiat Marea) gerou casos não documentados e custou várias noites de bug. E mídia física não tem patch — CD prensado torna o QA pré-entrega dramaticamente mais crítico que software atualizável. (— Meu Começo de Carreira Durante a Bolha)

---

## Aprendizado de fundo (por que isso vale)

- **Construir seu próprio mini-framework ensina os limites da tecnologia.** Implementar do zero Page Controller, sessão, validators e upload numa plataforma não feita pra isso mapeia os limites da linguagem e revela por que frameworks fazem as escolhas que fazem. Akita fez isso em VBScript (ASP) em 2001, empacotando o framework separado da aplicação via Windows Script Components (COM). (— Sua Linguagem É Especial? Partes 1 e 2 em 2001)
- **Emular hardware é só estrutura de dados:** um emulador de CPU é registradores (PC, SP, A, X, Y, flags) + array de bytes pra memória, com uma tabela de 256 funções indexadas por opcode; mappers usam **interface comum** (polimorfismo) pra adicionar variações sem mexer no resto (407 mappers de NES); cheats (Game Genie) = um dicionário endereço→{condição, valor falso} checado no ponto central de leitura de memória; e timing precisa contar ciclos por instrução (6502 a 1–3 MHz vs CPU moderna a GHz). Engenharia reversa de binário se faz com desassembler + tracing, adicionando labels progressivamente. (— Aprendendo sobre Computadores com Super Mario; O Guia +Hardcore de Introdução à COMPUTAÇÃO)
- **Código copy-paste tem "cheiro" que qualquer sênior identifica:** estilo muda abruptamente, tamanho de métodos e organização ficam inconsistentes. Reduzir o código ao mínimo necessário (legível E eficiente) é o que se aprende com o tempo. (— Respondendo suas Perguntas sobre Carreira)
- **Disciplina de código limpo sustenta base legada grande:** o código Scala do Twitter (10+ anos) surpreendeu — métodos curtos, baixa complexidade ciclomática, nomes claros, config em arquivos separados. Tenha um guia interno de boas práticas pra alinhar o time (Akita achou um no vazamento do Twitch). (— Desbloqueando o "Algoritmo" do Twitter; Examinando o Vazamento do Twitch)

---

*Fontes: canal @Akitando (YouTube), AkitaOnRails.com (~15 posts 2024-2026, incl. "Clean Code pra Agentes de IA"), blog.cloudflare.com (vinext). Todos os dados são de projetos reais.*
