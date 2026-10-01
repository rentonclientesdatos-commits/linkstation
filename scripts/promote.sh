#!/usr/bin/env bash
# ============================================================================
# promote.sh — Promocion de ramas linkstation (Bash/WSL/Linux/macOS)
# ============================================================================
# Equivalente Bash de promote.ps1. Uso:
#   ./scripts/promote.sh --from developer --to staging --version 0.1.0
#   ./scripts/promote.sh --from staging   --to main    --version 0.1.0
#
# Opcionales: --dry-run --force
# ============================================================================

set -euo pipefail

FROM=""
TO=""
VERSION=""
DRY_RUN=0
FORCE=0

while [[ $# -gt 0 ]]; do
    case "$1" in
        --from)    FROM="$2"; shift 2 ;;
        --to)      TO="$2"; shift 2 ;;
        --version) VERSION="$2"; shift 2 ;;
        --dry-run) DRY_RUN=1; shift ;;
        --force)   FORCE=1; shift ;;
        *) echo "Argumento desconocido: $1"; exit 1 ;;
    esac
done

if [[ -z "$FROM" || -z "$TO" || -z "$VERSION" ]]; then
    echo "Uso: $0 --from <developer|staging> --to <staging|main> --version <X.Y.Z> [--dry-run] [--force]"
    exit 1
fi

# Validar transiciones
case "$FROM->$TO" in
    "developer->staging") ;;
    "staging->main") ;;
    *)
        echo "ERROR: Transicion $FROM -> $TO no permitida."
        echo "Validas: developer -> staging, staging -> main"
        exit 1
        ;;
esac

# Validar SemVer
if [[ ! "$VERSION" =~ ^v?[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "ERROR: Version '$VERSION' no tiene formato SemVer."
    exit 1
fi
VERSION="${VERSION#v}"

# Confirmacion para rama protegida
if [[ "$TO" == "staging" || "$TO" == "main" ]] && [[ $FORCE -eq 0 ]]; then
    echo
    echo "AVISO: Promocion a rama PROTEGIDA '$TO' v$VERSION."
    echo "Pasos: pull, merge --squash, remove docs/plans/.claude/, commit, tag (si main)"
    read -r -p "Confirma con 'YES' para continuar: " CONFIRM
    if [[ "$CONFIRM" != "YES" ]]; then
        echo "Cancelado."
        exit 0
    fi
fi

# Working tree limpio
if [[ -n "$(git status --porcelain)" && $DRY_RUN -eq 0 ]]; then
    echo "ERROR: Working tree no esta limpio."
    git status --short
    exit 1
fi

PATHS_TO_REMOVE=(
    "docs/"
    "plans/"
    ".claude/"
    ".claude-plugin/"
    "CLAUDE.md"
    "scripts/promote.ps1"
    "scripts/promote.sh"
)

echo
echo "=== Promocion $FROM -> $TO (v$VERSION) ==="
[[ $DRY_RUN -eq 1 ]] && echo "DRY RUN activo"
echo

run_git() {
    echo "  > git $*"
    [[ $DRY_RUN -eq 0 ]] && git "$@"
}

echo "[1/6] Sincronizando origen..."
run_git checkout "$FROM"
run_git pull origin "$FROM"

echo "[2/6] Checkout destino..."
run_git checkout "$TO"
run_git pull origin "$TO"

echo "[3/6] Merge --squash..."
run_git merge --squash "$FROM"

echo "[4/6] Eliminando paths prohibidos..."
for p in "${PATHS_TO_REMOVE[@]}"; do
    if [[ -e "$p" ]]; then
        echo "  - Eliminando $p"
        if [[ $DRY_RUN -eq 0 ]]; then
            git rm -rf --cached "$p" 2>/dev/null || true
            rm -rf "$p"
        fi
    else
        echo "  - $p ya no existe (skip)"
    fi
done

echo "[5/6] Commit..."
COMMIT_MSG="chore(release): promote v$VERSION from $FROM to $TO"
run_git add .
run_git commit -m "$COMMIT_MSG"

if [[ "$TO" == "main" ]]; then
    echo "[6/6] Creando tag v$VERSION..."
    run_git tag -a "v$VERSION" -m "Release v$VERSION"
else
    echo "[6/6] (Tag solo se crea cuando To=main, skip)"
fi

echo
echo "=== Promocion completada localmente ==="
echo
echo "Siguiente paso MANUAL:"
echo "  git log --oneline -5"
echo "  git status"
echo "  # Si OK:"
echo "  git push origin $TO"
if [[ "$TO" == "main" ]]; then
    echo "  git push origin v$VERSION"
fi
