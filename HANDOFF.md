# fuel — Handoff & Resume Guide

The one document to read before picking this project back up. For the full design see [SPEC.md](./SPEC.md); for the pitch see [README.md](./README.md); for the blow-by-blow of how the Toll Booth got built see [CHANGELOG.md](./CHANGELOG.md). This file is the *state of play* plus every trap already hit, so nobody re-derives them.

Last updated: 2026-07-23 (Toll Booth built — M1–M6 of the router; **awaiting activation**, see "Activating the Toll Booth" below).

> **Resuming to make it work?** Read this file top-to-bottom, then jump to **[Activating the Toll Booth](#activating-the-toll-booth)** — that's the one thing left to do, and it's a guided ~3-step process (restart on the new build → register one PreToolUse hook → run in `observe`, then flip to `guard`).

---

## What fuel is, in one breath

A frameless, translucent, always-on-top Windows HUD that shows — in real time — the work Claude offloads to a local RTX 4080 SUPER running `qwen2.5-coder:14b` via Ollama. Part instrument, part feedback loop: **the gauge exists to be filled**, because across 104 Claude Code sessions the local model had *never actually been used* before this project.

---

## Where we are

| Milestone | State | What it delivered |
|---|---|---|
| **M1 — Sensor** | ✅ done | 1 Hz GPU + model-residency telemetry, `server.log` tailer, SQLite persistence, live HUD |
| **M2 — HUD** | ✅ done | Canvas gauge (ring + arc + sparkline), hover-expand panel, click-through, tray, six states, idle CPU 1.5% |
| **M3 — Cockpit** | ✅ done | Instrumented MCP shim (streaming + `num_ctx`), collector, reconciler dedup, installer, first tests |
| **M4 — Nudge** | ✅ done | `PostToolUse` hook + classifier flagging delegatable inline work as "unburned fuel"; shadow-mode default |
| **M5 — Valve** | ✅ done | Opt-in reverse proxy in front of Ollama: forces `num_ctx`/pins `keep_alive` for *all* clients, pre-warm, watchdog auto-bypass, `--unhook`; disabled by default |
| **Toll Booth** *(new subsystem)* | ✅ built, **inert** | Real-time offload router: reads each pending Write/Edit, decides `local`/`cloud`/`gray` (verifiability-first, cloud-default), records an auditable receipt, shows a catch-rate tile + decision feed, tunable from the tray. Built + tested; **not yet activated**. |

Everything — the M1–M5 milestones **and** the new Toll Booth — is committed and pushed to `main` (https://github.com/chromaglow/fuel). Suite: **72 tests passing**.

> ⚠️ **Naming clash to know about:** the Toll Booth's build was decomposed into six *internal* modules also labelled M1–M6 (Net, Sorter, Receipts, Catch, Dashboard, Controls). Those are **distinct** from the project's original M1–M5 milestones above. When this doc or the commit log says e.g. "M4 (Catch)", that's a Toll-Booth module; "M4 — Nudge" is the old milestone. See [CHANGELOG.md](./CHANGELOG.md) for the module→commit map.

## The Toll Booth, in one breath

The old **M4 Nudge** engine only flags delegatable work *after* Claude already did it, and (as the 2026-07-23 investigation found) it scored single-file scaffolds at **0**, so it never fired. The **Toll Booth** replaces that with a real-time router: on every *pending* Write/Edit it reads six "designators" (verifiability ★, spec-completeness, pattern-analog, blast-radius, reasoning-depth, context-locality), routes the work, and — in `guard` mode — advises Claude to send clearly-mechanical work to the local model *before* typing it. **Core law: cost is never the criterion; verifiability is the master gate** ("if the cheap model gets it wrong, do I find out immediately and for free?").

Modules & files: **M1 Net** `src/main/nudge/signals.ts` · **M2 Sorter** `src/main/nudge/sorter.ts` · **M3 Receipts** `src/main/db/index.ts` (+`receipts` table, `ReceiptRecord`/`CatchStats` in `src/shared/types.ts`) · **M4 Catch** `src/main/nudge/gate.ts` + `/decide` endpoint in `collector/server.ts` + `integrations/precheck.cjs` (the PreToolUse hook) · **M5 Dashboard** `src/renderer/panel.ts`+`hud.ts` (the "toll booth" panel section) · **M6 Controls** `src/main/tray.ts` (Toll booth submenu). Tests: `test/{signals,sorter,receipts,gate}.test.ts`.

## The two things NOT run, on purpose

Both are outward-facing, reversible-but-real system changes, so — like every milestone here — the *code* is complete and tested, but the live activation waits for an explicit decision.

**1. The installer (M3/M4).** `node integrations/install.mjs status` is read-only and safe; `install` modifies your *live* Claude Code (`~/.claude.json`) and Claude Desktop (`%APPDATA%\Claude\claude_desktop_config.json`) configs. Until it's run, the gauge only sees inference from the *old* uninstrumented shim (unattributed) and any manual `ollama` calls, and **no nudges fire** (the M4 hook isn't registered). Running `install` wires in: streaming + `num_ctx: 16384` + attribution, the nudge hook in `settings.json`, and — for the first time — Claude *Desktop* offloading. Every write is backed up; `uninstall` restores. Run it with **Claude Code and Desktop closed** (it rewrites `.claude.json` via parse/stringify; a concurrent Claude write could clobber it).

**2. The valve relocation (M5).** The valve is off by default and, unlike the monitor, is *load-bearing* when on — fuel sits in front of Ollama. Engaging it is two explicit steps: (a) `node integrations/valve.mjs hook` sets `OLLAMA_HOST=127.0.0.1:11435` (a persistent user env var) so Ollama moves off its default port; restart Ollama; then (b) tick **"Valve — force context, in-path"** in fuel's tray. fuel *refuses* to engage unless the upstream (`:11435`) is already answering, so it can never bind Ollama's port with nothing behind it. `node integrations/valve.mjs status` shows where things stand. Escape hatches: `valve.mjs unhook`, or GUI-independent `electron . --unhook` (both remove `OLLAMA_HOST`; restart Ollama after). The in-app watchdog also auto-drops to a zero-parsing byte pipe after 3 failed upstream health checks.

---

## Activating the Toll Booth

> **STATUS — 2026-07-23: ACTIVATED (observe mode).** Steps 1–2 are done: the app runs the new build (`/decide` verified live), and `precheck.cjs` is copied to `~/.claude/precheck.cjs` and registered as a `PreToolUse` hook (matcher `Write|Edit|MultiEdit`) in `~/.claude/settings.json` — verified end-to-end (a real hook invocation reached `/decide` and recorded a receipt). **The hook fires in Claude Code sessions started *after* registration** (hooks load at startup), so it began feeding receipts from the next session on. **Remaining: Step 3 — watch observe-mode data, then flip tray → Toll booth → Guard when the calls look right.** Do NOT re-register the hook. The steps below are kept for reference / re-install.

Built but **inert** — it changes nothing until these steps. Lead the user through them in order; each is safe and reversible.

**Pre-flight (read-only).** `npm run build` (refresh `out/`), `npm test` (expect **72**). Then check whether the running fuel app is the *new* build — if the app was open before the build it's serving the OLD code (no `/decide`, no toll-booth panel).

**Step 1 — Restart the app on the new build.** Quit (tray → Quit, or `Ctrl+Alt+Q`), then `npx electron .`. After this the tray shows a **Toll booth** submenu and the expanded HUD (hover) shows a **toll booth** section (empty until Step 2).

**Step 2 — Register the PreToolUse hook** (the one live-config change — get the user's OK first, same posture as the installer). Two sub-steps:
1. Copy the hook next to the existing one: `cp integrations/precheck.cjs "$USERPROFILE/.claude/precheck.cjs"` (`install.mjs` does **not** do this yet — a good follow-on).
2. Add to `~/.claude/settings.json` under `hooks.PreToolUse` (mirrors the existing fuel PostToolUse entry):
   ```json
   {
     "matcher": "Write|Edit|MultiEdit",
     "hooks": [{ "type": "command", "command": "node \"C:\\Users\\ezras\\.claude\\precheck.cjs\"", "timeout": 5 }]
   }
   ```
   Restart Claude Code so it loads the hook. The hook **fails open** — if fuel is down/slow it exits 0 and the edit proceeds untouched; it never blocks a tool.

**Step 3 — Run `observe`, then flip to `guard`.** Default is `observe` (tray → Toll booth → Observe): every pending Write/Edit is routed and logged to the catch-rate tile with **zero interference**. Watch the decision feed for a day or two — confirm mechanical work reads `local` and judgment work reads `cloud`. When it looks right, switch to **Guard**: clearly-local work now triggers a just-in-time advisory to route it to `local_coding_task`. **Sensitivity** (Careful/Normal/Eager) tunes eagerness; **Off** disables.

**Is it working?** Hover the HUD → the **toll booth** section shows `free-lane N/eligible` + a live feed of decisions with lane badges + reasons. In guard mode a mechanical edit surfaces a *"fuel: this looks like local work…"* prompt.

**Escape hatch:** tray → Toll booth → **Off** (instant), or delete the PreToolUse entry from `settings.json`.

**Two gaps (safe to activate without them):** the `offloaded` count stays 0 until outcome-stamping is wired (reconcile advise→actual via the PostToolUse side); per-category toggles need a category filter in the Sorter (M2).

---

## How to run it

```bash
npm install            # zero native deps — node:sqlite is built into Electron's Node
npm run build          # electron-vite build → out/
npx electron .         # or: npm run dev  (HMR)
npm test               # 72 tests, node --test, no deps
npm run typecheck      # tsc --noEmit
node scripts/inspect.mjs        # dump what's been captured to the DB
node scripts/make-icon.mjs      # regenerate tray/app icons (build/*.png)
node integrations/install.mjs status   # check Claude wiring (read-only)
node integrations/valve.mjs status     # check valve relocation (read-only)
npx electron . --unhook                # emergency: undo the valve relocation, then exit
```

Runtime data lives in `%LOCALAPPDATA%\fuel\` (`fuel.db`, `spool.jsonl`). Keyboard: `Ctrl+Alt+F` show/hide, `Ctrl+Alt+I` interactive/draggable, `Ctrl+Alt+Q` quit. The tray menu toggles nudge mode (shadow/live/off — default shadow), the **Toll booth** (mode: observe/guard/off + sensitivity: careful/normal/eager), and much else. Debug: `FUEL_DEBUG=1` logs to stderr; `FUEL_DEBUG_SHOT=<path> FUEL_DEBUG_SHOT_DELAY=<ms>` captures the window's own render (the only reliable way to screenshot a layered window).

---

## Critical problems & solutions (the hard-won part)

Read these before touching the relevant area — each cost real time to find.

1. **No MSVC toolchain on this machine → `node:sqlite`, not `better-sqlite3`.** The obvious DB choice needs a native rebuild for Electron, which fails without Visual Studio. Electron 40's bundled Node 24 has `node:sqlite` (`DatabaseSync`) working unflagged. Net: **zero native dependencies**, no rebuild step. Don't reintroduce a native module without checking the toolchain.

2. **A frameless transparent window can be `visible=true` and still paint nothing — because nothing loaded it.** M1 "passed" while the window never actually displayed: nothing ever called `loadFile()`, so `ready-to-show` never fired. It looked fine only because I verified the *database*, not the *screen*. **Lesson: verify on screen, not just in the DB.** `window.ts` now loads the renderer and there's `capturePage` debug tooling for exactly this.

3. **Idle CPU was 12% of a core; the cause was a CSS animation.** A perpetual `@keyframes breathe` opacity loop on a transparent always-on-top (layered) window forces DWM to recomposite the whole thing against the desktop every frame, forever. Removing it dropped gpu-process 6.2%→0.7% and renderer 1.9%→0.1%. **Never put a continuous CSS animation on the idle state of a layered window.** Final idle: 1.5% of one core.

4. **Click-through windows don't receive DOM mouse events.** Hover-to-expand via `mouseover`/`mouseleave` silently never fired, because `WS_EX_TRANSPARENT` sends mouse messages to whatever's underneath. `setIgnoreMouseEvents(..., { forward: true })` is supposed to forward moves but doesn't reliably here. **Solution: poll `screen.getCursorScreenPoint()` against the window bounds from the main process** (`isCursorOver` in `window.ts`). A few microseconds, always correct.

5. **You cannot screenshot a layered window with `CopyFromScreen`/BitBlt** — you get the desktop behind it. Use `PrintWindow(hwnd, dc, 2)` (PW_RENDERFULLCONTENT) or, better, Electron's `webContents.capturePage()`. This wasted several captures showing the browser instead of the HUD.

6. **`num_ctx` VRAM cost (resolved SPEC §12 Q5 by measurement).** 32,768 → 13.63 GB resident, **only 585 MiB GPU free** (one browser tab from spilling to system RAM). 16,384 → 11.08 GB, 3.2 GB free. **Default is 16,384**, not 32,768. Measure before raising.

7. **The log tailer and the MCP shim both see the same inference → double-counting.** Phase A (`server.log`) sees every generation but can't attribute it; Phase C (the shim) attributes the calls it made. The **Reconciler** (`src/main/collector/reconcile.ts`) pairs them by identical `eval_tokens` within a 6 s window (this box runs one generation at a time), keeps the richer MCP record, drops the log duplicate. This is the riskiest logic in the project — it has 13 unit tests. Verified live: 8→9 events, not 10.

8. **`prompt eval` vs `eval` tokens are a 5× pricing difference.** llama-server logs them on separate lines; the parser must keep them apart (input bills at $5/MTok, output at $25/MTok). Conflating them was an early bug that reported 12 tok/s where the truth was 63.

9. **Warm ≠ cold throughput.** The spec's original 40.1 tok/s was a cold-start artifact. Warm steady state is **~63–64 tok/s** (reconfirmed on 610-, 1049-, 1587-token runs). Gauge scales use the warm figure; redline is 70.

10. **Prefix caching makes the log undercount prompt tokens.** llama-server reports only prompt tokens it *evaluated* (44 reported as 18 on a cache hit). The log-only path undercounts input; the MCP path reads `prompt_eval_count` from the API and is authoritative. Documented in `ollamaLog.ts`.

11. **Node's test runner: two gotchas.** Parameter properties (`constructor(private x)`) need `--experimental-transform-types`, not the default strip-only mode. And the `@shared/*` build alias needs a resolve hook (`test/alias-hook.mjs` + `test/register.mjs`) since plain Node doesn't read tsconfig paths.

12. **The hook must be `.cjs`, not `.js`.** The repo's `package.json` has `"type": "module"`, so a `.js` hook using `require()` throws `require is not defined in ES module scope` when run in-repo. `integrations/hook.cjs` is unambiguously CommonJS wherever it's installed. Caught by piping a real Claude-Code stdin payload through it.

13. **The nudge classifier is deliberately eager-ish, and that's what shadow mode is for.** Two substantial mechanical reformats in the same session+dir already cross the threshold (each is +2). There's no historical ground truth (offloading never happened), so it ships in **shadow mode**: recorded + reviewable in the expanded panel, hidden from the compact count until calibrated. Don't hand-tune the weights without real data — flip to live from the tray once the review list looks right.

14. **The valve only ever inspects two endpoints, and only the request body.** `POST /api/generate` and `/api/chat` are buffered (small — just the prompt), JSON-parsed, and enriched (num_ctx floor + keep_alive). *Everything else* — `/api/ps`, `/api/tags`, `/api/version`, embeddings, GETs — is a pure streaming byte pipe. Responses are *always* streamed chunk-by-chunk, so NDJSON token streams are never buffered. Three layers keep it from ever breaking inference: a per-request try/catch that forwards the client's original bytes on any parse/rewrite error (SPEC §4.3 #2); the watchdog's global bypass after 3 failed health checks (#3); and the enable guard that refuses to bind unless the relocated Ollama is already answering on `:11435`. The context-forcing logic (`rewriteBody`) and the bypass state machine (`Watchdog`) are pure and unit-tested; the HTTP wiring was verified on the wire against a fake upstream (floor applied, passthrough clean, bypass verbatim).

15. **`node --import` needs a `file://` URL, not a bare Windows path.** Only relevant to ad-hoc test harnesses: `--import "C:\...\hook.mjs"` fails with `ERR_UNSUPPORTED_ESM_URL_SCHEME` (protocol `c:`). Use `--import "file:///C:/.../hook.mjs"`, or a repo-relative path like the real test command does (`--import ./test/register.mjs`). The script *path* argument is fine either way; only `--import` is picky.

---

## Key decisions (the why)

- **Electron, not Tauri** — Rust isn't installed; WebView2 transparency is fussier. Electron works today, best-in-class frameless/transparent/always-on-top/click-through on Windows.
- **Build order A → C → B** (sensor → cockpit → valve). The valve (proxy) is load-bearing and risky, so it comes last, once the safe layers are trusted.
- **Budget shown as `≈ $X` at Opus 4.8 rates, always with the `≈`.** On a subscription no dollars are literally saved — what's preserved is rate-limit headroom. The dollar figure is the legible proxy; it must never claim a refund. Rates live in `config/pricing.json` (overridable).
- **Telemetry is fire-and-forget with a spool fallback.** If fuel is down, the shim's 250 ms POST fails, the record spools to disk, and the coding task returns normally. Instrumentation must never break the tool.

---

## Known issues / gaps

- **Live tok/s is last-completed, not per-token streaming.** The GIN log line only lands when a request finishes. True per-token motion needs the shim to stream deltas to the collector (a Phase C+ enhancement) or the M5 proxy.
- **Nudge engine has no ground truth yet.** Offload rate was historically zero, so M4's classifier has nothing to tune against — plan a shadow-mode week (log classifications without displaying them) before the counter goes live.
- **Desktop attribution for nudging is uncertain.** Machine-wide *monitoring* works; machine-wide *nudging* may stay Claude-Code-only (Desktop has no supported hook API).
- **Rate-limit headroom figure is omitted, not estimated** — no reliable source for remaining-window capacity yet (SPEC §12 Q1).
- **Memory ~360 MB** — normal for Electron, on the heavier side, trimmable later.
- **Installer rewrites `.claude.json` via parse/stringify** — run with Claude closed.

---

## Where things live

```
SPEC.md                      full design (13 sections) + measured baselines
src/main/                    Electron main: sensors/, collector/, nudge/, db/, window, tray, metrics
  sensors/                   nvidiaSmi (GpuMonitor), ollamaApi, ollamaLog (tailer + parser)
  collector/                 server (:47113, /ingest + /hook + /decide), reconcile (dedup), spool
  nudge/                     classify (old M4 nudge) · Toll Booth: signals (M1), sorter (M2), gate (M4)
  proxy/                     M5 valve: rewrite (pure ctx/keep_alive forcing), watchdog (bypass FSM), server (Valve HTTP proxy)
src/renderer/                HUD: gauges/, hud.ts (event-driven render loop), panel (incl. toll-booth tile+feed), theme
src/shared/                  types (incl. ReceiptRecord, CatchStats) + constants shared across processes
integrations/ollama_mcp.py   the fuel-instrumented MCP shim (installed by install.mjs)
integrations/hook.cjs        PostToolUse nudge hook (old M4) — .cjs, not .js (see trap #12)
integrations/precheck.cjs    PreToolUse Toll-Booth gate → POSTs /decide; fail-open (see "Activating the Toll Booth")
integrations/install.mjs     status | install | uninstall — wires shim + hook into Claude (live configs)
integrations/valve.mjs       status | hook | unhook — relocates Ollama to :11435 via OLLAMA_HOST (M5)
test/                        node --test suites (reconcile, parse, collector, classify, rewrite, watchdog, signals, sorter, receipts, gate) + alias hook
scripts/                     inspect.mjs (DB dump), make-icon.mjs (PNG gen)
config/pricing.json          Claude API rates for the budget estimate
```

---

## Immediate next steps to resume

The five milestones **and** the Toll Booth are built. What's left is *activation*, not new code.

1. **Activate the Toll Booth — the headline task.** Follow **[Activating the Toll Booth](#activating-the-toll-booth)**: rebuild → restart on the new build → register `precheck.cjs` (one live-config change, get consent) → run `observe`, then flip to `guard`. This is what finally closes the loop the whole project exists for.
2. Sanity check the build: `npm test` → **72 passing**; `npm run build` clean.
3. The installer is **already wired** (as of 2026-07-23 `node integrations/install.mjs status` shows *fully wired* — shim + old nudge hook + Claude Code + Desktop). Nothing to do unless re-installing; run with Claude closed if you do.
4. Optionally engage the valve: `node integrations/valve.mjs hook` → restart Ollama → tick the tray toggle. Run it in-path for a week; the M5 exit criterion is *zero* inference failures attributable to fuel.
5. Remaining gaps worth a pass: **Toll-Booth outcome-stamping** (the `offloaded` count — reconcile advise→actual on the PostToolUse side) and **per-category toggles** (a category filter in the Sorter); plus older ones — **proxy attribution** (valve forces ctx but emits no per-client `source:'proxy'` events), packaging (`electron-builder` → NSIS, SPEC §8), and live per-token throughput (currently last-completed only).
