# fuel — Technical Specification

> A floating Windows desktop HUD that makes visible the work Claude offloads to a local RTX 4080 SUPER.

**Status:** Draft v1.0 — pre-implementation
**Author:** chromaglow
**Date:** 2026-07-22
**Repo:** https://github.com/chromaglow/fuel

---

## 1. Premise

Claude Code and Claude Desktop can delegate mechanical coding work to a local Ollama model instead of spending Claude API capacity. That delegation is currently **invisible** — and, as measured below, **has never actually happened**.

`fuel` is a frameless, always-on-top, translucent HUD that sits over the desktop and shows local-inference activity in real time: how much work has been offloaded, how fast the GPU is chewing through it, and how much Claude budget was preserved as a result.

It is equal parts instrument and feedback loop. The gauge exists to be *filled*.

---

## 2. Measured Baseline

Every number here was measured on the target machine on 2026-07-22. These are not estimates — they are the calibration data the HUD's scales are built against.

### 2.1 Hardware

| Property | Value |
|---|---|
| GPU | NVIDIA GeForce RTX 4080 SUPER |
| Driver | 591.86 |
| VRAM total | 16,376 MiB |
| VRAM idle baseline | ~2,808 MiB (desktop + browsers) |
| Power limit | 320 W |
| Idle power draw | ~41 W |
| Idle temperature | 41 °C |
| SM clock | 2,550 MHz |
| Memory clock | 11,251 MHz |
| PCIe | Gen 4 × 16 |

### 2.2 Model

| Property | Value |
|---|---|
| Model | `qwen2.5-coder:14b` |
| Parameters | 14.8 B |
| Quantization | Q4_K_M |
| Format | GGUF (family: qwen2) |
| Disk size | 8,988,124,298 B (~8.99 GB) |
| VRAM resident (`size_vram`) | 9,470,098,799 B (~9.47 GB) |
| Native context length | 32,768 |
| **Runtime context length** | **4,096** ⚠️ |
| Embedding length | 5,120 |
| Capabilities | completion, tools, insert |
| Ollama version | 0.32.1 |

### 2.3 Measured Performance (cold start, 37-token prompt)

| Metric | Raw (ns) | Human |
|---|---|---|
| `total_duration` | 54,527,568,500 | 54.53 s |
| `load_duration` | 33,372,956,000 | **33.37 s** |
| `prompt_eval_count` | 37 tokens | — |
| `prompt_eval_duration` | 17,287,002,000 | 17.29 s |
| `eval_count` | 155 tokens | — |
| `eval_duration` | 3,865,353,000 | 3.87 s |
| **Generation throughput** | — | **40.1 tok/s** |

### 2.3a Correction — warm vs cold throughput (added during M1)

The 40.1 tok/s above came from the **first ever cold run** and is depressed by first-load effects. Once M1's log parser was reading llama-server's own timing lines, two independent warm runs disagreed with it:

| Run | Condition | Eval tokens | Throughput |
|---|---|---|---|
| 1 | cold (33.4 s load) | 155 | 40.10 tok/s |
| 2 | warm | 19 | 63.02 tok/s |
| 3 | warm | 610 | 63.10 tok/s |

**Warm steady state is ~63 tok/s**; 40.1 is the cold-start figure. Gauge scales and the redline (now 70) are calibrated against the warm number.

Verified against Ollama's own API on run 3: `eval_duration` 9,480,608,000 ns vs the parser's 9,480.6 ms — exact agreement.

**Prompt-token caveat:** llama-server reports only prompt tokens it actually *evaluated*. On run 3, Ollama's API reported `prompt_eval_count: 44` while the log reported 18 — prefix caching absorbed the rest. For budget purposes the full prompt is what never reached Claude, so Phase A **undercounts input tokens on cache hits**. Phase C reads `prompt_eval_count` from the API and is the authoritative source.

VRAM after load: 12,154 MiB / 16,376 MiB → **~4.2 GB headroom**. A second large model will not co-reside.

Eviction: `expires_at` is set 5 minutes after load (Ollama default `keep_alive`). After eviction, the next request pays the full ~33 s cold start again.

### 2.4 Usage Reality

