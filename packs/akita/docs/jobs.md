# Jobs Assincronos e Confiabilidade — Guia do Akita

> Decisoes de senior sobre jobs/filas, performance de web, armazenamento, backup/recuperacao, infraestrutura e deploy. Tudo extraido de videos do canal @Akitando (projetos reais, nao teoria). Leia rapido, decida, aja.

---

## 1. Web rapido, trabalho pesado fora do request

| Regra | Numero/Detalhe |
|---|---|
| Endpoint web responde idealmente em **< 100ms** | Mais lento = menos req/s = mais servidores = mais custo (— ChatGPT Consegue te Substituir? \| Jobs Assincronos) |
| Processamento pesado (imagem, video, conversao) **nunca** roda no processo web | Vai pra worker assincrono separado (BULL/Node, Kafka/Java) (— Jobs Assincronos) |
| Upload de arquivo grande vai **direto do navegador pro S3** via URL pre-assinada | Elimina trafego e RAM no servidor de app (— Jobs Assincronos) |
| URL pre-assinada com **expiracao curta** (ex: 60s) | Sem expiracao, se vazar qualquer um faz upload arbitrario no bucket = custo/espaco descontrolado (— Jobs Assincronos) |

**Por que worker separado:** 100 usuarios subindo imagens de 60MB ao mesmo tempo = 6GB de RAM so no download dentro do web. Com workers, o web fica leve e a carga pesada e absorvida e controlada em outro lugar. (— Jobs Assincronos)

---

## 2. Quando usar Promise/async vs. fila com workers

`async/await` **nao elimina** a necessidade de jobs assincronos — sao ferramentas para casos diferentes. (— Jobs Assincronos)

| Use Promise / async-await | Use fila com workers |
|---|---|
| Operacao curta e de duracao **previsivel** (log, notificacao simples) | Tarefa longa e de duracao **variavel** (imagem, video, LLM, conversao) |
| — | Quando precisa controlar concorrencia, memoria, retry e recuperacao de erro sistemico |

> `await` no crop libera o event loop pra outras requisicoes, mas ainda ocupa RAM e impacta o web se houver muitos usuarios. Por isso, longo + variavel = fila. (— Jobs Assincronos)

---

## 3. Filas: concorrencia, retry, shutdown, monitoramento

**Controle de concorrencia por memoria:** dimensione workers pelos recursos. Tarefa de ~115MB (imagem 60MB + crop 50MB + PNG 5MB) num servidor de 4GB = limite de **~30 workers** simultaneos. Como o usuario nao espera, latencia maior e aceitavel. (— Jobs Assincronos)

**Retry com backoff exponencial:** ex. 3 tentativas com 1s, 2s, 4s. A fila permite **pausar** retries, achar o bug, corrigir e reprocessar pendentes. Sem fila, um erro sistemico dispara centenas de retries simultaneos e derruba o servidor. (— Jobs Assincronos)

**Graceful shutdown no deploy:** nunca mate worker no meio do job. Cada worker termina o job atual antes de reiniciar; em cluster, atualize **um a um**. (Analogia: shutdown normal do Windows vs. botao de forca.) (— Jobs Assincronos)

**Monitoramento visual em producao:** use interface web da fila pra ops ver estado dos workers, pendentes, falhas e taxa de processamento. O Akita cita o projeto **matador** como interface web pra monitorar filas BULL. (— Jobs Assincronos)

### Race condition classica (do mundo real)
Limpeza (`delete`) numa corotina com timer fixo (`sleep 2s`) esperando os inserts terminarem **e bug**: o delete pode rodar antes de todos os inserts concluirem. Correto: disparar o delete **apos a confirmacao do ultimo insert**, nunca confiar em tempo fixo.
> A versao vencedora em Rust da Rinha de Backend tinha exatamente esse bug: delete de ~500 registros de aquecimento via corotina com `sleep 2s` as vezes rodava cedo e deixava residuos. (— 16 Linguagens em 16 Dias: Minha Saga da Rinha de Backend)

---

## 4. Performance: meca antes de otimizar

- **Nunca otimize sem metricas de producao.** Instale APM (ex: New Relic), deixe rodar alguns dias, identifique gargalos objetivamente. (— Como fazer o Ingresso.com escalar?)
- Existe **no maximo meia duzia** de gargalos criticos; resolver o **top 3 elimina ~80%** dos problemas. (— Ingresso.com escalar?)
- Ofensor mais comum: **tabela grande sem indice**. Pode sumir com metade da lentidao sem tocar no codigo. (— Ingresso.com escalar?)
- **Desenvolva em ambiente restrito** (menos RAM que sua maquina): dyno de 512MB vs. notebook de 8GB+ revela cedo o consumo excessivo de memoria que voce nao veria local. (— Subindo Aplicacoes Web em Producao \| Heroku)

