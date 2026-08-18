# fuel — How to Use

Everyday operation, every key command, and troubleshooting. For state/resume see
[HANDOFF.md](./HANDOFF.md); for the design see [SPEC.md](./SPEC.md); for the build
history see [CHANGELOG.md](./CHANGELOG.md).

---

## TL;DR — daily use

fuel runs in the background (auto-starts at login) as a translucent always-on-top
HUD. You don't operate it so much as *glance* at it.

- **Watch the gauge** — when the local model is working, the dial lights up and the
  tachometer shows tok/s.
- **Hover the HUD** — expands into the full panel: telemetry, recent tasks, the
  **toll booth** (catch-rate tile + live routing feed), and unburned-fuel nudges.
- **Right-click the tray icon** — all the controls (Toll booth mode, nudges, valve,
  display, launch-at-login).

The point of the whole thing: **mechanical work should go to the local GPU, judgment
work stays with Claude.** The toll booth watches every edit and routes accordingly;
you watch it happen and tune it.

---

## Key commands

Run from the repo root (`C:\Users\ezras\OneDrive\Documents\work\GitHub\fuel`).

| Command | What it does |
|---|---|
| `npm run dev` | Run with hot-reload (development) |
| `npm run build` | Build to `out/` (needed before `npx electron .`) |
| `npx electron .` | Launch the built app |
| `npm test` | Run the test suite (72 tests, `node --test`) |
| `npm run typecheck` | `tsc --noEmit` |
| `node scripts/inspect.mjs` | Dump what's in the DB (samples, events, nudges) |
| `node scripts/make-icon.mjs` | Regenerate tray/app icons |
| `node integrations/install.mjs status` | Check Claude wiring (read-only) |
| `node integrations/valve.mjs status` | Check valve relocation (read-only) |
| `npx electron . --unhook` | **Emergency:** undo the valve relocation, then exit |
| `ollama ps` | Who is resident in VRAM right now (both tenants can be) — the HUD's VRAM bar is the same view |
| `ollama run qwen2.5-coder:7b` | Manually load / chat with the coder model |
| `python scripts/backfill-client-ip.py --days N [--apply]` | Re-attribute log events to tenants from Ollama's logs (one-time after the 2026-08-18 change) |

### Keyboard shortcuts

| Key | Action |
|---|---|
| `Ctrl+Alt+F` | Show / hide the HUD |
| `Ctrl+Alt+I` | Interactive (draggable) vs. click-through |
| `Ctrl+Alt+Q` | Quit fuel |

### Debug env vars

| Var | Effect |
|---|---|
| `FUEL_DEBUG=1` | Verbose logging to stderr |
| `FUEL_DEBUG_SHOT=<path> FUEL_DEBUG_SHOT_DELAY=<ms>` | Capture the window's own render (the only reliable way to screenshot a layered window) |

---

## The tray menu (right-click the icon)

- **Show / Hide HUD**
- **Interactive** — turn off click-through so you can drag it
- **Move to display** — send the HUD to another monitor
- **Nudges** — Live / Shadow / Off (the old post-hoc "unburned fuel" detector)
- **Toll booth** — the router (see below): **Mode** (Observe / Guard / Off) + **Sensitivity** (Careful / Normal / Eager)
- **Valve** — force context in-path (advanced; off by default)
- **Pre-warm model now** — load the model into VRAM (only when the valve is on)
- **Launch at login**
- **Quit**

---

## The Toll Booth

The core feature. On every pending Write/Edit, fuel reads six "designators" and routes
the work to a lane — **local** (the GPU), **cloud** (Claude), or **gray** (ambiguous →
defaults to cloud, logged for review). **Cost is never the criterion; verifiability is
the master gate** — *"if the cheap model gets it wrong, do I find out immediately?"*

### Modes (tray → Toll booth)