Across **104 Claude Code session transcripts**, `local_coding_task` has **zero real invocations**. The 42 string matches for `mcp__ollama-coder__local_coding_task` are tool *definitions* in system prompts; the 22 `attachment` records are copies of `CLAUDE.md` echoing the delegation policy. The only real `tool_use` blocks in those transcripts are `Bash` and `Write`.

Claude Desktop's config (`%APPDATA%\Claude\claude_desktop_config.json`) has **no `mcpServers` key at all** — top-level keys are only `coworkUserFilesPath` and `preferences`. Desktop is not merely unused; it is structurally incapable of offloading.

**Conclusion: nothing on this machine has ever sent Claude's work to the 4080.** The gauge starts at a true zero, and there is no history to backfill.

### 2.5 Displays

| Display | Primary | Bounds | Working Area |
|---|---|---|---|
| `\\.\DISPLAY1` | ✅ | 0,0 · 2560×1440 | 0,0 · 2560×1392 |
| `\\.\DISPLAY2` | — | **−3440**,333 · 3440×1440 | −3440,333 · 3440×1392 |
| `\\.\DISPLAY3` | — | **−2989**,**−1107** · 2560×1440 | −2989,−1107 · 2560×1392 |

Negative origins on two of three displays. Window placement **must** use virtual-screen coordinates and must not assume a (0,0) top-left origin.

### 2.6 Toolchain

| Tool | Version |
|---|---|
| Node.js | 24.13.0 |
| npm | 11.6.2 |
| Python | 3.13.3 |
| git | 2.52.0.windows.1 |
| gh | 2.96.0 |
| Rust / cargo | **not installed** |

Rust's absence is why the stack is Electron, not Tauri.

---

## 3. Goals & Non-Goals

### 3.1 Goals

1. **Monitor** — surface local inference activity in real time, regardless of which client initiated it.
2. **Nudge** — detect and surface delegatable work that was *not* offloaded, closing the feedback loop on the zero-usage problem.
3. **Utilize** — remove the friction that plausibly explains the zero usage: cold start, 5-minute eviction, and the 4,096-token context ceiling.
4. Be genuinely pleasant to look at. This is a desktop ornament as much as a dashboard; if it isn't attractive it won't stay on screen.
5. Survive restarts with history intact.

### 3.2 Non-Goals (v1)

- Cross-machine / remote GPU monitoring.
- Managing Ollama model downloads or the model library.
- Replacing `nvidia-smi`, NZXT CAM, or MSI Afterburner as a general hardware monitor. GPU telemetry is shown for context, not as the product.
- Fine-tuning, training, or benchmarking harnesses.
- Any cloud component. `fuel` is entirely local; nothing leaves the machine.

---

## 4. Architecture

One Electron application, built in three phases. Phases A and C ship as v1; phase B is gated behind explicit opt-in.

```
┌──────────────────────────────── fuel (Electron) ────────────────────────────────┐
│                                                                                  │
│  MAIN PROCESS                                                                    │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐  ┌───────────────┐ │
│  │  A: Sensors    │  │  C: Collector  │  │  C: Nudge      │  │  B: Proxy     │ │
│  │                │  │                │  │     Engine     │  │  (opt-in)     │ │
│  │ • server.log   │  │ • HTTP :47113  │  │                │  │ :11434 →      │ │
│  │   tailer       │  │ • from MCP     │  │ • reads hook   │  │   :11435      │ │
│  │ • /api/ps 1Hz  │  │   shim + hooks │  │   events       │  │ • forces      │ │
│  │ • nvidia-smi   │  │                │  │ • classifies   │  │   num_ctx     │ │
│  │   1Hz          │  │                │  │   missed work  │  │ • pre-warm    │ │
│  └───────┬────────┘  └───────┬────────┘  └───────┬────────┘  └───────┬───────┘ │
│          └───────────────────┴────────────────────┴───────────────────┘         │
│                                    ▼                                             │
│                        ┌───────────────────────┐                                 │
│                        │   SQLite (better-      │                                │
│                        │   sqlite3) — events,   │                                │
│                        │   samples, nudges      │                                │
│                        └───────────┬───────────┘                                 │
│                                    │ IPC (throttled 10 Hz)                       │
│  RENDERER PROCESS                  ▼                                             │
│                        ┌───────────────────────┐                                 │
│                        │  HUD — Canvas/WebGL   │                                 │
│                        │  frameless · always-  │                                 │
│                        │  on-top · click-thru  │                                 │
│                        └───────────────────────┘                                 │
└──────────────────────────────────────────────────────────────────────────────────┘
                     ▲                    ▲                    ▲
        ┌────────────┴───────┐  ┌─────────┴────────┐  ┌───────┴──────────┐
        │ Ollama server.log  │  │ ollama_mcp.py    │  │ Claude Code      │
        │ + /api/ps          │  │ (instrumented)   │  │ PostToolUse hook │
        │ + nvidia-smi       │  │                  │  │                  │
        └────────────────────┘  └──────────────────┘  └──────────────────┘
```