### Escala e arquitetura, nao linguagem
Sistema que nao aguenta escala massiva quase sempre tem problema **arquitetural**, nao de linguagem/framework. O Twitter (2007) nao falhou "por causa do Rails" — broadcast massivo exige arquitetura de atores (Erlang/Elixir/Akka), independente da linguagem. O GitHub tem escala comparavel e usa Rails ate hoje. (— A Historia de Ruby on Rails)

---

## 5. Memoria: o problema esta no codigo, nao no GC

- **Leaks em producao** geralmente vem de **dados externos**, nao do codigo em si: resultado grande de banco ou arquivo grande sem controle de tamanho. Verifique limites **antes** de alocar, nao depois. (— Gerenciamento de Memoria Parte 2)
- **Tuning de GC so depois de corrigir o codigo.** A config padrao do GC serve pra **99%** das aplicacoes. Tuning (heap inicial, fator de crescimento, frequencia, arenas) so apos medir exaustivamente em producao com dados reais. Tuning nao conserta ma programacao. (— Gerenciamento de Memoria Parte 2)
- **`MALLOC_ARENA_MAX` (Ruby/Linux glibc):** PT-Malloc2 aloca arenas por thread, multiplicador 8x em 64-bit. Quad-core com HT = **64 arenas** por padrao (8 × 4 × 2). Servidor pequeno (2 vCPUs): `export MALLOC_ARENA_MAX=2` basta e evita desperdicio massivo. So aplique apos medir. (Estudos do Heroku.) (— Gerenciamento de Memoria Parte 2)

---

## 6. Os 12 Fatores — logs

- **Logs sao streams pro stdout, nunca arquivos.** A plataforma captura o stream e encaminha pra servico externo (Papertrail, Logstash/Kibana). Jamais configure rotacao ou gravacao de log em arquivo dentro do container. (— A Forma Ideal de Projetos Web \| Os 12 Fatores)
- **Centralize logs de multiplos containers** com add-on de agregacao (Papertrail) + monitor de erros que notifica por e-mail em erro critico (Rollbar). (— Heroku)
- **`tail -f <arquivo>`** monitora log em tempo real sem ferramenta extra (funciona ate em symlink). (— O Guia DEFINITIVO de UBUNTU para Devs Iniciantes)

> Log4Shell (Log4j) e o exemplo do perigo: lib de log que fazia mais que o necessario (executava comando vindo no log, conectava ao mundo via JNDI). **Todo software desnecessario e um buraco de seguranca esperando.** (— Os 12 Fatores)

---

## 7. Deploy e infraestrutura

- **Procfile** declara o comando de cada tipo de container (web, worker...). Equivale ao `CMD` do Dockerfile; formato universal (Foreman/node-foreman/goreman simulam local). (— Heroku)
- **Console remoto efemero** (Heroku): container descartavel com a mesma imagem, via SSH, pra debug/admin. E destruido ao desconectar — nao crie arquivo local; operacoes no banco sao permanentes, use com cautela. (— Heroku)
- **Dependencias do projeto via Docker Compose, nao no SO.** MySQL/Postgres/Redis sempre em container: menos pacote gerenciado pelo sistema = menos chance de `apt upgrade` quebrar algo + versao certa por projeto. (— Protegendo e Recuperando Dados Perdidos)

### Infra descartavel (IaC)
- Maquina invadida ou com problema inexplicavel: **nao conserte, destrua e recrie.** Manual erra (esquece de instalar/configurar algo); IaC monta sempre do jeito certo. (— Entendendo "Devops" para Iniciantes Parte 1)
- **IaC = estado desejado em codigo versionavel e reutilizavel** (CFEngine 1993, Puppet 2005, Chef 2009). Mesma receita N vezes = mesma maquina. (— Devops Parte 1)
- **Automacao cobre seguranca tambem**, nao so instalacao: politicas, permissoes de usuario, VLANs, regras de firewall. Seguranca codificada na receita, nao aplicada na mao depois. (— Devops Parte 1)

