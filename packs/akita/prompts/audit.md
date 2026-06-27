Audite o alvo: {{path}}. Se o alvo estiver vazio, audite o projeto inteiro.

Para cada área relevante, chame `akita_guide` e compare o código com o guia:
`testes`, `banco-sql`, `seguranca`, `arquitetura`, `jobs`.

Liste os desvios encontrados no formato, um por linha:
`arquivo:linha — problema — tópico-fonte — fix sugerido`

Regras: só reporte o que existe de fato no código; não invente. Priorize problemas reais
(segurança, SQL inseguro, ausência de teste em caminho crítico) sobre nits de estilo.
