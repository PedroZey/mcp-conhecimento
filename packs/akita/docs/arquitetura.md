# Arquitetura e Design de Software — Guia Acionavel (Akita)

> Como decidir arquitetura, escala, modelagem e infra como um senior, destilado das falas e posts do Fabio Akita (@Akitando + akitaonrails.com). Tudo rastreado a uma fonte. Leia rapido, decida, aja.

---

## 0. Regras de ouro (decida por aqui primeiro)

- **Contexto manda em tudo.** Toda solucao de palestra de big tech e valida *dentro do contexto daquela empresa*. Pergunte sempre: minha escala, minha equipe e meu problema sao comparaveis? (— Nao Terceirize suas Decisoes!)
- **Nao copie arquitetura de big tech no dia 1.** Netflix/Google/Facebook resolveram escala massiva; no dia 1 com zero usuario sua preocupacao e sobreviver ate o dia 2, nao escolher Kubernetes ou GraphQL. (— Nao Terceirize suas Decisoes!)
- **Nao escolha stack por associacao** ("Clojure porque Nubank, React porque Facebook, Go porque Google"). A tech pode ser otima, mas a decisao e errada sem PoC pro *seu* problema. (— Nao Terceirize suas Decisoes!)
- **Make it work → make it right → make it fast, nessa ordem** (Kent Beck). Inexperientes tentam "direito" e "rapido" antes de "funcionar", inventando regras sem codigo que as justifique. (— ai-memory: arquitetura emergente)
- **Design emerge, nao se projeta de cima.** Impossivel especificar 100% no papel antes de construir; o design real aparece quando usuarios reais usam. Versao 1.0 nunca esta pronta. (— RANT: Empreendendo do JEITO ERRADO; Design Emergente)
- **Humano decide O QUE e POR QUE; IA decide O COMO.** A IA over-engineers e nunca diz "nao" — voce e o freio. (— legado eng. software)
- **Abstracao vem depois do uso, nao antes.** Cristalizar estrutura cedo vira camisa de forca. Software bom e escultura de barro umido, sempre ajustavel. (— ai-memory)
- **Cada solucao cria novos problemas.** Cache resolve banco mas vira mais um componente pra monitorar; fila resolve integracao mas exige tratar falhas na fila. Nao existe config final. (— RANT: Empreendendo do JEITO ERRADO)
- **Meça antes de otimizar.** Cache/fila/Redis nao deixam nada rapido por magica — cada componente consome RAM/CPU e pode piorar se o gargalo real for outro. (— Modelagem; Rinha de Backend)

---

## 1. MVP e evolucao — comece minimo, refatore depois de produzir

| Faca | Nao faca |
|---|---|
| Fixe **custo e prazo** primeiro, encaixe escopo dentro (— Rant: Beira do Caos) | Definir todo o escopo e tentar achatar custo/tempo |
| Lance MVP em **2-3 meses**; se errar, perdeu 3 meses, nao 2 anos (— RANT) | Planejar sistema de 2 anos tentando prever tudo |
| Construa so a arquitetura suficiente pra escala atual; reescrever parte e esperado, nao falha (— A COVID matou minha Startup?) | Construir a arquitetura mais complexa antes de precisar |
| Use plataformas prontas (Shopify, Magento) ate ter volume e margem (— RANT) | Reinventar e-commerce do zero se seu core nao e tech |
| Consolide duplicacao **so depois que roda em producao real** (— ai-memory) | Extrair abstracao "porque vai precisar" |

**Por que funciona:** no ai-memory, o `ScopeResolver` (601 linhas) nao foi inventado antecipando multi-usuario — foi *extraido* de codigo ja em producao em dezenas de maquinas e 3 SOs, que revelou os padroes repetidos. 24 dias, 482 commits, 26 pessoas, zero diagrama no dia 1. (— ai-memory)

- **Armadilha do segundo sistema** (Fred Brooks): depois do MVP, a tentacao de "agora sei a v2.0 perfeita" e perigosa. (— Design Emergente)
- **Especificacao de quem nao tem experiencia** detalha o obvio (login, cadastro, senha) e ignora o critico (admin, relatorios, integracao com backoffice). Calhamacos de 500-1000 paginas de UML nunca viravam software sem buracos. (— RANT; Design Emergente)
- **"Software pronto e software morto."** Em 4 projetos do Akita houve **125 commits apos "pronto"** — features, refactoring, hardening, nao patches. Software em producao diverge da spec em horas. (— legado eng. software)

---

## 2. Organizacao de equipe e integridade (Mythical Man-Month + Conway)

