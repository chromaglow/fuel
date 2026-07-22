# fuel — Handoff & Resume Guide

The one document to read before picking this project back up. For the full design see [SPEC.md](./SPEC.md); for the pitch see [README.md](./README.md). This file is the *state of play* plus every trap already hit, so nobody re-derives them.

Last updated: 2026-07-22 (end of M3).

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
| **M4 — Nudge** | ⬜ next | `PostToolUse` hook that flags delegatable work Claude did inline, as "unburned fuel" |
| **M5 — Valve** | ⬜ later | Opt-in reverse proxy in front of Ollama (pre-warm, forced ctx for all clients) |

Everything through M3 is committed and pushed to `main` (https://github.com/chromaglow/fuel).

## The one thing NOT done, on purpose

**The installer has not been run.** `node integrations/install.mjs status` is read-only and safe; `install` modifies your *live* Claude Code (`~/.claude.json`) and Claude Desktop (`%APPDATA%\Claude\claude_desktop_config.json`) configs. That's an outward-facing, hard-to-reverse change, so it waits for an explicit decision. Until it's run, the gauge only sees inference from the *old* uninstrumented shim (unattributed) and any manual `ollama` calls. Running it wires in streaming + `num_ctx: 16384` + attribution, and — for the first time — lets Claude *Desktop* offload at all.

Run it with **Claude Code and Desktop closed** (it rewrites `.claude.json` via parse/stringify; a concurrent Claude write could clobber it).

---

## How to run it

```bash
npm install            # zero native deps — node:sqlite is built into Electron's Node
npm run build          # electron-vite build → out/
npx electron .         # or: npm run dev  (HMR)
npm test               # 19 tests, node --test, no deps
npm run typecheck      # tsc --noEmit
node scripts/inspect.mjs        # dump what's been captured to the DB
node scripts/make-icon.mjs      # regenerate tray/app icons (build/*.png)
node integrations/install.mjs status   # check Claude wiring (read-only)
```

Runtime data lives in `%LOCALAPPDATA%\fuel\` (`fuel.db`, `spool.jsonl`). Keyboard: `Ctrl+Alt+F` show/hide, `Ctrl+Alt+I` interactive/draggable, `Ctrl+Alt+Q` quit. Debug: `FUEL_DEBUG=1` logs to stderr; `FUEL_DEBUG_SHOT=<path> FUEL_DEBUG_SHOT_DELAY=<ms>` captures the window's own render (the only reliable way to screenshot a layered window).

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
src/main/                    Electron main: sensors/, collector/, db/, window, tray, metrics
src/renderer/                HUD: gauges/, hud.ts (event-driven render loop), panel, theme
src/shared/                  types + constants shared across processes
integrations/ollama_mcp.py   the fuel-instrumented MCP shim (installed by install.mjs)
integrations/install.mjs     status | install | uninstall  (modifies live Claude configs)
test/                        node --test suites (reconcile, parse, collector) + alias hook
scripts/                     inspect.mjs (DB dump), make-icon.mjs (PNG gen)
config/pricing.json          Claude API rates for the budget estimate
```

---

## Immediate next steps to resume

1. `npm install && npm run build && npx electron .` — confirm the HUD is on screen.
2. Decide whether to run `node integrations/install.mjs install` (goes live, modifies Claude configs — see "The one thing NOT done").
3. Start **M4**: a `PostToolUse` hook (`integrations/hook.js`) + classifier (`src/main/nudge/`), surfacing unburned fuel in the HUD footer. Shadow-mode first.