| Tipo de ferramenta | Exemplos | Quando |
|---|---|---|
| Agentless (via SSH) | Capistrano (2006), Ansible (2015), Fabric | Mais simples; dev fazendo deploy de uma app em poucas maquinas |
| Cliente-servidor | CFEngine, Puppet, Chef | Mais complexa; infra grande com varios tipos de servidor (web/db/cache) |

(— Devops Parte 1)

---

## 8. Faca / Nao faca — operacao

**Faca**
- Abra **Tmux** antes de trabalho longo em servidor remoto: conexao caiu, sessao continua viva; `tmux attach -t <id>` recupera tudo (e permite pair remoto). (— Guia DEFINITIVO de UBUNTU)
- Seja **paranoid como bom sysadmin**: redundancia de tudo, backup do backup, **verifique que o restore realmente funciona**, monitore servidor minuto a minuto. (— Devops Parte 2)
- Trate script de infra com o **mesmo rigor** de codigo de app: valide e teste antes. (— Devops Parte 2)

**Nao faca**
- Nao monte seu **proprio servidor de e-mail/Redis/cache/processamento de imagem** — use SaaS especializado, a menos que seja seu core. O custo do servico e quase sempre menor que o tempo de engineering pra operar isso com confiabilidade. (— Devops Parte 2)
- Dev sem experiencia real de sysadmin: **use Heroku**, nao monte infra sozinho na primeira vez em producao. Nao compare centavo/hora sem somar o custo de um sysadmin pela vida inteira da app. (— Devops Parte 2)
- Cuidado mortal com **script em massa via SSH**: um typo pode apagar binario critico (ex: o `bash`) de **dezenas de servidores** de uma vez; recuperacao pode exigir ir fisicamente ao data center com pendrive. (— Devops Parte 2)

---

## 9. Armazenamento — escolha de RAID e hardware

| RAID | O que faz | Use / Nao use |
|---|---|---|
| RAID 0 (striping) | Soma capacidade e dobra leitura, **zero redundancia** | **Nunca** pra dados que importam — 1 disco falha, perde tudo dos dois. OK so pra cache/servidor onde o original existe em outro lugar (— Quebrei 3 HDs; Minha Maquina do Tempo) |
| RAID 1 (mirror) | Um HD copia o outro | Pessimo custo-beneficio pra backup pessoal: desperdica metade da capacidade (— Minha Maquina do Tempo) |
| RAID 5 (+ spare) | Paridade distribuida, sobrevive a 1 falha | Bom pra storage critico. Ex: 5 HDs de 4TB (20TB) = **~15TB uteis**, 5TB de paridade; Akita foi salvo varias vezes por isso (— Quebrei 3 HDs) |

- **HD de linha enterprise/NAS** (Seagate IronWolf Pro, WD Red) para storage continuo 24/7 — domestico e feito pra uso intermitente e quebra mais facil. (— Quebrei 3 HDs)
- **Cache em camadas (SO/HD) aumenta risco em queda de energia:** o "OK de gravacao" pode chegar antes do dado tocar o disco. Em servidor com milhoes de escritas, queda = perda real. Por isso data center tem no-break e redundancia. (— Quebrei 3 HDs)

---

## 10. Backup e durabilidade — assuma que tudo falha

> Todo dispositivo vai falhar: HD mecanico desgasta partes moveis; SSD/NVMe esgota ciclos PE das celulas NAND. Planeje a falha como evento **esperado**, e isso justifica investir em redundancia: em ~10 anos de uso do Drobo, o Akita trocou disco **duas vezes** por falha; o investimento de **~800 dolares** (com HDs) se pagou por proteger uma decada de historia pessoal. (— Tudo que Voce Queria Saber Sobre Dispositivos de Armazenamento; Minha Maquina do Tempo)

**Estrategia em 3 camadas independentes — cada uma cobre o ponto cego da outra:** (— Protegendo e Recuperando Dados Perdidos)
1. **Git** em todo projeto — versao e recuperacao granular.
2. **Btrfs + Timeshift** — snapshot local instantaneo (so metadados, nao duplica bytes), protege de acidente cotidiano.
3. **HD externo / off-site** — backup periodico contra falha de hardware.

