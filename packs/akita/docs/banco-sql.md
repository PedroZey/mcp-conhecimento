# Banco de Dados e SQL — Guia Acionável (Fabio Akita / @Akitando)

Decisões de banco e SQL para agir como senior: escolha de banco, modelagem, índices, queries, escala, NoSQL e operação. Regras no topo; o "por quê" entra só quando afia a decisão.

---

## Regras de ouro (decida por estas primeiro)

- **Na dúvida, Postgres.** Nunca MongoDB como banco primário, nunca Redis como banco. (— O Guia DEFINITIVO de UBUNTU para Devs Iniciantes; Como fazer o Ingresso.com escalar?)
- **NoSQL exige justificativa em números reais, nunca por chute.** Use porque o modelo de dados exige, não porque "vai escalar mais". (— Tornando sua App Web Mais Rápida!; Como fazer o Ingresso.com escalar?)
- **"Bancos relacionais não escalam" é falso** para a esmagadora maioria. Postgres + réplicas de leitura + cache resolve. NoSQL exótico só em escala Netflix. (— Tornando sua App Web Mais Rápida!)
- **Aprenda SQL e o modelo relacional de verdade.** ORM (Hibernate, SQLAlchemy, ActiveRecord, Eloquent) NÃO gera query eficiente sozinho; SQL ruim degrada performance em ordens de grandeza. (— Devo usar NOSQL?; Tornando sua App Web Mais Rápida!)
- **Toda otimização pós-produção é guiada por métrica.** Meça antes/depois, ataque só o maior ofensor (APM tipo New Relic costuma apontar tabela grande sem índice). Sem medir, não conserta. (— Discutindo sobre Banco de Dados; Como fazer o Ingresso.com escalar?)
- **Iniciante não configura banco manualmente.** Tutorial é trivial; durabilidade e zero perda exigem dezenas de configs por caso de uso — não há config universal. (— Devo usar NOSQL?)
- **Banco gerenciado em cloud compensa** salvo se você tiver TB/dia críticos e múltiplas apps grandes. Sysadmin dedicado custa 5–10× o gerenciado/mês; só vale com ~10+ apps equivalentes. (— Devo usar NOSQL?)

### Stack default (resolve ~90% dos casos)
Postgres (ou MySQL/InnoDB / MariaDB) como fonte de verdade + Redis/Memcached como cache + fila assíncrona (RabbitMQ, Redis Pub/Sub, Kafka ou SQS) para absorver picos de escrita + Elasticsearch só quando full text search passar a sobrecarregar o banco. Frameworks (Rails, Django, Laravel, Spring Boot) já assumem essa combinação. Postgres tem JSONB nativo — não traga Mongo só por documento JSON. (— Discutindo sobre Banco de Dados; Devo usar NOSQL?)

---

## Escolha de banco por caso de uso

| Banco | Perfil | Use quando | Não use quando |
|---|---|---|---|
| **Postgres / MySQL / Oracle / SQL Server** | Leitura rápida, escrita mais lenta (ACID), insubstituível em relatório/auditoria/consulta ad-hoc | Default sempre; dados transacionais, fiscais, financeiros, e-commerce | — |
| **Redis** | Cache em memória + grava em disco (reaquece sozinho) | Cache, fila, sessão; resultados caros de calcular (agregações, contadores, médias) | Como banco principal |
| **Memcached** | Cache puro em RAM, aceita ordens de grandeza mais conexões, perde tudo ao reiniciar | Cache puro de altíssima concorrência | Quando precisa sobreviver a restart |
| **MongoDB** | Document store (key-value com value=JSON); leitura rápida, escrita lenta; durabilidade NÃO garantida por padrão | Dados cuja perda pouco importa: analytics, logs | Dado que não pode perder; default |
| **Cassandra** | Key-value multidimensional (column families), consistência eventual, muita escrita distribuída | Cluster multi-nó/multi-região, alto volume de escrita | Instância única / substituto de SQL |
| **DynamoDB** | Key-value gerenciado; eficiência depende da partition key | Acesso rápido por chave bem modelada | Quando o padrão de acesso não está claro no início |
| **Time Series DB** | Séries temporais contínuas | Ex: Fitbit/batimento contínuo — mas o agregado ainda vai pro SQL | Como banco geral |
| **SQLite** | <1 MB de RAM, sem servidor; B-tree para dados e índices; até ~280 TB teóricos | Dispositivo local: mobile, IoT, roteador, Smart TV, wearable | Servidor com múltiplos clientes concorrentes |
| **Elasticsearch** | NoSQL especializado em busca textual | Full text com relevância em alto volume | Como banco transacional / no dia 1 |

