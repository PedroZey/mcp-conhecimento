# Linguagens, Stacks e Ambiente de Desenvolvimento — Decisões do Akita

Guia acionável para escolher linguagem, runtime, SO e ferramentas, mais o estado atual de LLMs como ferramenta de código — destilado das falas do Fabio Akita (@Akitando) e do blog akitaonrails.com.

---

## Regras de decisão (topo)

- **Use a linguagem certa para cada camada.** Não existe linguagem universal; existe adequação ao caso de uso. Turing-completude não implica eficiência — discutir se X ou Y é Turing-complete é perda de tempo de engenheiro; o que importa é eficiência e adequação (— O Computador de Turing e Von Neumann).
- **Padrão pragmático:** Python/JS para os ~80% de código "cola" e lógica de negócio; C/Rust/Go para os ~20% que exigem performance ou hardware, integrando via FFI/extensão nativa (— Python? Java? Rust? Qual a Diferença?).
- **Linguagens interpretadas são casca sobre C.** A performance real vem das libs C/C++/Fortran por baixo; `os.mkdir`, `math.sin`, `datetime.strftime` são wrappers finos da libc. Uma lib 100% Python nunca bate uma em C (— Python? Java? Rust?; Hello World Como Você Nunca Viu! | Entendendo C).
- **Desenvolva no ambiente mais próximo da produção.** Deploy é em Linux → desenvolva em Linux (ou WSL2/VM). Quanto mais próximo, menos surpresa (— O Guia DEFINITIVO de UBUNTU; Falando um pouco de MAC, LINUX e WINDOWS).
- **Em I/O-bound (web), a escolha de linguagem importa menos do que parece.** O gargalo é rede/banco, não CPU; linguagens interpretadas escalam horizontalmente com mais hardware e têm curva e pool de devs muito maiores (— Setting up Docker Compose and Postgres for Stress Testing).
- **LLM para código: ótima para o que é simples e está no treino; ruim para o novo, legado e ambíguo.** "Se a LLM tem conseguido resolver seus problemas, não é porque ela é boa, é porque seu problema é muito simples." (blog: *Quando LLMs não Funcionam pra Programar?*).

---

## Escolha de linguagem por camada

| Camada | Linguagens | Por quê |
|---|---|---|
| Kernel / drivers / baixa latência | C, C++, Rust, Swift (ARC) | Sem GC: GC reserva RAM extra e causa pausas inaceitáveis para drivers/SO/baixa latência |
| Ferramentas de infra / CLIs | Go, Rust, **Crystal** | Binário nativo estático, sem camada de script por cima |
| Sistemas distribuídos | Erlang/Elixir, Java | Erlang: consenso/tolerância a falhas nativos; Java: maturidade e ecossistema |
| Web / scripts / lógica de negócio | Python, JS/TS, Ruby, PHP | Produtividade, pool de devs, curva baixa |
| Data science / ML | Python (interface), C++/Fortran/CUDA (motor) | Python é só a casca; motor real é nativo |

Fonte da tabela: Python? Java? Rust? Qual a Diferença? | Discutindo Linguagens.

### Dados reais: do que as ferramentas-base são feitas (— Python? Java? Rust?)
| Projeto | Composição |
|---|---|
| NumPy | ~1/3 em C |
| SciPy | ~1/5 Fortran, ~1/5 C/C++ |
| TensorFlow | >50% C++, ~1/5 Python |
| PyTorch | ~50% C++ |
| Postgres | >85% C |
| MariaDB | ~50% C++, ~40% C |
| MongoDB | 72% C++ |
| Redis | ~80% C |
| Cassandra | ~100% Java |
| Kafka | ~75% Java, 22% Scala |
| OpenJDK | ~13% C++ (HotSpot JIT é C++) — nem Java é 100% Java |

Conclusão prática: bancos e infra são C/C++/Java por isso são maduros e rápidos. JavaScript runtime é escrito em C++; "praticamente tudo que importa é escrito em C e C++" (— Recomendação de Livros - Introdução a Design Emergente).

---

## Gerenciamento de memória e concorrência (o que afia a decisão)