- **Equipes cirurgicas pequenas:** divida sistema grande em subsistemas, cada um com equipe pequena multidisciplinar com lider. Empiricamente, **nao mais que 10 pessoas** por equipe; em vez de 200 num monolito, 20 equipes de 10. (— The MM-M)
- **Integridade conceitual e o principio #1.** Melhor omitir features e refletir um conjunto coeso de ideias do que ter muitas boas ideias descoordenadas. Alguem precisa ser dono dessa integridade. (— The MM-M)
- **Projeto nao e democracia.** Precisa de um "ditador benevolente"; todo open source serio tem core team que decide o merge. (— The MM-M)
- **Arquiteto tem que saber implementar.** Deve estar pronto pra mostrar uma implementacao de cada feature que especifica (sem ditar a final). Arquitetura monumental que nao serve ao uso e inutil. (— The MM-M)
- **Lei de Conway:** a arquitetura do software espelha a estrutura de comunicacao da organizacao. Muitas equipes independentes → muitos microservicos. Mudar a org muda o design e vice-versa. (— Vazamento do Twitch)
- **Rotacao de programadores = teste de saude.** Se remover o autor original quebra o sistema, foi mal projetado. (— A COVID matou minha Startup?)

---

## 3. Microservicos e monolito — menos e melhor

**Microservicos so se justificam em 2 cenarios** (fora deles, quanto menos melhor):
1. Endpoint especifico que precisa de baixa latencia / alto throughput.
2. Necessidade organizacional de dividir equipes (Lei de Conway).
(— Vazamento do Twitch)

- **Gatilho concreto:** quando a aplicacao nao cabe num container, corte gordura ou particione — *ai* nasce o microservico com justificativa real. Escale horizontal (mais containers menores), nao vertical (maquina maior). (— DevOps p/ Iniciantes Parte 2)
- Shopify se orgulha de ser **monolito** em Rails com escala gigante; monolito bem cuidado reduz complexidade de infra e costuma indicar boa comunicacao entre equipes. (— Vazamento do Twitch)
- O Twitch pode ter virado vitima da Lei de Conway acumulando mais microservicos que o necessario. (— Vazamento do Twitch)
- **Bounded Context ≠ microservico.** BC e conceito estrategico de DDD; pode viver dentro de um monolito via namespaces e modulos. Confundir os dois gera overengineering. (— Modelagem de Software)

---

## 4. Escalabilidade web — a receita que resolve 80%

**Ordem de implementacao:** (1) instalar metricas → (2) testes → (3) cache de paginas/componentes → (4) mover operacoes pesadas pra filas com workers. **Cache + filas sozinhos resolvem ~80% dos problemas de escala**, independente de linguagem/framework. (— Como fazer o Ingresso.com escalar?)

### Onde o tempo e gasto numa request (exemplo de 100ms)
| Etapa | Tempo |
|---|---|
| Rede entrada | 10ms |
| Nginx | 5ms |
| Framework (rota+controller) | 20ms |
| **MySQL (maior gargalo individual)** | **30ms** |
| Geracao de HTML | 25ms |
| Rede saida | 10ms |

(— Como fazer o Ingresso.com escalar?)

- **Trocar linguagem/framework raramente resolve performance.** Stack so afeta a porcao *dentro* da app (~45 dos 100ms); rede, banco e servicos externos nao mudam. Quem sugere trocar de linguagem como 1a solucao geralmente nao entendeu o gargalo. (— Como fazer o Ingresso.com escalar?)
- **Diagnostique IO-bound vs CPU-bound antes de agir.** Problemas web costumam ser IO-bound (fluxo de conexoes), nao CPU-bound. Adicionar CPU/banco nao resolve IO-bound. (— Rinha de Backend)
- **Controlar vazao de entrada > aumentar capacidade interna.** Limitar workers do Nginx a um valor razoavel (~1024 ou menos) atende de forma ordenada em vez de saturar tudo. Reduzir workers Nginx de 10-20k pra 1024 e pool Postgres de 200 pra ~40 fez versoes pularem de 27k pra 40k+ inserts; Ruby chegou a 46k com 256 workers / 30 conexoes. (— Rinha de Backend)
- **Escala horizontal nao e bala de prata: o banco tambem precisa escalar.** Subir Dynos e facil, mas o banco tem limite de conexoes simultaneas, CPU e RAM. Escalabilidade nunca e automatica. (— Heroku; Os 12 Fatores)
- **Vertical (upgrade da mesma maquina: mais cores/RAM) vs horizontal (mais maquinas no balanceador).** O load balancer (Nginx/HAProxy) distribui as requests entre containers — geralmente **round-robin** — e **anonimiza os IPs reais** dos servidores (o usuario so ve o IP do balanceador). Em escala mundial, Google/Amazon usam **DNS com multiplos IPs**, devolvendo enderecos diferentes por regiao geografica. (— DevOps p/ Iniciantes; pedagogico: vertical vs horizontal / load balancer)