(— Devo usar NOSQL?; Tornando sua App Web Mais Rápida!; Discutindo sobre Banco de Dados; Examinando o Vazamento do Twitch)

> Não existe NoSQL que resolve tudo: Cassandra escreve rápido/lê devagar, Mongo lê rápido/escreve devagar, Postgres prioriza não perder dado. Sistemas grandes combinam vários — o Twitch usa Postgres (estruturado) + DynamoDB (acesso rápido) + Redis (cache) + Redshift colunar (Big Data). (— Examinando o Vazamento do Twitch)

> **MongoDB:** o "OK" é "recebi a ordem, gravo quando der" — confirma antes de persistir; crash entre RAM e disco perde dados. Dá pra aumentar durabilidade, mas isso mata a performance que motivou escolher Mongo. Sweet spot: dataset inteiro em RAM; passar disso exige sharding planejado desde o dia 1 (migrar depois = refazer infra e mover tudo). (— Devo usar NOSQL?)

---

## Índices

- **Faca de dois gumes:** índice é uma árvore B-Tree separada com cópia dos campos; acelera leitura, mas cada INSERT/UPDATE/DELETE atualiza TODOS os índices. (— Árvores: O Começo de TUDO; Fiz um servidor de "SQL"??)
- **Não indexe tudo.** Equilibre pelo perfil de uso (leitura vs. escrita). Em conteúdo (muito mais leitura que escrita), índice correto é sempre boa prática. (— Índices no banco de dados; Tornando sua App Web Mais Rápida!)
- **Sem índice adequado → table scan** (varre registro a registro). Em milhões de linhas + disco mecânico, cada acesso exige posicionamento físico → muito lento. (— Árvores: O Começo de TUDO)
- **Use EXPLAIN / EXPLAIN ANALYZE** (Postgres, MySQL, SQLite) para confirmar se a query usa índice antes de ir pra produção: index scan (rápido) vs. bitmap scan (intermediário) vs. sequential scan (evitar). (— Fiz um servidor de "SQL"??; Setting up Docker Compose and Postgres)

### Números reais
| Cenário | Custo | Fonte |
|---|---|---|
| Busca em 10k registros @1ms/op: linear (pior caso) vs. B-tree | 10s → ~10ms (100×+) | Discutindo sobre Banco de Dados |
| Buscar em 37 registros: linear vs. binária | 37 comparações → 6 | Fiz um servidor de "SQL"?? |
| ~10M objetos em memória: table scan vs. índice AVLTree | ~150ms → ~40ms (~3–4×, ordens de magnitude maior em disco) | Fiz um servidor de "SQL"?? |
| Insert com 3 índices (dBASE) | 1ms → ~4ms; cada índice NDX ~2× o tamanho da tabela | Discutindo sobre Banco de Dados |
| Tabela 50 colunas indexadas | 51 operações por insert | Fiz um servidor de "SQL"?? |

---

## Queries — faça / não faça

| Faça | Não faça |
|---|---|
| Um único `UPDATE ... WHERE` no servidor para atualizar N registros | `SELECT *` + loop no cliente + 1 UPDATE por linha (latência de rede ×N, horas) |
| Streaming: processar uma linha por vez (ex: PDFBox incremental) | Carregar todo o resultset na memória |
| Definir teto fixo de memória independente do volume de dados | Memória crescer proporcional ao volume (jeito amador) |
| Bulk/batch insert numa única transação | INSERT individual por requisição (overhead de transação + rede) |
| Full text com índice GIST+trigram sobre campo concatenado | `SELECT ... LIKE '%termo%'` ou `LIKE` em vários campos com OR |

