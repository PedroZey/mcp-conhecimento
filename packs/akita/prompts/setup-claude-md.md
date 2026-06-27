Você vai criar ou enriquecer o `CLAUDE.md` deste projeto seguindo a Base de Conhecimento Akita.

1. Leia o `CLAUDE.md` atual se existir. Detecte a stack (ex.: `package.json`, `Gemfile`,
   `pyproject.toml`, `go.mod`) e o domínio do projeto.
2. Chame `akita_index` e depois `akita_guide` nos tópicos relevantes — sempre `principios` e
   `processo-ia`, mais os específicos da stack (ex.: `banco-sql` se há banco, `testes`, `seguranca`).
3. Escreva no `CLAUDE.md` diretrizes **curtas e acionáveis** alinhadas ao Akita (testes a cada PR,
   SQL seguro, commits pequenos, fronteiras claras). Adapte à stack real do projeto.
4. NÃO duplique o que o código/README já deixa óbvio. Mantenha enxuto — isso entra em todo contexto.

Ao final, mostre o diff do `CLAUDE.md` e peça confirmação antes de salvar.