### Cache
- **Maior alavanca de performance web.** Cachear o HTML por periodo curto (ex: 5 min) elimina banco + template na maioria das requests. 50k requests/5min servidas processando HTML 1x. Reduziu 100ms→~35ms (-60%) sem trocar stack. (— Como fazer o Ingresso.com escalar?)
- Caso concreto: home com 400 req/s exigia 195 conexoes/s ao banco; cache de 5min → **zero conexoes em 392 das 400 requests/s**. (— Tornando sua App Web Mais Rapida)
- **Use TTL, nao delecao manual.** Apos expirar, o proximo request regenera. Preocupar-se em invalidar cache manualmente costuma indicar que esta sendo feito errado. Mesmo principio em timelines (deixar tweets velhos expirarem em janela de 1-2 dias evita logica de delete). (— Ingresso.com; Twitter/Grafos)
- **Cache so ajuda com hit rate alto.** Pra termos de busca aleatorios (cache miss sempre) e inutil. Cache em dicionario sem indice faz busca linear e fica lento conforme cresce (Concurrent Dictionary .NET travou o ZAM em 40k inserts). (— Rinha de Backend)

### Filas e jobs assincronos
- **Mova trabalho lento (pagamento, email, ERP, nota fiscal, relatorio) pra fila + worker.** A request web grava na fila e retorna rapido; worker separado processa. Funciona local ou distribuido e resolve a maioria dos problemas reais de paralelismo. (— Concorrencia Parte 2; Ingresso.com)
- **Nao use async/await pra operacoes criticas no web server.** Se ele crashar, todos os awaits pendentes morrem e o estado fica corrompido. Use fila persistente + worker — o worker continua mesmo com crash do web. (— Ingresso.com)
- **Jobs assincronos tornam o sistema gerenciavel, nao mais rapido.** Nao reduzem recursos usados; o ganho e poder pausar, corrigir e reprocessar. Controle e o objetivo. (Google Workspace propaga config em horas; YouTube/Anchor.fm mostram "processando".) (— ChatGPT te Substitui?)
- **Nao use tabela do banco como fila** — o objetivo da fila e aliviar o banco. Use servico dedicado (RabbitMQ, SQS, Kafka). (— Tornando sua App Web Mais Rapida)
- **Numero do pedido desassociado do ID autoincrement:** com fila, o pedido precisa de numero antes de gravar; tenha um microservico dedicado a gerar IDs unicos. (— Tornando sua App Web Mais Rapida)
- **Workers tambem consomem conexoes do banco.** Balanceie processos web vs workers dentro do limite do plano; cache na camada web libera conexoes pros workers. Ex: 10 dynos × 10 threads × 10 conexoes = 100 conexoes so de workers. (— Tornando sua App Web Mais Rapida)
- **Modele pedido como maquina de estados** (pendente → aguardando → confirmado/rejeitado). Nunca chamada sincrona ao pagamento na request. (— Ingresso.com)

| Stack | Lib de jobs |
|---|---|
| Rails | Sidekiq / Resque / ActiveJob |
| Node.js | Bull / pacote Q |
| Django/Python | Celery / RQ |
| Laravel | Queues |
| Spring (Java) | JMS / background jobs do Spring / consumer Kafka |
| .NET | HangFire |

Servicos de fila: Redis (simples), RabbitMQ (garantias ACID-like), Kafka, ActiveMQ, AWS SQS. (— Concorrencia Parte 2; Tornando App Mais Rapida)

### Shared-nothing / stateless
- **Web servers devem ser volateis e sem estado local.** Nunca grave arquivo no disco local nem confie em RAM local — em load balancer, outro servidor nao acha o arquivo. Arquivos → S3/NFS; estado → Redis/banco. So assim escala horizontal sem dor. (— Ingresso.com; ChatGPT te Substitui?)
- Historico: sessao em memoria força Session Affinity (sticky) no load balancer e mata escala horizontal; sessao em banco (State Server do ASP.NET) foi precursora do shared-nothing. (— Sua Linguagem e Especial? 2001)
- **Redis = memoria compartilhada** entre processos web: cache, sessoes, filas, PubSub (workers assinam canais e processam em background). (— Ingresso.com)

