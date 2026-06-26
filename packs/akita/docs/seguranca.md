# Segurança — Guia Acionável (Akita)

> Regras de segurança destiladas das aulas do Fabio Akita (@Akitando) e do blog AkitaOnRails: senhas/hashing, criptografia aplicada, hardening de máquina e infra, rede/VPN, web (injection/CSRF/XSS), custódia de cripto, fator humano, e sandbox para agentes de IA. Tudo verificável a uma fonte. Leia, decida como sênior, aja.

---

## 0. Mentalidade (assuma o pior, sempre)

- **Não existe 100% de segurança** enquanto o sistema estiver conectado e em uso. O jogo é gerenciar risco: escolher quais riscos valem o retorno, ter plano B e processo de resposta pronto. (— RANT: Selo de Segurança é Marketing)
- **Assuma que a base de dados SERÁ roubada.** Projete para minimizar o dano quando isso acontecer — muda como você guarda credenciais, logs e dados de usuário. (— Conceitos Básicos de CRIPTOGRAFIA Parte 1)
- **Nunca confie em nada.** Em rede, parta de 100% suspeito. Provedores tecnicamente operam em modo promíscuo (recebem todos os pacotes); não há como verificar o que registram. (— Introdução a Redes Parte 3)
- **Ausência de incidente ≠ segurança.** Ninguém ter invadido só significa que ninguém tentou/detectou ainda. Segurança se prova ativamente. (— Selo de Segurança é Marketing)
- **Segurança é hábito contínuo, não fase nem checklist.** No projeto real do Akita foram 21 commits de segurança espalhados por 8 dias — não uma "sprint de segurança" no final. (— legado §7)
- **Segurança exige plano de resposta a incidente**, não só prevenção: resolver não basta, garanta que o mesmo incidente não se repita ou doa menos. (— Selo de Segurança é Marketing)
- **Toda funcionalidade desnecessária é superfície de ataque.** Não antecipe necessidade hipotética; faça só o de hoje. Log4Shell veio de o Log4j executar comandos do log e abrir JNDI — features inúteis para logging. (— Os 12 Fatores)
- **Segurança proativa é o ponto fraco da IA.** Ela implementa o que você pede, raramente sugere proteções. Humano decide O QUE/POR QUE; rode scanner a cada commit. (— legado §8)

---

## 1. Senhas e Hashing — regras no topo

| Regra | Detalhe |
|---|---|
| Nunca plaintext | "Recuperar senha por e-mail" (a original, não reset) denuncia plaintext. Equivale a cirurgião não lavar a mão. (— O que os Cursos NÃO te Ensinam) |
| Nunca encriptar com chave simétrica | Ponto único de falha: roubou a chave, decripta 100% das senhas. (— CRIPTOGRAFIA Parte 1) |
| Hash one-way + salt único por usuário | Salt gravado em aberto na tabela. Sem salt, dois usuários com `TEST1234` têm o mesmo hash; quebra um, quebra todos. (— CRIPTOGRAFIA Parte 1 e 2) |
| Use **KDF**, nunca hash genérico | bcrypt/PBKDF2/scrypt/Argon2 — caros de propósito (CPU e/ou RAM). SHA-256/512 e MD5 são rápidos demais → força bruta. (— Sua Segurança é uma DROGA) |
| Hierarquia | **Argon2 > Scrypt > Bcrypt > PBKDF2.** Argon2 venceu a Password Hashing Competition; PBKDF2 é o mais fraco (pouca RAM, vulnerável a ASIC). (— CRIPTOGRAFIA Parte 2) |
| Migração de algoritmo | Não dá pra re-hashear sem a senha. No **login bem-sucedido** (único momento com a senha em mãos), gere hash novo com dificuldade maior e regrave. (— CRIPTOGRAFIA Parte 2) |

**Por que KDF e não SHA:** hardware gera ordens de grandeza de hashes/s — i9-9990K ~478 h/s, Titan X 1.3 GH/s, Antminer S9 ~14 TH/s. SHA-512 em GPU faz bilhões/s; bcrypt cai para centenas. PBKDF2 com 100 mil rodadas leva ~0,5–1s por tentativa → ataque inviável. (— CRIPTOGRAFIA Parte 2)

