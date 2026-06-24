# Metabase MCP — engineer setup (macOS)

Connect Claude (Cowork desktop app **and** the Claude Code CLI) to
`metabase.multiverse.io` so you can query our data from chat. The Metabase API
key never touches disk — it's pulled from 1Password at launch.

**Time:** ~5 min. **Idempotent:** safe to re-run.

---

## Prerequisites

- **macOS with Homebrew** (the script installs `uv`, `1password-cli`, `jq` if missing).
- **1Password desktop app installed**, and you can **read the Metabase item**
  (`op://Product and tech/metabase/api key`). If you don't have access to the
  *Product and tech* vault, request it first — nothing below works without it.
- For the CLI surface: **Claude Code** installed (`claude` on your PATH).
- For the Cowork surface: the **Cowork desktop app** installed.

> Note: this is the **only** supported path. There is no hosted Metabase MCP —
> the HTTP/OAuth transport does not work against our instance. This local
> `op run + uvx metabase-mcp` setup is the working one.

---

## Why the 1Password *desktop* CLI integration (read this — it's the gotcha)

The Claude config stores a secret **reference** (`op://…`), never the key. At
server launch, `op run` swaps that reference for the real key **in memory**, for
the child process only. For `op` to do that non-interactively it needs an
authenticated 1Password session — and the clean way to provide one (without
stashing a service-account token on disk) is the **desktop app CLI integration**:
`op` borrows the desktop app's unlocked session over local IPC, gated by Touch ID.

So, one-time, before running:

1. **1Password → Settings → Developer → enable "Integrate with 1Password CLI"**.
2. **Quit (⌘Q) and reopen 1Password** so `op` picks up the socket.
3. Keep 1Password **unlocked** when Claude launches the server — the key is
   resolved fresh on every (re)start. If it's locked, the tools won't connect
   until you unlock and restart that surface.

---

## Run it

Save the script below as `setup-metabase-mcp-eng.sh`, then:

```bash
chmod +x setup-metabase-mcp-eng.sh

./setup-metabase-mcp-eng.sh --dry-run     # preview, writes nothing
./setup-metabase-mcp-eng.sh               # set up BOTH Cowork + CLI (default)

# scope to one surface if you prefer:
./setup-metabase-mcp-eng.sh --cli         # Claude Code only
./setup-metabase-mcp-eng.sh --cowork      # Cowork app only
```

The script preflights 1Password and tells you the exact fix if the integration
isn't live yet.

---

## The script