### CDN e proxy reverso
- **Nunca sirva CSS/JS/imagens pelo app server em producao.** Use CDN (CloudFront, Akamai, Cloudflare, Fastly) servindo de servidores geo-proximos. Ingresso.com usa `ingresso-a.akamaihd.net`. Escreva URLs via helper do framework, nunca hardcode o CDN. (— Ingresso.com; Tornando App Mais Rapida)
- **Frameworks web nao rodam expostos na porta 80.** Linguagens de script (JS, PHP, Python, Ruby) sao single-thread e saturam 1 core — sempre ponha Nginx na frente. (— Tornando App Mais Rapida)
- **Nginx (proxy reverso):** termina SSL/TLS, balanceia (round-robin) entre processos internos (3000, 3001...), e faz buffer de uploads lentos — segura o cliente durante o upload e so repassa ao app quando termina (upload de 60MB em 4G leva ~480s; sem Nginx um processo ficaria bloqueado esse tempo). Lida com conexoes lentas muito melhor que frameworks. (— Tornando App Mais Rapida; ChatGPT te Substitui?)
- Arquitetura do Nginx: reactor pattern, master + N workers (1/core), event loop com epoll — milhares de conexoes por thread sem context switch. Resolve o C10K (Dan Kegel, 1999). Reactor/event loop nao nasceu com Node: Twisted (2002) e Nginx (2002) vieram antes. (— Concorrencia Parte 1)

### Sala de espera (waiting room) e fila virtual
- Pra proteger servico de terceiros lento/sem controle: token unico por usuario, pagina leve cacheada com estimativa, entra na zona protegida so na sua vez. AWS publicou "sala de espera virtual com DynamoDB + Lambda" (CityGeek). (— Ingresso.com)
- **Overbooking de tokens** como companhia aerea: se 10% desiste, emita 10% a mais. (— Ingresso.com)
- Fila virtual protege sistema legado nao-escalavel (reserva de assentos antiga, Caixa na Mega da Virada). (— Heroku)

---

## 5. Os 12 Fatores (piso minimo de escalabilidade)

> Satisfazer os 12 fatores nao garante escala, mas **nao satisfazer quase garante que nao escala**. Frameworks como Rails ja nasceram seguindo. (— Os 12 Fatores; DevOps p/ Iniciantes)

| Fator | Regra |
|---|---|
| 2 — Dependencias | Tudo declarado em manifesto (package.json, Gemfile, composer.json); mesmas versoes em dev/CI/prod; nunca dependa de pacote do SO |
| 3 — Config | Config que muda por ambiente vai em env var, nunca hardcoded; debug em dev, sem detalhes de erro em prod |
| 4 — Backing services | Banco, fila, cache = recurso externo por URL; proibido instalar MySQL/Redis no mesmo container do app |
| 6 — Stateless | Nada persistente dentro do container (uploads, logs); tudo efemero some no deploy; persistencia em backing service |
| 7 — Port binding | Servico exposto por porta de rede; servicos so via arquivo local (cron do SO) sao incompativeis com containers |
| 8 — Concorrencia | Escale com mais containers (horizontal), nao maquina maior; ate JS/Elixir atingem o limite da maquina |
| 9 — Descartabilidade | Container destruivel/recriavel a qualquer momento; consiga apagar o servidor e reinstalar via script sem perder 1 bit |
| 12 — Admin processes | Tarefa admin em container isolado e efemero, nunca SSH no container web (`heroku run bash`) |

- **Um processo por container.** Postgres num, Redis noutro, Nginx noutro — escala/substitui/monitora cada um isolado. Container nao e SO. (— DevOps p/ Iniciantes)
- Ambientes dev/teste/prod identicos (VMs/containers) mataram o "funciona na minha maquina". (— DevOps p/ Iniciantes)
- **Gargalo classico ao escalar = banco.** Containers web escalam mas todos batem no mesmo banco (limite de conexoes). Solucoes: connection pool, cache Redis, replicas de leitura — mas replicas infinitas criam gargalo de replicacao. Escalabilidade depende mais do programador que da infra. (caso real 2014: Postgres saturou ao escalar dynos) (— Os 12 Fatores)
- Config padrao de banco e ruim; precisa tuning pro hardware — motivo pra usar DBaaS/PaaS. (— DevOps p/ Iniciantes)

---

## 6. Containers, Docker e infra