- **GC (Java, C#, Go):** conveniente, mas reserva RAM extra e pausa execução periodicamente. Inaceitável para baixa latência/drivers/SO (— Entendendo C).
- **Sem GC:** C (manual), Rust (borrow checker — o paradigma mais distinto), Swift (ARC — contador de referências assistido pelo compilador). Bom balanço comodidade × eficiência sem custo de GC (— O que vem DEPOIS do Hello World | Consertando meu C).
- **Alocador troca performance sem mexer no código:** em binários nativos (C/C++/Rust), trocar o PT-Malloc2 padrão do Linux por **jemalloc** ou **TCMalloc** reduz RAM e aumenta performance; jemalloc gera menos leaks por fragmentação em servidores de longa duração (Facebook adotou por isso) (— Gerenciamento de Memória Parte 1). Go reimplementa o próprio alocador (mmap/madvise/sbrk, inspirado no TCMalloc; arenas de 8KB) — não decore os números dos bins, mudam por versão.

### Modelos de concorrência (— Concorrência e Paralelismo Parte 2; 16 Linguagens em 16 Dias)
| Plataforma | Modelo | Característica |
|---|---|---|
| Erlang/Elixir | Atores + scheduler **preemptivo** userland | Melhor modelo: green threads isoladas, sem memória compartilhada, sem ponteiros trafegados; supervisores; hot code loading |
| Java (JVM) | Threads reais | Scala/Clojure adicionam green threads via Akka (inspirado em Erlang) |
| Go | GoRoutines + Channels, scheduler **cooperativo** | Permite ponteiros nos channels → compartilha memória → riscos de race/deadlock como threads reais |
| Python/Ruby/PHP/Perl/JS | Single-thread / GIL | Melhor saída: reactor com fibers |

- **Concorrência ≠ paralelismo.** async/await e fibers dão concorrência (tarefas intercaladas num thread); paralelismo real exige múltiplos threads/processos em núcleos distintos. Ideal web: I/O assíncrono **+** múltiplos workers (— 16 Linguagens em 16 Dias). Ex.: ativar cluster (forks) no Node combina os dois.
- **Pool de conexões depende disso:** Java thread-safe compartilha um pool entre threads; Node single-thread/processo precisa de um pool por fork. Em cluster de N forks: pool por fork = MAX_CONEXÕES / N (5 forks × 20 = 100, igual a um pool Java de 100) (— Setting up Docker Compose and Postgres).
- **Cluster Erlang/Elixir é nativo:** instâncias compartilham estado em memória via RPC sem Redis externo (— 16 Linguagens em 16 Dias).
- **Erlang pré-aloca portas pelo limite de file descriptors do SO.** No Arch (limite alto) pré-alocava >1M portas, ~1.5GB RAM/instância e crashava na Rinha. `ERL_MAX_PORTS=2048` derrubou para ~160MB/instância (— 16 Linguagens em 16 Dias).

---

## Performance: categorias e benchmarks reais

- **Categoria A (compiladas nativas):** Rust, Go, C++, Java/Kotlin, C#, Crystal — performance bruta superior.
- **Categoria B (interpretadas):** JS/TS, Ruby, Python, PHP — abaixo em CPU-bound, **quase empatam em I/O-bound** (— Setting up Docker Compose and Postgres). Na Rinha de Backend várias linguagens ficaram comparáveis porque o gargalo era I/O.
- **Lean 4 chegou ao top 5 da Rinha** (linguagem de provas de teoremas da Microsoft Research, família ML), mas exigiu implementar do zero parser JSON, wrapper FFI para HTTP em C, framework e servidor web — nada disso existia na linguagem (dupla Sofia/Gabi) (— 16 Linguagens em 16 Dias).

### ARM vs x86 (por que o M1 ganhou) (— Turing Complete, Emuladores e o Chip ARM M1)
| Métrica | x86 (CISC) | ARM (RISC) |
|---|---|---|
| Tamanho de instrução | variável (1–15 bytes) | fixo (16/32 bits) |
| Instruções/clock | ~4 (Intel) | 8 (M1) |
| Registradores 64-bit | 16 | 32 |

- M1 de 2 GHz pode competir com Intel de 3–4 GHz só pela profundidade de pipeline → mais bateria, menos calor.
- **Emular x86 em ARM é fácil** (ARM tem instruções simples + registradores sobrando → Rosetta 2 roda Photoshop quase nativo); o inverso é caro (Rosetta 1, Intel emulando PowerPC, era lento).
- ARM dominou mobile e avança para servidores/desktop (Fugaku já era ARM em 2020).

---

## Sistema operacional, hardware e ambiente

### Faça
- **Priorize SSD antes de RAM** em máquina fraca — é a troca que mais impacta performance geral; RAM em segundo (— O Melhor Setup Dev com Arch e WSL2).
- **Instale `build-essential` primeiro** ao montar um Linux dev (gcc, make) — sem ele, gems/npm/extensões nativas falham (— O Guia DEFINITIVO de UBUNTU).
- **Use ASDF** como gerenciador universal de versões (substitui RVM/NVM/virtualenv): `asdf global <lang> <ver>`, `asdf local <lang> <ver>`, e fixe versão por projeto em `.tool-versions`. Rode `asdf reshim` quando um binário instalado (ex.: webpack, yarn -g) não for encontrado no PATH (— O Guia DEFINITIVO de UBUNTU; O Melhor Setup Dev com Arch).
- **Escolha distro madura** (Mint, Elementary; Arch/Manjaro se tem autonomia e usa a wiki). Para máquina lenta: Lubuntu/Puppy. Evite distro jovem de empresa pequena, ex. Pop!OS como daily driver por falta de histórico (— Falando um pouco de MAC, LINUX e WINDOWS).
- **OpenJDK em vez de Oracle JDK** — desde jan/2019 a Oracle cobra licença comercial; use OpenJDK ou suporte pago (ex.: Azul) (— Emacs vs Java | Oracle vs Google).
- **VS Codium em vez de VS Code** por privacidade (equivalente sem telemetria, como Chromium ↔ Chrome) (— O Melhor Setup Dev com Arch).

### Não faça
- **Não use versões Windows-nativas de Python/PHP/Node.** Dependências nativas são remendadas para libs proprietárias → comportamento/qualidade inferior; nunca funcionam 100%. Rode dentro de Linux/WSL2 — o que esvazia a razão de existir dessas versões (— Entendendo Back-End Parte 1; Entendendo WSL 2).
- **Não use versão Insider/beta em máquina de trabalho.** Akita perdeu o Docker após atualizar para Insider Preview e teve de reinstalar o SO (— O Melhor Setup Dev com Arch).

### Recomendação de SO por perfil (— Falando um pouco de MAC, LINUX e WINDOWS)
| Situação | SO |
|---|---|
| PC fraco | Linux (extrai o máximo do hardware) |
| PC mid/topo, sem software exclusivo | Linux preferível; Windows funciona |
| Apps iOS | Mac obrigatório |
| .NET pesado | Windows; mas .NET Core no Linux já cobre a maioria (C#/F#, SQL Server, Xamarin p/ mobile) |

### Games no Linux (nota de escopo)
- **Steam Proton/Wine+DXVK** roda a maioria dos games Windows no Linux sem configurar Wine jogo a jogo: Dota 2, CS:GO, Rocket League, Skyrim, Fallout funcionam; exceções existem (ex.: PUBG, anti-cheat incompatível). O suporte da Valve tornou Linux viável como plataforma gamer principal (— Falando um pouco de MAC, LINUX e WINDOWS). *(Apps híbridos Electron/React Native — Spotify, Slack, VS Code — não constam nas fontes deste compilado; fora de escopo aqui.)*

### GPU no Linux
- **Prefira AMD.** Intel/AMD suportam Mesa (drivers open source completos); NVIDIA só dá binário fechado + CUDA proprietário; Nouveau não tem performance para jogos/ML. AMD também tem melhor suporte a Wayland — NVIDIA atrasou a adoção. Akita usa AMD RX 6400 como GPU primária no host só por causa do Wayland (— A Longa História de CPUs e GPUs; Games em Máquina Virtual com GPU Passthrough).
- **NVIDIA discreta em notebook (Optimus, Linux):** nvidia-prime + Optimus Manager; `NV_PRIME_RENDER_OFFLOAD=1` direciona o app à GPU discreta e `VK_LAYER_NV_optimus=NVIDIA_only` força o Vulkan a usar a NVIDIA (não a Intel) (— A Longa História de CPUs e GPUs; *confiança média no nugget — confirme as variáveis na sua distro*).
- **ML com GPU não roda em WSL2** (não expõe GPU à VM) — use Linux nativo ou dual boot (— Entendendo WSL 2).

### WSL2 (— O Melhor Setup Dev com Arch e WSL2)
- **Nunca deixe projetos em `/mnt/c`** — acesso via protocolo P9 (tipo rede) adiciona overhead por operação; projetos Node (muitos arquivos pequenos) ficam lentíssimos. Mantenha dentro do `.vhdx` do WSL.
- **Monte discos físicos direto** com `wsl --mount \\.\PhysicalDriveN` (sem P9) ou crie `.vhdx` ext4; o mesmo disco virtual pode ser compartilhado entre distros.
- **Separe o `.vhdx` de SO do `.vhdx` de projetos** → reinstalar distro/migrar máquina sem copiar nada.
- Automatize a montagem no boot via Task Scheduler (Mount-VHD no startup; `wsl --mount` com delay de 1min, ambos como admin) e encurte o path com `ln -s /mnt/wsl/PhysicalDrive1 ~/projects`.
- **WSLg** roda apps gráficos Linux sem cliente X (bom para testes Selenium/Cypress; sem GPU, render por CPU). No Speedometer o Chromium no WSL fez 172 pontos, batendo o Edge com extensões.
- **debloate o Windows** logo após instalar (script Ledragox) — telemetria/Cortana; mesmo assim consome ~5GB de RAM no boot.

### Arch / pacman (— O Melhor Setup Dev com Arch e WSL2)
- AUR + `yay` instala pacotes de terceiros num comando (`pacman -S docker`), vs 4 passos manuais no Ubuntu (chave GPG, repo, update, install).
- Habilite downloads paralelos: em `/etc/pacman.conf` descomente `VerbosePkgLists` e adicione `ParallelDownloads = 5`.
- Substitua ferramentas Unix por versões Rust: `exa` (ls, ícones/cores), `bat` (cat, syntax highlight), `fd` (find), `ripgrep/rg` (grep). **Mas mantenha os originais em scripts** — `exa` quebra captura de listagem para arquivo texto.
- `zsh-autosuggestions` autocompleta pelo histórico em tempo real.

---

## Ecossistema importa mais do que mérito técnico

- **Framework dominante > muitos frameworks.** Fragmentação aumenta curva ao trocar de empresa e impede ferramentas (CI, monitoring, deploy) de mirar um alvo único. Rails: estrutura igual em todo projeto → dev produtivo na hora → permitiu Heroku, Travis CI, Code Climate, New Relic se especializarem (— A História de Ruby on Rails).
- **Killer app faz a linguagem, não o mérito.** Objective-C era de nicho Mac até o iPhone/App Store (2007) criar demanda urgente; Ruby só engatou ~10 anos depois (2004) via adesão dos signatários do Manifesto Ágil (— Falando um pouco de MAC; Entendendo Back-End Parte 2).
- **Ruby herda o espírito do Smalltalk (OO verdadeira).** Smalltalk era tido como a melhor OO de todos os tempos, mas sumiu nos anos 90 com o declínio de suas mantenedoras (Digitalk, ObjectShare); Visual Basic e Java deram o tiro de misericórdia. Ruby e Objective-C (da NeXT) foram os únicos sobreviventes do estilo Smalltalk — escolher Ruby foi acertar o improvável: carregava a herança da OO correta (— A História de Ruby on Rails).
- **Linguagem certa na época errada perde.** Erlang já tinha consenso distribuído nativo nos anos 80, mas o ecossistema Apache (Kafka/Cassandra/Hadoop/Zookeeper) foi feito em Java por ser a única opção multiplataforma produtiva nos anos 2000; Elixir chegou 5–10 anos tarde demais (— Python? Java? Rust?). O Twitter escolheu Scala em 2007 porque Kafka/Cassandra/Redis/Go/Elixir/Rust ainda não existiam (código liberado: ~2/3 Scala, ~30% Java) (— Desbloqueando o "Algoritmo" do Twitter).
- **Síndrome NIH custa caro.** Reescrever do zero em vez de contribuir duplica esforço e fragmenta a comunidade (Go fez compilador próprio em vez de LLVM; Mozilla reescreveu o Binaryen do Emscripten) (— Entendendo Apple, GPL e Compiladores).
- **Compatibilidade binária habilita migração incremental** — escolha que reduz risco de adoção: Swift ↔ Objective-C interoperam (LLVM modular, Lattner 2010); Kotlin/Groovy/Scala/Clojure compilam para bytecode Java e coexistem com Java no mesmo projeto. Contraexemplo: **Scala quebra compatibilidade binária entre versões** — cada release força autores de libs a recompilar/republicar (— Entendendo Apple, GPL; Entendendo Back-End Parte 2).
- **Crítica ao Go:** binário nativo estático, deploy simples, integra com Git — mas criado em 2009 ignorando avanços: sistema de tipos pobre, generics limitados, permite ponteiro nulo, sem sobrecarga de operadores. Ganhou por softwares populares (Docker) escritos nele (— Entendendo Back-End Parte 2).
- **std lib importa:** `std::map` (C++) e `TreeMap` (Java) já são Red-Black Trees; em Go/Rust você caça implementação no GitHub (— Árvores: O Começo de TUDO).

---

## Crystal para CLIs e ports (caso concreto)

> Fonte desta seção: blog akitaonrails.com, post *Portando 10 Mil Linhas de Python pra Crystal com Claude: easy-subtitle* (2026-03-07). Não há nugget de vídeo correspondente nos bundles deste repo — os números abaixo vêm do post citado, não de transcrição.

**Quando vale portar:** portar "só porque sim" (fetiche de Rust etc.) é perda de tempo — mas quando o custo cai de semanas para <1h com LLM, a equação muda. O objetivo legítimo: binário estático para jogar num server e esquecer, sem runtime Python nem pip quebrando.

**Caso easy-subtitle** (port de Subservient, Python → Crystal com Claude, 5 commits em <40 min):
| Métrica | Subservient (Python) | easy-subtitle (Crystal) |
|---|---|---|
| Código | 10.220 linhas / 6 arquivos | 2.516 linhas / 42 arquivos |
| Testes | 0 | 76 specs / 800 linhas |
| Deps runtime | 7 pip + ffsubsync (numpy, auditok…) | 0 (só webmock em teste) |
| Binário | precisa Python + deps | ~6MB estático |
| Config | INI | YAML |
| Sync engine | ffsubsync (Python) | alass (binário Rust) |
| UI | menu interativo | subcomandos CLI |
| Concorrência | ThreadPoolExecutor | fibers + channels |

- A redução de linhas **não é só mérito do Crystal**: o Python original era monolítico com UI misturada à lógica; o port separou em módulos focados (maior arquivo: 144 linhas vs 2.726 do `acquisition.py`).
- **Trocar dependência pesada por binário standalone** (ffsubsync→alass) elimina a maior cadeia de deps Python.
- Concorrência fica natural: `spawn` por candidato + `Channel` para coletar resultados, sem futures/callbacks. Rate limiting com `Mutex.synchronize` thread-safe, sem lib externa.

---

## LLMs como ferramenta de código (estado atual)

> Fonte desta seção: blog akitaonrails.com (*Quando LLMs não Funcionam pra Programar?*, 2025-05-01; *AI Agents: Qual seria a melhor Linguagem de Programação para LLMs?*, 2026-02-09) e o compilado legado `05-llm-research-2023-2025.md`. Não há nuggets de vídeo correspondentes nos bundles deste repo — os números, casos (Zig/Gemini, easy-subtitle) e listas de linguagens abaixo vêm desses posts, não de transcrição.

### Faça
- **Tenha intuição de quando falta informação no treino e forneça URLs** ao modelo.
- **Peça coisas pequenas e incrementais.** Nunca diga "corrija tudo" / "teste tudo".
- **Leia stacktraces e guie o modelo** sobre o que ignorar.
- **Testes são fundamentais** (validação crítica; nunca confie cego).
- **Setup local recomendado: Aider + Ollama + Qwen** (gratuito, privado, universal — Aider é production-ready e roda no terminal, sem IDE específica). Para entender por baixo: Tiny Qwen CLI (Python+Docker+PyTorch+CUDA). Outras peças: llama.cpp, vLLM.
- **Para código quer temperatura baixa** (mais determinístico) — ajustável via Modelfile do Ollama (Temperature/Top_P/Top_K).

Fontes (blog/legado): *Quando LLMs não Funcionam pra Programar?*; compilado legado `05-llm-research-2023-2025.md`. Itens de setup (Aider+Ollama+Qwen, llama.cpp/vLLM, temperatura baixa via Modelfile) provêm do legado/blog — não foram localizados nos nuggets deste repo; confira a fonte antes de tratar como falas literais de vídeo.

### Não faça / cuidado
- **Não confie em benchmarks sintéticos** — "muitos são MENTIRAS". O LiveBench testa trivialidades ("carregar 2 CSVs e comparar") mais simples que LeetCode/teste júnior. Sucesso em benchmark ≠ capacidade produtiva (blog: *Quando LLMs não Funcionam*).
- **Não use LLM como autoridade em linguagem nova/recente.** Teste em Zig (novo, experimental) com Aider+Gemini 2.5 Pro falhou: pouco material de treino e defasado, paths errados em loop infinito, confundiu tipos C (`c_int`) com Zig (`int32`), copiou headers inteiros sem filtrar, não resolveu um `std::bad_alloc` após horas. **Gasto: ~USD 35 de USD 100 (4–5h) para NÃO ter código funcionando** (blog: *Quando LLMs não Funcionam*).
- **Não ponha mais de ~4 arquivos no contexto** simultaneamente — o modelo raramente trabalha bem além disso.
- **Não nomeie projetos parecidos com OSS popular** ("my-react" confunde com React.js real).
- **LoRA atualiza conhecimento, mas não é trivial.** Para ensinar Zig recente a um Qwen3-8b: dataset custom + Unsloth + LoRA, servido via Ollama (legado `05-llm-research-2023-2025.md`, post *Ensinando Zig Mais Recente pra sua LLM - Treinando LoRAs*).

### Por que falha (a realidade dos dados de treino)
LLMs são boas em "copia e cola" do que viram muito no treino; o calcanhar de Aquiles é o novo (libs/versões/linguagens recentes). A maior parte do bom código de mercado é **fechado** (Amazon, Alibaba, iFood, MercadoLivre nunca liberam); LLMs só veem OSS do GitHub e Stack Overflow — "código BÁSICO E RUIM". Daí: **"Se a LLM tem conseguido resolver seus problemas, é porque seu problema é muito simples."** (blog: *Quando LLMs não Funcionam*).

| Aspecto | Posição do Akita |
|---|---|
| LLM para aprender | Excelente |
| LLM para código simples | Útil com supervisão |
| LLM para legado / requisito ambíguo | Limitado, exige muito contexto |
| Benchmarks de LLM | Enganosos |
| "Evolução infinita" | Questionável, há limites |

### Para onde isso aponta: a linguagem ideal para LLM
Exercício mental (blog: *AI Agents: Qual seria a melhor Linguagem de Programação para LLMs?*): se o usuário principal é o LLM, as prioridades de design humano se invertem. Açúcar sintático, convenções de nome, indentação, DRY e ocultação de complexidade ajudam humanos mas **atrapalham LLM** (whitespace do Python é hostil à tokenização; comportamento oculto força o modelo a simular o runtime).

O que ajudaria de verdade: metadados semânticos inline, rastreabilidade bidirecional (cada linha sabe por que existe), grafos de dependência consultáveis, rastreamento total de efeitos, semântica nativa de diff/patch, specs por restrição junto da implementação, e fim da sobrecarga ambígua. Proporção metadados:lógica ~3:1 (inverso das linguagens humanas) — "uma linguagem nativa para IA é principalmente especificação, proveniência e restrições com uma camada fina de computação".

Quem chega mais perto hoje (mas é hostil a humanos, por isso ninguém usa): **Lean 4, F\*, Idris 2** (nível 1); **Rust, Haskell, Dafny** (nível 2 — borrow checker e traits do Rust são rastreamento de efeitos por outro nome); **Elixir/Erlang, Scala 3, Ada/SPARK** (nível 3). A tensão central: "a linguagem ideal para IA é a que humanos continuam rejeitando". Direção plausível: humanos escrevem **especificação/blueprint**, a IA gera e mantém a implementação, verificação formal garante que concordam — texto vira view, não fonte (protótipo PACT-Lang, compilador em Rust feito pelo Claude).

---

## Notas históricas úteis para julgar uma linguagem

- **Linhagem real das linguagens de uso geral:** ALGOL → CPL → BCPL → B → C (não COBOL). Backus inventou BNF (metalinguagem) para o ALGOL (— Linguagem Compilada vs Interpretada).
- **Tipagem:** estática (declara tudo antes — Java/C++), dinâmica (em runtime — Python/Ruby), **inferência** (meio-termo Hindley-Milner — Scala, Swift, Rust, Kotlin, TS, Java 10+, C#). Lambdas/closures vêm do lambda calculus de Church; Ruby popularizou na web (— Entendendo Back-End Parte 2).
- **LLVM modular** é a base de Swift, Rust, Crystal, Julia, shaders de GPU e dezenas de front-ends — entender compiladores (léxico/sintático/IR/otimização) permite julgar qualquer linguagem nova por critério técnico (— Recomendação de Livros; Entendendo Apple, GPL).
- **Apple migrou de GCC para Clang/LLVM incrementalmente (2007–2011):** primeiro LLVM como code generator dentro do GCC (LLVM-GCC, Xcode 3.1/2007), depois substituição gradual até o Xcode 4.1 (macOS 10.7, 2011) ser o último com GCC; do Xcode 4.2 em diante, só Clang. A modularidade abriu o LLVM para front-ends de dezenas de linguagens — ActionScript, Ada, C#, Common Lisp, Crystal, CUDA, D, Delphi, Fortran, Haskell, Java bytecode, Julia, Kotlin, Lua, Objective-C, Pony, Python, R, Ruby, Rust, Scala, Swift, Zig (— Entendendo Apple, GPL e Compiladores).
- **Pipeline de compilação do Android: Java → bytecode → DEX → nativo.** Código Java vira bytecode Java, traduzido para o bytecode DEX (formato do Dalvik) e, nas versões recentes, pré-compilado para ARM nativo via AOT. O passo extra existe para aproveitar o ecossistema Java e atrair devs Java sem exigir nova linguagem (— Entendendo Apple, GPL e Compiladores).
- **Convenções vazam da linguagem de origem** — esteja consciente: Akita levou o prefixo `T` do Delphi para componentes VBScript (— Sua Linguagem É Especial? Parte 2).
- **PHP/LAMP:** dominou web open source mas o interpretador era tecnicamente ruim (memória, segurança, "quick and dirty" do Perl) e a comunidade fez "ilhas de produto" (WordPress/Joomla/Drupal) sem cultura de reuso, copiando a parte ruim do Java enterprise (Magento/Zend) (— Entendendo Back-End Parte 2; A História de Ruby on Rails).
- **A guerra server-side dos anos 90/2000:** PHP surgiu como extensão embutida no Apache (o próprio servidor interpreta a lógica e gera HTML, em vez de chamar um processo externo como no CGI); a Microsoft respondeu com ASP no IIS (1996), iniciando a guerra PHP × ASP — e gerando aberrações como o ColdFusion, que usava XML como linguagem de programação (— A História do Front-End para Iniciantes).
- **Python entrou no lugar do Perl** quando o Perl 5 estagnou e o Perl 6/Parrot nunca entregou (— Python? Java? Rust?).
- **Interpretadores tradicionais (Perl/Python/Ruby) start/stop rápido; Erlang/Java rodam indefinidamente** (hot code loading) — modelo-chave para entender DevOps/infra (— Entendendo Back-End Parte 2).