```bash
#!/usr/bin/env bash
#
# setup-metabase-mcp-eng.sh — engineer edition
# ----------------------------------------------------------------------------
# Wires the Metabase MCP server into Claude so you can query metabase.multiverse.io
# from chat. Engineer-oriented variant of setup-metabase-mcp.sh: covers BOTH the
# Claude Code CLI and the Cowork desktop app, is flag-configurable, and is explicit
# about *why* the moving parts are shaped the way they are — especially the
# 1Password desktop CLI integration.
#
#   ./setup-metabase-mcp-eng.sh                 # set up BOTH Cowork + CLI (default)
#   ./setup-metabase-mcp-eng.sh --cli           # Claude Code (CLI) only
#   ./setup-metabase-mcp-eng.sh --cowork        # Cowork desktop app only
#   ./setup-metabase-mcp-eng.sh --dry-run       # show what it would do, write nothing
#   OP_REF=… METABASE_URL=… ./setup-metabase-mcp-eng.sh
#
# Idempotent: re-running replaces only the "metabase" server entry on each surface.
#
# ============================================================================
# ARCHITECTURE (what actually runs)
# ============================================================================
#
#   Claude (Code CLI or Cowork app)
#     └─ spawns a stdio MCP server with this command:
#          op run --no-masking -- uvx metabase-mcp
#            │                        └─ uvx fetches+runs the `metabase-mcp` package
#            │                           (no global install; pinned per-run by uv)
#            └─ `op run` resolves every op:// reference in the child's env to the
#               real secret, IN MEMORY, for that child process only, then execs it.
#
#   The server reads two env vars:
#       METABASE_URL      — plaintext, non-secret (the instance URL)
#       METABASE_API_KEY  — an op:// REFERENCE in the config, resolved to the real
#                           key by `op run` at launch. The key itself is NEVER
#                           written to the Claude config, a dotfile, or shell history.
#
# ============================================================================
# WHY 1PASSWORD *DESKTOP* CLI INTEGRATION IS REQUIRED  (the load-bearing bit)
# ============================================================================
#
# The whole point of the `op run` wrapper is that the Metabase API key lives
# ONLY in 1Password. The Claude config stores a secret *reference*
# (op://Product and tech/metabase/api key), not the secret. At server launch,
# `op` swaps the reference for the real value in the process environment.
#
# But `op` can only do that if it has an authenticated 1Password session. There
# are two ways to give it one:
#
#   1. A service-account token (OP_SERVICE_ACCOUNT_TOKEN). This is itself a
#      long-lived secret that you'd have to store on disk / in an env file —
#      which reintroduces exactly the plaintext-credential problem we're avoiding,
#      and needs separate provisioning. Rejected.
#
#   2. **The 1Password desktop app CLI integration.** The `op` CLI has no
#      credential store of its own; with this integration it *borrows the desktop
#      app's already-unlocked session* over a local IPC channel. Auth is gated by
#      the desktop app — i.e. your Touch ID / device unlock. No token on disk;
#      the human-presence unlock IS the credential. This is what we use.
#
# That is why it must be the DESKTOP integration specifically: the CLI alone is
# credential-less; it delegates to the running, unlocked desktop app. Enable it at
#   1Password → Settings → Developer → "Integrate with 1Password CLI"
# then QUIT (⌘Q) and reopen 1Password so the `op` binary picks up the socket.
#
# Operational consequence to know: because the key is resolved at *launch* and
# depends on the desktop app being unlocked, if 1Password is locked when Claude
# (re)starts the server, the Metabase tools won't come up until you unlock and
# the server is restarted. That latency is the price of keeping zero secrets on
# disk — an accepted trade, not a bug.
# ============================================================================

set -euo pipefail

# --- config (override via env or flags) -------------------------------------
OP_REF="${OP_REF:-op://Product and tech/metabase/api key}"
METABASE_URL="${METABASE_URL:-https://metabase.multiverse.io}"
SURFACES="cli cowork"   # default: set up both
DRY_RUN=0

while [ $# -gt 0 ]; do
  case "$1" in
    --cowork|--desktop) SURFACES="cowork" ;;
    --cli)              SURFACES="cli" ;;
    --both)             SURFACES="cli cowork" ;;
    --dry-run)          DRY_RUN=1 ;;
    -h|--help)          sed -n '2,40p' "$0"; exit 0 ;;
    *) printf 'Unknown flag: %s (try --help)\n' "$1" >&2; exit 2 ;;
  esac
  shift
done

# --- pretty output -----------------------------------------------------------
bold() { printf "\033[1m%s\033[0m\n" "$1"; }
ok()   { printf "  \033[32m✓\033[0m %s\n" "$1"; }
warn() { printf "  \033[33m!\033[0m %s\n" "$1"; }
die()  { printf "  \033[31m✗ %s\033[0m\n" "$1" >&2; exit 1; }
run()  { if [ "$DRY_RUN" -eq 1 ]; then printf "  \033[2m(dry-run) %s\033[0m\n" "$*"; else "$@"; fi; }
has()  { case " $SURFACES " in *" $1 "*) return 0 ;; *) return 1 ;; esac; }

bold "Metabase MCP setup — surfaces: $SURFACES$([ "$DRY_RUN" -eq 1 ] && echo '  (dry-run)')"

# --- 1. dependencies ---------------------------------------------------------
# uv (provides uvx), the 1Password CLI (op), and jq (the JSON merge for Cowork;
# also used to build the CLI payload). Install only what's missing.
command -v brew >/dev/null 2>&1 || die "Homebrew not found — install from https://brew.sh, then re-run."
BREW_BIN="$(brew --prefix)/bin"

need=()
command -v uv >/dev/null 2>&1 || need+=("uv")
command -v op >/dev/null 2>&1 || need+=("1password-cli")
command -v jq >/dev/null 2>&1 || need+=("jq")
if [ "${#need[@]}" -gt 0 ]; then
  bold "Installing: ${need[*]}"
  run brew install "${need[@]}"
fi

# Resolve ABSOLUTE binary paths. The Cowork desktop app does not inherit your
# shell PATH, so its config MUST point at real locations. Claude Code is more
# forgiving, but absolute paths are correct for both — so we always use them.
OP_PATH="$(command -v op  || echo "$BREW_BIN/op")"
UVX_PATH="$(command -v uvx || echo "$BREW_BIN/uvx")"
[ -x "$OP_PATH" ]  || die "op not found after install"
[ -x "$UVX_PATH" ] || die "uvx not found after install"
ok "op  → $OP_PATH"
ok "uvx → $UVX_PATH"

# --- 2. 1Password CLI integration preflight ---------------------------------
# Shared by both surfaces — they launch the identical `op run` command, so if the
# integration is healthy here it's healthy for both. We diagnose the SPECIFIC
# failure mode rather than just "couldn't read the key", because the fix differs
# (integration off vs. app locked vs. wrong vault/item path).
bold "Verifying 1Password CLI access (a Touch ID prompt may appear)…"
op_err="$("$OP_PATH" read "$OP_REF" 2>&1 >/dev/null)" && op_ok=1 || op_ok=0
if [ "$op_ok" -eq 1 ]; then
  ok "Resolved '$OP_REF' — 1Password CLI integration is live."
else
  warn "Could not resolve the secret reference yet. Likely cause from the error below:"
  printf "      \033[2m%s\033[0m\n" "${op_err:-<no detail>}"
  case "$op_err" in
    *"not currently signed in"*|*"no account"*|*"connect"*|*"integration"*|*"app integration"*)
      warn "→ The desktop CLI integration is OFF (or the app isn't running)."
      warn "  1Password → Settings → Developer → enable 'Integrate with 1Password CLI',"
      warn "  then QUIT (⌘Q) and reopen 1Password. See the header of this script for why." ;;
    *"locked"*|*"unlock"*)
      warn "→ 1Password is LOCKED. Unlock the desktop app and re-run." ;;
    *"isn't an item"*|*"no item"*|*"not found"*|*"doesn't exist"*)
      warn "→ The reference path is wrong. Confirm vault/item/field with:  op item get 'metabase'"
      warn "  Current OP_REF='$OP_REF' (override with: OP_REF='op://Vault/Item/field' $0)" ;;
    *)
      warn "→ Make sure the 1Password desktop app is running, unlocked, and CLI integration is on." ;;
  esac
  warn "Continuing to write the config so it's ready once the integration is live."
fi

# Same launch command for every surface; only the registration mechanism differs.
ok "Server command: $OP_PATH run --no-masking -- $UVX_PATH metabase-mcp"

# --- 3. register per surface -------------------------------------------------

register_cli() {
  # Claude Code: register as a user-scoped stdio server. Remove-then-add keeps it
  # idempotent (add-json errors if the name already exists).
  bold "Claude Code (CLI)…"
  local json
  json="$(jq -n --arg op "$OP_PATH" --arg uvx "$UVX_PATH" \
                --arg url "$METABASE_URL" --arg ref "$OP_REF" \
    '{type:"stdio", command:$op,
      args:["run","--no-masking","--",$uvx,"metabase-mcp"],
      env:{METABASE_URL:$url, METABASE_API_KEY:$ref}}')"
  run claude mcp remove -s user metabase 2>/dev/null || true
  run claude mcp add-json -s user metabase "$json"
  ok "Registered 'metabase' with Claude Code (user scope)."
}

register_cowork() {
  # Cowork desktop app: merge into the app config, preserving other MCP servers.
  bold "Cowork desktop app…"
  local dir="$HOME/Library/Application Support/Claude"
  local cfg="$dir/claude_desktop_config.json"
  run mkdir -p "$dir"
  if [ "$DRY_RUN" -eq 1 ]; then
    printf "  \033[2m(dry-run) would merge 'metabase' server into %s\033[0m\n" "$cfg"
    return
  fi
  if [ ! -f "$cfg" ]; then echo '{}' > "$cfg"; ok "Created $cfg"
  elif ! jq empty "$cfg" >/dev/null 2>&1; then
    cp "$cfg" "$cfg.bak.$(date +%s)"; echo '{}' > "$cfg"
    warn "Existing config wasn't valid JSON — backed up and started fresh."
  else ok "Found existing config (other MCP servers preserved)"; fi
  local tmp; tmp="$(mktemp)"
  jq --arg op "$OP_PATH" --arg uvx "$UVX_PATH" --arg url "$METABASE_URL" --arg ref "$OP_REF" \
    '.mcpServers = (.mcpServers // {})
     | .mcpServers.metabase = {command:$op, args:["run","--no-masking","--",$uvx,"metabase-mcp"],
                               env:{METABASE_URL:$url, METABASE_API_KEY:$ref}}' \
    "$cfg" > "$tmp" && mv "$tmp" "$cfg"
  ok "Wrote 'metabase' into $cfg"
}

has cli    && register_cli
has cowork && register_cowork

# --- 4. completion + verification, per surface -------------------------------
# Each surface finishes differently — make both explicit so the user knows the
# setup is actually DONE, not just that the config was written.
bold "Completion & verification"
if has cli; then
  echo
  bold "  ▶ Claude Code (CLI)"
  echo "    1. Restart Claude Code, or run /mcp inside a session to reconnect."
  echo "    2. Verify:   claude mcp list      → expect:  metabase … ✔ Connected"
  echo "    3. Smoke test in chat:  \"list my Metabase databases\""
fi
if has cowork; then
  echo
  bold "  ▶ Cowork desktop app"
  echo "    1. Fully QUIT Cowork (⌘Q) — not just close the window — then reopen it."
  echo "       (Config is read only at app launch; a window close won't reload it.)"
  echo "    2. Verify: open a new chat → the 'metabase' tools appear in the tool list,"
  echo "       or check Settings → Connectors/MCP for 'metabase'."
  echo "    3. Smoke test in chat:  \"list my Metabase databases\""
fi
echo
warn "Both surfaces share one prerequisite: 1Password must be UNLOCKED when the"
warn "server launches — 'op' resolves the key fresh on every (re)start. If the"
warn "metabase tools fail to connect, unlock 1Password and restart that surface."
```

