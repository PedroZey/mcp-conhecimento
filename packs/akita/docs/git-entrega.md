# Git e Entrega Contínua

Como um senior usa Git no dia a dia e entrega software em produção, destilado das falas e posts do Fabio Akita (@Akitando). Regras acionáveis no topo; modelo mental e história ao final, só onde afiam a decisão.

---

## Regras de ouro (faça isto sempre)

| Regra | Por quê |
|---|---|
| 100% do código no Git. Nada existe fora do repositório. | Editar arquivo via SSH/FTP no servidor significa que a mudança não está no Git: se o servidor falhar, ela se perde e ninguém sabe por que parou (— A Forma Ideal de Projetos Web \| Os 12 Fatores). |
| `git init` em qualquer projeto, mesmo sem remote. GitHub é opcional; Git é obrigatório. | Git não requer infra externa; controle de versão local já vale (— Protegendo e Recuperando Dados Perdidos). |
| Commits pequenos e frequentes ao longo do dia, mesmo parciais/feios. | Commit parcial é infinitamente melhor que perder o trabalho num acidente (— Protegendo e Recuperando Dados Perdidos). |
| Cada commit = uma coisa coesa (uma feature, um bug, um doc). Nunca misture contextos num `git add .`. | Misturar CSS de tela com linha de README sobre infra no mesmo commit quebra a rastreabilidade (— Usando Git Direito). |
| `git status` antes de todo commit. Cuidado com `git add .`. | `.gitignore` é a primeira defesa, mas a revisão manual é insubstituível (— Subindo Aplicações Web em Produção \| Heroku). |
| Limpe o histórico do branch ANTES de mergear na main. | Mensagens como "fixing", "hotfix", "atualizando" são inaceitáveis no branch principal (— Usando Git Direito). |
| Quem escreveu o código não faz o merge na main. Code review universal, ninguém imune. | Cria pressão peer-to-peer que torna visível falta de teste, gambiarra e baixa qualidade antes de ser ingerenciável. É a PRIMEIRA prática a institucionalizar — antes de qualquer ritual ou métrica (— Começando na Carreira de TI). |
| Main/master é sagrada: sempre com todos os testes passando. Tudo inacabado vai em branch separado. | Só código verde no CI entra na main (— Os 12 Fatores). |
| Integre todo dia: pelo menos um pull + rebase por dev por dia. | Quanto mais demora pra integrar, maiores e mais difíceis os conflitos e mais bugs sobem (— Os 12 Fatores). |
| Mergeie com frequência. | O ancestral comum fica recente e o diff pequeno; adiar merge evita custo imediato mas aumenta o custo futuro exponencialmente (— Entendendo GIT). |
| Deploy via `git push`, não FTP. | Push dispara build, instalação de deps e restart dos containers; atualizar via FTP é a pior forma possível de deploy (— Subindo Aplicações Web em Produção \| Heroku). |
| Tenha rollback rápido e versionado. | Bugs podem aparecer só em produção; rollback atômico por versão limita o impacto (— Rant: Projetos, TESTES e Estimativa). |

---

## Higiene de commits (reescrever histórico do SEU branch)

Regra-mestra: **reescreva história só no seu branch pessoal; NUNCA na main.** No seu branch faça quantos commits feios/parciais/experimentais quiser; limpe antes do PR (— Protegendo e Recuperando Dados Perdidos).

