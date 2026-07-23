# fuel

A floating Windows desktop HUD that makes visible the work Claude offloads to a local RTX 4080 SUPER.

Translucent, frameless, always-on-top. It sits over the desktop and shows local-inference activity in real time — how much work went to the GPU instead of to Claude, how fast it's being chewed through, and how much Claude budget was preserved as a result.

```
        ◜                                        ◝

              QWEN2.5-CODER 14B · RESIDENT
                   evict in 4:12

                  ╱                ╲
                ╱      ≈ $4.80      ╲
               │    BUDGET PRESERVED  │
                ╲   1.24M tok today  ╱
                  ╲________________╱
                   ▁▂▃▅▇█▇▅▃▂▁  40.1 tok/s

           ⬡ 9.47 / 16.0 GB      ⬡ 41 W · 41 °C

           ─────── today ───────
           47 tasks · 3 unburned · ctx 32k ✓

        ◟                                        ◞
```

## Why

The delegation path already exists — an MCP server exposing `local_coding_task`, backed by `qwen2.5-coder:14b` on the 4080. It has never been used. Across 104 Claude Code sessions: **zero real invocations.** Claude Desktop isn't even wired up to it.

So `fuel` is equal parts instrument and feedback loop. The gauge exists to be *filled*.

## Measured baseline

Everything the HUD's scales are calibrated against, measured on the target machine:

| | |
|---|---|
| GPU | RTX 4080 SUPER · 16,376 MiB · 320 W |
| Model | `qwen2.5-coder:14b` Q4_K_M · 14.8 B params |
| VRAM resident | 9.47 GB (→ ~4.2 GB headroom) |
| **Generation (warm)** | **~63 tok/s** |
| Generation (cold run) | 40.1 tok/s |
| **Cold start** | **33.4 s** |
| Eviction | 5 min idle (Ollama default) |
| Context | **4,096** ⚠️ — the model supports 32,768 |

That last row is a real bug, not a display detail: the MCP shim never sets `num_ctx`, so every delegation silently runs at 4K context. `fuel` fixes it — and until it does, the HUD shows the truncation warning.

## Running it

```bash
npm install
npm run dev      # or: npm run build && npx electron .
```

Zero native dependencies — persistence uses Node 24's built-in `node:sqlite`, so there's no rebuild step and no Visual Studio toolchain required.

| Shortcut | |
|---|---|
| `Ctrl+Alt+F` | show / hide |
| `Ctrl+Alt+Q` | quit |

Drag the panel anywhere; position is remembered per-monitor. `node scripts/inspect.mjs` dumps what's been captured.

Data lives in `%LOCALAPPDATA%\fuel\fuel.db`.

## How

Three phases, one app:

- **A — Sensor.** Passive and client-agnostic. Tails Ollama's `server.log`, polls `/api/ps` and `nvidia-smi`. Sees every local inference from any client. Touches nothing.
- **C — Cockpit.** Instruments the MCP shim and Claude Code's `PostToolUse` hooks. The only layer that can attribute work to a client, or spot delegatable work that *wasn't* delegated.
- **B — Valve.** Opt-in reverse proxy in front of Ollama. Forces `num_ctx` for all clients, pins `keep_alive`, pre-warms away the 33 s cold start.

Built A → C → B. See [SPEC.md](./SPEC.md) for the full design.

## Stack

Electron + TypeScript + better-sqlite3, Canvas 2D for the gauges. Node 24 and Python 3.13 are already present; no Rust, which is why this isn't Tauri.

## Status

**M4 complete** — the nudge engine spots delegatable work Claude did inline.

- A `PostToolUse` hook (`integrations/hook.cjs`) forwards Write/Edit/MultiEdit/`local_coding_task` actions to the collector — fire-and-forget, never blocks Claude.
- A conservative classifier (`src/main/nudge/`) flags *unburned fuel*: repetitive mechanical bursts (reformats, import reorders, comment blocks, sibling scaffolding). It hard-suppresses security-sensitive paths and the good case (a real delegation), and a single judgment edit never fires. 11 unit tests pin the bias down.
- Runs in **shadow mode by default** — nudges are recorded and reviewable in the expanded panel, but the compact count stays hidden until the heuristics are calibrated against real activity (there was no historical ground truth — offloading had never happened). Flip to live from the tray.
- 30 tests pass. Verified end-to-end: a real Claude-Code-shaped tool burst piped through `hook.cjs` produced one scored nudge.

**M3 complete** — the gauge can now be filled, and by any Claude client.

- The MCP shim is rewritten: it **streams** Ollama's response for exact per-phase timings, requests a real **16,384-token context** (the old shim silently ran at 4,096), and POSTs an attributed telemetry record to a local collector — fire-and-forget, with a disk spool fallback so nothing is lost when fuel is closed.
- A loopback **collector** on `127.0.0.1:47113` ingests those records; a **reconciler** merges them with the client-agnostic log events so a single offload is counted once, keeping the richer attributed record. That dedup is the riskiest logic in the project and has 13 unit tests plus a live 8→9-event check.
- An **installer** (`node integrations/install.mjs`) wires the shim into Claude Code and — for the first time — Claude Desktop, which had no MCP servers at all. Every write is backed up; `status` and `uninstall` included.
- Resolved SPEC §12 Q5 by measurement: `num_ctx: 32768` leaves only 585 MiB of VRAM free (unsafe); **16,384** costs 11.08 GB and leaves 3.2 GB — the new default.

19 tests pass (`npm test`). The install step is a manual, explicit action — it modifies your live Claude configs — so run it yourself when ready.

**M2 complete** — the HUD is built out and click-through.

- Canvas gauge: budget ring, tachometer arc with tick bezel, and a GPU-utilisation sparkline tucked inside the dial.
- Hover to expand into a dense telemetry panel (per-phase VRAM, temp, watts, context size, eviction timer, and a recent-task list); the window grows and shrinks with it.
- Click-through by default so it never intercepts a click meant for the window beneath; `Ctrl+Alt+I` or the tray toggles interactive (draggable) mode.
- System-tray icon with show/hide, interactive toggle, move-to-display, and launch-at-login.
- Six visual states — offline, evicted, resident, warming, generating, and a truncation alarm — with bloom on activity.

**Idle cost: 1.51% of one core, 0.063% of total CPU** (24-core box), 363 MB. Getting there meant killing a perpetual CSS `breathe` keyframe that was forcing DWM to recomposite the layered window every frame — that one change dropped the GPU-process cost from 6.2% to 0.7% of a core.

**M1 complete** — the sensor layer works end to end: 1 Hz GPU + model-residency telemetry, a log tailer that captures inference events with exact token counts (parser `eval_ns` matched Ollama's `eval_duration` to the nanosecond), and persistence across restarts.

Next: **M5** — the opt-in reverse-proxy valve (pre-warm away the cold start, force context for all clients, `keep_alive` pinning).

## License

MIT