---

## Confirm it worked

**Claude Code (CLI)**
1. Restart Claude Code (or run `/mcp` in a session to reconnect).
2. `claude mcp list` → expect `metabase … ✔ Connected`.
3. In chat: *"list my Metabase databases"*.

**Cowork desktop app**
1. Fully **quit Cowork (⌘Q)** — not just close the window — then reopen
   (config is read only at app launch).
2. New chat → the `metabase` tools appear in the tool list
   (or Settings → Connectors/MCP shows `metabase`).
3. In chat: *"list my Metabase databases"*.

---

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Preflight: *"not currently signed in" / integration error* | Desktop CLI integration off, or app not running. Enable it (Settings → Developer), **⌘Q + reopen 1Password**, re-run. |
| Preflight: *"locked"* | Unlock the 1Password desktop app, re-run. |
| Preflight: *"isn't an item / not found"* | Wrong reference path. Check with `op item get 'metabase'`; override with `OP_REF='op://Vault/Item/field' ./setup-metabase-mcp-eng.sh`. |
| Tools don't connect after restart | 1Password was locked when the server launched. Unlock, then restart that surface. |
| `metabase` missing from `claude mcp list` | Re-run `./setup-metabase-mcp-eng.sh --cli`. |

Config overrides (env): `OP_REF`, `METABASE_URL`.