| Situação | Comando | Nota |
|---|---|---|
| Mensagem do último commit errada | `git commit --amend -m "msg correta"` | Operação de segundos, indolor; corrija na hora (— Usando Git Direito). |
| Fechar commit parcial do dia anterior num commit final | `git commit -m "código final" --amend` | Substitui o "código no meio" antes do push (— Protegendo e Recuperando Dados Perdidos). |
| Vários commits "fixing" pra unificar antes do push | `git reset --soft HEAD~N` | Tira os commits do grafo SEM perder mudanças; elas voltam pro stage e você refaz um commit limpo (— Usando Git Direito). |
| Squash interativo seletivo | `git rebase -i HEAD~N` | Troque `pick` por `squash`; pode pular commits do meio se não fizer sentido mesclar. `fixup` é squash que descarta a mensagem combinada (— Usando Git Direito). |
| Misturei contextos no stage com `git add .` | `git add -i` → opção 3 (`revert`) | Tira arquivos do stage sem perder mudanças; opção 2 (`update`) faz o oposto (— Usando Git Direito). |
| Hunks do MESMO arquivo em commits separados | `git add -p` | Responde y/n por hunk; use `s` (split) pra dividir hunks agrupados (— Usando Git Direito). |

`git reset --soft` vs `--hard`: **soft** remove só os commits do grafo e devolve as mudanças ao stage (reescrever sem perder trabalho); **hard** remove os commits E descarta as modificações — undo sem recuperação aparente (— Usando Git Direito).

---

## Rede de segurança / recuperação

| Perda | Recuperação |
|---|---|
| Arquivo deletado, ainda não commitado como deleção | `git checkout <arquivo>` (volta ao último commit; só funciona se você commita com frequência) (— Protegendo e Recuperando Dados Perdidos). |
| `git reset --hard` acidental | `git reflog` acha o SHA1 perdido → `git checkout -b <branch> <SHA1>` antes do garbage collector rodar. Commits "deletados" ficam no banco marcados pra GC, como a lixeira do Windows; `git gc` é quem apaga de fato (— Usando Git Direito). |
| Repositório central corrompido ou rebaseado indevidamente | Como cada dev tem cópia completa, recupera-se comparando hashes entre máquinas; quem ainda não deu pull pode force-push a versão original de volta. Múltiplas cópias = consenso rudimentar: a versão mais diferente provavelmente é a errada (— Criptografia na Prática). |

Backup sem serviço externo: clone bare em pendrive/HD — `git clone --bare /media/pendrive/projeto.git`, `git remote add origin ...`, `git push origin master` (— Protegendo e Recuperando Dados Perdidos). Em emergência (GitHub fora): `git update-server-info` + mover hook `post-update.sample` + `python -m http.server 8000` no clone bare, exposto via ngrok pra colaboradores clonarem/fetcharem (— Protegendo e Recuperando Dados Perdidos).

---

## Arquivos que NÃO entram cru no Git

- **Binários grandes (Photoshop, vídeo, áudio, instaladores): use Git LFS** antes de adicionar o arquivo — `git lfs install` + `git lfs track "*.psd"`. O Git não faz delta de binário: grava o arquivo inteiro a cada commit. Photoshop de 200MB commitado 5 dias = 1GB no repo, e todo clone baixa o histórico inteiro (— Usando Git Direito). Com LFS, o binário vai pra `.git/lfs` e o commit guarda só um ponteiro de texto; o clone baixa só a versão mais recente (— Usando Git Direito).
- **Senhas / credenciais: jamais.** Apagar o arquivo depois não basta — o histórico preserva o conteúdo. Se aconteceu: BFG Repo Cleaner (ou `git filter-branch`) pra reescrever todo o histórico → `git reflog expire` + `git gc` → toda a equipe faz novo clone (— Usando Git Direito).
- **Repo já inchado de binários antigos:** adicionar LFS só nos commits novos não limpa o passado. `git clone --mirror` → BFG (ferramenta Java, muito mais rápida que `git filter-branch`) removendo blobs acima de X ou arquivos específicos → `git reflog expire` + `git gc` + `git push`. Equipe inteira re-clona (— Usando Git Direito).

Por que re-clonar: o SHA1 de cada commit inclui o SHA1 do pai, então remover algo de um commit antigo muda o hash dele e de todos os subsequentes — toda a história é reescrita (— Usando Git Direito / Criptografia na Prática).

`docker-compose.yml`: versione e mantenha atualizado no repo. O erro comum é cada dev ajustar serviços só na própria máquina e não subir — novos membros baixam config desatualizada e quebram (— Entendendo Funcionamento de Containers).

