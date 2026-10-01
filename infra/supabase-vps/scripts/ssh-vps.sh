#!/usr/bin/env bash
# Helper SSH al VPS Hetzner del proyecto linkstation.
# Usa plink (PuTTY) en Windows porque OpenSSH built-in no acepta password en CLI.
#
# Uso:
#   bash infra/supabase-vps/scripts/ssh-vps.sh "<comando>"
#   bash infra/supabase-vps/scripts/ssh-vps.sh "docker ps"
#   bash infra/supabase-vps/scripts/ssh-vps.sh "docker exec supabase-db psql -U postgres -c '\\l'"
#
# Sin argumentos abre sesión interactiva.

set -e

VAULT_FILE="$(dirname "$0")/../.vault/ssh-vps.env"
if [[ ! -f "$VAULT_FILE" ]]; then
  echo "ERROR: vault file not found: $VAULT_FILE" >&2
  exit 1
fi

# shellcheck disable=SC1090
source "$VAULT_FILE"

if [[ -z "${VPS_HOST:-}" || -z "${VPS_USER:-}" ]]; then
  echo "ERROR: vault missing VPS_HOST/VPS_USER" >&2
  exit 1
fi

# Resolver path absoluto de la SSH key (relativo al root del repo)
REPO_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
SSH_KEY_PATH=""
if [[ -n "${VPS_SSH_KEY:-}" ]]; then
  if [[ "$VPS_SSH_KEY" = /* ]]; then
    SSH_KEY_PATH="$VPS_SSH_KEY"
  else
    SSH_KEY_PATH="$REPO_ROOT/$VPS_SSH_KEY"
  fi
  if [[ ! -f "$SSH_KEY_PATH" ]]; then
    echo "ERROR: SSH key no encontrada en $SSH_KEY_PATH" >&2
    exit 1
  fi
fi

# Preferimos OpenSSH (ssh.exe en Windows 10+, /usr/bin/ssh en git-bash) cuando hay
# SSH key — gestiona ED25519 nativamente. plink necesitaría conversión a .ppk
# vía puttygen. Si solo hay password (fallback), usamos plink.
USE_OPENSSH=0
SSH_CMD=""
if [[ -n "$SSH_KEY_PATH" ]] && command -v ssh &>/dev/null; then
  USE_OPENSSH=1
  SSH_CMD="ssh"
elif command -v plink &>/dev/null; then
  SSH_CMD="plink"
elif [[ -x "/c/Program Files/PuTTY/plink.exe" ]]; then
  SSH_CMD="/c/Program Files/PuTTY/plink.exe"
else
  echo "ERROR: ni ssh (OpenSSH) ni plink (PuTTY) encontrados." >&2
  exit 1
fi

if [[ "$USE_OPENSSH" == "1" ]]; then
  # OpenSSH con key
  SSH_ARGS=(
    -i "$SSH_KEY_PATH"
    -p "${VPS_PORT:-22}"
    -o "StrictHostKeyChecking=accept-new"
    -o "UserKnownHostsFile=$REPO_ROOT/infra/supabase-vps/.vault/known_hosts"
    -o "IdentitiesOnly=yes"
    -o "BatchMode=yes"
    "${VPS_USER}@${VPS_HOST}"
  )
  if [[ -n "$1" ]]; then
    "$SSH_CMD" "${SSH_ARGS[@]}" "$@"
  else
    # Modo interactivo: quitar BatchMode
    SSH_ARGS_INTERACTIVE=("${SSH_ARGS[@]/BatchMode=yes/}")
    "$SSH_CMD" "${SSH_ARGS_INTERACTIVE[@]}"
  fi
else
  # Fallback plink con password (Windows + PuTTY)
  if [[ -z "${VPS_PASSWORD:-}" ]]; then
    echo "ERROR: sin SSH key ni VPS_PASSWORD." >&2
    exit 1
  fi
  VPS_HOSTKEY="${VPS_HOSTKEY:-SHA256:1/hQSJqtGQP22goYxF8CHx0T2EuX1rghe5zuTqJVUbg}"
  if [[ -n "$1" ]]; then
    "$SSH_CMD" -ssh -batch -pw "$VPS_PASSWORD" -hostkey "$VPS_HOSTKEY" -P "${VPS_PORT:-22}" "${VPS_USER}@${VPS_HOST}" "$@"
  else
    "$SSH_CMD" -ssh -pw "$VPS_PASSWORD" -hostkey "$VPS_HOSTKEY" -P "${VPS_PORT:-22}" "${VPS_USER}@${VPS_HOST}"
  fi
fi