**Ataque que isso bloqueia:** Rainbow tables são bancos pré-computados (hash → senha de dicionário, com leet code e variações), vendidos em GB/TB na dark web. Comparar é muito mais rápido que computar bcrypt na hora; senhas fracas caem em minutos. Salt único invalida tabelas pré-computadas. (— Sua Segurança é uma DROGA; CRIPTOGRAFIA Parte 1)

**Caso real:** em 2018 Kevin Mitnick quebrou senha de 17 chars com leet code em <1 min com 8 GPUs GTX 1080. (— Sua Segurança é uma DROGA)

### Senhas do usuário final (e suas)
- Senha **única, longa e aleatória por site**, num gerenciador (Bitwarden/1Password/LastPass). Senha-mestra = passphrase memorizável >20 chars. (— Sua Segurança é uma DROGA; CRIPTOGRAFIA Parte 2)
- Por quê: Have I Been Pwned lista 600+ sites e 11+ bilhões de contas vazadas; robôs fazem **credential stuffing** (testam credenciais vazadas em outros serviços). De 1M de usuários, 100k senhas quebradas = 100k vetores. (— Sua Segurança é uma DROGA)
- Espaço de busca cresce exponencial: 92 chars possíveis → 92^10 ≈ 43 quintilhões; cada char a mais ×92. Substituições leet já estão pré-computadas. (— Sua Segurança é uma DROGA)

---

## 2. 2FA e Autenticação

- **Evite 2FA por SMS.** SIM swap (engenharia social com a operadora) e remoção física do chip; perder o celular trava o acesso. Use app autenticador (Authy) ou o próprio gerenciador. (— Sua Segurança é uma DROGA)
- Dados de vazamentos governamentais (nome, RG, CPF, nome da mãe) bastam para enganar o atendente da operadora. (— Sua Segurança é uma DROGA)
- **3 fatores:** o que você SABE (senha), TEM (app 2FA / YubiKey), É (biometria). Biometria moderna fica em hardware isolado (Secure Enclave/T2 no iPhone, TPM no PC), fora do alcance do SO. (— Sua Segurança é uma DROGA)
- **TOTP (RFC 6238):** servidor compartilha seed via QR; ambos calculam `HMAC-SHA1(seed + horário_arredondado_30-60s)` truncado em 6 dígitos. Por isso o relógio precisa estar sincronizado via NTP. (— Sua Segurança é uma DROGA)

---

## 3. Criptografia Aplicada — o que escolher

### Faça / Não faça
**Faça**
- Use bibliotecas auditadas: OpenSSL, BoringSSL, Libsodium. (— Vazamento do Twitch; Supremacia Quântica)
- Para simétrico novo, prefira **AES-GCM** sobre AES-CBC (GCM autentica via tag, paraleliza, e permite chave de 128 bits com segurança equivalente). CBC é didático mas vulnerável a padding oracle. (— Criptografia na Prática; CRIPTOGRAFIA Parte 2)
- Para chaves SSH/assimétricas, prefira **Ed25519** a RSA: curva elíptica, 256 bits, mais forte que RSA-4096 e mais compacto/rápido. ECC-256 ≈ RSA-3072+. (— Guia de Ubuntu; CRIPTOGRAFIA Parte 2; Criptografia na Prática)
- Para integridade/assinatura nova, use **SHA-256/SHA-512** (ou SHA-3). (— Criptografia na Prática)