---

## Pipeline de entrega contínua

Fluxo correto de deploy: desenvolver local → commit com mensagem descritiva → `git push` pro ambiente. No Heroku, `git push heroku main` dispara build da imagem, instalação de deps e restart dos containers (— Subindo Aplicações Web em Produção \| Heroku).

Práticas que sustentam o pipeline:

- **CI em todo PR.** Configure CI (GitLab CI, CircleCI, Travis, Semaphore) pra rodar a suíte automaticamente antes da aprovação. O revisor só checa o código; o CI diz se passou — merge só com tudo verde. Exemplo real do Akita: PR interno aprovado em pouco mais de 5 min, incluindo checagem de segurança com Brakeman (Ruby) (— Rant: Projetos, TESTES e Estimativa).
- **Review apps por PR.** Staging isolado por pull request (ex: Heroku Review Apps, URL própria por PR) deixa o QA testar cada mudança em paralelo, sem serializar tudo num único staging (— Rant: Projetos, TESTES e Estimativa).
- **Feature flags** pra funcionalidade que leva semanas. Não é desculpa pra não integrar: esconda atrás de flag (env var ou permissão por usuário). Código integrado continuamente, feature invisível até ser aprovada (— Os 12 Fatores).
- **Deploys frequentes** — múltiplos por semana ou por dia, ao menos em staging. Equipe que passa semanas sem deployar demonstra incompetência de gerência (— Os 12 Fatores). Quanto mais tempo entre deploys, mais código não testado acumula em produção e maior a chance de falha; deploys frequentes limitam o escopo de cada mudança e facilitam achar o que quebrou. O "fail fast" do Spotify é deliberado (— Desconstruindo o Modelo Spotify).
- **Rollback versionado.** Heroku mantém releases numeradas; `heroku releases:rollback v10` quando v11 quebrou. Impossível de fazer rápido e organizado no modelo FTP (— Subindo Aplicações Web em Produção \| Heroku).
- **Deployment automatizado, não tarefa de especialista.** O Capistrano (2006) popularizou orquestração SSH no Rails e inspirou Fabric/Ansible em Python; antes dele, subir app era manual e chato a ponto de existir cargo de infra só pra isso (— A História de Ruby on Rails).

### Faça / Não faça — entrega

| Faça | Não faça |
|---|---|
| Deploy em qualquer dia, inclusive sexta | Ter medo de deploy na sexta |
| Suíte de testes verde + rollback rápido | Tratar deploy como evento de adrenalina |
| Build imutável e versionado (`docker build`), execução só sobe containers a partir dele | Editar arquivo direto no servidor via SSH/FTP |
| Velocidade histórica da equipe pra planejar | Forçar escopo "na marra" pra caber na semana |

Medo de deploy na sexta não é problema do dia da semana — é falta de testes, CI e rollback. Com isso, deploy vira evento tedioso, que é o estado desejado. (Akita cita o caso do dev que subiu Java 16→18 em produção numa sexta e causou desastre.) (— Rant: Projetos, TESTES e Estimativa).

Separe **build** (gera imagem imutável) de **release/run** (sobe containers a partir da imagem); cada release tem ID único e imutável (Fator 5). Com builds imutáveis e versionados, rollback é trivial (— Os 12 Fatores).

Planejamento: use a **velocidade histórica** (quantas tarefas a equipe entrega em média por semana), não estimativa individual. Akita observou ~8-9 unidades/semana de média, e que semanas mais fracas coincidiam com deploys que geravam bugs (— Rant: Projetos, TESTES e Estimativa). Rituais ágeis (planning, review) são pontos de coordenação, não burocracia; se ninguém participa de fato, elimine ou repense (— Rant: Projetos, TESTES e Estimativa).

---

## 12 Fatores — os que tocam Git e entrega

(Lista completa no contexto de arquitetura; aqui só o que decide fluxo de código/deploy.)