| Mode | Behavior |
|---|---|
| **Observe** *(default)* | Records every routing decision to the catch-rate tile. **Zero interference.** Use this to calibrate. |
| **Guard** | Also advises Claude to redirect clearly-local work to `local_coding_task` before typing it. |
| **Off** | Disables the booth entirely. |

### Sensitivity

`Careful` → `Normal` → `Eager` raises how readily work is routed local (lower
verify-floor + bands). Start **Normal**; go **Careful** if you see false "local" calls,
**Eager** if too much stays cloud.

### Reading the HUD (hover to expand → "toll booth" section)

- **Catch-rate tile:** `free-lane N/eligible · %` — of the offload-eligible work
  (local + gray), how much actually routed local. Cloud work is excluded (it was never
  a candidate). `· N offloaded` appears once outcome-stamping is wired.
- **Decision feed:** each routing call, newest first — a **lane badge** (green `local`,
  gray, muted `cloud`), the file, and the top reason.

### Reason glossary (what shows in the feed)

`pure-transform` · `cheaply-verifiable` · `shallow` (mechanical) · `contained` (leaf
file) · `has-template` → lean **local**. `not-cheaply-verifiable` · `security-sensitive`
· `deep-logic` · `high-blast` → forced/leaning **cloud**. `ambiguous-default-cloud` →
**gray**.

---

## How offloading actually happens

The toll booth *advises*; it doesn't move work by itself. In **Guard** mode, when you
(or Claude Desktop) are about to write clearly-mechanical code, the PreToolUse hook
surfaces: *"fuel: this looks like local work — route it to local_coding_task."* Claude
then calls the local model (`local_coding_task`, backed by `qwen2.5-coder:7b`), the
result streams back, and the offload registers on the gauge.

**Enforce** mode goes one step further: a clearly-local write is *denied* until a
delegation has completed (writes then pass for 10 minutes so the delegated result and its
siblings can land). Note the booth also intercepts prose and doc edits it judges
mechanical — a trivial delegation opens the window.

Delegation itself is done by Claude choosing to call `local_coding_task` — the toll
booth makes that choice loud and timely instead of silently missed.

---

## Troubleshooting

### "no model loaded" / the gauge is idle
**Normal when nothing has used a model recently.** Keep-alive is `OLLAMA_KEEP_ALIVE=1h`
server-side (the shim asks for 30 m for its own calls); a model unloads after that idle
period and reloads on the next request. Warm the coder manually with
`ollama run qwen2.5-coder:7b`. Confirm with `ollama ps` or the HUD's VRAM bar.

### The HUD says `evicted N ⚠` / a resident row says `NN% on CPU ⚠`
Contention. Two residents did not fit and one was pushed out early, or a model loaded
while VRAM was short and landed partly in system RAM (that is the "PC locks up"
state). Check `ollama ps` and `nvidia-smi`. Usual causes: a Claude session still on the
old 14b shim (restart it), or orphaned `llama-server.exe` runners after an Ollama
restart (kill any whose parent isn't the live `ollama.exe`, then `ollama stop <model>`
so it reloads clean). The panel's **contention** section names the victim and the
newcomer.

### A resident row says `ka 5m ⚠`
That caller isn't getting the server-side keep-alive. Check Ollama's `server.log` for
`OLLAMA_KEEP_ALIVE:1h0m0s` at startup — if it says `5m0s`, Ollama was launched from a
shell that didn't have the variable; relaunch it from the Start menu.

### The dollar figure went *down*
Since 2026-08-18 each tenant is priced at its own counterfactual model (WEYLD DJ at
Sonnet rates, your offloads at the default). Hover the panel's **preserved · by tenant**
rows to see the rate. Lower and honest beats higher and blended.

### The gauge stays at ~zero / nothing is being offloaded
Offloading only happens when Claude *delegates* mechanical work. Check, in order:
1. **Toll booth panel shows decisions?** Hover the HUD. If "no decisions yet" → the
   hook isn't feeding it (next item).