### 4.1 Phase A — The Sensor (client-agnostic, zero-risk)

Passive observation. Touches nothing outside `fuel`.

**Sources:**

| Source | Mechanism | Cadence | Yields |
|---|---|---|---|
| `%LOCALAPPDATA%\Ollama\server.log` | tail (watch + incremental read) | on change | request lines, `slot print_timing`, `truncated` flag, load duration |
| `http://localhost:11434/api/ps` | HTTP GET | 1 Hz | resident model, `size_vram`, `expires_at`, `context_length` |
| `http://localhost:11434/api/tags` | HTTP GET | 60 s | installed models |
| `nvidia-smi --query-gpu=...` | child process, CSV | 1 Hz | util, VRAM, temp, power, clocks |

**Log line grammar** (confirmed against real output):

```
[GIN] 2026/07/22 - 13:35:34 | 200 |   54.5301118s |       127.0.0.1 | POST     "/api/generate"
slot print_timing: id  0 | task 0 |       total time =   21152.35 ms /   192 tokens
slot      release: id  0 | task 0 | stop processing: n_tokens = 191, truncated = 0
msg="llama-server started in 30.11 seconds"
```

**Known limitation:** every client appears as `127.0.0.1`. Phase A proves *that* inference happened, never *who* asked. Attribution requires Phase C or B.

**Log rotation:** Ollama rotates `server.log` → `server-1.log` … `server-5.log`. The tailer detects inode/size regression and re-opens.

---

### 4.2 Phase C — The Cockpit (attribution + nudge)

The only phase that can attribute work to a client or detect *missed* opportunities.

#### 4.2.1 Rewrite `ollama_mcp.py`

Current state (`C:\Users\ezras\.claude\ollama_mcp.py`, 87 lines) has three defects:

| Line | Defect | Fix |
|---|---|---|
| 69 | `"stream": False` — no token-by-token feed | `"stream": True`, emit per-chunk telemetry |
| 69 | no `num_ctx` → silently runs at 4,096 | `"options": {"num_ctx": 32768}` |
| 74 | `result["response"]` discards all metrics | capture `eval_count`, `eval_duration`, `prompt_eval_count`, `prompt_eval_duration`, `load_duration`, `total_duration` |

Additionally: emit a `task_start` event on entry and a `task_end` event on completion, both POSTed to the collector.

**Critical constraint:** each Claude Code session spawns its **own** `ollama_mcp.py` process (stdio transport). Telemetry must therefore go to a *shared* sink, not process-local state.

**Sink design:** POST to `http://127.0.0.1:47113/ingest`, with fire-and-forget semantics and a 250 ms timeout. If `fuel` is not running, the POST fails silently and **the delegation still completes normally**. Instrumentation must never be able to break the tool. As a durability backstop, failed POSTs append to `%LOCALAPPDATA%\fuel\spool.jsonl`, which `fuel` drains on next launch.

#### 4.2.2 Claude Desktop enablement

Desktop currently has no `mcpServers` key. Adding one makes offloading *possible* there for the first time:

```jsonc
// %APPDATA%\Claude\claude_desktop_config.json
{
  "coworkUserFilesPath": "...",
  "preferences": { /* ... unchanged ... */ },
  "mcpServers": {
    "ollama-coder": {
      "command": "python",
      "args": ["C:\\Users\\ezras\\.claude\\ollama_mcp.py"]
    }
  }
}
```

`fuel` will **not** write this automatically. It detects the absence, surfaces a one-click "Enable Desktop offloading" action, backs up the file, and writes only on explicit confirmation.

