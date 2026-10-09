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

The delegation path already exists — an MCP server exposing `local_coding_task`, backed by a local coder model on the 4080. When fuel was started it had never been used: across 104 Claude Code sessions, **zero real invocations.** So `fuel` is equal parts instrument and feedback loop. The gauge exists to be *filled*.

**Since 2026-08-18 the card is shared.** WEYLD radio's DJ (`llama3.1:8b`, called from a Jetson on the LAN ~1,500×/day) lives on the same 16 GB as fuel's coder. fuel now models the GPU as what it is — a **multi-tenant** resource — and its job widened from "meter my offloads" to "show who is on the card, whether they fit, and who is paying for whom." See [HANDOFF.md](./HANDOFF.md) (layers 1–3) and the 2026-08-18 entry in [CHANGELOG.md](./CHANGELOG.md) for the story.

## Measured baseline

What the HUD's scales are calibrated against, measured on the target machine. The 14b row is the original (2026-07-22) baseline; the 7b is what runs now.

| | |
|---|---|
| GPU | RTX 4080 SUPER · 16,376 MiB · 320 W |
| Coder model (now) | `qwen2.5-coder:7b` · **5.6 GB** resident @ 16k ctx · warm load ~0.1–2 s |
| Coder model (orig) | `qwen2.5-coder:14b` Q4_K_M · 9.5–11 GB resident · **~63 tok/s** warm · 33 s cold start |
| Co-tenant | WEYLD DJ `llama3.1:8b` · 5.9 GB @ 8k ctx · ~110 tok/s |
| Desktop itself | ~2.6 GB (browsers, DWM) — real free space with both models is **~2 GB** |
| Keep-alive | `OLLAMA_KEEP_ALIVE=1h` server-side (Ollama default was 5 min) |
| Context (shim) | 16,384 — the original 4,096 silent default was a real bug; the shim now sets `num_ctx` |

**The budget rule:** DJ + coder must stay under ~12 GB. The 14b + DJ did not fit (18 GB), and the two evicted each other on every call — 40–96 reloads a day and the "PC locks up for minutes" complaint. The VRAM bar on the HUD shows this live; `evicted N` in the footer counts it.

## Documentation

- **[USAGE.md](./USAGE.md)** — how to use it day to day: every command, the tray controls, the Toll Booth, and troubleshooting.
- **[HANDOFF.md](./HANDOFF.md)** — state of play + how to resume/activate, plus every hard-won trap.
- **[CHANGELOG.md](./CHANGELOG.md)** — dated build & decision log.
- **[SPEC.md](./SPEC.md)** — original design (single-model era; §2.2 baseline superseded by the multi-tenant sections in HANDOFF).
- **[FIXES.md](./FIXES.md)** — the Claude Desktop offload investigation and its resolution (policy lives in the shim).
- **`config/tenants.json`** / **`config/pricing.json`** — who owns what on the GPU, and what each tenant's tokens are priced against.

## Running it

```bash
npm install
npm run dev      # or: npm run build && npx electron .
```

Full command reference and troubleshooting: **[USAGE.md](./USAGE.md)**.

Zero native dependencies — persistence uses Node 24's built-in `node:sqlite`, so there's no rebuild step and no Visual Studio toolchain required.

| Shortcut | |
|---|---|
| `Ctrl+Alt+F` | show / hide |
| `Ctrl+Alt+Q` | quit |

