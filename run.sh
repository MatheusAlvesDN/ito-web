#!/usr/bin/env bash
# Party Games - inicia backend (FastAPI) e frontend (Vite) juntos no Linux/macOS.
#
# Uso:
#   ./run.sh          instala o que faltar e inicia backend + frontend
#   ./run.sh setup    (re)instala dependências do frontend e do backend
#   ./run.sh seed     popula o banco de dados (só se estiver vazio)
#   ./run.sh seed --reset  apaga o conteúdo dos jogos e repopula (contas de admin ficam)
#   ./run.sh admin <usuario>  cria uma conta de admin do painel (pede a senha)
#   ./run.sh backend  inicia só o backend
#   ./run.sh frontend inicia só o frontend
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

VENV="$ROOT/backend/.venv"
PYTHON="$VENV/bin/python"
DB_FILE="$ROOT/backend/partygames.db"
BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"

info() { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
fail() { printf '\033[1;31mErro:\033[0m %s\n' "$*" >&2; exit 1; }

require() {
  command -v "$1" >/dev/null 2>&1 || fail "'$1' não encontrado. Instale-o e tente novamente."
}

setup_frontend() {
  require node
  require npm
  info "Instalando dependências do frontend..."
  local npm_major
  npm_major="$(npm -v | cut -d. -f1)"
  if [ "$npm_major" -ge 10 ]; then
    npm install --no-audit --no-fund
  else
    # O package.json usa alias "npm:rolldown-vite" em overrides, que o npm 9 não entende.
    # Roda o npm 10 a partir de outro diretório para o npx não ler este package.json.
    info "npm $npm_major detectado; usando npm 10 via npx."
    (cd "$HOME" && npx -y npm@10 --prefix "$ROOT" install --no-audit --no-fund)
  fi
}

setup_backend() {
  require python3
  info "Criando ambiente Python em backend/.venv..."
  if [ ! -x "$PYTHON" ]; then
    if ! python3 -m venv "$VENV" 2>/dev/null; then
      # Sem ensurepip (ex.: Debian/Ubuntu sem python3-venv): cria sem pip e instala o pip manualmente
      rm -rf "$VENV"
      python3 -m venv --without-pip "$VENV"
      local tmp
      tmp="$(mktemp -d)"
      curl -sSL https://bootstrap.pypa.io/get-pip.py -o "$tmp/get-pip.py"
      "$PYTHON" -I "$tmp/get-pip.py" -q
      rm -rf "$tmp"
    fi
  fi
  info "Instalando dependências do backend..."
  "$PYTHON" -m pip install -q -r backend/requirements-dev.txt
}

seed_db() {
  info "Populando o banco de dados..."
  "$PYTHON" backend/scripts/seed_from_ts.py "$@"
}

create_admin() {
  [ -n "${1:-}" ] || fail "Informe o usuário: ./run.sh admin <usuario>"
  "$PYTHON" backend/scripts/create_admin.py "$@"
}

ensure_ready() {
  [ -d node_modules ] || setup_frontend
  [ -x "$PYTHON" ] && "$PYTHON" -c "import fastapi" 2>/dev/null || setup_backend
  [ -f "$DB_FILE" ] || seed_db
}

run_backend() {
  "$PYTHON" -m uvicorn app.main:app --app-dir backend --reload --port "$BACKEND_PORT"
}

run_frontend() {
  ./node_modules/.bin/vite --port "$FRONTEND_PORT"
}

run_all() {
  ensure_ready

  info "Iniciando backend em http://localhost:$BACKEND_PORT (docs em /docs)..."
  run_backend &
  local backend_pid=$!

  # Encerra os dois processos ao sair (Ctrl+C ou falha de um deles)
  cleanup() {
    trap - INT TERM EXIT
    info "Encerrando..."
    kill "$backend_pid" "${frontend_pid:-}" 2>/dev/null || true
    wait 2>/dev/null || true
  }
  trap cleanup INT TERM EXIT

  # Espera a API responder antes de subir o frontend
  for _ in $(seq 1 30); do
    curl -sf "http://localhost:$BACKEND_PORT/api/health" >/dev/null 2>&1 && break
    kill -0 "$backend_pid" 2>/dev/null || fail "O backend não iniciou. Veja as mensagens acima."
    sleep 0.5
  done

  info "Iniciando frontend em http://localhost:$FRONTEND_PORT ..."
  run_frontend &
  frontend_pid=$!

  info "Tudo no ar. Pressione Ctrl+C para parar."
  # Sai assim que qualquer um dos dois parar
  wait -n "$backend_pid" "$frontend_pid"
}

case "${1:-all}" in
  all)      run_all ;;
  setup)    setup_frontend; setup_backend; seed_db ;;
  seed)     shift; ensure_ready; seed_db "$@" ;;
  admin)    shift; ensure_ready; create_admin "$@" ;;
  backend)  ensure_ready; run_backend ;;
  frontend) ensure_ready; run_frontend ;;
  *)        fail "Comando desconhecido: $1 (use: setup, seed, admin, backend, frontend)" ;;
esac