#### 4.2.3 Nudge engine

Claude Code's `PostToolUse` hooks already work and support `matcher` patterns (verified in `~/.claude/settings.json`, which currently registers several). `fuel` adds one:

```jsonc
{
  "PostToolUse": [
    {
      "matcher": "Write|Edit|MultiEdit|mcp__ollama-coder__local_coding_task",
      "hooks": [{
        "type": "command",
        "command": "\"C:/Program Files/nodejs/node.exe\" \"%LOCALAPPDATA%/fuel/hook.js\"",
        "timeout": 5
      }]
    }
  ]
}
```

`hook.js` reads the tool payload from stdin, classifies it, and POSTs to the collector. It **never blocks** — it exits 0 unconditionally within its 5 s budget.

**Classification heuristics** (v1, deliberately conservative — a false "you should have delegated" is worse than a miss):

| Signal | Weight |
|---|---|
| ≥3 `Write`/`Edit` calls within 60 s touching files matching a shared stem or sibling directory | +3 |
| Edit is a pure-mechanical diff (rename, import reorder, formatting-only change) | +2 |
| New file matching an existing template/sibling by structural similarity | +2 |
| Content is docstrings/comments added to already-written code | +2 |
| File is a test file whose subject already exists | +1 |
| Any Claude-authored prose in the same turn indicating design/architecture reasoning | −3 |
| Diff touches security-sensitive paths (auth, crypto, secrets) | −5 |

Score ≥ 4 marks a **missed opportunity**. Displayed as *unburned fuel* — never as a modal, never as a notification. It accumulates quietly in the HUD's secondary readout.

**Quality tracking:** when `local_coding_task` *is* invoked, the hook records the returned text hash. Subsequent `Write`/`Edit` calls within the same session are diffed against it to classify the outcome as `accepted` / `edited` / `discarded`. This is the "was the offload worth it" metric, and it is explicitly best-effort.

---

### 4.3 Phase B — The Valve (opt-in, load-bearing)

`fuel` binds `127.0.0.1:11434`; Ollama is moved to `11435` via the `OLLAMA_HOST` environment variable. Every local inference request from every client then flows through `fuel`.

**Gains:** full request/response bodies; per-client attribution via `User-Agent`; forced `num_ctx` for *all* clients at once; `keep_alive` pinning; pre-warm; request queueing; response cache.

**Risk:** `fuel` becomes load-bearing. If it dies, all local inference dies.

**Mandatory mitigations:**

1. Proxy runs in the Electron **main** process with a supervising watchdog.
2. Any handler exception → transparent passthrough to `:11435`, unmodified.
3. Health check every 5 s; three consecutive failures → auto-bypass mode (pure TCP pipe, zero parsing).
4. A `fuel --unhook` CLI command restores `OLLAMA_HOST` and exits, recoverable without the GUI.
5. Phase B ships **disabled by default** behind a settings toggle with an explicit risk acknowledgement.

---

## 5. Data Model

SQLite via `better-sqlite3` at `%LOCALAPPDATA%\fuel\fuel.db`. WAL mode.

