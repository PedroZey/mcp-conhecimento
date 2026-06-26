# Testes — Guia Acionavel (Fabio Akita / @Akitando)

Cobre quando, por que e como testar: regra de PR, ciclo de adocao, hierarquia de camadas, metricas reais e armadilhas de stress/load testing. Voce le e age como um senior.

---

## Regras de ouro (topo)

- **PR sem teste e rejeitado automaticamente, sem excecao.** Toda feature e todo bug-fix vem com teste unitario no minimo. O revisor (de preferencia o mais experiente) rejeita o PR se nao houver teste. Essa e a regra que mantem o projeto vivo por anos. (— A Forma Ideal de Projetos Web | Os 12 Fatores; — Rant: Projetos, TESTES e Estimativa???)
- **Corrigiu bug? Comece pelo teste que reproduz o bug** — ele deve comecar FALHANDO; a correcao termina quando ele passa. Garante que aquele bug nao volta. (— Rant: Projetos, TESTES e Estimativa???)
- **Rode a suite inteira apos cada correcao.** Corrigir um defeito tem 20-50% de chance de introduzir outro, porque um defeito "local" tem ramificacoes pelo sistema todo. (— The MM-M: O Melhor Livro de Software?)
- **Crie testes ANTES de refatorar arquitetura ou otimizar performance.** Mudanca de arquitetura introduz bug — questao de quando, nao se. Sem teste voce nao distingue "otimizei certo" de "introduzi um bug que pulou codigo necessario" (o New Relic mostra melhora so porque um bug apagou o caminho lento). (— Como fazer o Ingresso.com escalar?)
- **Nunca refatore E adicione feature no mesmo commit.** Verde → refatora → verde. (— compilado legado)
- **"Se compila, funciona" e falso.** Bug de logica, regressao e validacao de regra de negocio passam pelo compilador — inclusive em Java, C++, Rust. TDD nasceu em Java (Kent Beck, JUnit) exatamente por isso. (— Rant: Projetos, TESTES e Estimativa???)
- **Mockar tudo = 100% coverage e zero confianca.** Dados reais revelam a verdade. (— compilado legado)

---

## A economia dos testes: por que compensa

Testes sao um **seguro**, nao burocracia: parecem custo desnecessario ate evitarem o desastre. Pular testes da velocidade no curto prazo, mas a produtividade decai ate o time so apagar incendio. (— Rant: Projetos, TESTES e Estimativa???)

Ciclo vicioso que os testes quebram: *"Sem tempo pra teste → muitos bugs → sem tempo (apagando incendio) → sem teste"*. (— Rant: Aprendizado na Beira do Caos)

| Cenario | Time de 3 | Ao dobrar p/ 6 | Tendencia |
|---|---|---|---|
| **Sem testes** | comeca 6-9 tarefas/sem → cai p/ 3-6 → 2-4 → 1-2 | repete o ciclo desde 6-9, converge p/ 1-2 | produtividade → zero |
| **Com testes** | 4-6/sem de forma constante | 8-10/sem sustentavel | quase dobra e se mantem |

(— Rant: Projetos, TESTES e Estimativa???; confianca media na linha "com testes")

Dado concreto: mesmo sem TDD rigoroso, testar durante o dev cortou pela metade o tempo do "Stupid Database" — sem os testes teria levado o dobro. (— Fiz um servidor de "SQL"??)

Prova de longevidade: o blog do Akita roda no mesmo Rails desde 2012 (Rails 3/4 → Rails 6, Ruby 3); atualizar bibliotecas leva ~30 min/ano rodando a suite antes de subir — sem varar fim de semana. (— Rant: Projetos, TESTES e Estimativa???)

O processo, nao a IA, e a variavel. Mesmo dev + mesma IA:

| Projeto | Disciplina | Resultado |
|---|---|---|
| FrankMD (sem XP) | feature primeiro, teste depois, CI "quando lembrar" | arquivo de ~5.000 linhas, 6 cirurgias de emergencia |
| M.Akita Chronicles (com XP) | TDD, CI a cada commit, small releases | zero paradas forcadas, 1.323 testes |

Em 274 commits, o CI **pegou 50+ bugs reais** que iriam pra producao. Codigo de IA precisa de MAIS testes, nao menos. (— compilado legado)

---

## Como adotar testes (projeto legado sem cobertura)

- **Comece com UM teste.** "O projeto tem anos sem teste" nao justifica continuar sem. Escreva o teste da feature que acabou de entregar; a cada bug reportado, teste antes de corrigir. A cobertura cresce organicamente. (— Rant: Projetos, TESTES e Estimativa???)
- **Nao persiga 100% de cobertura.** Discutir se a meta e 100% e procrastinacao de quem tem 0%. Prioridade e comecar; quais casos importam cobrir vem da pratica, nao de meta numerica. (— Rant: Projetos, TESTES e Estimativa???)
- **Testes como ancora da experimentacao:** tenha uma versao minima funcional, adicione testes, e entao experimente sabendo que o que ja funciona continua funcionando. (— Rant: Aprendizado na Beira do Caos)

