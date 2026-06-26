#!/usr/bin/env bash
# Sincroniza o conteúdo dos packs a partir das bases-fonte locais.
# Reexecutável: copia os docs e os renomeia para as keys do manifest.
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AKITA_SRC="${AKITA_SRC:-$HOME/Projects/akita-engineering-base/compilados-akita}"
AKITA_DST="$REPO_DIR/packs/akita/docs"

if [[ ! -d "$AKITA_SRC" ]]; then
  echo "ERRO: fonte akita não encontrada em $AKITA_SRC (defina AKITA_SRC)" >&2
  exit 1
fi

mkdir -p "$AKITA_DST"

# key:arquivo-fonte
declare -A AKITA_MAP=(
  [principios]=principios-e-filosofia.md
  [processo-ia]=processo-com-ia.md
  [escrever-codigo]=escrever-codigo.md
  [testes]=testes.md
  [arquitetura]=arquitetura-e-design.md
  [banco-sql]=banco-e-sql.md
  [git-entrega]=git-e-entrega.md
  [seguranca]=seguranca.md
  [jobs]=jobs-e-confiabilidade.md
  [linguagens]=linguagens-e-stacks.md
)

for key in "${!AKITA_MAP[@]}"; do
  src="$AKITA_SRC/${AKITA_MAP[$key]}"
  if [[ ! -f "$src" ]]; then
    echo "ERRO: doc fonte ausente: $src" >&2
    exit 1
  fi
  cp "$src" "$AKITA_DST/$key.md"
  echo "ok: $key.md"
done

echo "Pack akita sincronizado em $AKITA_DST"