```sql
-- One row per offload attempt.
CREATE TABLE events (
  id                  INTEGER PRIMARY KEY,
  started_at          INTEGER NOT NULL,        -- epoch ms
  ended_at            INTEGER,
  source              TEXT NOT NULL,           -- 'mcp' | 'proxy' | 'log'
  client              TEXT,                    -- 'claude-code' | 'claude-desktop' | 'unknown'
  session_id          TEXT,
  model               TEXT NOT NULL,
  status              TEXT NOT NULL,           -- 'running' | 'ok' | 'error' | 'timeout'
  error               TEXT,

  prompt_tokens       INTEGER,
  eval_tokens         INTEGER,
  prompt_eval_ns      INTEGER,
  eval_ns             INTEGER,
  load_ns             INTEGER,
  total_ns            INTEGER,

  num_ctx             INTEGER,
  truncated           INTEGER,                 -- 0/1, from slot release line
  cold_start          INTEGER,                 -- 0/1, load_ns > 1e9

  task_summary        TEXT,
  output_hash         TEXT,
  outcome             TEXT                     -- 'accepted' | 'edited' | 'discarded' | null
);
CREATE INDEX idx_events_started ON events(started_at);

-- 1 Hz hardware + model-residency timeseries. Downsampled on retention.
CREATE TABLE samples (
  ts                  INTEGER PRIMARY KEY,
  gpu_util            INTEGER,
  vram_used_mb        INTEGER,
  vram_total_mb       INTEGER,
  temp_c              INTEGER,
  power_w             REAL,
  sm_clock_mhz        INTEGER,
  model_resident      TEXT,
  model_vram_bytes    INTEGER,
  evict_at            INTEGER
);

-- Detected-but-not-taken delegation opportunities.
CREATE TABLE nudges (
  id                  INTEGER PRIMARY KEY,
  ts                  INTEGER NOT NULL,
  session_id          TEXT,
  score               INTEGER NOT NULL,
  signals             TEXT NOT NULL,           -- JSON array
  tool                TEXT,
  file_hint           TEXT,
  est_tokens          INTEGER,
  dismissed           INTEGER DEFAULT 0
);
CREATE INDEX idx_nudges_ts ON nudges(ts);

-- Precomputed daily rollups for fast HUD startup.
CREATE TABLE daily (
  day                 TEXT PRIMARY KEY,        -- 'YYYY-MM-DD'
  tasks               INTEGER DEFAULT 0,
  eval_tokens         INTEGER DEFAULT 0,
  prompt_tokens       INTEGER DEFAULT 0,
  gpu_seconds         REAL DEFAULT 0,
  cold_starts         INTEGER DEFAULT 0,
  truncations         INTEGER DEFAULT 0,
  nudges              INTEGER DEFAULT 0,
  discarded           INTEGER DEFAULT 0
);
```

**Retention:** `events` and `nudges` kept indefinitely (tiny). `samples` kept at full 1 Hz for 7 days, then downsampled to 1-minute means; raw rows older than 30 days are dropped.

---

## 6. Metric Definitions

Precision here matters — these are the numbers the HUD asserts.

### 6.1 Offload volume

- **`tokens_offloaded`** = Σ `eval_tokens` + Σ `prompt_tokens` over successful events. Both halves count: prompt tokens are context that never left the machine, eval tokens are output Claude never had to generate.
- **`tasks_offloaded`** = count of events with `status = 'ok'`.
- **`gpu_seconds`** = Σ (`total_ns` − `load_ns`) / 1e9. Cold-start time is excluded — it is overhead, not work.

### 6.2 Budget preserved

The headline number, and the one most at risk of being *technically a lie*. Two figures are shown together:

**Primary — API-dollar equivalent.** What these tokens would have cost at Claude API rates had they gone to Claude instead:

```
usd_equivalent = (prompt_tokens / 1e6 × INPUT_RATE)
               + (eval_tokens   / 1e6 × OUTPUT_RATE)
```

Default rates target Opus 4.8 (the model in use):

| Model | Input $/MTok | Output $/MTok |
|---|---|---|
| **Claude Opus 4.8** (default) | 5.00 | 25.00 |
| Claude Sonnet 5 | 3.00 | 15.00 |
| Claude Haiku 4.5 | 1.00 | 5.00 |

Rates live in `config/pricing.json` so they can be corrected without a release.

**Secondary — rate-limit headroom.** The honest figure. On a Claude Code subscription no dollars are actually saved; what is saved is *capacity within the usage window*. Shown as a percentage of the rolling session window where a baseline is known, and omitted rather than guessed when it isn't.

**Labeling requirement:** the dollar figure is always rendered with a `≈` and the qualifier "at Opus 4.8 API rates." `fuel` must never claim money was refunded.

### 6.3 Throughput

- **`tok_per_sec`** = `eval_tokens / (eval_ns / 1e9)`. Generation only — excludes prompt eval and load, matching the 40.1 tok/s baseline.
- **Live rate** during streaming = EMA over a 2 s window, α = 0.3.
- **Redline** at 45 tok/s (measured baseline 40.1 + headroom).

### 6.4 Health

- **`cold_start_rate`** = cold starts / tasks. High values mean the 5-minute eviction is costing real time.
- **`truncation_rate`** = events with `truncated = 1` / tasks. Should be zero once `num_ctx` is fixed; any non-zero value is a correctness alarm.
- **`waste_rate`** = `discarded` / tasks with a known outcome. The "was this worth it" metric.

