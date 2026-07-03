#!/usr/bin/env bash
#
# Smoke test post-deploy: verifica che la produzione (o un'istanza locale)
# serva davvero il contenuto atteso. Build verde != contenuto online.
#
# Uso:
#   bash scripts/smoke.sh                         # default: https://montelli.dev
#   bash scripts/smoke.sh http://localhost:4321   # contro build/dev locale
#
# Env opzionali:
#   SMOKE_ATTEMPTS  numero di tentativi (default 3) — per la propagazione di Pages
#   SMOKE_SLEEP     secondi tra i tentativi (default 30)
#
# Le sentinelle stanno tutte qui sotto: quando cambia il copy si aggiorna
# questa lista, non N grep sparsi. Fallimento => exit !=0 => workflow rosso.

set -uo pipefail

BASE_URL="${1:-${BASE_URL:-https://montelli.dev}}"
ATTEMPTS="${SMOKE_ATTEMPTS:-3}"
SLEEP_SECS="${SMOKE_SLEEP:-30}"

# --- Sentinelle che DEVONO essere presenti: "percorso|stringa attesa" ---
PRESENT=(
  "/servizi/|discovery call"
  "/servizi/|Affondo mirato"
  "/servizi/|Affiancamento"
  "/servizi/|€1.200"
  "/servizi/|cal.com/francesco-montelli"
  "/en/services/|discovery call"
  "/en/services/|targeted intervention"
  "/en/services/|ongoing"
  "/en/services/|€1,200"
  "/en/services/|cal.com/francesco-montelli"
)

# --- Sentinelle che NON devono comparire: "percorso|stringa" ---
# Guardia anti-regressione: la vecchia label CTA non deve tornare in home.
ABSENT=(
  "/|Richiedi un Health Check"
  "/en/|Request a Health Check"
)

fetch() {
  curl -fsSL --max-time 20 "$BASE_URL$1" 2>/dev/null
}

run_checks() {
  local fail=0 url needle entry
  declare -A CACHE=()

  # Scarica una sola volta ogni URL coinvolto (no refetch per sentinella).
  local urls=()
  for entry in "${PRESENT[@]}" "${ABSENT[@]}"; do
    url="${entry%%|*}"
    [[ " ${urls[*]:-} " == *" $url "* ]] || urls+=("$url")
  done
  for url in "${urls[@]}"; do
    CACHE[$url]="$(fetch "$url" || true)"
    [ -z "${CACHE[$url]}" ] && CACHE[$url]="__FETCH_FAILED__"
  done

  for entry in "${PRESENT[@]}"; do
    url="${entry%%|*}"; needle="${entry#*|}"
    if grep -qF -- "$needle" <<< "${CACHE[$url]}"; then
      echo "  OK  presente   $url  <-  '$needle'"
    else
      echo "  KO  MANCANTE   $url  <-  '$needle'"; fail=1
    fi
  done

  for entry in "${ABSENT[@]}"; do
    url="${entry%%|*}"; needle="${entry#*|}"
    if grep -qF -- "$needle" <<< "${CACHE[$url]}"; then
      echo "  KO  PRESENTE MA NON DOVREBBE   $url  ->  '$needle'"; fail=1
    else
      echo "  OK  assente    $url  ->  '$needle'"
    fi
  done

  return $fail
}

echo "Smoke test su: $BASE_URL"
for n in $(seq 1 "$ATTEMPTS"); do
  echo "--- Tentativo $n/$ATTEMPTS ---"
  if run_checks; then
    echo "Smoke test superato."
    exit 0
  fi
  if [ "$n" -lt "$ATTEMPTS" ]; then
    echo "Ritento tra ${SLEEP_SECS}s (propagazione GitHub Pages)..."
    sleep "$SLEEP_SECS"
  fi
done

echo "Smoke test FALLITO dopo $ATTEMPTS tentativi."
exit 1
