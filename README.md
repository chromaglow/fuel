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
| **Generation** | **40.1 tok/s** |
| **Cold start** | **33.4 s** |
| Eviction | 5 min idle (Ollama default) |
| Context | **4,096** ⚠️ — the model supports 32,768 |

That last row is a real bug, not a display detail: the MCP shim never sets `num_ctx`, so every delegation silently runs at 4K context. `fuel` fixes it.

## How

Three phases, one app:

- **A — Sensor.** Passive and client-agnostic. Tails Ollama's `server.log`, polls `/api/ps` and `nvidia-smi`. Sees every local inference from any client. Touches nothing.
- **C — Cockpit.** Instruments the MCP shim and Claude Code's `PostToolUse` hooks. The only layer that can attribute work to a client, or spot delegatable work that *wasn't* delegated.
- **B — Valve.** Opt-in reverse proxy in front of Ollama. Forces `num_ctx` for all clients, pins `keep_alive`, pre-warms away the 33 s cold start.

Built A → C → B. See [SPEC.md](./SPEC.md) for the full design.

## Stack

Electron + TypeScript + better-sqlite3, Canvas 2D for the gauges. Node 24 and Python 3.13 are already present; no Rust, which is why this isn't Tauri.

## Status

Pre-implementation. The spec is written; M1 is next.

## License

MIT