- **Fator 1 — Codebase:** uma única base de código no Git, múltiplos deploys (staging, prod) a partir dela. Um repo exclusivo por app (— Os 12 Fatores).
- **Fator 5 — Build/Release/Run:** estritamente separados; cada release com ID único e imutável; nunca alterar código em produção (— Os 12 Fatores).
- **Fator 10 — Dev/Prod Parity:** dev, staging e prod o mais similares possível; exige build automatizado, deploy frequente e jamais editar no servidor. CI buildar e testar a cada commit e, se verde, deploy automático. Nada de demorar um mês pra fechar release: quanto mais demora pra integrar/deployar, mais rápido crescem bugs e conflitos (— Os 12 Fatores).
- Complementares ao fluxo: testes obrigatórios, CI detecta cedo, CI/CD automatiza deploy (— Os 12 Fatores).

---

## Modelo mental do Git (entenda pra usar avançado, não decore comandos)

Tutoriais ensinam só os comandos **porcelain** (alto nível: `git add`, `git commit`); entender o **plumbing** (baixo nível: `git hash-object`, `git cat-file`, `git write-tree`, `git update-index`) revela como funciona por dentro (— Entendendo GIT). Vale porque entender a estrutura permite usos avançados — integrar a pipelines de deploy ou até um mini-clone de Dropbox (— Conhecimentos Básicos para Iniciantes).

- **Três estágios:** Working Tree (onde você edita) → Stage/index (estaciona o que vai no próximo commit) → Commit (empacota o stage com metadados e gruda o nó no grafo sob a HEAD) (— Usando Git Direito).
- **Git é uma Merkle DAG.** Banco de objetos em `.git/objects` com três tipos: **blob** (conteúdo bruto), **tree** (nomes/estrutura de diretório), **commit** (ponteiro pra uma tree + autor/data + SHA1 do pai). ID de cada objeto = SHA1 do conteúdo → integridade automática (— Entendendo GIT). Blob: header `blob <tamanho>\0` + conteúdo, comprimido com Deflate/zlib, salvo em `.git/objects/<2 chars>/<38 chars>` (os 2 primeiros chars subdividem pra não estourar entradas por diretório) (— Entendendo GIT).
- **Branch = ponteiro de 41 bytes** com o SHA1 de um commit. Criar branch é instantâneo e quase de graça (— Entendendo GIT).
- **Git rastreia conteúdo, não arquivos/diretórios.** Por isso renomear num branch + deletar noutro mergeia certo (rastreia o conteúdo, não o nome), enquanto CVS/SVN geravam conflito insolúvel. E por isso **diretório vazio não entra no repo** — frameworks usam `.gitkeep` pra reservá-lo (— Entendendo GIT / Usando Git Direito).
- **Merge three-way** (compara as duas versões com o ancestral comum) resolve a maioria dos conflitos automaticamente; CVS/SVN usavam two-way (só as duas pontas, sem origem) e empilhavam conflitos. Torvalds fazia merge de 22.000 arquivos várias vezes ao dia em menos de meio segundo (— Entendendo GIT).
- **`.git` é o repositório real;** os arquivos que você vê são espelho do banco de objetos. Apagou tudo? `git checkout` recupera, sem servidor (— Entendendo GIT).
- **Distribuído de verdade:** clona via SSH, rede local, pendrive ou outro diretório. A diferença pro GitHub são umas linhas de `remote` no `.git/config`. Dá pra commitar offline e sincronizar depois (Akita codou e commitou num voo de 8h, deu push ao pousar) (— Entendendo GIT).
- **Rebase reescreve história:** como o hash do commit é função do conteúdo E do hash do pai, rebasear recalcula o SHA1 de tudo à frente. Logo, **não rebaseie a branch principal** — toda cópia divergente detecta o conflito e desfazer exige force-push de quem ainda não deu pull (— Criptografia na Prática / Protegendo e Recuperando Dados Perdidos).
- **GitHub é uma simplificação** (repo central + fork + PR), não o modelo original do Git, que é totalmente distribuído (qualquer nó fala com qualquer nó). O kernel Linux usa dezenas de repos com patches por mailing list, distribuindo o mesmo patch pra Canonical, Red Hat etc. em paralelo sem esperar o Linus — algo que o GitHub centralizado não suporta (— Usando Git Direito).