**Faca**
- Todo projeto com **Dockerfile + Docker Compose** (documentacao viva da infra; Rinha gerou 94 versoes faceis de rodar). (— Rinha Final)
- **Fixe versoes de imagem**, nunca `latest` (ex: `postgres:15.2`, `redis:7.2.3-alpine3.19`, `node:lts`). Producao precisa de estabilidade, nao da versao mais nova/bugada. (— Containers; Rinha Final)
- Use **env var** pra controlar nº de workers/forks; nunca leia `os.cpus()` em runtime (script de 4 cores vira 16 forks e estoura RAM num servidor de 16 cores). (— Rinha Final)
- **Limite CPU/RAM por container** (Rinha: 1,5 CPU / 3 GB) pra um processo faminto nao matar outro. (— Rinha Final)
- **`network_mode: host`** elimina overhead do bridge/NAT sob carga — foi o "elo perdido" da Rinha: versoes de 39-40k saltaram pra 46k+ inserts com zero knockouts; Crystal 40k→47k. So funciona em Linux nativo (ignorado em macOS/Windows). (— Rinha Final; Rinha de Backend)
- **Unix Sockets** (IPC) em vez de TCP quando tudo roda na mesma maquina — sem overhead de rede (Nginx ↔ app via `.sock`). (— Rinha de Backend)
- Limpe imagens nao usadas (`docker compose down --rmi all`). (— Rinha Final)

**Nao faca**
- `docker run -v /:/mnt`: o daemon containerd roda como **root** e isso monta a raiz do host no container (editar `/etc/passwd` = invadir host). **Podman** usa runc, suporta rootless, sem daemon — mais seguro e compativel com mesmos comandos/Dockerfile. (— Containers)
- **Docker Compose nao escala** (adicionar instancia = editar arquivo manualmente; 10 instancias fica impraticavel). E pra dev local / deploy simples. Producao em cloud: **Kubernetes** (orquestra pods) + **Terraform** (provisiona infra). (— Containers)
- **Evite Kubernetes em projeto pequeno/medio.** Foi feito pra data centers do tamanho do Google; a maioria ignora o custo de manter a infra. Heroku/PaaS basta pra esmagadora maioria. (No vazamento do Twitch nao havia K8s, so Terraform → RDS/EC2/Beanstalk.) (— Vazamento do Twitch)

**Historico util:** Heroku (2008) precedeu o Docker (2013) e inspirou o ecossistema — dynos≈pods, kubectl≈CLI do Heroku, buildpack≈Dockerfile. Heroku abriu padroes (sem lock-in, app roda em qualquer lugar) vs Google App Engine que forçava Bigtable. (— Heroku; Os 12 Fatores)

**Dyno (Heroku):** free tier 512 MB / ~4 cores virtuais; pagos ate 14 GB. App bem escrita roda em 512 MB — se precisa mais, investigue leak/ma programacao. (— Heroku)

**Autoescala** vale mais pra **economia** (derrubar dynos ociosos de madrugada) do que pra resiliencia magica. (— Heroku)

---

## 7. FaaS (Lambda) — uso certo

- **Use FaaS como worker assincrono respondendo a eventos:** processar fila de escrita, uploads de imagem/video, enviar email. Ex: SQS → Lambda → Aurora; S3 → SQS → Lambda → S3/Redshift. (— Devo usar NoSQL?)
- FaaS = container de curta duracao, ligado por trigger (HTTP, fila, Firebase). Otimo pra cargas **esporadicas / picos imprevisiveis** — fica desligado sem consumir, sobe em N instancias quando a fila cresce. (— Devo usar NoSQL?)
- **NAO use FaaS pra servir aplicacao web inteira:** cold start aumenta latencia e apps grandes demoram a inicializar. (— Devo usar NoSQL?)

---

## 8. Modelagem, DDD e Design Patterns