---

## Estrutura/cultura: torne o teste o caminho de menor resistencia

Embutir diretorios e arquivos de teste no gerador (model/controller/view) faz o dev precisar agir conscientemente pra REMOVER teste, nao pra adicionar. Isso impos cultura de teste numa comunidade inteira sem convencer ninguem individualmente. (— A Historia de Ruby on Rails: o Rails de 2004 ja gerava arquivos de teste vazios; o mundo Java/PHP/dotnet da epoca zombava de quem testava.)

Testes sao a base da estabilidade do open source: distros como Ubuntu rodam os testes de todo pacote antes de gerar a ISO; pacote que quebra teste sofre rollback (o slackbuild roda `make check` antes de empacotar). (— Entendendo Pacotes com Slackware)

Testes de regressao e fixtures **nao sao modernos**: Brooks ja advogava isso em 1975 no OS/360. (— The MM-M: O Melhor Livro de Software?)

---

## O que cada nivel de teste prova

- **Unitario** — as pecas funcionam isoladas.
- **Integracao** — o *sistema* funciona junto.
- **E2E / aceitacao** — o *usuario* consegue fazer o que precisa.
- Documentacao viva: em sistema grande que voce nao consegue rodar, os testes revelam entradas→saidas e invariantes. O repo liberado do Twitter nao tinha testes; com eles, confirmar a analise teria sido trivial mesmo sem compilar. (— Desbloqueando o "Algoritmo" do Twitter)

### As 7 camadas (M.Akita Chronicles) — do barato/rapido ao caro/lento

| Camada | Prova | Nota-chave |
|---|---|---|
| 1. Unitarios isolados | pecas isoladas | 977 testes em 7s (32 workers); diretorio de teste NUNCA aponta pra dados reais |
| 2. Ambiente de integracao | sistema com dados/APIs reais | nao e staging; jobs async rodam inline; emails salvos em HTML pra inspecao visual |
| 3. DevCache | LLM nao e idempotente | cache file-based de respostas de LLM; 1a exec paga, resto gratis; `FORCE=1` busta o cache. **Requisito, nao otimizacao** |
| 4. Dados reais via rsync | edge cases que mock esconde | ver lista abaixo |
| 5. Pipeline completo | semana de producao numa exec | jobs em threads paralelas; imprime billing summary |
| 6. Preflight | estrutura, nao conteudo | status por secao: pass/degraded/fail/skip. **Todo bug de LLM caiu aqui** (resposta truncada, formato errado, secao faltando) |
| 7. Cross-app | integracao entre apps | pega quando um app muda formato e o outro nao acompanha |

**Bugs achados SO com dados reais (camada 4):** titulo em japones quebrava o slugify; RSS virou Atom e o parser mockado nao pegou; Yahoo Finance retornava 429 apos o 5o ticker (rate limit inexistente no mock); CDN retornava 200 com body HTML (pagina de erro Cloudflare) em vez de imagem. (— compilado legado)

### Hierarquia: CI != Integracao

| Nivel | Prova | Tempo | Custo | Quando roda |
|---|---|---|---|---|
| Unitarios | pecas isoladas | ~7s | $0 | todo commit |
| CI pipeline | codigo saudavel | ~22s | $0 | todo commit |
| Integracao | sistema funciona | ~3min | ~$0.40 | antes de deploy |
| Preview | resultado apresentavel | manual | $0 | antes de release |

Os dois (CI e Integracao) sao necessarios. (— compilado legado)

---

## CI a cada commit (guardrails)

Pipeline do Akita (~22s, todo commit): **RuboCop (estilo) → bundler-audit (CVEs) → Brakeman (seguranca) → suite completa**. (— compilado legado)

Equivalente por stack:

| Etapa | Ruby/Rails | PHP/Laravel | Python/FastAPI | Node/Next.js |
|---|---|---|---|---|
| Lint | RuboCop | Pint | Ruff | ESLint+Prettier |
| Tipos | Sorbet | PHPStan | mypy | tsc --noEmit |
| Seg. codigo | Brakeman | Enlightn | Bandit | eslint-plugin-security |
| Seg. deps | bundler-audit | composer audit | pip-audit | npm audit |
| Testes | Minitest/RSpec | Pest | pytest | Vitest |
| E2E | — | Playwright | Playwright | Playwright |

Makefile como fonte de verdade + git hooks (`git config core.hooksPath .githooks`):
```makefile
ci: lint types test                     # pre-commit (~30-60s)
ci-full: lint types security test build # pre-push (~2-3min)
```
**Se o CI nao roda a cada commit, nao e CI.** (— compilado legado)

Cenario que isso evita: dev some 2 semanas sem integrar, da merge na master sem teste, faz deploy numa sexta e regride a equipe inteira — inclusive mudando schema sem rollback possivel. (— Rant: Projetos, TESTES e Estimativa???)

---

## Metricas reais (ratio teste/codigo)