---

## 7. HUD Design

### 7.1 Direction

Sci-fi HUD: frameless, translucent, no chrome, no border. It reads as an overlay projected onto the desktop rather than a window sitting on it. Glow intensity tracks activity; the whole thing fades toward invisible when idle and blooms when an offload begins.

**Resolved tension:** the chosen aesthetic sketch centered `tok/s`, but the chosen headline metric is cumulative offload + budget. The center ring therefore displays **fuel/budget accumulated**; `tok/s` becomes the live motion that animates the ring's outer arc. Best of both: the big number tells the story, the motion proves it's alive.

### 7.2 Layout

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

- **Center ring** — cumulative budget preserved. Fills over the day; resets at local midnight with the prior day ghosted behind it.
- **Outer arc** — live `tok/s`, sweeping during generation, decaying to rest after.
- **Sparkline** — 60 s throughput history.
- **Hex indicators** — VRAM and power/thermal, low-emphasis.
- **Footer** — task count, unburned-fuel count, context-size health check.

### 7.3 States

| State | Visual |
|---|---|
| **Idle, model evicted** | 12 % opacity, slow 6 s breath, ring holds day total, no motion |
| **Idle, model resident** | 25 % opacity, eviction countdown visible, faint ring pulse |
| **Pre-warming** | Ring outline traces clockwise over the ~33 s load, "WARMING" label |
| **Generating** | 100 % opacity, outer arc sweeping, sparkline live, glow tracks tok/s |
| **Truncation detected** | Amber ring flash, persistent `ctx` warning in footer |
| **Error / Ollama down** | Ring desaturates to grey, "OFFLINE" label, last-known values dimmed |
| **Unburned fuel detected** | Footer counter ticks up with a brief soft highlight — no modal, no sound |

### 7.4 Window behavior

- **Frameless**, `transparent: true`, `alwaysOnTop: 'screen-saver'` level.
- **Click-through by default** via `setIgnoreMouseEvents(true, { forward: true })`; becomes interactive while a modifier (default `Ctrl+Alt`) is held, or via tray toggle.
- **Hover expands** to the dense telemetry panel (full GPU stats, recent task log, eviction timer, nudge list).
- **Fades when idle** per the state table.
- **Multi-monitor:** position persisted as `{ displayId, relativeX, relativeY }`, never raw absolute coordinates. On launch, the saved display is matched by ID; if it is gone, the window falls back to the primary display's working area. Given displays at X=−3440 and X=−2989,Y=−1107, all placement math uses `screen.getAllDisplays()` bounds and clamps against the **virtual** screen rectangle.
- **Tray icon** with show/hide, per-monitor pin, pre-warm, and quit. Launch-on-boot via registry `Run` key, opt-in.
- **DPI:** per-monitor DPI aware; all rendering in CSS pixels with `devicePixelRatio` scaling on the canvas backing store.

### 7.5 Rendering

Canvas 2D for gauges and sparklines (sufficient; WebGL reserved for later effects). Render loop is **event-driven, not free-running**: it ticks at 30 fps only while generating or animating a transition, and drops to 1 fps or fully idle otherwise. Target: **< 1 % CPU and no measurable GPU load when idle.** A monitor that steals resources from the thing it monitors is self-defeating.

---

## 8. Tech Stack

| Concern | Choice | Rationale |
|---|---|---|
| Shell | **Electron** (latest stable, Node 24 available) | Works today with zero new toolchain; best-in-class frameless + transparent + always-on-top + click-through support on Windows; full Canvas/CSS for the HUD aesthetic. Tauri rejected: Rust not installed, and WebView2 transparency is fussier. |
| Language | TypeScript | Type safety across the IPC boundary |
| Bundler | electron-vite | Fast HMR for HUD iteration |
| DB | better-sqlite3 | Synchronous, embedded, no server |
| Charts | hand-rolled Canvas 2D | Bespoke gauge geometry; no chart lib fits |
| Collector | Node `http` on 127.0.0.1:47113 | Loopback only, no auth needed |
| Proxy (B) | Node `http` + streaming pipe | Must not buffer streamed responses |
| MCP shim | Python 3.13 (existing) | Already the language of `ollama_mcp.py` |
| Hook | Node (already used by existing hooks) | Consistent with `~/.claude/hooks/*` |
| Packaging | electron-builder → NSIS | Standard Windows installer |