- **Design Patterns (GoF) e catalogo de nomes, nao manual.** Os autores so deram nome a repeticoes que observaram (inspirados em "A Pattern Language" de Christopher Alexander, 250+ patterns urbanos). Erro classico: montar Decorator+Adapter+Factory+Singleton sem necessidade. Pra iniciante a utilidade e quase nula — precisa de experiencia previa pra nomear o que ja conhece na pratica. (— Design Emergente; A Dor de Aprender)
- **Frameworks sao implementacoes de patterns** (UIKit=GUI, Rails/Laravel=web, OTP=distribuido). Entender patterns facilita aprender frameworks. (— A Dor de Aprender)
- **DDD = dar bons nomes e organizar por dominio.** Ubiquitous language, aggregates, bounded contexts. BC = subsistema com fronteira clara que compartilha entidades na borda (ex: "produto" e "usuario" existem em vendas e suporte e precisam de nome unificado). (— Design Emergente)
- **Saber ONDE aplicar um padrao > saber COMO.** Identificado o contexto, a implementacao e facil. (— Modelagem de Software)
- **Regra de negocio escondida em codigo deve virar entidade.** Cláusula de guarda embutida (ex: overbooking 110%) vira `OverbookingPolicy.isAllowed()` (Strategy) — explicita e facil de achar/alterar. (— Modelagem de Software)
- **Nao confunda:** DDD ≠ Event Sourcing + CQRS (sao tecnicas pra partes especificas; aplicar em tudo e overengineering). Bounded Context ≠ microservico. (— Modelagem de Software)
- **API especializada > banco generico (sem overengineering):** Graphjet do Twitter foi feito com API minima (so o que sabiam que precisariam) apos anos de experimentacao revelarem os padroes de acesso reais. (— Twitter/Grafos)
- **Separacao logica/apresentacao e antiga e universal:** NES (CPU=logica, PPU=render no V-Blank) ≈ Virtual DOM do React (acumula mudancas e aplica de uma vez). MVC com thin controllers (logica no model) foi tornado acessivel pelo Rails; J2EE tinha mas exigia certificacao de arquiteto. (— Super Mario Hardcore; Historia do Rails)
- **Modelo OSI em camadas** como referencia: cada camada com responsabilidade clara, trocavel sem afetar as de cima desde que a interface se mantenha (inserir TLS entre TCP e HTTP). (— Sockets/Redes Parte 4)

### Linha historica: three-tier → RPC → J2EE → microservicos
- **Three-tier** nasceu pra separar logica de negocio do cliente e aliviar o banco: servidor de aplicacao no meio (cliente → app → banco), centralizando a logica sem precisar atualizar programa em cada desktop. (— pedagogico: arquitetura three-tier)
- **RPC** (chamar logica remota como se fosse local) exige uma interface que descreva funcoes/argumentos/resultados expostos pelo servidor — analogo a header de biblioteca dinamica. **COM+ (Microsoft), CORBA (IIOP) e DCOM** foram implementacoes dessa ideia. (— pedagogico: RPC/CORBA/DCOM)
- **J2EE** consolidou as praticas de tres camadas com tecnologias de internet: **Servlets** (encapsulam HTTP), **Model 2** (≈ MVC) e **EJB** (abstracao de acesso a banco e servicos remotos), tudo configurado em XML. Era tao complexo que existia certificacao de arquiteto Java; o Rails depois tornou MVC com thin controllers acessivel sem isso. (— pedagogico: J2EE/Model 2/EJB; Historia do Rails)
- **Page Controller** (1 controller por pagina HTML, estado em campo hidden serializado em base64; ASP.NET Web Forms) era o padrao web antes do MVC; o Struts ja nascia MVC e era considerado superior. (— pedagogico: Page Controller vs MVC)
- **Maturidade de ecossistema > superioridade tecnica da linguagem.** Pra sistemas complexos, ferramentas/libs maduras pesam mais que a linguagem ser "melhor"; reescrever sistema maduro raramente compensa (o ecossistema Apache em Java equiparou Erlang em distribuidos). (— Discutindo Linguagens)

---

## 9. Como uma startup cresce tecnicamente (evolucao de arquitetura)

- **Ciclo tipico de crescimento:** (1) comeca com framework produtivo (Rails, Django, Laravel, Node) pra iterar rapido; (2) adiciona filas de background (Sidekiq, SQS) e cache (Redis) por performance; (3) cria microservicos em linguagem de baixa latencia (Go, Elixir) so nos pontos de gargalo; (4) adota Big Data (Redshift, Spark) pra analise; (5) acumula repos — muitos ficam obsoletos no caminho. (— pedagogico: como startup cresce)
- **Toda grande tech usa mais de uma linguagem — cada uma no lugar certo.** Framework web produtivo no core, Go/Elixir pra baixa latencia / muitas conexoes longas (WebSocket, WebRTC), Python/Bash pra scripts, JS no front. O Twitch comecou Rails (Justin.tv), depois Go pra alta performance, Python pra scripts/Lambda, JS (Ember/React) no front. (— Vazamento do Twitch)
- **Tres geracoes do motor de recomendacao do Twitter** (evolucao iterativa, cada geracao resolvendo o gargalo da anterior): (1) WTF/Cassovary 2010 (grafo em memoria, SALSA, batch diario); (2) Hadoop/RealGraph 2012 (distribuido, mais sinais, ainda batch); (3) Graphjet 2014-2016 (janela de tempo, <10ms, quase real-time; gargalo passou a ser a fila Kafka). (— Twitter/Grafos)
- **Pipeline "Para Voce" do Twitter** em 3 etapas: (1) Candidate Sourcing (~1500 candidatos via SimClusters/RealGraph/GraphJet, in-network + out-of-network); (2) Ranqueamento (Light Ranker EarlyBird/Lucene + Heavy Ranker, rede neural ~48M parametros); (3) Filtros/heuristicas (Visibility Filters = moderacao). (— Twitter/Grafos)

