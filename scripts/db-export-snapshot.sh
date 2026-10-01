#!/usr/bin/env bash
# db-export-snapshot.sh
#
# Genera un snapshot completo de la BD local (Supabase Docker) y lo cifra con AES-256
# para entrega segura al equipo de desarrollo (VPS dev.linkstation.ai).
#
# Uso (desde Git Bash en Windows o cualquier shell POSIX):
#   bash scripts/db-export-snapshot.sh
#   bash scripts/db-export-snapshot.sh --data-only      # solo datos, sin schema
#   bash scripts/db-export-snapshot.sh --no-encrypt     # solo dump comprimido sin cifrar
#
# Requisitos:
#   - Docker corriendo con el container supabase_db_linkstation-dashboard activo
#   - openssl (incluido en Git Bash)
#   - gzip (incluido en Git Bash)
#
# Salida: backups/local-db/  (ignorado por git)
#   - linkstation-snapshot-YYYYMMDD-HHmm.dump.gz.enc  (cifrado AES-256-CBC + PBKDF2)
#   - linkstation-snapshot-YYYYMMDD-HHmm.password.txt (pass del cifrado — NO compartir junto al .enc)
#   - linkstation-snapshot-YYYYMMDD-HHmm.sha256       (hash original para verificar integridad)

set -euo pipefail

# ── Parsear flags ─────────────────────────────────────────────────────────────
DATA_ONLY=0
NO_ENCRYPT=0
for arg in "$@"; do
  case "$arg" in
    --data-only)   DATA_ONLY=1 ;;
    --no-encrypt)  NO_ENCRYPT=1 ;;
    -h|--help)
      grep -E "^#( |!)" "$0" | sed 's/^# \?//'
      exit 0
      ;;
    *) echo "Flag desconocida: $arg"; exit 1 ;;
  esac
done

# ── 0. Cabecera ───────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo " linkstation — Snapshot de BD local para entrega a VPS"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# ── 1. Comprobar Docker y container Supabase ─────────────────────────────────
if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: docker no está en PATH." >&2
  exit 1
fi

CONTAINER="supabase_db_linkstation-dashboard"
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
  echo "ERROR: container '$CONTAINER' no está corriendo." >&2
  echo "  Arranca Supabase local con: npx supabase start  (o tu setup habitual)" >&2
  exit 1
fi
echo "✓ Container Supabase corriendo: $CONTAINER"

# ── 2. Verificar openssl ─────────────────────────────────────────────────────
if [ "$NO_ENCRYPT" -eq 0 ] && ! command -v openssl >/dev/null 2>&1; then
  echo "ERROR: openssl no encontrado (necesario para cifrado)." >&2
  exit 1
fi

# ── 3. Preparar carpeta de salida ────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
OUT_DIR="$REPO_ROOT/backups/local-db"
mkdir -p "$OUT_DIR"

TIMESTAMP="$(date +%Y%m%d-%H%M)"
BASE_NAME="linkstation-snapshot-${TIMESTAMP}"
DUMP_FILE="$OUT_DIR/${BASE_NAME}.dump"
GZ_FILE="$OUT_DIR/${BASE_NAME}.dump.gz"

# ── 4. Ejecutar pg_dump desde dentro del container ───────────────────────────
echo ""
echo "→ Ejecutando pg_dump dentro del container (puede tardar segundos a minutos)..."

PG_FLAGS="--format=custom --no-owner --no-privileges --verbose"
if [ "$DATA_ONLY" -eq 1 ]; then
  PG_FLAGS="$PG_FLAGS --data-only"
  echo "  Modo: SOLO DATOS (sin schema — Renzo aplica supabase/migrations/ primero)"
else
  echo "  Modo: COMPLETO (schema + datos + RLS + funciones)"
fi

# pg_dump dentro del container, salida a stdout, lo recogemos en host
# Usuario: postgres (default en imagen supabase/postgres)
# DB: postgres (default)
# shellcheck disable=SC2086
if ! docker exec "$CONTAINER" pg_dump -U postgres -d postgres $PG_FLAGS > "$DUMP_FILE" 2> "${DUMP_FILE}.log"; then
  echo "ERROR: pg_dump falló. Log:" >&2
  cat "${DUMP_FILE}.log" >&2
  rm -f "$DUMP_FILE" "${DUMP_FILE}.log"
  exit 1