**Faca**
- **Nao confie so em cloud** (gratuita ou nao): contas sao suspensas por erro/falta de 2FA, e servicos morrem (ICQ, Hotmail, Orkut). Mantenha copias locais de e-mail (Thunderbird+IMAP), arquivos e redes sociais. Akita: copia em PC, laptop e NAS. (— Quebrei 3 HDs; Minha Maquina do Tempo)
- **Migre midia proativamente** antes da obsolescencia (Akita: disquete 8"→5¼"→3½"→Zip→CD→DVD→HD). (— Minha Maquina do Tempo)
- **M-Disc** (Blu-ray de camada inorganica) pra backup critico de longa duracao: aguentou 250h a 90°C e 85% umidade; CD/Blu-ray comum tem camada organica que degrada em 10 anos ou mais, mesmo guardado com cuidado. (— Deteccao e Correcao de Erros \| Redes Parte 2)
- **Data scrubbing periodico** (ZFS/Btrfs `scrub`, ex: a cada 3 meses): verifica checksums e reconstroi bloco corrompido pela copia redundante antes do bit rot acumular e tornar a recuperacao impossivel. (— Redes Parte 2)
- **Snapshots como defesa contra ransomware** (Btrfs, NAS ZFS/Btrfs, Dropbox Rewind): voltam ao estado pre-infeccao. Falha se o HD de backup estiver conectado durante a infeccao (malware encripta ele tambem) — tenha snapshot local imutavel + off-site nao conectado continuo. Akita: OneDrive + Dropbox + Synology (snapshots de ate 4 meses) + Blu-ray M-Disc em cofre. (— Protegendo e Recuperando Dados Perdidos)
- **Nunca confie num HD que ja falhou** — descarte, ou use so pra dado descartavel (biblioteca Steam). Falhou uma vez, falha de novo. (— Protegendo e Recuperando Dados Perdidos)

**Correcao vs. deteccao de erro — escolha pelo contexto:**
ECC/Hamming/Reed-Solomon custam bits e processamento. Em rede da pra so **detectar** e pedir retransmissao (checksum + NAK). Em storage local sem original disponivel, tem que **corrigir** (Reed-Solomon em CD/HD, ECC na RAM, Reed-Solomon em sonda espacial). (— Redes Parte 2)

---

## 11. Recuperacao de dados perdidos — ordem das operacoes

1. **Parou de funcionar / deletou por engano:** desmonte o HD imediatamente e tire da maquina pra nenhum processo sobrescrever os blocos. (— Protegendo e Recuperando Dados Perdidos)
2. **Copia bit a bit primeiro:** `sudo dd if=/dev/vdb of=/downloads/backup.img bs=4M`. Toda tentativa de recuperacao roda **sobre a imagem**, nunca no dispositivo original (pode levar horas). (— idem)
3. **Superbloco corrompido (ext4):** liste backups sem tocar no disco com `mke2fs -n /dev/vdb` (dry run); recupere com `fsck -b <endereco> /dev/vdb` testando cada backup (ex: `fsck -b 32768`). Funcionou? Monte e copie os arquivos pra outro lugar **na hora**. (— idem)
4. **Nenhum backup de superbloco funcionou:** `PhotoRec` (pacote testdisk) varre byte a byte por cabecalhos conhecidos (JPEG/PNG/MP4/PDF). Resultado: nomes aleatorios, muitos incompletos, muito lixo — **ultimo recurso**. (— idem)

---

## 12. Btrfs/Timeshift na pratica — armadilhas de espaco

- **Snapshot e instantaneo** (so metadados) e lista no boot via `grub-btrfs` pra iniciar de um estado anterior. Recupera arquivo deletado ou reverte `apt upgrade` ruim. (— Protegendo e Recuperando Dados Perdidos)
- **Exclua diretorios volateis** do escopo com `chattr +C`: `/var/log`, `/var/cache`, `/var/tmp`, `/tmp`, swap, `/var/lib/docker`, `/var/lib/libvirt`. Senao o Btrfs acumula versao antiga deles em cada snapshot e enche o disco de forma invisivel. (— idem)
- **Apagar snapshot nao libera espaco sozinho:** rode `btrfs filesystem balance start /` pra consolidar (Akita: caiu de 25GB pra 10GB, levou >1h). Use `btrfs filesystem df /` pro uso real — `df -h` engana. (— idem)
- **Limpe imagem Docker apos testar:** `docker-compose down --rmi all`. Imagens nao removidas se acumulam rapido — um projeto Node ~220MB, Nginx ~200MB, Postgres ~400MB. Com snapshot ativo e sem limpeza, ficam presas em snapshots historicos. Akita encheu um **NVMe de 1TB em poucos dias** testando ~50 projetos da Rinha. (— idem)

---

*Fontes: videos do canal @Akitando (YouTube), atribuidos por afirmacao acima. Sintetizado por Claude (Anthropic), 2026.*