---

## 10. Concorrencia e paralelismo

- **Numero ideal de threads nao e regra fixa** — threads demais = overhead de context switch; 1/core nao garante nada se disputam mutex. Frequentemente e tentativa-e-erro em producao. (— Concorrencia Parte 1)
- **Nunca crie threads sem limite.** Use thread pool (tipicamente 1/core) e abstraia trabalho como tasks; o pool e um load balancer (100 pessoas, 10 caixas). Mesmo principio pra connection pool. Java/C# ThreadPool, Ruby gem Parallel, macOS Grand Central Dispatch. (— Concorrencia Parte 2)
- **Processos vs threads por SO:** Linux/Unix favorecem fork (barato, isola sem mutex); Windows favorece multithreading (criar processo e caro). Solucao baseada em fork roda ordens de grandeza pior no Windows. Chrome usa processo por aba (estabilidade + seguranca, ao custo de RAM duplicada). (— Concorrencia Parte 1)
- **Serializacao causa muitos bugs de microservico.** Atento a serializar/desserializar em toda integracao HTTP. (— Concorrencia Parte 2)
- **VMs (JVM, Erlang) rodam melhor sozinhas** na maquina e sem reboots frequentes — relevante pra DevOps. (— Concorrencia Parte 2)
- **Fibers/corotinas (M:N) precisam de menos conexoes ao banco** (multiplexam sobre a mesma conexao); threads tradicionais (1:1) precisam de 1 conexao por thread. (— Rinha de Backend)
- **Broadcast massivo** (microblog com milhoes) nao se resolve com framework web convencional — e modelo de atores (Erlang; Scala/Akka foi o 1o substituto viavel na JVM; hoje Elixir). Twitter migrou partes pra Scala/Akka por isso, nao porque Rails fosse ruim; GitHub segue em Rails com escala comparavel. (— Historia do Rails)

---

## 11. Comunicacao entre servicos — JSON vs binario

- **JSON pra API publica** (legivel, facil de integrar); **binario pra comunicacao interna em alta escala** — JSON converte numero em string, carrega schema em cada registro e desperdica banda mesmo com GZIP. (— Twitter/Grafos; Vazamento do Twitch)
- **Protobuf (Google) / Thrift (Facebook)** + RPC (gRPC / Finagle) substituem REST/JSON em pipelines de alto throughput. Mesmo payload: ~200 bytes em JSON → <80 bytes em Protobuf (**economia ~2.5x** + ganho de CPU). Twitch usa binario internamente (twirp, open source proprio). (— Twitter/Grafos; Vazamento do Twitch)
- **REST com todos os verbos** (GET/POST/PUT/DELETE/PATCH) e a base de boas APIs; Rails 1.2 (jan/2007) popularizou RESTful Resources. (— Historia do Rails)
- **Integracao sincrona com sistema externo (ERP) e antipadrao classico.** ERP nao aguenta escala web; se demora, o checkout falha. Torne assincrono via fila (e monitore a fila). (— RANT)

---

## 12. Dependencias e seguranca de codigo

- **Nao vendorize bibliotecas** (copiar fonte de terceiro pro repo): congela a versao, perde updates de seguranca, vira bomba-relogio. No vazamento do Twitch havia copias vendorizadas de OpenSSL 1.0 (com buracos ja corrigidos em 1.1.1/3.0). (— Vazamento do Twitch)
- **Declare versoes explicitas em manifesto** (package.json/Gemfile/requirements.txt) e use auditoria automatica (Dependabot). Nunca commite `node_modules`. (— Vazamento do Twitch)
- **Declare versao exata de linguagem/runtime/banco em todo projeto.** Node 16 vs 17, Postgres 9 vs 14 tem diferencas que so aparecem em prod se dev nao for identico. (— Setup Dev Arch+WSL2)
- **Use Docker Compose pros servicos locais**, nao instale bancos nativamente — assim dev nao roda v14 enquanto prod roda v9. (— Setup Dev Arch+WSL2)
- **Codigo nao pode ser largado sem manutencao** — frameworks/libs/infra precisam de update de seguranca continuo; sistema abandonado e invadido rapido. (— RANT)
- Custo total de armazenamento inclui o custo de **recuperar de falhas**, nao so o preco inicial (Akita escolheu Synology mais caro pelo software maduro de recuperacao). (— Redes Parte 6)
- Camadas de adaptacao entre sistemas sao alvos moveis instaveis — qualquer update dos dois lados quebra a camada do meio (WSL1 morreu por isso). Prefira ferramenta projetada pro problema (PowerShell pra recursos Windows). (— WSL 2)