---

## 9. Repository Layout

```
fuel/
├── SPEC.md
├── README.md
├── package.json
├── electron.vite.config.ts
├── tsconfig.json
├── config/
│   └── pricing.json              # Claude API rates, user-editable
├── src/
│   ├── main/
│   │   ├── index.ts              # app lifecycle, window, tray
│   │   ├── window.ts             # frameless/transparent/multi-monitor placement
│   │   ├── sensors/
│   │   │   ├── ollamaLog.ts      # server.log tailer + rotation handling
│   │   │   ├── ollamaApi.ts      # /api/ps, /api/tags pollers
│   │   │   └── nvidiaSmi.ts      # nvidia-smi CSV poller
│   │   ├── collector/
│   │   │   ├── server.ts         # :47113 ingest endpoint
│   │   │   └── spool.ts          # drain spool.jsonl on launch
│   │   ├── nudge/
│   │   │   ├── classify.ts       # scoring heuristics
│   │   │   └── outcome.ts        # accepted/edited/discarded diffing
│   │   ├── proxy/                # Phase B, opt-in
│   │   │   ├── server.ts
│   │   │   └── watchdog.ts
│   │   ├── db/
│   │   │   ├── schema.sql
│   │   │   ├── index.ts
│   │   │   └── rollup.ts
│   │   └── metrics.ts            # all derived-metric math
│   ├── preload/
│   │   └── index.ts              # contextBridge surface
│   ├── renderer/
│   │   ├── index.html
│   │   ├── hud.ts                # render loop + state machine
│   │   ├── gauges/
│   │   │   ├── ring.ts           # center budget ring
│   │   │   ├── arc.ts            # outer tok/s sweep
│   │   │   └── sparkline.ts
│   │   ├── panel.ts              # hover-expanded dense telemetry
│   │   └── theme.ts
│   └── shared/
│       ├── types.ts              # event/sample/nudge contracts
│       └── constants.ts
├── integrations/
│   ├── ollama_mcp.py             # instrumented replacement (installed on opt-in)
│   ├── hook.js                   # Claude Code PostToolUse hook
│   └── install.ts                # backup + patch settings.json / desktop config
├── scripts/
│   ├── replay.ts                 # synthetic event generator for dev
│   └── bench.ts                  # re-measure baseline on this machine
└── test/
```

---

## 10. Milestones

### M1 — Sensor (Phase A)
Electron shell; frameless transparent always-on-top window with correct multi-monitor placement; `nvidia-smi` + `/api/ps` pollers; `server.log` tailer; SQLite schema; a HUD that renders live GPU + model-residency state.
**Done when:** the HUD sits on screen, shows real VRAM/power/temp and resident-model state with its eviction countdown, and survives a restart with history intact.

### M2 — HUD polish
Center ring, outer arc, sparkline, all six visual states, fade/bloom transitions, click-through, hover-expand panel, tray, launch-on-boot.
**Done when:** it looks good enough that leaving it on screen is the default, and idle CPU is < 1 %.

### M3 — Instrumentation (Phase C, part 1)
Collector endpoint + spool; rewritten `ollama_mcp.py` with streaming, `num_ctx: 32768`, and telemetry emission; installer that backs up before patching; Claude Desktop `mcpServers` enablement flow.
**Done when:** a `local_coding_task` call moves the needle live, the 4,096-context bug is closed, and Desktop can offload for the first time.

### M4 — Nudge (Phase C, part 2)
`PostToolUse` hook, classification scoring, unburned-fuel counter, outcome tracking.
**Done when:** the HUD surfaces plausible missed opportunities with a false-positive rate low enough not to be annoying.

### M5 — Valve (Phase B, opt-in)
Reverse proxy, `OLLAMA_HOST` relocation, watchdog + auto-bypass, pre-warm and `keep_alive` pinning, `--unhook` escape hatch.
**Done when:** it can run in-path for a week without a single inference failure attributable to `fuel`.

---

