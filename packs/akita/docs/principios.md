# Princípios e Filosofia de Engenharia — Fabio Akita

Como decidir, priorizar, gerir e escolher tecnologia do jeito de um sênior pragmático: trade-offs, design emergente, gestão de risco, processos, ética/licenças e a era da IA. Use como régua de decisão, não como tutorial.

---

## Regras de ouro (decida por aqui primeiro)

- **Não existe bala de prata nem metodologia universal.** Toda decisão é caso a caso; "seguimos o modelo X" é quase sempre sinal de erro. (— RANT: Projetos, TESTES e Estimativa???; RANT: Empreendendo com Software do JEITO ERRADO!)
- **Programação é escolher entre opções não-erradas com contextos diferentes** — como não há cor universalmente melhor, não há escolha técnica universalmente correta. (— Entendendo Back-End para Iniciantes Parte 1)
- **Na dúvida entre dois designs, escolha o mais fácil de mudar no futuro.** Bom design é o mais fácil de mudar que um ruim (corolário de David Thomas). (— Esqueça Metodologias "Ágeis")
- **Faça a coisa mais simples que funciona, meça com dados reais de produção, só então otimize.** Nada é automaticamente mais rápido (Redis ≠ mais rápido que Postgres por definição). (— #rinhadebackend Final Part; Modelagem de Software é Difícil?)
- **Software emerge, não se projeta de cima para baixo.** O código É o design e a especificação mais precisa que existe. (— Recomendação de Livros - Design Emergente; Discutindo Gestão)
- **Software nunca está "pronto":** diverge da spec em horas, não meses; one-shot prompt é mito. Software pronto é software morto. (— Software Nunca Está 'Pronto')
- **Errar cedo e consertar rápido > planejar demais.** Quanto mais detalhado o plano de algo desconhecido, mais errado ele estará. (— RANT: Projetos, TESTES e Estimativa???)
- **A métrica que importa é valor entregue / ROI / custo total de propriedade** — não throughput de sprint, lead time ou bugs corrigidos. (— Esqueça Metodologias "Ágeis"; Discutindo Gestão)
- **Engenharia é achar a solução do tamanho certo para o problema certo dentro das restrições** — nem mais, nem menos. (— Usando Git Direito)
- **IA acelera quem você é: se você é bom, acelera código bom; se é ruim, acelera dívida técnica.** A decisão final sobre qualidade é humana. (— VS Code é o novo Cartão Perfurado)

---

## Trade-offs: não existe almoço grátis

Toda decisão técnica troca uma vantagem por uma desvantagem. Entender o que está por baixo da abstração afia a escolha de quando usá-la.

| Dimensão | Trade-off | Fonte |
|---|---|---|
| Segurança/disponibilidade/durabilidade × performance | Mais de uma exige menos da outra; para ganhar performance, algo cai | Devo usar NOSQL? |
| Memória × ciclos de CPU | Economizar memória custa CPU e vice-versa; fórmulas universais tendem a ser mais lentas | Aprendendo Computadores com Super Mario |
| Processos × threads | Processos: isolamento/facilidade, mais recursos. Threads: baratas, exigem mutex manual, mais bugs | Concorrência e Paralelismo Parte 1 |
| Armazenamento | Setores menores desperdiçam menos mas são lentos; RAID 0 rápido e menos confiável; cache acelera escrita e arrisca perda | Quebrei 3 HDs |
| Linguagem × otimização | Trocar linguagem rende 5–10%; cache bem posicionado rende ordens de grandeza (5–10x) | Tornando sua App Web Mais Rápida |

- **Lookup table / cache** é técnica atemporal: troca espaço por acesso O(1). Aparece como Redis/Memcache e índices de banco. (— Aprendendo Computadores com Super Mario)
- **Abstração é mapeamento (DE-PARA):** traduzir o complexo no simples (CHS→LBA) é o motor da evolução; gastar processamento pra simplificar o que o dev precisa saber é justificável conforme o hardware melhora. (— Quebrei 3 HDs)
- **Produtividade frequentemente supera performance** em apps comerciais; escolha linguagem pelo problema, não pela moda. (— legado: Linguagens)

---

## Otimização e performance

**Faça / Não faça**

- **Faça:** otimizar com base em dados analíticos de produção real (New Relic, Scout). 80% dos problemas vêm de 20% da app. (— Tornando sua App Web Mais Rápida)
- **Faça:** implementar o mais ingênuo (insert direto no banco), rodar benchmark, achar o gargalo real com números, otimizar onde dói. Na Rinha, o gargalo era o modo de rede Docker, não o banco. (— #rinhadebackend Final Part)
- **Não faça:** otimizar no chutométro nem assumir que trocar um componente melhora performance.
- **Não faça:** gastar semanas por 1–2%; gaste horas por 5–10x. (— Tornando sua App Web Mais Rápida)
- **Boas práticas não consertam algoritmo ruim:** o compilador não conserta `SELECT *` numa tabela de 1 milhão de linhas pra pegar 1 registro — isso é responsabilidade sua. (— Linguagem Compilada vs Interpretada)
- **Você programa para pessoas, não para a máquina:** estilo/nomes/indentação economizam hora de programador (incluindo você daqui a dias), não hora de máquina. O que encareceu foi a hora do dev, não a RAM. (— Linguagem Compilada vs Interpretada)

---

## Gestão de projetos: variáveis, risco e priorização

**A trindade + a 4ª variável invisível:** escopo, custo e tempo são as três variáveis; é impossível maximizar as três. Como custo e tempo costumam ser fixos, o **escopo** é o que se ajusta. A **qualidade** é a 4ª variável: espremer escopo no menor tempo/custo a faz despencar, empurrando problemas pra operação e aumentando o custo total. (— Discutindo Gestão)

> "Igual ao Messenger em 1 mês? Claro, se você pagar a mesma coisa que o Facebook pagou." (— Discutindo Gestão)

- **Gestão de projetos é gestão de riscos.** 100% de certeza é impossível e contraproducente (mais ferramentas de controle = mais erros). Planeje pontos de corte curtos, teste por período limitado, corte cedo. ("100% de certeza que o carro não bate? Não tire da garagem.") (— Esqueça Metodologias "Ágeis")
- **Estime, não preveja:** ordens de grandeza (semana/mês/semestre/ano), não "743h e 54min". Estimativa ≠ compromisso. (— Projetos: Aprendendo a Priorizar; legado)
- **Se tudo é prioridade, nada é prioridade.** Priorizar é obrigatório porque tempo e recursos são finitos; o item de maior valor sempre no topo do backlog. (— Discutindo Gestão; RANT: Projetos, TESTES)
- **Faça o mais importante primeiro** (esferas grandes antes das bolinhas); o instinto de começar pelo fácil atrasa o que importa. (— Projetos: Aprendendo a Priorizar)
- **Não detalhe mais que 1–2 meses de backlog.** Tenha direção de longo prazo, detalhe só o curto — premissas mudam. (— RANT: Projetos, TESTES)
- **Garantir que o que funciona não quebre > velocidade de features.** Regredir é tempo e dinheiro perdidos duas vezes. (— RANT: Projetos, TESTES)
- **Cancele cedo o inviável** (e recuse projetos mal definidos — recusar também é ágil). Continuar projeto inviável só aumenta o prejuízo. (— Projetos: Aprendendo a Priorizar; Esqueça Metodologias "Ágeis")
- **Falácia do custo perdido:** o que já foi gasto não volta; decida só por custos/benefícios futuros. Insistir "pra não desperdiçar o investido" é irracional. (— pedagógico: sunk cost / Projetos: Aprendendo a Priorizar)
- **Prova de conceito:** prazo fixo de até 2 semanas, código descartável, valor está no aprendizado. Um time com 10 dúvidas caras (2–4 meses cada) descobriu que 7 não valiam a pena — economizou meio ano. (— RANT: Projetos, TESTES)
- **Horas extras como rotina** geram bola de neve de baixa qualidade ("como um projeto atrasa um ano? Um dia de cada vez") e indicam incompetência/má gestão, não dedicação. Exceção pontual ok. (— Discutindo Gestão; 10 Mitos sobre Tech Startups Parte 1)
- **Interrupções são desperdício:** tarefa de 1h interrompida por 5min vira 1h30+. Informe no momento certo; se tudo é alerta vermelho, ninguém presta atenção. (— Discutindo Gestão)
- **Reuniões são o oposto de trabalhar:** o que cabe em e-mail resolve-se em e-mail; reunião só pra bater o martelo. (— Discutindo Gestão)
- **Saber dizer não** é essencial; escolha as batalhas que pode ganhar (recursos são escassos). Gestor yes-man nunca é bom gestor. (— Discutindo Gestão)
- **Descrições de tarefa: concisas, não exaustivas.** UML/casos de uso detalhados/classes pré-definidas dão ilusão de controle e burocracia. Exigir que o dev liste classes/métodos antes de codar é absurdo. (— RANT: Projetos, TESTES)
- **Burocracia excessiva é muleta de quem não sabe o que faz** ("segui os procedimentos, a culpa não é minha"). Equipe que se comunica bem precisa de pouca formalização. (— RANT: Projetos, TESTES)
- **Novos projetos:** sênior interno lidera, terceiro/júnior embaixo dele. Nunca terceirize o projeto inteiro num modelo black box — o conhecimento tem que ficar dentro. (— Discutindo Gestão; RANT: Empreendendo)

**Ferramentas de gestão (caixa, não receita):** PMBOK é enciclopédia de termos (útil pra não reinventar a roda, não faz de você bom carpinteiro). Balanced Scorecard (Kaplan & Norton, fim dos anos 80) adicionou métricas não-financeiras à saúde da empresa. (— Discutindo Gestão)

---

## Métricas e incentivos

- **Métricas ruins criam incentivos perversos:** medir "bugs corrigidos" incentiva criar bugs. As pessoas seguem o caminho de menor esforço dentro das regras que você criou. (— Discutindo Gestão)
- **Números não são evidência:** story points/lead time/WIP são numerologia arbitrária; é fácil "torturar números pra contar a história que você quer". Sem coleta precisa, procedimento repetível e grupo de controle, dado não prova causalidade. (— Esqueça Metodologias "Ágeis")
- **Incentivos financeiros pioram tarefas cognitivas** (8 de 9 experimentos de Dan Ariely; 51 estudos da LSE sobre pay-for-performance). Funcionam só pra tarefas mecânicas. (— O Guia DEFINITIVO de Organizações)
- **Free Cash Flow** é a métrica de sustentabilidade: faturar mais que gasta. Operar no negativo justificando "crescimento" é risco estrutural — Meta, Shopify, Zoom demitiram em massa em 2022 por isso. (— Rant: A Bolha de Startups Estourou?)

---

## Por que software é diferente de engenharia física

- Software é "soft": sem peso/cor/cheiro, não obedece leis físicas. Dois devs com a mesma spec produzem código **completamente diferente**, com tempos em ordens de grandeza distintas (um medíocre: dezenas de linhas/horas; o melhor: 1 linha/minutos). Duas construtoras com a mesma planta entregam o mesmo prédio. Por isso técnicas de fábrica (Kanban Toyota, Lean, Six Sigma, Monte Carlo) **não se traduzem diretamente**. (— Esqueça Metodologias "Ágeis")
- **Programador não é operário — é arquiteto;** o compilador faz o trabalho mecânico. Software é mais jazz (improviso, intuição, time) que orquestra clássica. (— Discutindo Gestão)
- **Especificar com precisão antes de codar é impossível:** quanto mais precisa a doc, mais perto do código-fonte ela chega. (— Discutindo Gestão)
- **Não existe bala de prata** (Brooks, "No Silver Bullet"): não há Lei de Moore para software; estamos longe de uma ordem de grandeza de ganho em engenharia. (— The MM-M: O Melhor Livro de Software?)
- A ponta do iceberg: o que o usuário vê é mínimo perto de integração, banco, backoffice, relatórios, logística, faturamento. (— RANT: Empreendendo)

**Ordens de grandeza reais (a escala derruba tutoriais):**

| Item | Tamanho | Fonte |
|---|---|---|
| E-commerce de livro (Agile Web Dev w/ Rails) | ~2.700 linhas Ruby | Modelagem de Software é Difícil? |
| Spree Commerce | ~92.000 linhas (34x o tutorial) | Modelagem de Software é Difícil? |
| Magento 2 | ~2 mi PHP + 200k JS (700x) | Modelagem de Software é Difícil? |
| Hotsite simples | ~US$ 1.000 | RANT: Empreendendo |
| Protótipo funcional | ~US$ 10.000 (10x) | RANT: Empreendendo |
| Tech startup de verdade | ~US$ 100.000+ (100x) | RANT: Empreendendo |

---

## Design e modelagem emergente

- **O design nasce do código, não o contrário.** Fluxo: primeiro código que funciona (mesmo sujo) → refatorar com disciplina até estrutura sem bugs e fácil de manter. RUP/UML gerando código de diagramas nunca funcionou. (— Recomendação de Livros - Design Emergente)
- **Por que mudou:** nos anos 60–80 debugar era caríssimo (terminais lentos, KBs de RAM) — o código tinha que sair de primeira. Micros potentes + internet rápida nos anos 90 tornaram viável refatorar e deixar o design emergir. (— Recomendação de Livros - Design Emergente)
- **O manifesto ágil (2001) resume 20 anos de prática anterior** (XP/Beck 1999, Refactoring/Fowler 1999) — as técnicas vieram antes, não depois. (— Recomendação de Livros - Design Emergente)
- **Modelagem exige conhecimento do domínio, não só técnica:** se a regra de negócio está errada, a implementação está errada independente do pattern. Livros (DDD, Design Patterns) dão **vocabulário compartilhado**, não receitas. (— Modelagem de Software é Difícil?)
- **Domínio/bounded context é referência móvel:** "checkout" pode ser domínio próprio numa empresa e parte de "vendas" em outra. Emerge do contexto. (— Modelagem de Software é Difícil?)
- **Arquitetura responde à evolução do produto, não é plano fixo do dia 1.** Magento: 0 linhas (2007) → ~500k (2012) → 2 mi (2023), com trocas de dono mudando prioridades. (— Modelagem de Software é Difícil?)
- **O melhor programador toma a decisão possível no momento certo** — nem antes, nem depois. O pior é o incapaz de decidir. (— Modelagem de Software é Difícil?)
- **Versão 1.0 vai ser ruim — é normal.** Só fazendo muito software ruim se aprende o que é software bom; os gaps ficam aparentes com a prática. (— Modelagem de Software é Difícil?)
- **Débito técnico tem juros:** quanto mais demora pagar, mais caro e mais rápido cresce. Vale assumir dívida pequena com consciência de que será paga com juros. (— Usando Git Direito)
- **O melhor software é zero software:** Simplicidade = maximizar o trabalho que não precisou ser feito. (— O Guia DEFINITIVO de Organizações)
- **Minimalismo como vantagem:** fazer menos features e executar as básicas com excelência (escola Bauhaus → 37signals → Basecamp → Rails). Abraçar todo nicho destrói a integridade conceitual. (— A História de Ruby on Rails)

---

## Diagnóstico de problemas (debugging mental)

**Faça / Não faça**

- **Faça:** primeira hipótese = você não está sabendo usar a ferramenta. Trocar HW/SO/ferramenta é a última opção. (— Refletindo sobre RESOLUÇÃO de Problemas)
- **Faça:** primeira conclusão sobre performance ruim = "estou fazendo algo errado", não "a linguagem é ruim". Akita achou 15–20k inserts em Crystal, investigou e era bug do framework Lucky + config própria — não a linguagem. (— 16 Linguagens em 16 Dias)
- **Não faça:** trocar de linguagem/ferramenta no meio de uma emergência com prazo apertado — custo de aprendizado + bugs novos. (— Refletindo sobre RESOLUÇÃO de Problemas)
- **HW raramente é a causa raiz** de crash/travamento (HW fraco causa lentidão, não crash). Se roda em HW pior pra outros, é config/uso. (— Refletindo sobre RESOLUÇÃO de Problemas)
- **5 Porquês** chega à raiz (caso Toyota: baixa produção → operador anda 1,5m por material → estocar mais perto). (— Rant: Aprendizado na Beira do Caos)
- **Teoria das Restrições (Goldratt, "The Goal"):** conserte o elo mais fraco; ao consertá-lo, outro vira o mais fraco — repita. (— Rant: Aprendizado na Beira do Caos)
- **Benchmark não generaliza:** Rails/Java/Node/PHP pareciam "lentos" na Rinha; após ajuste de config (pool, batch insert) chegaram aos mesmos ~46.000 inserts de Rust e Go. O conjunto da obra importa mais que um resultado isolado. (— 16 Linguagens em 16 Dias)

---

## Escolha de tecnologia: não copie os gigantes

- **Você não é o Netflix/Google/Uber/Twitter.** 99,999% dos devs nunca chegará a uma fração dessa escala. Premissa errada: "o Google usa, logo devo usar". Premissa certa: "empresas de mesmo porte com os mesmos problemas talvez se beneficiem". (— Usando Git Direito; Devo usar NOSQL?; DevOps para Iniciantes Parte 1)
- Exemplos concretos: Apache Mesos (do Twitter) numa infra de 3 servidores é desperdício; o post "Uber migrou de Postgres pra MySQL" (2016) era sobre escala extrema e foi mal interpretado como motivo geral pra abandonar Postgres; monorepo faz sentido pro Google (1 bi de linhas, 25k engenheiros, 80TB), não pra time de 10–20. (— DevOps para Iniciantes; Devo usar NOSQL?; Usando Git Direito)
- **Ecossistema e documentação são fatores reais:** uma ferramenta com ecossistema maior pode vencer uma tecnicamente superior (Premiere vs DaVinci: docs/assets e custo de migração de assets). (— Refletindo sobre RESOLUÇÃO de Problemas)
- **Mantenha-se antifrágil:** o ecossistema muda a cada ~10 anos (anos 90 proprietário → 2000 open source → 2010 SaaS). O objetivo não é apostar no vencedor, é adaptar-se. (— Devo usar NOSQL?)
- **Adoção depende de cultura/mercado, não só de mérito técnico:** QWERTY persiste; armas chegaram primeiro ao Japão e a cultura da espada as condenou; Betamax > VHS em qualidade mas perdeu em tempo de conteúdo. (— 10 Mitos sobre Tech Startups Parte 1)
- **Convention over Configuration + DRY:** convenções sólidas deixam o framework inferir e dispensar boilerplate (J2EE com 100 arquivos e ~20 de regra de negócio → equivalente Rails em ~20 no total). (— A História de Ruby on Rails)
- **Frameworks opinionated preservam integridade conceitual;** consenso por comitê produz o mínimo denominador comum (Rails 5 ~ estrutura do Rails 1). **Extraia frameworks de produtos reais** (Rails veio do Basecamp; JSF veio de comitê sem produto). (— A História de Ruby on Rails)

---

## Brooks / Mythical Man-Month

- **Lei de Brooks:** adicionar pessoas a projeto atrasado atrasa mais. Caminhos de comunicação = N·(N-1)/2: 10 pessoas = 45 linhas; 15 = 105; 20 = 190. (— The MM-M)
- **Três perturbações ao adicionar gente:** reparticionar tarefas, onboarding, novas linhas de comunicação. (— The MM-M)
- **Comunicação é a causa principal de falhas** (metáfora da Torre de Babel: tinha tudo, faltou comunicação). Equipes pequenas devem se comunicar de todas as formas possíveis. (— The MM-M)
- **Planeje jogar fora o primeiro sistema** (quase sempre lento/grande/complicado demais); mudança é fato da vida. (— The MM-M)
- **Perigo do segundo sistema:** superengenharia — joga tudo que foi prudentemente deixado de fora (ex.: Windows Vista; ciclos de frameworks JS). (— The MM-M)
- **Waterfall já era criticado por Brooks (1995):** assume passar pelo processo uma vez e construir tudo de uma vez. Solução incremental (esqueleto funcional → preencher → compilar/testar → repetir) já estava lá; Royce adicionou feedback em 1970. (— The MM-M)

---

## Processos: agilidade real vs. cargo cult

- **Manifesto Ágil é declaração de valores, não metodologia.** "Ágil" é adjetivo (como você age), não substantivo que se compra. O erro foi soltar o manifesto sem orientação → contrataram consultoria pra implementar "processos e ferramentas" (justamente o que o 1º valor desprioriza). (— Esqueça Metodologias "Ágeis")
- **Agilidade = 3 passos + loop** (David Thomas): descubra onde está → dê um passo pequeno → avalie. Repita fractalmente, de nomear variável a definir arquitetura. Idêntico a PDCA, DMAIC, Kaizen, Sprint, MVP — todos variantes do método científico (tentativa e erro **disciplinado**, não ao acaso). (— Esqueça Metodologias "Ágeis"; Rant: Aprendizado na Beira do Caos)
- **Para iniciantes, estude XP antes de Scrum.** O que importa são práticas de desenvolvimento: TDD, Small Releases, Continuous Integration, Simple Design, Collective Code Ownership (hoje ≈ Git). Scrum/Kanban são gestão, não desenvolvimento. (— Esqueça Metodologias "Ágeis")
- **Kaizen (melhoria contínua) é o único processo permanente:** errar rápido, aprender, ensinar, não repetir. Toda metodologia é substituível; Kaizen não. Fonte real do Lean: Ohno e Shingo. (— O Guia DEFINITIVO de Organizações)
- **Sprint longo demais esconde reunião/interrupção demais** (segunda inteira de planning, sexta de review/retro = não dá pra ter sprint semanal). (— Discutindo Gestão)
- **"Agilidade de fachada"** (dailys e sprints sem entregar software funcional) não funciona. (— legado: Testes e Estimativas)

---

## Organizações e auto-organização

- **Modelos de gestão (Spotify, Scrum, Lean) são fotografias, não receitas.** Copiar a estrutura sem entender os princípios = fracasso. O próprio diretor de engenharia do Spotify (2018) disse que o paper de 2012 nem descrevia 2012 corretamente. (— O Guia DEFINITIVO de Organizações)
- **Cultura é fotografia — não algo a preservar;** muda com tempo/tamanho/pessoas. Entrar numa empresa "pela cultura de um post de blog" é entrar por foto desatualizada. (— O Guia DEFINITIVO de Organizações)
- **Auto-organização é o conceito central** do qual tudo deriva (squads, sprints, manifesto). (— O Guia DEFINITIVO de Organizações)
- **Trabalhe no "edge of chaos":** entre microgerenciamento (alta energia, estático, decai) e anarquia pura (ordem em tempo hábil → 0). A terceira via gasta menos energia, tolera erros e maximiza eficiência. (— O Guia DEFINITIVO de Organizações; Rant: Aprendizado na Beira do Caos)
- **Autonomia COM alinhamento:** liderança define o destino (alinhamento), times decidem o como (autonomia). Autonomia sem direção = anarquia; direção sem autonomia = microgerenciamento. (— O Guia DEFINITIVO de Organizações)
- **Empresa não é democracia:** quem não assume o risco financeiro não decide o ilimitado. Autonomia do funcionário cobre sua competência técnica (ferramentas, arquitetura), não estratégia/finanças. (— O Guia DEFINITIVO de Organizações)
- **Auto-organização só funciona com bons agentes:** baixa experiência se desenvolve, má conduta não tem cura — corte imediato do mal-caráter, independente da habilidade técnica. Um agente ruim sabota o grupo. (— O Guia DEFINITIVO de Organizações)
- **Antes de adotar qualquer modelo, elimine o desperdício:** corte quem não entrega, desfaça burocracia, desatole os líderes técnicos (eles já sabem o que fazer). Contratar coach antes disso é desperdício sobre desperdício. (— O Guia DEFINITIVO de Organizações)
- **Defina o problema objetivamente e ataque um de cada vez** (bugs/release? tempo até deploy? mudanças de escopo/sprint?) — o modelo adequado emerge, sem copiar o de outra empresa. (— O Guia DEFINITIVO de Organizações)
- **Transparência útil:** devs veem todo o código; DevOps toda a infra; designers o roadmap. Financeiro detalhado é inútil pra maioria. (— O Guia DEFINITIVO de Organizações)
- **Open source como modelo de auto-organização que funciona** (React, Redis, Git superam squads corporativos): código acessível, testes fáceis de rodar, bugs/roadmap no issue tracker, comunicação aberta e um "ditador benevolente" que garante integridade conceitual. (— O Guia DEFINITIVO de Organizações)
- **Lei de Conway:** a organização produz design que reflete sua estrutura de comunicação. Microserviços às vezes nascem porque duas equipes não colaboram, não por razão técnica. (— O Guia DEFINITIVO de Organizações)
- **Teoria X vs Y / Drive (Daniel Pink):** pessoas se motivam por **autonomia, mastery e propósito**; gestão cria ambiente, não controle. (— O Guia DEFINITIVO de Organizações)
- **Por que processos centralizados decaem:** 2ª lei da termodinâmica — sistemas fechados aumentam a entropia; ordem absoluta no máximo mantém e inevitavelmente deteriora ("Ordem e Progresso" é determinismo newtoniano já superado). (— Rant: Aprendizado na Beira do Caos)
- **Memes evoluem mais rápido que genes:** modelos organizacionais sofrem "mutação e seleção" em horas, não milênios. (— O Guia DEFINITIVO de Organizações)

---

## Engenharia de equipe e qualidade de código

- **Tech lead deve rejeitar PR sujo sem hesitar** (quebrado, sem testes, commits sem mensagem, coisas misturadas). Aceitar por prazo = ninguém limpa depois, a sujeira se acumula. Sênior que apagava commits da master sem teste → base toda coberta + produtividade subiu. (— Usando Git Direito)
- **Enforce bons hábitos no início;** maus hábitos viram cultura quando gente nova copia e a produtividade já caiu — aí é tarde. (— Usando Git Direito)
- **O código revela o nível real do dev**, independente do currículo (Akita: ~30 anos lendo código, ~100 devs na empresa, ~300 pessoas avaliadas). (— Akita, quais Cursos você recomenda?)
- **Em teste técnico, ataque o complexo/diferenciador primeiro** — candidatos floreiam o simples e ficam sem tempo no que revela capacidade real. (— Akita, quais Cursos você recomenda?)
- **Copiar código em teste é detectável e desqualificante** (comentários e console.logs idênticos nos mesmos lugares); falta de ética sinaliza como tratará produção. (— Akita, quais Cursos você recomenda?)

---

## Ética profissional, licenças e jurídico

**Faça / Não faça (open source e contratos)**

- **Faça:** auditar todas as dependências — GPL/AGPL são "virais" e NPM/PIP puxam centenas de transitivas; uma GPL acidental obriga a abrir o código. (— RANT: A Realidade do "Software Livre")
- **Faça:** ter tudo por escrito, assinado, com testemunhas. Acordo verbal/e-mail sem registro não vale nada (amigo de Stallman perdeu o e-mail de permissão do Gosling → processo no caso GosMax/Unipress). (— Emacs vs Java | Oracle vs Google)
- **Faça:** garantir no contrato que a propriedade intelectual do software é da contratante antes de começar. (— RANT: Empreendendo)
- **Não faça:** confiar na "boa vontade" de um vendor — só licença aberta formal garante direitos. Oracle comprou a Sun (US$ 7,4 bi, 2009) e em <1 ano processou o Google por Java (pedindo até US$ 80 bi). (— Emacs vs Java | Oracle vs Google)
- **Não faça:** usar NDA pra proteger ideia de startup — ideia raramente é original e a multa vira "preço de compra barato" pra quem quer copiar; o que importa é execução. (— 10 Mitos Parte 1; RANT: Empreendendo)
- **Não faça:** preço fixo em licitação cujo escopo será definido depois (item de trabalho "definir o escopo" com prazo já fechado é incoerente). (— RANT: Empreendendo)
- **Mudança de licença** exige consenso de **100%** dos contribuidores (até quem fez 1 commit); não é retroativa; não pode discriminar usuários (5ª cláusula OSI). Eclipse levou >1 ano (CPL→EPL); o PR da Lerna excluía empresas e Eric Raymond disse que "deserdaram da comunidade". (— A Controvérsia da Lerna vs ICE)
- **Dual licensing** é modelo de negócio válido: versão GPL (impede cópia proprietária) + versão comercial paga (cliente modifica sem abrir). Ex.: MySQL. (— RANT: A Realidade do "Software Livre")
- **Código não é o produto:** marca, operação, comunicação e reputação compõem o produto. Se o negócio cai quando copiam seu código, ele foi mal montado. (— RANT: A Realidade do "Software Livre")
- **Decisões técnicas têm consequência jurídica de longo prazo** — alegar ignorância da lei depois não elimina responsabilidade (Google sabia do risco do Java no Android). (— Emacs vs Java | Oracle vs Google)
- **Economia porca sai cara:** cliente recusou o preço, terceirizou pela metade, voltou em 6 meses e pagou o dobro pra consertar. Você recebe proporcional ao que paga. (— RANT: Empreendendo)
- **Nunca terceirize 100% do core num modelo black box;** terceiros trabalham junto dos internos, nunca em silos. (— RANT: Empreendendo)
- **Skin in the game:** só opine/decida onde você arca com a consequência de errar — força rigor (Akita manteve bitcoins e encerrou a Omnitrade com recursos próprios). (— A COVID-19 matou minha Startup?)

---

## Pensamento crítico (não terceirize suas decisões)

- **Consenso/popularidade não é verdade:** "2+2=4, não importa 1 milhão de likes num tweet dizendo que é 5." Avalie o argumento pelos méritos. (— Não Terceirize suas Decisões!)
- **Nunca valide informação pela reputação de quem fala** — vale pelo conteúdo e evidência. (— Mercado Financeiro Pós-Pandemia)
- **Questione o que todo mundo repete buscando o oposto** (Akita buscou "não faça o que você ama" porque "faça o que ama" estava em tudo). (— Procure o que você Ama... SÓ QUE NÃO!)
- **Correlação ≠ causalidade:** o cérebro cria padrões onde não há (IE market share × homicídios; temperatura global × nº de piratas). (— 10 Mitos Parte 2)
- **Vieses controlam decisões** mais do que se pensa: opt-in vs opt-out muda doação de órgãos de populações inteiras (Dan Ariely). (— 10 Mitos Parte 2)
- **Gurus surgem por acaso estatístico** (Taleb): num grupo grande de palpites binários, alguém acerta vários anos seguidos por sorte. Info genuinamente valiosa raramente é de graça. (— 10 Mitos Parte 2)
- **Modelos preditivos têm bugs e premissas erradas** — não embase decisão de alto impacto sem sanity check (analogia: não se coloca código em produção sem teste/revisão; ex. modelo de Ferguson/Imperial). (— Bate-Papo com Fernando Ulrich)
- **Informação ruim em abundância distorce tanto quanto a falta** — notícia boa "não vende ads". O mundo melhorou objetivamente (extrema pobreza caiu pela metade em 20 anos; 80% das crianças até 1 ano vacinadas). Pergunte a quem a narrativa beneficia. (— O Mundo Hoje É PIOR?)
- **A Revolução Científica foi da ignorância:** o avanço começou ao admitir que não sabemos as respostas (Harari). Questione o que acha que sabe; cuidado com receitas prontas e salvadores. (— 10 Mitos Parte 1)

---

## Inovação e empreendedorismo

- **Ideia é a parte menos importante; execução é tudo.** >4.000 patentes de ratoeira nos EUA, ~20 viraram produto; 400 novas patentes/ano sem ninguém bater na porta do inventor. (— 10 Mitos Parte 1)
- **Produto bom não se vende sozinho — a rede é determinante:** convença investidores, fornecedores, varejistas, clientes e até competidores. (— 10 Mitos Parte 1)
- **Inovação depende de ecossistema preexistente:** Gutenberg (1440) precisou de papel (China, 105 a.C.) e escrita (3000 a.C.). Inventar antes do ecossistema é inútil. (— 10 Mitos Parte 1)
- **Oportunidades não se planejam, mas exigem preparo:** Darwin (22 anos, HMS Beagle, 1832) estava preparado quando o timing surgiu; Wallace chegou à mesma teoria sem o contexto. Faça bem o que sabe e mantenha-se preparado. (— 10 Mitos Parte 2)
- **Para disrupcionar um mercado, tenha vivido nele** (ou um sócio que viveu) — disrupcionar medicina sem nunca ter trabalhado em hospital é loteria. (— Conhecendo a SAP!)
- **Ciclos de bolha são inevitáveis em tech** (ponto-com 2001; 2008; 2018 = 1 unicórnio a cada 4 dias). Unicórnios inflados são "mulas disfarçadas" (estudo: 65 de 135 perdem o status após ajuste). **VC não é modelo de negócio** (Uber: receita 11 bi, prejuízo operacional 3 bi pré-IPO; 80% dos IPOs de 2018 não eram lucrativos). IPOs entregam abaixo do esperado (Snap 17→11; Blue Apron 10→3; Fitbit 45→5; Lyft 88→61). (— A Bolha de Startups vai Estourar?)
- **Crashes deixam legados:** a fibra ótica do boom ponto-com viabilizou banda larga e smartphones. (— A Bolha de Startups vai Estourar?)

---

## Carreira e mentalidade

- **Ame o esforço, não a atividade:** satisfação vem de fazer o melhor agora; ramo/cargo/empresa não determinam a qualidade do seu trabalho — você determina. (— Procure o que você Ama... SÓ QUE NÃO!)
- **Insatisfação vem de não gostar do que você mesmo produz** — fazer o mínimo perpetua o ciclo. (— Procure o que você Ama)
- **Mova uma pedra de cada vez: volume supera talento.** 1001+ posts, 200+ palestras = esforço acumulado, não inspiração nem talento inato. (— Procure o que você Ama)
- **Seja júnior de novo:** o prazer está no progresso incremental, não no patamar grandioso. (— Procure o que você Ama)
- **Mostre como fazer certo, não diga;** apontar defeito é trivial, modelar o comportamento gera mudança. (— Procure o que você Ama)
- **Conteúdo baseado em experiência prática supera pesquisa superficial** — aprenda com quem testou na prática, não com quem repete o que leu. (— De AkitaOnRails para Akitando)
- **Aprender a aprender = se virar sem validação de ninguém, sofrer e não desistir;** roadmap completo leva 3–5 anos. Programar não é fácil; "qualquer um programa" é marketing enganoso. (— legado: Carreira)
- **"Não sabendo que era impossível, foi lá e fez":** a Sofia escreveu parser JSON, wrapper FFI HTTP, framework e servidor web do zero em Lean 4 (sem essas libs) e chegou ao top 5 da Rinha. (— 16 Linguagens em 16 Dias)

**Palestra é pitch de vendas** (— 9 Dicas para Palestrantes): foque no **problema do público**, não nas qualidades da solução; conecte-se emocionalmente com dores reais (o "como funciona" qualquer um acha no Google); não apresente "20 milhões de transações/s" pra plateia que só quer terminar o produto.

---

## IA na engenharia (2026)

**Posição:** pragmática — nem hype, nem rejeição ideológica. Usa IA desde 2023/GPT-2. "A caixa de Pandora já foi aberta." (— legado; RANT: IA acabou com programadores?)

**Regras acionáveis**

- **A IA reflete quem você é:** acelera código bom de quem é bom; acelera dívida técnica de quem é ruim. Erros agora são produzidos **em escala** — o fundamento ficou MAIS crítico. (— VS Code é o novo Cartão Perfurado)
- **VS Code virou o novo cartão perfurado:** desde o fim de 2025, agentes (Claude Code, Codex, OpenCode) são a interface primária; o editor ficou em segundo plano. O papel mudou de "digitador" para tech lead + product owner + QA + gerente de fluxo. (— VS Code é o novo Cartão Perfurado)
- **TDD é MAIS importante com IA, não menos:** o agente modifica com confiança porque os testes são rede de segurança. Sem disciplina (TDD, CI, small releases, refactoring) a IA produz código rápido que acumula dívida. (— Software Nunca Está 'Pronto'; legado)
- **Você decide qual código escrever; a IA executa.** Ela implementa um circuit breaker quando você pede, mas não tem contexto operacional pra pedir um (caso: cron triplica queries no domingo → circuit breaker, não retry com backoff). (— Software Nunca Está 'Pronto')
- **Não reescreva do zero:** reescrever sempre gera bugs novos desconhecidos; corrija pontualmente no existente. Linguagem mais "nova" não é automaticamente melhor. (— RANT: IA acabou com programadores?)
- **Nenhuma IA acha todos os bugs** — detecção é heurística, nunca 100%. "Martelo não serve pra girar parafuso." (— RANT: IA acabou com programadores?)
- **One-shot prompt é mito:** software diverge da spec em horas, não meses. A spec perfeita exigiria saber de antemão tudo que vai dar errado — e aí você não precisaria dela. (— Software Nunca Está 'Pronto')

**O que a IA faz bem vs. mal**

| Faz bem | Faz mal |
|---|---|
| Boilerplate, prototipagem, debugging básico | Decisões arquiteturais |
| Análise de legado, refatoração, testes unitários | Contexto de negócio profundo |
| Sugestões de melhoria, análise de segurança/perf | Tende a soluções genéricas; exige validação |
(— legado; RANT: IA acabou com programadores?)

**O "teto" e a bolha**

- Sem nova arquitetura (desde "Attention is all you need"), evolução é curva em S com retornos decrescentes (GPT-4→5 quase imperceptível); treinar cada geração custa exponencialmente mais; acabaram os dados de treino na web → dados sintéticos batem em diminishing returns; Stack Overflow em declínio. (— RANT: IA acabou com programadores?)
- **A bolha de IA vai estourar — mas a IA continua** (como a Internet pós-2001, como a IA pós-inverno dos anos 70). Ciclo econômico ≠ ciclo tecnológico. "Não aposte todas as fichas no mesmo cavalo." (— RANT: IA acabou com programadores?)

**Mercado de trabalho**

- A IA substitui **programadores ruins** ("chef de miojo", bootcamp de 1 mês), não os bons — e isso é positivo. A bolha de programação estourou no fim de 2022, antes do ChatGPT. Front-end (alto volume, baixo valor) é o mais afetado. (— RANT: IA acabou com programadores?; legado)
- **Continuem contratando júniores:** sêniores não são imortais e precisam criar substitutos; mentoria agora tem a LLM na caixa de ferramentas. "Sênior incapaz de criar substituto não é sênior, é liability." (— RANT: IA acabou com programadores?)
- **Júnior com fundamento** usa o agente como exoesqueleto e aprende mais rápido; **sem fundamento** terceiriza a própria ignorância e confunde "funciona localmente" com "pronto pra produção". (— VS Code é o novo Cartão Perfurado)
- **LLMs copiam o que existe, não inventam categorias novas:** copiar GCC não substitui Linus nem Stallman. (— RANT: IA acabou com programadores?)

**Provas numéricas de que produção ≠ demo** (fevereiro/2026, 1 pessoa + 1 agente):

| Projeto | Tempo | Total | Pós-produção |
|---|---|---|---|
| M.Akita Chronicles | 8 dias | 335 commits, 1.422 testes | 56 commits / 10 dias, +99 testes |
| Frank Sherlock | 7 dias | 103 commits, 621 testes, 7 releases, 3 OS | 53 commits, face detection e vídeo emergiram do uso |
| FrankMD | ~4 dias | 226 commits, 1.804 testes | 14 commits, 3 contribuidores externos |
| FrankMega | 1 dia | 28 commits, 210 testes | 2 commits (MIME types `.dmg/.deb/.msi`) |
| **Total** | — | **692 commits, 4.057 testes** | **125 commits pós-publicação** |

- Bugs que só existem em produção: Gmail corta e-mail >102KB; Steam API retorna datas em PT-BR; Windows usa UNC paths `\\?\`; TTS em "Auto" mistura sotaque. Nenhum previsível por spec. (— Software Nunca Está 'Pronto')
- "Software pronto é software morto. Software vivo itera." Pós-produção não é manutenção — são features novas, refactoring de arquitetura e hardening. (— Software Nunca Está 'Pronto')
- **O gargalo é a experiência do dev, não a velocidade da IA.** A IA digita rápido; você sabe o que digitar. (— Software Nunca Está 'Pronto')

---

> Fontes: nuggets das transcrições do canal @Akitando (vídeos citados inline), blog akitaonrails.com (posts citados inline) e o legado `01-panorama-completo.md`. Toda afirmação não-óbvia é rastreável à fonte indicada.