---

## 13. AI Memory — arquitetura emergente sem RAG pesado

> Como projetar memoria/contexto pra agentes em 2026, com base no vazamento do Claude Code e na inversao do paradigma RAG.

- **Contexto longo inverteu a equacao do RAG.** Com Claude Opus 4.6 / Gemini 3.1 Pro a 1M tokens (abr/2026), retrieval pode voltar a ser simples (grep/BM25) e deixar o LLM fazer a filtragem semantica fina. "O R do RAG ficou mais simples e barato." (— RAG Esta Morto?)
- **Arquitetura de memoria do Claude Code (vazada):** `MEMORY.md` como indice (~25 KB) + topic files pros dados reais + **grep** pra buscar — sem vector DB, sem embeddings, sem Pinecone. 5 estrategias de compactacao de contexto quando necessario. (— RAG Esta Morto?)
- **Subagente `autoDream`** consolida memoria entre sessoes via busca lexical em transcripts, em paralelo ao agente principal, tratando resultados como **pistas verificaveis**, nao verdade absoluta. (— RAG Esta Morto?)

**Problemas reais de vector DB:** falsos vizinhos (cosseno acha topico, nao resposta), chunking destrutivo (corta tabelas/definicoes), falhas opacas (plausibilidade sem diagnostico), indice envelhecido (re-embedding continuo), custo operacional. (— RAG Esta Morto?)

**Grep + contexto longo vs RAG classico**
| | Grep + contexto longo | RAG (vector DB) |
|---|---|---|
| Infra | ~zero nova | stack complexa (8 etapas vs 4) |
| Frescor | sempre fresco (arquivo mudou → ja ve) | indice envelhece, re-embedding |
| Falhas | transparentes | opacas |
| Custo | mais barato | overhead operacional |
| Limite | nao escala pra TB; sofre com vocabulario disperso; latencia maior/query | bases gigantes, cross-lingual, economiza input |

(— RAG Esta Morto?)

**Custo (200k input + 2k output):** Sonnet 4.6 $0.63 · Opus 4.6 $3.15 · GLM 5 $0.12 · Gemini 3.1 Pro $0.42. Com prompt caching, queries seguintes custam centavos — vs ~$1.600-$3.200 de engenharia pra montar vector DB. (— RAG Esta Morto?)

**Estrategia Lazy Retrieval (default recomendado):** (1) docs brutos em disco → (2) filtro lexical rapido (ripgrep/BM25/SQL LIKE) → (3) carregar generosamente (arquivo inteiro/janela grande) → (4) LLM faz selecao fina → (5) **embeddings so se os dados mostrarem falha demonstrada.** (— RAG Esta Morto?)

**Quando RAG classico ainda faz sentido:** (1) bases 500+ GB onde grep esgota recursos; (2) vocabulario muito disperso (suporte ao cliente); (3) modalidades nao-textuais; (4) latencia <100ms com input restrito; (5) compliance/auditoria com rastreamento de chunks. Literatura: long context bate RAG em qualidade mas RAG economiza tokens (EMNLP 2024); nao ha bala de prata (LaRA, ICML 2025); hibrido lexical+vetor+reranker supera vetor puro (Anthropic 2024). (— RAG Esta Morto?)

---

## 14. Faca / Nao faca (resumo transversal)

**Faca**
- Comece minimo, deixe a abstracao emergir do codigo em producao.
- Cache + filas antes de pensar em trocar stack.
- Web server stateless; persistencia em backing service.
- 1 processo por container; versoes fixas; limites de recurso.
- Mecanismo mais simples que funciona dado o conhecimento atual.
- Meça (metricas/profiling) antes de otimizar.
- Deixe a arquitetura evoluir por etapas (framework produtivo → cache/filas → microservico so no gargalo) e use a linguagem certa pra cada peca.

**Nao faca**
- Copiar arquitetura de big tech / escolher tech por marca.
- Microservico/Kubernetes por moda ou no dia 1.
- Async/await pra operacao critica; tabela do banco como fila.
- Vendorizar libs; usar `latest`; SSH em container web.
- Cristalizar design completo antes de construir.
- Adicionar cache/Redis/fila sem confirmar onde esta o gargalo real.

---

*Fontes: videos do canal @Akitando e posts de akitaonrails.com (incl. ai-memory jun/2026 e "RAG Esta Morto?" abr/2026), consolidados a partir do compilado de engenharia Q1-2026. Atribuicao inline por titulo de video/post.*