## 11. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| **Phase B breaks all local inference** | High | Opt-in only; watchdog; transparent-passthrough on error; auto-bypass after 3 failed health checks; `--unhook` CLI recovery |
| **Instrumented MCP shim breaks delegation** | High | Fire-and-forget telemetry, 250 ms timeout, wrapped in try/except; the tool returns normally even if `fuel` is dead |
| **Nudge engine cries wolf** | Medium | Conservative thresholds; strong negative signals for design/security work; no modals or notifications; counter-only presentation; per-signal tuning from real data before enabling by default |
| **Log format changes across Ollama versions** | Medium | Parser is version-tolerant and fails soft; `/api/ps` is the authoritative source for model state, log is supplementary |
| **Multi-monitor placement bugs (negative origins)** | Medium | Store display-relative coordinates only; clamp to virtual screen; explicit test against the −3440 and −2989,−1107 origins |
| **`nvidia-smi` per-process VRAM is `[N/A]`** | Low | Confirmed on WDDM. Not a blocker — `/api/ps` `size_vram` gives exact model VRAM directly from Ollama, which is a better source anyway |
| **Widget consumes the GPU it monitors** | Medium | Event-driven render loop; idle at 1 fps or paused; CPU/GPU budget is an explicit M2 exit criterion |
| **Gauge sits at zero forever** | Medium | This is the product thesis, not a bug. Phase C's nudge engine exists precisely to attack it. If offload rate is still zero after M4, the heuristics — not the HUD — are wrong |
| **Only one model fits in VRAM** | Low | 9.47 GB resident + 2.8 GB desktop = 12.15/16 GB. Document that a second large model will thrash; surface a warning if VRAM headroom drops below 1 GB |
| **Public repo leaks local paths** | Low | Spec contains `C:\Users\ezras\...` paths. Username is already public via the GitHub handle. No credentials, tokens, or transcript contents are included |

---

## 12. Open Questions

1. **Rate-limit headroom baseline.** Claude Code does not expose remaining window capacity in a documented, stable way. Until a reliable source is found, the secondary "capacity preserved" figure will be omitted rather than estimated. Is an approximation acceptable, or is omission correct?
2. **Nudge tuning data.** With zero historical offloads, the classifier has no ground truth. M4 likely needs a *shadow mode* — log classifications without displaying them — for a week before the counter goes live.
3. **Desktop attribution.** Claude Desktop has a `logs/` directory and a cowork service but no supported hook API. Machine-wide *monitoring* is fully achievable; machine-wide *nudging* may remain Claude-Code-only. Is Desktop reduced to "you can finally offload, and here's what happened" — or is there a supportable signal in those logs worth investigating?
4. **Pre-warm policy.** Should `fuel` pre-warm automatically on a schedule (e.g. when Claude Code launches), or strictly on manual request? Automatic pre-warming burns ~9.5 GB of VRAM and idle power for work that may never arrive.
5. **`num_ctx` cost — RESOLVED (M3).** Measured on the target machine:

   | num_ctx | Resident VRAM | GPU free |
   |---|---|---|
   | 4,096 (the bug) | 9.47 GB | ~4.2 GB |
   | **16,384** | **11.08 GB** | **3.2 GB** |
   | 32,768 | 13.63 GB | 0.57 GB |

   32,768 leaves only 585 MiB free — one browser tab away from spilling Ollama into system RAM. **16,384 is the default**: 4× the broken context, comfortable headroom. 32,768 is available via config with a headroom warning.

---

## 13. Appendix — Verification Commands

Reproduce the baseline on this machine:

```bash
# GPU
nvidia-smi --query-gpu=name,driver_version,memory.total,memory.used,\
utilization.gpu,temperature.gpu,power.draw,power.limit,clocks.sm --format=csv

# Installed models
curl -s http://localhost:11434/api/tags

# Resident model + eviction time
curl -s http://localhost:11434/api/ps

# Throughput benchmark (returns the metric fields the HUD consumes)
curl -s http://localhost:11434/api/generate \
  -d '{"model":"qwen2.5-coder:14b","prompt":"write a python function that adds two numbers","stream":false}'

# Client-agnostic request log
tail -50 "$LOCALAPPDATA/Ollama/server.log"

# Displays (PowerShell)
Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.Screen]::AllScreens
```