- **Loop processando dados do banco é red flag** — quase sempre está errado; mande o SQL certo. Ex: pôr prefixo 9 em todos os telefones de SP = um `UPDATE ... SET telefone='9'||telefone WHERE city='São Paulo'` (segundos), não 100k updates. (— Discutindo sobre Banco de Dados)
- **Streaming, números reais:** relatório PDF de 500 ordens × 500 bytes = 250 MB dados + 250 MB PDF = 500 MB de uma vez; com streaming, ~10 MB por página de 20 ordens, constante. (— Discutindo sobre Banco de Dados)
- **`LIKE '%termo%'` não usa índice convencional** → sequential scan na tabela toda. Na Rinha (46k linhas): LIKE com OR em 3 campos = 42 ms; campo `searchable` com GIST+trigram (`pg_trgm`) = 4 ms (~10×). EXPLAIN ANALYZE no vídeo mostrou index scan 0,037 ms vs. seq scan 42 ms. (— Setting up Docker Compose and Postgres)
- **`UUID` gerado na aplicação** (não auto-incremento do banco) deixa gravar cache e outras operações em paralelo, sem esperar o banco devolver o ID — elimina um passo serial. (— 16 Linguagens em 16 Dias)
- **Bulk insert** venceu a Rinha (Rust, C#): acumula inserts em fila/memória e envia em lote; essencial em ETL/data warehouse/data science. (— 16 Linguagens; Setting up Docker Compose and Postgres)

### Full text search no Postgres
- Crie coluna `GENERATED ALWAYS AS (...) STORED` concatenando os campos buscáveis (ex: `generate_searchable(nome, apelido, stack)`) — Postgres mantém atualizada em todo write, e você indexa um campo só. (— Setting up Docker Compose and Postgres)
- Índice: **GIST + `gist_trgm_ops`** (`pg_trgm`) para busca parcial por trigrama em texto. **GIN** para arrays/JSONB/HStore (busca múltiplas chaves). (— 16 Linguagens; Setting up Docker Compose and Postgres)
- GIST/GIN aguentam a maioria. Mova para **Elasticsearch só quando a carga sobrecarregar o banco** — não é overengineering de dia 1. (— Setting up Docker Compose and Postgres)
- `SELECT LIKE` em volume é ruim por complexidade algorítmica; saber a matemática é o que permite criticar a ferramenta em vez de copiar a solução comum. (— O que os Cursos NÃO te Ensinam sobre Mercados)

---

## Modelagem

- **Desnormalização estratégica > normalização máxima.** Normalizar ao máximo multiplica joins. Troque redundância/disco por performance quando o dado quase nunca muda. Ex: estado (SP/São Paulo) na própria linha elimina join em todo SELECT a custo prático zero. (— Devo usar NOSQL?)
- **Ao desnormalizar, mova a consistência para a aplicação:** enums + validação rigorosa antes de gravar (evita "São Paulo" com/sem acento). Trade-off consciente. (— Devo usar NOSQL?)
- **Views materializadas** (Postgres) são tabelas desnormalizadas pré-calculadas (≠ view comum, que é dinâmica) — ganham leitura sem refazer o schema físico. (— Devo usar NOSQL?)
- **Constraints no banco são obrigatórias, não opcionais.** Valide em 3 camadas: schema (tipo, tamanho, unicidade, FK), modelo no servidor (ORM), frontend. Redundância não é ruim; dado inconsistente é muito pior. Validação só no frontend + banco sem constraint é o pior cenário. (— Discutindo sobre Banco de Dados)
- **Muitos `if` de validação no código = red flag:** provavelmente deveriam ser constraints declaradas no schema. (— Discutindo sobre Banco de Dados)
- **Entidades "simples" viram subsistemas.** "Usuário" expande para identificação vs. autenticação (salt, hash, seed TOTP), múltiplos endereços (cobrança vs. entrega), fidelidade, perfis (funcionário/PIS, fornecedor/CNPJ, consumidor). (— Modelagem de Software é Difícil?)
- **`preço` não é campo estático:** resulta de custo + impostos (ICMS varia por estado) + estratégia; varia por região e no tempo. Modelar como valor fixo na tabela de produtos é erro de iniciante. (— Modelagem de Software é Difícil?)
- **SKU = unidade distinta de venda:** cadastre o item exato em estoque ("Nivus Highline 2023 cinza moonstone", camiseta tam. M ≠ G), não o modelo genérico. (— Modelagem de Software é Difícil?)
- **Árvore em SQL:** parent-child é anti-pattern (não traz a árvore toda num SELECT); prefira Nested Set, ou serialize como JSONB/XML em um campo (precursor do NoSQL de documento — Akita gravava chave de campeonato como XML em blob em 2001). (— Sua Linguagem É Especial? Parte 2 em 2001)
- **Comunicação entre serviços internos:** prefira protocolo binário (Protocol Buffers) a JSON/XML — tradução texto↔binário dobra memória e processa a mais. Reserve JSON para API pública. (— Discutindo sobre Banco de Dados)
- **JSON é formato de consumo, não de armazenamento.** Mongo usa BSON internamente, não JSON; texto ocupa ~40% a mais que binário e a serialização duplica memória. (— Discutindo sobre Banco de Dados; Fiz um servidor de "SQL"??)

---

## Escala e operação

- **Réplicas de leitura:** primário concentra escritas e sincroniza réplicas read-only. Páginas do site na réplica; relatórios pesados/analítica em réplica dedicada via workers assíncronos, com resultado cacheado. Réplica pode atrasar alguns segundos — aceitável na maioria. (— Tornando sua App Web Mais Rápida!; Como fazer o Ingresso.com escalar?; Discutindo sobre Banco de Dados)
- **Filas absorvem picos de escrita.** Em Black Friday, NÃO adicione só web servers conectando ao banco (aumenta contenção e bloqueia escrita); enfileire pedidos e grave de forma controlada. Async/await e Node ajudam mas não resolvem picos sozinhos. (— Devo usar NOSQL?)
- **Pool de conexões** mantém N conexões reutilizáveis entre threads, controlando o consumo máximo do banco. Não chute o tamanho: rode teste de carga monitorando conexões ativas (ex: pgAdmin) e dimensione pelo pico real. (— Tornando sua App Web Mais Rápida!; Setting up Docker Compose and Postgres)
- **Cada conexão Postgres = um fork, ~2–4 MB de RAM.** Pool grande demais satura CPU e RAM e deixa cada conexão mais lenta. Na Rinha (1.5 CPU): 100 conexões com mais CPU > 400 conexões disputando CPU; 100 conexões ≈ 300 MB. Pools Node de 35×2 nunca passaram de 40 ativas — 450 max teria desperdiçado ~900 MB. (— 16 Linguagens; Setting up Docker Compose and Postgres)
  - Cálculo Heroku: 3 processos × 5 threads × 5 conexões = 75/dyno; 13 dynos = 195 necessárias vs. 120 do plano básico. (— Tornando sua App Web Mais Rápida!)
- **PgBouncer** estica o limite de conexões sem upgrade de plano: fica na frente do Postgres, usa no máx. 75% das conexões e enfileira até 10 mil pedidos pendentes antes de erro — ao custo de maior tempo de resposta. Paliativo. (— Tornando sua App Web Mais Rápida!)
- **Postgres simples é rápido — não over-engineere.** Insert em tabela pequena rivaliza com Redis. A fama de "banco é sempre o gargalo" vem de sistemas com centenas de tabelas/triggers/índices/joins. Na Rinha (tabela única ~50k linhas, ~100k inserts/3min): Postgres em microssegundos sem cache; quem adicionou Redis não ganhou nada. (— Setting up Docker Compose and Postgres)
- **Migrations:** scripts versionados (nascidos no Rails) que criam/alteram schema, executados automaticamente ao subir containers. Nunca altere schema manualmente em produção, exceto emergência. (— Subindo Aplicações Web em Produção)
- **Arquivamento periódico:** relacional não escala infinito — tabela enorme deixa até o índice lento. Mova (nunca apague) dados antigos para banco secundário/storage frio (ex: Glacier); guarde ≥5 anos por exigência legal; arquivamento anual/semestral. (— Discutindo sobre Banco de Dados)
- **DynamoDB:** partition key define a eficiência — query dentro da partição é barata, cruzar partições exige SCAN (caro). Defina a estratégia no início pelos padrões de acesso; mudar depois exige migração. Custo é por throughput (escritas/s, pico, leitura, capacidade reservada, nível de consistência), não só por GB — projete o comportamento antes de estimar. (— Discutindo sobre Banco de Dados)
- **Migração de legado:** importação bruta não basta; rode queries de validação cruzada para corrigir registros corrompidos/inconsistentes antes de importar. Em sistema financeiro a tolerância é zero. (— Meu Começo de Carreira Durante a Bolha)

---

## Segurança e jobs (onde toca o banco)

- **Nunca concatene input em SQL** — use bindings/parâmetros do ORM. `orderBy`/`sort` com whitelist de campos. Scanner (Brakeman) pegou SQL injection e path traversal antes de produção. (— legado 02-engenharia §5/§7)
- **Nunca exponha pgAdmin / ferramentas de admin do banco na internet pública** — só dev, staging ou rede privada; se subir em produção, tire do ar logo após o uso. (— Setting up Docker Compose and Postgres)
- **Jobs idempotentes, payload só com IDs** (busque o dado sensível do banco dentro do job); timeout configurado. Para operações que não podem duplicar (cobrança, email): criar registro antes de executar e fazer claim atômico via `UPDATE ... WHERE`; status preso vira `unknown`, nunca retry automático. (— legado 02-engenharia §7/§10)
- **Réplica como UUID/Snowflake em sistemas distribuídos:** auto-incremento não escala (colisão entre nós). Snowflake = timestamp + id do servidor + sequência; permite agrupar por tempo e localizar o cluster. Cassandra usa TimeUUID. (— Desbloqueando o "Algoritmo" do Twitter)

---

## Fundamentos que afiam a decisão (1 frase cada)

- **ACID** (relacional): Atomicidade (tudo ou nada), Consistência (estado sempre válido, FK/unicidade), Isolamento (concorrentes = sequenciais), Durabilidade (confirmado = no disco mesmo após crash). Por isso escrita custa mais que leitura — exige disco seguro, MVCC e transaction log para rollback. (— Discutindo sobre Banco de Dados; Devo usar NOSQL?; Fiz um servidor de "SQL"??)
- **CAP** (Brewer, 2000): no máx. 2 de 3 (Consistência, Disponibilidade, Tolerância a Partição). Termos ambíguos — é heurística de trade-off, não lei; o eixo útil é consistência forte vs. eventual. (— Discutindo sobre Banco de Dados)
- **NoSQL surgiu** (anos 2010) para escrita imensa onde perder/duplicar registro ocasional pouco importa (analytics, batimento, eventos de jogo, cripto alta frequência) e consistência eventual basta. Financeiro/fiscal/e-commerce → ACID. (— Discutindo sobre Banco de Dados)
- **Maioria do NoSQL é variação de key-value;** buscas precisam ser planejadas/indexadas com antecedência — query mal planejada percorre todos os nós do cluster. (— Devo usar NOSQL?)
- **B-Tree / B+Tree** são a base de quase todo banco e filesystem (ext4, NTFS, APFS, ZFS, Btrfs, SQLite, Postgres, Oracle, SQL Server, Mongo, Dynamo, Cassandra). Autobalanceadas, alto fanout (muitos valores por nó = menos seeks em disco que lê em blocos de 512 B–4 KB); na B+ só as folhas têm dados. Transformam busca de O(n) para O(log n). (— Árvores: O Começo de TUDO; Fiz um servidor de "SQL"??; Discutindo sobre Banco de Dados)
- **Transaction log / WAL / journal:** grava a operação num arquivo append-only antes de aplicar; no restart faz replay e restaura estado consistente — mesma ideia do journaling de NTFS/ext4. dBASE/Clipper não tinha isso, por isso DBF corrompia (backup diário obrigatório; só o servidor central tocando o arquivo resolveu — origem do cliente-servidor). (— Fiz um servidor de "SQL"??; Discutindo sobre Banco de Dados; Meu Começo de Carreira Durante a Bolha)
- **Deleção em arquivo de registro fixo** marca bit "apagado" (não remove); recuperar espaço exige comando explícito: PACK (dBASE) ≡ VACUUM (SQLite/Postgres). (— Discutindo sobre Banco de Dados)
- **Banco é, no fundo, array de structs em disco + funções de busca:** SELECT=filter/map, INSERT=push, DELETE=filter. Servidor = processo que escuta TCP, recebe SQL, executa no motor e devolve resultado (cliente não tem lógica de banco). Stored procedure (plpgsql/plsql/tsql) passa por parser e é compilada JIT via LLVM — Postgres usa o JIT do LLVM para queries complexas. (— Fiz um servidor de "SQL"??; Discutindo sobre Banco de Dados; Entendendo Apple, GPL e Compiladores)
- **Stored procedures:** põem lógica no banco (menos atualização de cliente, cliente mais simples), mas sobrecarregam o banco com processamento além de I/O — trade-off. (— Entendendo Back-End para Iniciantes Parte 2)
- **Grafos (rede social) não escalam em SQL:** navegar nós/arestas exige carregar estrutura interconectada em memória; o Twitter criou FlockDB para substituir o MySQL (13 bi de arestas, 20k+ escritas/s, 100k+ leituras/s em 2010). Algoritmos de grafo assumem grafo todo em RAM (10 bi arestas ≈ 80 GB); ao particionar em Hadoop, o shuffling entre servidores degrada — daí MapReduce e variantes como OnePass PPR. Consistent hashing (anel) distribui sem rebalancear tudo ao adicionar/remover nó (base de Cassandra/Dynamo; Cassandra usa Murmur3). (— Desbloqueando o "Algoritmo" do Twitter; Discutindo sobre Banco de Dados)
- **SAP como referência de escala/modelagem enterprise:** instalação padrão do R3 pré-configurava 40k+ tabelas (nomes em acrônimos alemães de ≤4/5 chars para economizar espaço na era Pentium 2). Tipos: transparente (1:1 com o físico), pool (agrupadas num físico maior) e cluster (serializa campos não-chave em raw para driblar limite de tamanho — performance pior). Campos usam tipos de domínio definidos pelo usuário (ex: domínio e-mail já apara espaço, baixa caixa, aplica regex e limita tamanho) — mudar o tipo propaga a tudo, sem search-and-replace manual. (— Você não sabe nada de Enterprise. Conhecendo a SAP!)

---

## Dependências e ferramentas

- **Nunca atualize todas as dependências de uma vez** (quebra), nem mantenha versões antigas para sempre (CVEs). Atualizar continuamente e adaptar o código é manutenção essencial de projeto real. (— Entendendo Back-End para Iniciantes Parte 2)
- **APM em toda produção** (New Relic, Datadog, Sentry, Dynatrace, Splunk, AppOptics, Instana, Azure Monitor): ver memória pós-deploy, achar o código que mais consome e checar se o uso sobe proporcional ao tráfego. Sem métrica, não melhora. (— Discutindo sobre Banco de Dados)
- **Use a ferramenta certa para o contexto:** SQLite num dispositivo embarcado, Postgres/MySQL num servidor concorrente — inverter é usar a ferramenta errada. (— Discutindo sobre Banco de Dados)

---

*Fontes: nuggets de vídeos do canal @Akitando (engenharia + pedagógico, banco-e-sql) e compilado legado 02-engenharia-software-q1-2026.md. Atribuição inline aponta o vídeo/post de origem.*