| Projeto | Codigo | Testes | Ratio | Coverage |
|---|---|---|---|---|
| marvin-bot | 9.348 linhas | 13.929 linhas | 1.49x | 82.4% |
| newsletter | 3.397 linhas | 5.391 linhas | 1.59x | 86.8% |
| FrankMD | ~38K linhas | 1.804 testes | — | ~89% |
| FrankSherlock | ~37K linhas | 621 testes | — | — |
| FrankMega | ~7K linhas | 210 testes | — | — |
| Cloudflare vinext | — | 1.700 + 380 E2E | — | 94% API |
| **Total (Akita)** | **~144K** | **4.057 testes** | **1.52x** | — |

Mais linhas de teste que de codigo nas duas apps principais. Ecossistemas de linguagens tipadas confirmam que testar e inegociavel: React ~7 mil testes (Jest), Tailwind ~900, Django ~16 mil, Laravel ~8 mil, Spring Boot, Firefox (C++/Rust), Tokio — todos com CI rodando testes. (— compilado legado; — Rant: Projetos, TESTES e Estimativa???)

---

## Stress / load testing — meça antes de otimizar

- **Rode load test ANTES de otimizar qualquer coisa** (cache, fila, reescrita). Sem numeros reais, otimizar e chute. Ferramentas: Gatling (gera grafico legivel pro time), WRK, Apache Bench, Vegeta. Na Rinha, mudar pra modo de rede `host` rendeu mais que todas as otimizacoes de codigo (cache Redis, filas) somadas. (— Setting up Docker Compose and Postgres for Stress Testing; confianca media)
- **Conheca o limite teorico do script antes de ler o resultado.** Numero ACIMA do maximo teorico = bug de validacao, nao otimizacao — e sinal de alerta, nao de sucesso. Na Rinha o Gatling tinha teto de ~46.000-46.500 inserts; quem reportou 48.500+/51.000+ tinha bug (ex: nao validar data de nascimento, aceitar mes 13, varchar no lugar de date). (— 16 Linguagens em 16 Dias)
- **Percentis > media.** A media quase nao diz nada. Se p50 = 2ms mas p95 = 5s, o gargalo e infra no pico de carga, nao codigo — so vale otimizar codigo se o p50 estiver alto. Exemplo (modo host): media 879ms, desvio 1,7s, mas p50 ~2ms → problema era infra no final, nao codigo. (— Setting up Docker Compose...; confianca media)
- **Stress test mede throughput, nao corretude.** Uma suite de aceitacao (ex: Cypress) cobrindo casos de erro (dados invalidos, unicidade, formato) pega bugs de validacao que o stress test ignora. (— 16 Linguagens em 16 Dias)
- **Fuzz: sempre inclua dados invalidos/aleatorios no load test.** Nao assuma entrada valida — bots e usuarios descuidados mandam absurdo. O script da Rinha usava arquivo de 100 mil linhas de JSON aleatorio. (— Setting up Docker Compose...; confianca media)
- Tipo/compilacao nao salva: a versao vencedora em Rust tinha race condition deixando registros extras; versoes em Lean 4 (tipos fortes) tinham bug de validacao de data. (— 16 Linguagens em 16 Dias)

---

## Seguranca como teste continuo

Seguranca e habito a cada commit, nao "sprint no final" — 21 commits de seguranca espalhados por 8 dias. O Brakeman pegou, durante o dev, SQL injection numa busca, path traversal no controller de imagens e open redirect no unsubscribe — cada um corrigido no mesmo commit que o CI flaggou. (— compilado legado)

Antes de lancar sistema com responsabilidade financeira, contrate auditoria externa de seguranca por pelo menos um mes. Nenhum sistema e 100% seguro, mas bugs grosseiros tem que sair antes do lancamento. (— A COVID-19 matou minha Startup?: a Omnitrade auditou por um mes; nenhum bug grosseiro antes do lancamento em fev/2018.)

---

## Faca / Nao faca

**Faca:**
- Rejeite PR sem teste, automaticamente.
- Reproduza o bug com um teste que falha antes de corrigir.
- Rode a suite inteira apos cada fix.
- Crie testes antes de mexer em arquitetura/performance.
- Comece com um teste em projeto legado; cresca organicamente.
- Embuta teste no scaffold pra ser o caminho de menor resistencia.
- Teste com dados reais; conheca o limite teorico do seu load test; olhe percentis.

**Nao faca:**
- Achar que "compila, logo funciona".
- Mockar tudo (100% coverage, zero confianca).
- Refatorar e adicionar feature no mesmo commit.
- Procrastinar discutindo se a meta e 100% de cobertura quando voce tem 0%.
- Confiar em throughput de stress test como prova de corretude.
- Assumir que so dado valido chega na sua API.
- Tratar numero acima do maximo teorico como vitoria (e bug de validacao).
- Pular testes "porque a IA escreveu" — codigo de IA precisa de mais testes.

---

*Fontes: nuggets de @Akitando (engenharia/testes, pedagogico/testes) + compilado legado 02-engenharia-software-q1-2026 (akitaonrails.com + blog.cloudflare.com).*