Hover the HUD and drag it anywhere, on any monitor. Clicks only reach it while the mouse is over it; everywhere else they pass through. Where you leave it is remembered per monitor across restarts. Click **▴** to roll it up into a mini pill showing only the dollar amount; its fuel ticks light green while any model is processing locally (amber while one loads). **▾** rolls it back down. See [USAGE.md](./USAGE.md#moving-and-sizing-the-hud). `node scripts/inspect.mjs` dumps what's been captured.

Data lives in `%LOCALAPPDATA%\fuel\fuel.db`.

## How

Three phases, one app:

- **A — Sensor.** Passive and client-agnostic. Tails Ollama's `server.log`, polls `/api/ps` and `nvidia-smi`. Sees every local inference from any client. Touches nothing.
- **C — Cockpit.** Instruments the MCP shim and Claude Code's `PostToolUse` hooks. The only layer that can attribute work to a client, or spot delegatable work that *wasn't* delegated.
- **B — Valve.** Opt-in reverse proxy in front of Ollama. Forces `num_ctx` for all clients, pins `keep_alive`, pre-warms away the 33 s cold start.
- **Toll Booth.** Built on the Cockpit's hooks: a real-time router that reads each pending edit, sends mechanical/cheaply-verified work to the local model and keeps judgment work with Claude, records an auditable receipt for every call, and (in Guard mode) advises the redirect before Claude types it.

Built A → C → B, then the Toll Booth on top. See [SPEC.md](./SPEC.md) for the full design.

## Stack

Electron + TypeScript + Node 24's built-in `node:sqlite` (zero native deps — no rebuild, no Visual Studio toolchain), Canvas 2D for the gauges. Node 24 and Python 3.13 are already present; no Rust, which is why this isn't Tauri.

## Status

**Multi-tenant instrument (2026-08-18)** — fuel now models the 4080 as a shared card. Layer 1 *truth*: tenants (`config/tenants.json`), every resident from `/api/ps` tenant-tagged, a VRAM budget bar, an eviction detector that separates contention from harmless timeouts, a CPU-split alarm, attributed log events (the caller IP is kept). Layer 2 *policy*: keep-alive set at the Ollama layer and *observed* per resident. Layer 3 *economics*: each tenant priced at its own counterfactual Claude model; the headline is the honest sum, itemised in the panel. Plus a lapping budget ring (red → yellow → orange → green → blue, one lap per daily goal). 82 tests. Story and gotchas: [CHANGELOG 2026-08-18](./CHANGELOG.md); resume from [HANDOFF.md](./HANDOFF.md).

**Toll Booth complete & activated (2026-07-23), enforce mode added 2026-07-24** — the real-time offload router, and the answer to the project's core problem (the gauge never filled because *nothing routed work to the GPU*).

- On every pending Write/Edit, six pure "designators" (verifiability ★, spec-completeness, pattern-analog, blast-radius, reasoning-depth, context-locality) feed a router that decides **local / cloud / gray**. **Cost is never the criterion — verifiability is the master gate:** *"if the cheap model gets it wrong, do I find out immediately and for free?"* That single rule keeps security, concurrency, and architecture on Claude while boilerplate, config, tests, and scaffolds go local.
- A `PreToolUse` hook (`integrations/precheck.cjs`) posts each pending action to a new `/decide` endpoint, which records an auditable **receipt** and — in **Guard** mode — advises redirecting clearly-local work to `local_coding_task` *before* Claude types it. **Observe** mode records only (safe default); **Off** disables. Tunable sensitivity (Careful/Normal/Eager) from the tray.
- The HUD's expanded panel gains a **catch-rate tile** (free-lane rate on eligible work) and a **live decision feed** with lane badges + reasons.
- Built as six modules (Net → Sorter → Receipts → Catch → Dashboard → Controls) with 31 new unit tests (**72 total**). Module M3 was **dogfooded** — drafted on the local model itself, proving the offload loop live. See [CHANGELOG.md](./CHANGELOG.md); use it via [USAGE.md](./USAGE.md).

**M5 complete** — the opt-in reverse-proxy **valve**.

- Sits in front of Ollama (off by default), forcing `num_ctx` for all clients, pinning `keep_alive`, and pre-warming away the cold start. Three safety layers keep it from ever breaking inference: per-request passthrough-on-error, a watchdog that auto-bypasses after 3 failed health checks, and an enable-guard that refuses to bind unless the relocated upstream answers. Escape hatch: `npx electron . --unhook`.

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

Next: Toll-Booth **outcome-stamping** (the `offloaded` count — reconcile advise→actual) and **per-category toggles**; packaging (`electron-builder` → NSIS).

## License

MIT