2. **New Claude Code session?** The PreToolUse hook loads at startup — it only fires in
   sessions started *after* it was registered. Restart Claude Code.
3. **Guard mode on?** Observe only *records*; it doesn't advise. Flip tray → Toll booth
   → Guard once the observe data looks right.

### Toll booth panel empty / hook seems dead
1. **App on the new build?** If it was open before the last `npm run build`, it's the
   old code with no `/decide`. Quit (`Ctrl+Alt+Q`) and `npx electron .`.
2. **Verify `/decide` is live:** `curl -s -X POST http://127.0.0.1:47113/decide -H "Content-Type: application/json" -d '{"tool_name":"Write","tool_input":{"file_path":"/x/a.json","content":"{}"}}'` → should return a JSON verdict.
3. **Hook registered?** `~/.claude/settings.json` → `hooks.PreToolUse` should have a
   `Write|Edit|MultiEdit` entry running `precheck.cjs`, and `~/.claude/precheck.cjs`
   should exist.
4. **fuel running?** The hook fails open — if fuel is down it silently allows the edit
   and records nothing.

### Low tok/s / slow first response
Cold start (~33 s, single-digit tok/s on the first call after eviction); warm is
~63 tok/s. Enable the **Valve** to pin `keep_alive` and pre-warm so the model stays hot.

### Truncation warning (⚠ on context)
Inference ran at a small context (the old uninstrumented shim used 4,096). Confirm the
instrumented shim is installed: `node integrations/install.mjs status` (should say
*fully wired*). The valve also forces `num_ctx: 16384` for every client when on.

### App won't start / nothing appears
- `npm run build` first (a transparent window with nothing loaded paints nothing).
- Single-instance lock: if one is already running, a second launch just exits. Check
  `Get-Process electron` / kill stragglers.

### fuel didn't auto-start after reboot
Check the Startup shortcut exists: `Win+R` → `shell:startup` → `fuel.lnk`. Re-create it
if missing (see HANDOFF "auto-start"). To **disable** auto-start, delete `fuel.lnk`.

### Inspect the raw data
`node scripts/inspect.mjs` dumps samples/events/nudges. For receipts:
```bash
node -e "const {DatabaseSync}=require('node:sqlite');const db=new DatabaseSync(process.env.LOCALAPPDATA+'/fuel/fuel.db');console.table(db.prepare('SELECT ts,route,score,file_hint FROM receipts ORDER BY ts DESC LIMIT 10').all())"
```

---

## Escape hatches (turn things off)

| To disable | Do this |
|---|---|
| Toll booth advising | Tray → Toll booth → **Off** (instant) |
| The PreToolUse hook entirely | Remove the `Write\|Edit\|MultiEdit` entry from `~/.claude/settings.json` |
| Nudges | Tray → Nudges → Off |
| The valve (if engaged) | Tray toggle off, or `npx electron . --unhook`, then restart Ollama |
| Auto-start | Delete `fuel.lnk` from `shell:startup` |
| Everything (uninstall Claude wiring) | `node integrations/install.mjs uninstall` (restores backups) |

The hook and telemetry are **fail-open by design** — if fuel is down, your edits and
tools proceed untouched. fuel can never block your work.

---

## File & data locations

| Path | What |
|---|---|
| `%LOCALAPPDATA%\fuel\fuel.db` | All persisted data (samples, events, nudges, receipts, meta) |
| `%LOCALAPPDATA%\fuel\spool.jsonl` | Offline telemetry spool (replayed when fuel restarts) |
| `~/.claude/precheck.cjs` | The installed PreToolUse toll-booth hook |
| `~/.claude/fuel-hook.cjs` | The installed PostToolUse nudge hook |
| `~/.claude/settings.json` | Where both hooks are registered |
| `…\Start Menu\Programs\Startup\fuel.lnk` | Auto-start shortcut |
