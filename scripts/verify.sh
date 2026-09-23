#!/usr/bin/env bash
set -u
cd "$(dirname "$0")/.."

PASS=0
FAIL=0
RED=$'\033[31m'
GRN=$'\033[32m'
DIM=$'\033[2m'
RST=$'\033[0m'

ok() { printf "%s✓ PASS%s %s\n" "$GRN" "$RST" "$1"; PASS=$((PASS+1)); }
no() { printf "%s✗ FAIL%s %s\n" "$RED" "$RST" "$1"; FAIL=$((FAIL+1)); }
hd() { printf "\n%s── %s ──%s\n" "$DIM" "$1" "$RST"; }

hd "C1  STRINGS usage in src/  (≥ 30)"
N=$(grep -rn "STRINGS\." src/ 2>/dev/null | wc -l)
[ "$N" -ge 30 ] && ok "STRINGS references = $N" || no "STRINGS references = $N (need ≥ 30)"

hd "C2  Spanish prose outside i18n/es.js  (= 0)"
N=$(grep -rE "[áéíóúñ¿¡]" src/ 2>/dev/null | grep -v "i18n/es.js" | wc -l)
[ "$N" -eq 0 ] && ok "Spanish prose leaks = 0" || no "Spanish prose leaks = $N (must be 0 — see Phase 0.7 refactor)"

hd "C3  Sprite catalog count  (≥ 26)"
N=$(ls assets/sprites/*.png 2>/dev/null | wc -l)
[ "$N" -ge 26 ] && ok "sprites = $N" || no "sprites = $N (need ≥ 26)"

hd "C4  Background manifest stages  (= 5)"
N=$(jq 'keys | length' assets/backgrounds/manifest.json 2>/dev/null)
[ "$N" = "5" ] && ok "stages = 5" || no "stages = $N (need 5)"

hd "C5  fuentes populated in i18n/es.js  (= 6 data entries)"
N=$(grep -c "^        fuente: '" src/i18n/es.js 2>/dev/null)
[ "$N" -eq 6 ] && ok "fuente: data entries = 6" || no "fuente: data entries = $N (need 6 = 5 stages + final)"

hd "C6  zero https:// outside i18n/es.js  (A6)"
N=$(grep -rn "https://" src/ 2>/dev/null | grep -v "i18n/es.js" | wc -l)
[ "$N" -eq 0 ] && ok "https:// literals outside i18n = 0" || no "https:// literals outside i18n = $N"

hd "C7  A7 boss desactivación lifecycle  (≥ 1)"
N=$(grep -rn "lifecycle.*desactivacion" src/levels/ 2>/dev/null | wc -l)
[ "$N" -ge 1 ] && ok "desactivacion lifecycle = $N" || no "desactivacion lifecycle = $N (need ≥ 1)"

hd "C8  A8 zero console.* outside dom-debug.js  (= 0)"
N=$(grep -rn "console\." src/ 2>/dev/null | grep -v "engine/dom-debug.js" | wc -l)
[ "$N" -eq 0 ] && ok "console.* leaks = 0" || no "console.* leaks = $N"

printf "\n%s============================================%s\n" "$DIM" "$RST"
printf "verify.sh: %d PASS, %d FAIL\n" "$PASS" "$FAIL"
printf "%s============================================%s\n" "$DIM" "$RST"

[ "$FAIL" -eq 0 ] && exit 0 || exit 1