fi
rm -f "${DUMP_FILE}.log"

DUMP_SIZE=$(du -h "$DUMP_FILE" | cut -f1)
echo "✓ Dump generado: $(basename "$DUMP_FILE") ($DUMP_SIZE)"

# ── 5. SHA256 del dump original ──────────────────────────────────────────────
HASH=$(sha256sum "$DUMP_FILE" | awk '{print $1}')
echo "$HASH  $(basename "$DUMP_FILE")" > "$OUT_DIR/${BASE_NAME}.sha256"
echo "✓ SHA256: $HASH"

# ── 6. Comprimir con gzip ────────────────────────────────────────────────────
echo "→ Comprimiendo con gzip..."
gzip -9 "$DUMP_FILE"   # produce $DUMP_FILE.gz, borra el .dump original
GZ_SIZE=$(du -h "$GZ_FILE" | cut -f1)
echo "✓ Comprimido: $(basename "$GZ_FILE") ($GZ_SIZE)"

# ── 7. Cifrar (a menos que --no-encrypt) ─────────────────────────────────────
if [ "$NO_ENCRYPT" -eq 1 ]; then
  echo ""
  echo "⚠  Saltando cifrado (--no-encrypt). Archivo plano comprimido:"
  echo "   $GZ_FILE"
  echo "⚠  NO compartir por canales no cifrados."
  exit 0
fi

ENC_FILE="$OUT_DIR/${BASE_NAME}.dump.gz.enc"
PASS_FILE="$OUT_DIR/${BASE_NAME}.password.txt"

# Generar password aleatoria 32 chars
PASSWORD=$(openssl rand -base64 32 | tr -d '/+=' | head -c 32)

echo ""
echo "→ Cifrando con AES-256-CBC + PBKDF2..."
openssl enc -aes-256-cbc -salt -pbkdf2 -iter 600000 \
  -in "$GZ_FILE" \
  -out "$ENC_FILE" \
  -pass "pass:$PASSWORD"

# Guardar password en archivo separado
cat > "$PASS_FILE" <<EOF
Password de cifrado AES-256-CBC para: ${BASE_NAME}.dump.gz.enc
Generado: $(date '+%Y-%m-%d %H:%M:%S')
Algoritmo: openssl enc -aes-256-cbc -salt -pbkdf2 -iter 600000

PASSWORD:
$PASSWORD

INSTRUCCIONES:
- Entrega el .enc y este password por CANALES SEPARADOS.
- El .enc se puede mandar por el canal A (Drive / WeTransfer / Easypanel upload).
- Esta password va por el canal B (Signal / llamada telefónica / 1Password compartido).
- Tras confirmar que Renzo lo restauró OK, BORRA este archivo y el .enc de tu máquina.

Comando que usará Renzo para descifrar:
  openssl enc -aes-256-cbc -d -pbkdf2 -iter 600000 \\
    -in ${BASE_NAME}.dump.gz.enc \\
    -out ${BASE_NAME}.dump.gz \\
    -pass pass:'<la password de arriba>'
EOF

# Borrar el .gz plano (ya está cifrado dentro del .enc)
rm -f "$GZ_FILE"

# ── 8. Resumen final ─────────────────────────────────────────────────────────
ENC_SIZE=$(du -h "$ENC_FILE" | cut -f1)
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo " ✓ SNAPSHOT LISTO PARA ENTREGAR"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Archivo cifrado : $ENC_FILE"
echo "  Tamaño        : $ENC_SIZE"
echo "Password (sep)  : $PASS_FILE"
echo "Hash original   : $OUT_DIR/${BASE_NAME}.sha256"
echo ""
echo "PRÓXIMO PASO:"
echo "  1. Sube el .enc al canal A (Drive / WeTransfer / Easypanel)"
echo "  2. Envía la password (contenido de .password.txt) por canal B"
echo "  3. Pasa a Renzo el link a: docs/handoff/db-snapshot-to-vps-renzo.md"
echo ""