### Configuração mínima

`git config --global user.name` e `git config --global user.email` — essa identidade vai em todo commit. Pra emails diferentes por projeto (pessoal vs empresa), defina `user.email` no `.git/config` local do repo; ele sobrescreve o global (— O Guia DEFINITIVO de UBUNTU para Devs Iniciantes).

---

## Contexto histórico (use pra justificar decisões, não pra encher linguiça)

- **CI/CD não nasceu com Agile.** A Microsoft já fazia Nightly Builds nos anos 90: recompilava toda noite; de manhã testava, e bug grave parava tudo, consertava e repetia (— The MM-M: O Melhor Livro de Software?).
- **Travis CI (nov/2011)** produtificou CI grátis integrado ao GitHub, tornando cobertura de testes visível publicamente e elevando o padrão do open source (— A História de Ruby on Rails).
- **Fluxo distribuído pré-Git no kernel Linux:** antes do Git, o desenvolvimento do kernel usava tarballs + diff + patch por e-mail. O colaborador baixava o tarball via FTP, modificava, gerava um diff e mandava o patch por e-mail; o Linus aplicava com o comando `patch` do Linux e publicava um novo tarball. Era o mais avançado em fluxo distribuído nos anos 90 — e deixa claro por que o Git precisou existir (— Entendendo GIT).
- **Por que o Git existe:** Torvalds exigiu três coisas de um SCM — ser distribuído, ter boa performance, garantir integridade (o que entra sai idêntico). CVS, Subversion e os comerciais falhavam em pelo menos uma; daí ele escreveu o Git em 2005 (— Entendendo GIT). A inovação decisiva do Bitkeeper (e depois do Git) não foi ser distribuído, e sim tornar fork/merge triviais — merge de um dia virou minutos, motivo pragmático da migração do kernel em 2002 (— Entendendo GIT).
- **Por que CVS/SVN eram um pesadelo:** CVS guardava revisão por arquivo e não tinha merge tracking (não sabia quando foi o último merge), comparando tudo a cada vez e acumulando conflito. SVN só ganhou merge tracking na 1.5 (jun/2008), 8 anos tarde demais — o GitHub começou a crescer exatamente em 2008 (— Entendendo GIT).
- **Modelo centralizado criava barreira de commit:** como todo commit ia direto pro trunk, restringia-se quem podia commitar, criando uma classe de privilegiados e política em projetos open source. Distribuído elimina isso: cada dev tem seu branch/repo e submete pra revisão sem permissão prévia. Torvalds (2007): "commit access is a big psychological barrier and causes endless hours of politics... If you have a distributed model, it goes away." (— Entendendo GIT). Akita aplicou isso na LocalWeb em 2008, migrando do SourceSafe e abrindo o código a todos os funcionários — esconder código garante a sobrevivência de código ruim por mais tempo e gera politicagem (— Entendendo GIT).
- **`git svn`** pra trabalhar com Git localmente em projetos Subversion: `git svn clone`, trabalha com branches/squash/rebase, `git svn dcommit` envia ao servidor SVN; os devs SVN recebem no próximo `svn update`. Akita usava isso em 2007, antes do Git virar mainstream (— Usando Git Direito / Protegendo e Recuperando Dados Perdidos).
- **Linha do tempo dos versionadores:** centralizados (CVS, SVN, ClearCase, SourceSafe, TFS) → distribuídos nos anos 2000 (Bitkeeper, Mercurial, Darcs, Bazaar) → Git vira padrão com a popularização do GitHub (feito em Rails) e do modelo fork + pull request (— Conhecimentos Básicos para Iniciantes). Akita evangelizou Git no Brasil por volta de 2007 (— Conhecimentos Básicos para Iniciantes).