**Não faça**
- **Nunca implemente seu próprio algoritmo de cripto/hash** — sairá mais fraco que o Enigma (quebrado nos anos 40). ROT13 já foi "usado de verdade" e é só Caesar shift 13. (— CRIPTOGRAFIA Parte 1; Supremacia Quântica)
- **Não use MD5/SHA-1 para assinatura ou integridade séria** — têm colisões controláveis (adulterar arquivo mantendo o mesmo hash). Git ainda usa SHA-1 por compat, deve migrar para SHA-256. (— Criptografia na Prática; CRIPTOGRAFIA Parte 1)
- **Não use hash como ID único** — colisão é probabilística (paradoxo do aniversário: 30 pessoas → ~70% de colisão). Use UUID/GUID. Não confunda MD5/UUID/IPv6 (mesmo formato visual, semânticas distintas). (— CRIPTOGRAFIA Parte 1)
- **Não use `hash(segredo + msg)` como MAC** — vulnerável a length-extension (atacante forja MAC sem saber o segredo, sabendo só hash+tamanho). Use **HMAC** (SHA-3 já incorpora). (— CRIPTOGRAFIA Parte 1)
- **Base64 não é criptografia** — sem chave, trivialmente reversível. Nunca use para "ofuscar". (— CRIPTOGRAFIA Parte 2)
- **Não deixe o dev escolher parâmetros cripto** — JWT no lançamento permitia algoritmo/modo livre e a maioria escolhia inseguro. APIs boas eliminam combinações ruins. (— Criptografia na Prática)

### Tabela de referência rápida
| Categoria | Use | Para quê |
|---|---|---|
| Digest/hash | SHA-256/512, SHA-3; HMAC; bcrypt/Argon2 (senha) | impressão digital, integridade, MAC |
| Simétrico | AES (GCM > CBC); chave acelerada em HW | encriptar o canal/dados |
| Assimétrico | RSA-2048/4096, ECC/Ed25519 | autenticar identidade + trocar chave |
| Troca de chave | Diffie-Hellman / ECDHE (efêmero) | segredo compartilhado sem trafegar a chave |

**Como o TLS combina tudo (modelo mental):** RSA/X.509 (autentica via CA) + ECDHE (troca segredo efêmero → forward secrecy) + AES-GCM (canal rápido). Ex.: `TLS_ECDHE_RSA_WITH_AES256_GCM_SHA384`. RSA autentica mas é lento; DH troca chave mas não autentica; AES é rápido mas precisa da chave — a suíte resolve as três fraquezas juntas. (— CRIPTOGRAFIA Parte 2)

- **RSA não tem forward secrecy** (chave longa; se quebrada no futuro, expõe todo o passado). ECDHE tem (chave efêmera por sessão). (— CRIPTOGRAFIA Parte 2)
- **Diffie-Hellman puro é vulnerável a man-in-the-middle** — precisa autenticar (STS, RSA/X.509). (— CRIPTOGRAFIA Parte 2)
- **Chave privada nunca trafega pela rede nem sai da máquina onde nasceu.** Se vazar, gere par novo e substitua. (— Criptografia na Prática; Guia de Ubuntu)
- **Quântico:** Shor ameaça RSA/Diffie-Hellman (fatoração/log discreto). AES só sofre Grover (ganho quadrático) — dobrar a chave (AES-256→512) neutraliza. (— Supremacia Quântica)
- **Side-channel** (tempo, energia, EM) ataca a implementação; mitigação é cripto em hardware (Intel AES-NI desde pré-Sandy Bridge, AMD desde Jaguar). (— CRIPTOGRAFIA Parte 1)
- **Entropia/PRNG é a base.** /dev/random + rngd/TPM melhoram a entropia; entropia inicial fraca = chave fraca. (— Criptografia na Prática)

### Certificados / TLS na prática
- Cadeia de confiança: seu domínio → assinado por uma CA (ex.: Let's Encrypt / ISRG Root X1) → raiz pré-instalada no SO (`/etc/ssl/certs`). (— Criptografia na Prática; CRIPTOGRAFIA Parte 2)
- Certbot valida posse do domínio via challenge DNS (TXT) e gera `fullchain.pem` (público) + `privkey.pem` (privado, nunca compartilhe). (— Criptografia na Prática)
- Assinatura digital = hash do conteúdo encriptado com a chave privada da autoridade (garante integridade + autoria). GPG assina ISOs (`.iso.sig`). (— Criptografia na Prática)

---

## 4. Web / Aplicação — injection, framework, exposição

### Regras universais (qualquer stack) — do legado
- **Input sempre validado** antes da lógica de negócio; autorização verificada; rate limiting em endpoints sensíveis; nunca retornar dado sensível na resposta.
- **Queries:** nunca concatenar input em SQL; use bindings/ORM; `orderBy`/sort com whitelist de campos.
- **Models:** mass-assignment explícito; campos sensíveis fora do JSON.
- **Upload:** validar MIME no servidor (não confiar na extensão); guardar fora do diretório público; renomear com UUID/hash.
- **Redirect:** nunca redirecionar para URL vinda do usuário; whitelist de rotas.
- **Jobs/filas:** payload só com IDs (busca o dado sensível dentro do job); idempotente; timeout. (— legado §7)

### Proteções do framework
- **Segurança ligada por padrão, não opcional.** CSRF, XSS, SQLi e session hijacking devem vir ativos; o dev deveria ter que desligar conscientemente. Em 2004 era comum produção com CSRF/XSS/SQLi básicos; Rails veio protegido desde o início. (— A História de Ruby on Rails)
- **Nunca desabilite proteção do framework por "performance".** Largar o ORM por SQL manual reabre SQLi/CSRF/session hijack/replay que o framework já fechava. Entenda o porquê do design antes de desviar. (— CRIPTOGRAFIA Parte 1)
- **ORMs eliminam SQL Injection** ao sanitizar valores automaticamente (Rails/Django/Laravel/ASP.NET). (— CRIPTOGRAFIA Parte 1)

### Injection e sanitização
- **Trate todo parâmetro de usuário como material radioativo.** Interpolar input em shell (`exec`/`system`/`popen`) → command injection. Ex.: `exec('cowsay ' + req.query.message)` permite `?message=foo;cat ~/.ssh/id_rsa` → vaza a chave privada. (— Introdução a Redes Parte 5; legado)
- **Sanitização cirúrgica, não defensiva em excesso:** valide no ponto de entrada (funções que recebem do usuário), não em toda função interna. (— Introdução a Redes Parte 5)

### Exposição / segredos
- **Credenciais nunca no front-end nem no Git.** Senha de banco em JS do cliente expõe a base inteira; `.env` no `.gitignore`, segredos via variável de ambiente real (`heroku config:set`), com `.env.example` versionado documentando as chaves. (— O que os Cursos NÃO te Ensinam; Aprendendo HEROKU)
- **Não exponha IDs sequenciais em URL pública** — facilita enumeração (`/users/1` → tenta 2,3,...). Use UUID/aleatório de 64 bits (colisão hiperbaixa). (— Discutindo sobre Banco de Dados)
- **Casos reais de plaintext:** vazamentos do STF e Ministério da Saúde — senha de banco trafegando em JS e senhas de usuário em texto aberto; planilha de senhas de pacientes COVID subida a um repo público no GitHub. (— O que os Cursos NÃO te Ensinam; Selo de Segurança é Marketing)
- **Homograph attack:** domínio falso com caracteres Unicode visualmente idênticos (`a` latino U+0061 vs `а` cirílico U+0430). Hoje registrars filtram, mas o link parece idêntico no navegador. (— Arquivos Binário e Texto)

### Memória / boot (defesas que existem por baixo)
- **DEP/bit NX** marca regiões (ex.: stack) como não-executáveis, bloqueando código injetado por buffer overflow. **ASLR** randomiza endereços de stack/heap/DLL a cada execução; em 64 bits há bits sobrando para randomizar sem fragmentar. ASLR sozinho não basta (vazamento de ponteiro), mas matou uma classe de exploits de ~2004. (— De 16 a 64 bits)
- **Intel SGX:** enclaves de memória que nem o SO/root acessam — dados saem para a RAM já encriptados; útil para chaves-mestras. (— CRIPTOGRAFIA Parte 2; Blockchain em SF)

---

## 5. Hardening de Máquina / Estação

### Disco
- **Encriptação de disco completo é obrigatória, especialmente em notebook.** Senha de login não protege nada se removerem o SSD e plugarem em outra máquina (Mac em Target Disk Mode aparece como HD USB). BitLocker / FileVault / LUKS; AES por hardware torna a perda de performance imperceptível — se for problema, compre SSD mais rápido, não desligue a cripto. Esqueceu a chave = dados perdidos. (— Sistemas de Arquivos; Sua Segurança é uma DROGA; Criptografia na Prática)
- **Apagar arquivo não apaga os bytes** (só o inode/dentry); forense recupera. Disco encriptado desde o início resolve: basta descartar a chave. (— Sistemas de Arquivos)
- **VeraCrypt** para dados críticos: partição oculta (negação plausível, 2 senhas) e não revela nem qual algoritmo foi usado (Serpent/Twofish além de AES); capta movimento do mouse para entropia real. Para o dia a dia, BitLocker/FileVault basta. (— Sua Segurança é uma DROGA; Criptografia na Prática)

### Boot e hardware
- **Habilite Secure Boot + TPM.** Secure Boot assina os binários de boot e aborta se adulterados, barrando rootkits que carregam antes do antivírus/kernel (a ESP é FAT aberta — alvo de rootkit). TPM guarda chaves em hardware isolado e melhora entropia. Nunca desative Defender/Secure Boot seguindo tutorial de "otimização" — se o HW é fraco, migre para Linux. Mac já tem T2 de fábrica. (— Sua Segurança é uma DROGA; Dispositivos de Armazenamento; Criptografia na Prática)
- Anti-cheats de jogos (ex.: Riot) já exigiram desabilitar Secure Boot por funcionarem como rootkit — sinal de alerta. (— Dispositivos de Armazenamento)

### Periféricos e execução
- **Nunca plugue USB/Thunderbolt desconhecido** — pendrive preparado ataca só ao conectar. Empresas de treino (KnowBe4) espalham pendrives para flagrar funcionários. (— Selo de Segurança é Marketing; Dispositivos de Armazenamento)
- **Rode software não confiável em sandbox/VM.** Windows Sandbox (VM descartável nativa, apaga tudo ao fechar; precisa ~16GB RAM, 8+ cores) ou VirtualBox. Instalador pirata é o vetor #1 de ransomware. (— Sua Segurança é uma DROGA)
- **APK fora da loja:** verifique se é open source e compile você mesmo (ex.: Smart YouTube TV, YouTube Vanced). (— Monetizar? Bloquear ADs?)
- **SSD só de marca conhecida, novo e lacrado** (Samsung/Crucial/SanDisk/WD). Genéricos usam microSD interno ou mentem capacidade (sobrescrevem ao passar do limite real). (— Protegendo e Recuperando Dados)

### Backup
- **Backups com snapshots históricos (semanas/meses)** contra ransomware, que encripta aos poucos por dias antes de se revelar — backup simples já pode estar corrompido. BtrFS/ZFS + TimeShift no Linux; cloud tipo Backblaze. (— Sua Segurança é uma DROGA)
- **RAM ECC** no NAS corrige bit flip (raio cósmico) — proteção contra corrupção silenciosa. (— Introdução a Redes Parte 6)

---

## 6. Rede / Infra

- **Cloudflare como primeira linha de defesa** independente de onde rode (VPS/EC2/containers/Heroku): substitui DNS, CDN e detecção/prevenção de ataque e DDoS. (— Devo usar NOSQL?)
- **Anti-bot/cambista em alta demanda:** WAF + anti-DDoS (AWS WAF + AWS Shield, ou Cloudflare) contra scalpers automatizados (ingressos). (— Como fazer o Ingresso.com escalar?)
- **Firewall = deny-all + allow explícito.** Roda como root, intercepta todos os pacotes; corporativo tipicamente só libera saída 80/443. (— Introdução a Redes Parte 5)
- **Instale o mínimo em produção.** Software velho sem manutenção vira escalada para root. Akita critica o Slackware (pré-instala tudo) por isso. (— Pacotes com Slackware; Os 12 Fatores)
- **Nunca exponha Redis/Memcached/MongoDB na internet sem senha** — por padrão não exigem auth (ok só em dev local). Use o Postgres (exige usuário) como modelo. (— Guia de Ubuntu)
- **Validação de pacotes apt** por chave pública do fornecedor — apt recusa pacote com assinatura que não bate. Instale a chave de domínio oficial (`docker.com`), "não de um domínio com cara de russo". (— Guia de Ubuntu)
- **Protocolos sem cripto (Telnet/FTP/SMTP/HTTP) são sniffáveis** → use SSH/SFTP/SMTP+TLS/HTTPS. (— DevOps para Iniciantes Parte 1)
- **Use switch, não hub** — em hub, qualquer placa em modo promíscuo (Wireshark) captura tudo. (— Introdução a Redes Parte 3)
- **DNS não é criptografado** por padrão; mesmo com HTTPS depois, a consulta expõe o site. Use DoH/DoT (Cloudflare 1.1.1.1). **Pi-hole** como DNS no DHCP bloqueia ads/malware para a rede toda. (— Introdução a Redes Parte 3; Introdução a Redes Parte 6)
- **Não desative IPv6 temporário** (privacidade — evita ID permanente externo). (— Introdução a Redes Parte 3)

### VPN / acesso remoto
- **Sempre VPN em rede pública** (aeroporto/café/hotel/faculdade): sniffing e **DNS poisoning** (redireciona domínio legítimo p/ site falso e te faz baixar malware). Nunca baixe nada de rede que você não controla. (— Introdução a Redes Parte 6; Sua Segurança é uma DROGA)
- **PPTP é obsoleto/inseguro** → use **WireGuard** (enxuto, no kernel) ou OpenVPN. (— Introdução a Redes Parte 6)
- **Furar CGNAT/firewall por conexão de saída:** ZeroTier/TailScale — o cliente atrás do NAT inicia a saída até um relay, que conecta os dois lados. (— Introdução a Redes Parte 6)
- **SSH tunneling existe e firewall por porta não basta:** SSHD escuta em qualquer porta (até 80); `-R` (remote forward) expõe máquina interna; `-D` (dynamic) cria proxy SOCKS5 pessoal. Entenda para defender — proxy/firewall que ignora HTTP tunneling dá falsa sensação. (— Introdução a Redes Parte 5; Selo de Segurança é Marketing)

### Permissões e chaves SSH
- **Geração/guarda:** Ed25519 + passphrase longa; chave **privada nunca sai da máquina** (backup em pendrive guardado); a `.pub` é a que você cadastra; use `ssh-agent`. Perder a privada = perder acesso a tudo. (— Guia de Ubuntu)
- **Permissão `600`** no `~/.ssh` e nas chaves (FAT32 não preserva permissão Unix → `chmod -R 600 ~/.ssh`). (— Setup Dev com Arch e WSL2)
- **chroot NÃO é mecanismo de segurança** — roda como root, escapável com exploit simples (cria subdir, `cd ..` em loop, novo chroot dentro). Use namespaces/containers de verdade. (— Apanhando do Gentoo)
- **Nunca mapeie a raiz do host (`/`) como volume em container** — daemon Docker roda como root, o container ganha escrita no host inteiro (`/etc/passwd`). `docker run -v /:/mnt` = "certificado de estupidez". (— Funcionamento de Containers)

---

## 7. Dependências e Supply-Chain

- **Audite dependências regularmente** — desatualizada é bomba-relógio com CVE conhecida. Use Dependabot. No CI do Akita: `bundler-audit`/`npm audit`/`composer audit`/`pip-audit`. (— Vazamento do Twitch; legado §5)
- **Use cripto de biblioteca, mas mantenha atualizada** — OpenSSL 1.0 tinha CVEs corrigidas depois; vendor estático não recebe correção. A principal crítica do Akita ao código do Twitch foi exatamente bibliotecas estáticas desatualizadas. (— Vazamento do Twitch)
- **Biblioteca abandonada é risco ativo** — autor parou, CVE não é corrigida; é preciso substituir e reescrever quem dependia. Trabalho recorrente em projeto longevo. (— Back-End para Iniciantes Parte 2)
- **Supply-chain é realidade constante** — pacotes npm/PyPI/RubyGems são invadidos; scripts pós-instalação maliciosos comprometem dados. Sandboxe o que executa código de terceiros. (— ai-jail blog; AI Agents: Proteção do Sistema)

### CI como guardrail (do legado, dados reais)
Pipeline a cada commit (~22s): RuboCop → bundler-audit → Brakeman → testes. O Brakeman pegou em desenvolvimento, antes de produção: **SQL injection** (query de busca), **path traversal** (controller de imagens), **redirect aberto** (unsubscribe), além de XSS, mass assignment e CSRF bypass. Cada um corrigido no mesmo commit que o CI flaggou. (— legado §5 e §7)

| Etapa | Ruby | PHP | Python | Node |
|---|---|---|---|---|
| Segurança (código) | Brakeman | Enlightn | Bandit | eslint-plugin-security |
| Segurança (deps) | bundler-audit | composer audit | pip-audit | npm audit |

---

## 8. Sandbox para Agentes de IA (ai-jail)

> Agente de IA precisa de filesystem, compilador e linters — o mesmo acesso lê `~/.aws/credentials`, chaves SSH ou roda `rm -Rf /`. A boa vontade da LLM não é garantia, e supply-chain não escolhe vítima. **Isolamento de processo é a barreira que funciona.** (— AI Agents: Proteção do Sistema; ai-jail)

### Faça / Não faça
- **NÃO** rode `--dangerously-skip-permissions` em workstation com credenciais — o nome já avisa; serve só para CI/CD já isolado (container/VM descartável). (— ai-jail)
- **NÃO** habilite auto-aprovação total por conveniência. (— AI Agents: Proteção do Sistema)
- **FAÇA** rodar o agente em sandbox sempre que usar IA para programar — e para qualquer comando de origem duvidosa. (— ai-jail; AI Agents)
- **FAÇA** combinar camadas: sandbox (filesystem) + Git sem push (código) + push manual. Sobe para OS imutável (Silverblue/NixOS/Aeon) e o ataque que fura as três é improvável. (— ai-jail)

### Como funciona (Linux)
- **Bubblewrap** (mesmo do Flatpak): ~50KB, roda sem root via `CLONE_NEWUSER`. Alternativas descartadas: Firejail (setuid root), nsjail (complexo), minijail (produção), systemd-nspawn (root). **Landlock** (kernel 5.13+) complementa no nível VFS, com degradação graciosa. (— ai-jail)
- O agente roda em namespaces isolados (PID/UTS/IPC, hostname `ai-sandbox`). `/usr /etc /opt /sys` read-only; só o **diretório do projeto** tem escrita (além dos dotdirs de ferramenta). `$HOME` vira tmpfs vazio — **`.ssh`, `.aws`, `.gnupg` nunca são montados**; subdirs de browser em `~/.config` são escondidos. (— ai-jail; AI Agents)
- **macOS:** backend `sandbox-exec` (SBPL), default-deny, bloqueia `.ssh/.aws/.gnupg`/Keychain. Limitação: GPU (Metal) e Display (Cocoa) não restringíveis. **Windows:** sem primitiva equivalente — use **WSL 2** (kernel Linux real, bubblewrap funciona). (— ai-jail)

### Operação
- Config por projeto em `.ai-jail` (TOML), commitável → mesma sandbox para todo o time. (— ai-jail)
- `ai-jail --lockdown` (workload não confiável): projeto read-only, sem GPU/Docker/Display, corta rede (`--unshare-net`), `$HOME` tmpfs puro — o mais restritivo sem VM. (— ai-jail)
- `ai-jail --bootstrap` gera permissões: para Claude Code, `~/.claude/settings.json` com **allow** (git status/diff/log, cargo/npm/python, docker compose), **deny** (`rm -rf`, `sudo`, `chmod 777`, `git push --force`), **ask** (`git push`, `rm`, `docker run`). Backup automático; recusa se o alvo for symlink. (— ai-jail; AI Agents)
- `ai-jail --dry-run --verbose` audita antes de rodar. (— ai-jail)

### ai-jail + Git = rede de segurança
Sem permissão de push, o pior caso é corromper o projeto local: `git checkout .` recupera; `.git` corrompido → apaga e `git clone`. **O remote nunca é tocado**; push continua sendo decisão humana. (— ai-jail)

### Comparações
- **vs sandbox nativo do Claude Code** (out/2025, `/sandbox`, bubblewrap/sandbox-exec): ai-jail é agnóstico de ferramenta, sem escape hatch, config commitável; o do Claude é específico, tem `dangerouslyDisableSandbox`, config global, e enfraquece muito dentro de Docker. Dá para rodar um dentro do outro. (— ai-jail)
- **vs Dev Container:** resolvem coisas diferentes. Dev Container *define* o ambiente (Docker, reprodutível, startup em segundos); ai-jail *restringe* acesso ao filesystem do host (startup em ms, ferramentas do host). Combináveis. (— ai-jail)

---

## 9. Custódia de Criptomoedas

- **Segregue infra web da infra de blockchain:** nós de blockchain em cluster isolado sem internet pública; fila de mensagens + daemons como camada intermediária. Brecha na web não dá acesso direto às carteiras. (Omnitrade no GCP: cluster web separado dos nós Bitcoin/Ethereum/XRP/Dash, cada um em container, comunicados por fila.) (— A COVID-19 matou minha Startup?)
- **Hot wallet / Cold wallet:** só o necessário para saques diários em hot wallet (automática); o grosso em cold wallet (assinatura manual de 2+ pessoas). Exchanges que não separaram foram hackeadas repetidamente (Coreia/Japão). (— A COVID-19 matou minha Startup?)
- **Análise estática antes do deploy de smart contract** (CertK p/ ERC20): deploy é irreversível e Solidity protege pouco — bug = perda total de tokens em vários ICOs. (— 33 exemplos de ICOs; análogo a linter de segurança tipo Brakeman) (— ICOs; engenharia)
- **Blockchain é público, não privado** — "cripto" aqui = integridade/autenticidade, não sigilo. Metadados e ordem das transações expõem; ruim para voto secreto. (— Blockchain em SF)

---

## 10. Fator Humano e Governança

- **Engenharia social (phishing/spear phishing) é o vetor #1.** Segundo a KnowBe4, **91%** das violações em grandes empresas começam por spear phishing. Ataque ao Twitter (jul/2020): adolescentes ligaram para funcionários (phone spear phishing), acessaram 130 contas (Obama, Bill Gates) e juntaram 12+ bitcoins — zero sofisticação técnica. (— Selo de Segurança é Marketing)
- **Regra de ouro contra phishing:** nunca clique em link recebido por mensagem, por mais urgente/legítimo que pareça; se for importante, a pessoa acha outro canal. (— Sua Segurança é uma DROGA)
- **Privacidade em rede social facilita phishing amador** — GPS, família, hábitos e LinkedIn (funcionário descontente) viram alvo fácil; o risco real não é vigilância estatal, é o amador. (— Selo de Segurança é Marketing)
- **O maior vetor é a pessoa, não a tecnologia.** Frameworks (COBIT/ITIL/PMBOK) existem para reduzir decisão individual — menos variância = menor superfície de erro humano. COBIT: nível 0 (sem processo) → nível 5 (documentado, repetível, auditado). (— Selo de Segurança é Marketing)
- **Selo/auditoria de segurança costuma ser marketing/liability**, não garantia técnica: documenta que se seguiu o procedimento aceito para limitar responsabilidade legal em caso de brecha (funciona como seguro). Não confunda com estar seguro. (— Selo de Segurança é Marketing)
- **Processo precisa ser entendido, não só seguido** — proxy com whitelist que não bloqueia HTTP tunnel, ou BIOS sem senha, parecem seguros e têm brecha óbvia (Akita contornou proxy de telecom em 2002 e quebrou senha de Win2000 pela BIOS em minutos). (— Selo de Segurança é Marketing)

### Organização / legal
- **Nunca deixe acessos críticos só com terceiros.** Dono/cofundador técnico tem que poder revogar qualquer um, inclusive freelancer. Deixar senha da AWS e GitHub na mão de um freelancer = milhão numa conta cuja senha está com um estranho. (— Empreendendo do JEITO ERRADO)
- **LGPD responsabiliza a empresa pelos dados, mesmo se o erro foi do terceiro.** Conheça as condições antes de compartilhar dados. (— Empreendendo do JEITO ERRADO)
- **SOX (2002):** diretor pode ser indiciado individualmente por fraude — criou incentivo real (resposta a Enron/WorldCom; destruiu a Arthur Andersen). (— Selo de Segurança é Marketing)

---

*Fontes: transcrições do canal @Akitando (YouTube) e posts do AkitaOnRails.com (ai-jail e AI Agents, 2026), mais o compilado de engenharia Q1/2026. Atribuição inline por título de vídeo/post.*
