# FIXES — offload not reaching Desktop; full findings + what's left to solve

> **UPDATE 2026-07-24 (later session): Problem 1 is RESOLVED — see §7.** The shim now
> carries the offload policy and a `route_check` tool, so Desktop gets advice + receipts
> with no per-client config. Restart Desktop once to load the updated shim.

> **Audience:** a fresh AI session (Fable) opened in **Claude Desktop** with no prior
> context. This document is self-contained. Read it top to bottom before touching
> anything. It records what was *verified live* on **2026-07-24**, what's broken, and
> what still has to happen.
>
> **Companion docs in this repo:** `HANDOFF.md` (full project state + traps),
> `USAGE.md` (how-to + troubleshooting), `README.md`, `reboot-guide.html`
> (end-user restart guide). This file supersedes the "Desktop is wired" optimism in
> those where they disagree — see **Problem 1**.

---

## 0. The goal (in one sentence)

**Mechanical, cheaply-verifiable work should be offloaded to the local GPU
(`qwen2.5-coder:14b` on an RTX 4080 SUPER via Ollama) instead of being done by Claude —
and this should happen automatically from BOTH Claude Code (terminal) AND Claude
Desktop.** fuel (the HUD) + the Toll Booth (the router) are the machinery meant to do
this. Right now it works from Code and **not at all from Desktop.** Closing that gap is
the whole point of this document.

---

## 1. What fuel + the Toll Booth actually are

- **fuel** — a frameless translucent always-on-top Windows HUD (Electron + TypeScript)
  showing, in real time, work offloaded to the local model. Repo:
  `C:\Users\ezras\OneDrive\Documents\work\GitHub\fuel`.
- **The Toll Booth** — the routing subsystem. On every *pending* `Write`/`Edit`/`MultiEdit`
  it reads six "designators" and routes the work to a lane: **local** (GPU), **cloud**
  (Claude), or **gray** (ambiguous → defaults to cloud, logged). The master gate is
  **verifiability**, never cost: *"if the cheap model gets it wrong, do I find out
  immediately?"* Source: `src/main/nudge/{signals,sorter,gate}.ts`.
- **How an offload is *supposed* to happen:** the Toll Booth only **advises** — it does
  not move work itself. In **Guard** mode, when Claude is about to write clearly-mechanical
  code, the `PreToolUse` hook surfaces *"fuel: this looks like local work — route it to
  local_coding_task."* Claude then calls `local_coding_task` (the `ollama-coder` MCP tool),
  the result streams back, and the offload registers on the gauge.

**Critical consequence:** offload rides on Claude *choosing to delegate* after being
advised. The gate advises; it never forces.

---

## 2. Current state — VERIFIED LIVE 2026-07-24

Everything in this section was checked directly this session, not assumed.

### 2a. Toll Booth settings (persisted in fuel's DB)
Read from `%LOCALAPPDATA%\fuel\fuel.db`, `meta` table:

| Key | Value | Meaning |
|---|---|---|
| `toll.mode` | `guard` | ✅ Actively advising redirects (not just observing) |
| `toll.level` | `eager` | Most aggressive preset — casts the widest net (verifyFloor 0.30, localBand 0.55) |
| `nudge.mode` | `live` | Post-hoc "unburned fuel" detector on |
| `proxy.enabled` | (unset) | Valve OFF — correct/intended |

### 2b. The `/decide` endpoint is live
`POST http://127.0.0.1:47113/decide` returns a routing verdict. On a local route in Guard
mode it returns `action:"advise"` (per `src/main/nudge/gate.ts`:
`action = mode==='guard' && route==='local' ? 'advise' : 'allow'`). Confirmed responding.

### 2c. The PreToolUse hook is registered AND firing in Claude Code
- Registered in `~/.claude/settings.json` under `hooks.PreToolUse`, matcher
  `Write|Edit|MultiEdit`, command runs `C:\Users\ezras\.claude\precheck.cjs`.
- **Proven firing in a live Code session** by receipt-diff test: snapshot `receipts`
  count → do one `Write` through the tool → count incremented by exactly one, and the new
  row carried the *current Code session's* `session_id` + the exact file path. This is
  end-to-end proof the hook loads and reaches fuel in Claude Code.

### 2d. Ollama
`ollama ps` returned an **empty list** (server up, no model resident). Not a blocker —
`qwen2.5-coder:14b` cold-loads into VRAM on the first `local_coding_task` call (a few
seconds' delay on that first call, then it stays warm).

---

## 3. THE PROBLEMS

### Problem 1 — Claude DESKTOP does not offload at all (the main problem) 🔴
**Verified:** a **14-minute active Desktop work session left ZERO receipts** in fuel,
even though some of that work was clearly offloadable. In the same 15-minute window fuel
recorded only: this Code session's probe, a manual curl test, and a *different Code
window's* edits. **No Desktop session_id ever appears.**

**Root cause — architectural, not a misconfiguration:**
- `precheck.cjs` (the Toll Booth gate) is registered in `~/.claude/settings.json`, which
  is **Claude Code's** config. **The Desktop app does not execute settings.json hooks.**
- `~/.claude/CLAUDE.md` (the standing "offload mechanical work to local" instruction) is
  also a **Claude Code** file. **Desktop does not read it.**
- Therefore Desktop has *neither* the automatic nudge *nor* the standing instruction to
  delegate. It just does everything itself.

**Consequence:** **Restarting Desktop does nothing for offload** — there is no hook there
to load. Any earlier note claiming Desktop is "fully wired" refers to *telemetry
wiring* (the shim/`install.mjs status`), NOT the Toll Booth gate. Do not be misled by it.

### Problem 2 — Offload is advisory only, even where it works 🟡
In Code + Guard, the Toll Booth **advises**; Claude must then actually call
`local_coding_task`. If Claude ignores the advice, nothing offloads and the gauge stays
flat. This is by design (verifiability-first, fail-safe), but it means "settings correct"
≠ "work offloaded."

### Problem 3 — Hook only lives in sessions started AFTER registration 🟡
The `PreToolUse` hook loads at Claude Code startup. A Code session started *before* the
hook was registered won't have it. Fix: start a fresh Code session. (This one is already
satisfied in the current Code session — see 2c.)

### Problem 4 — Model not pre-warmed; tray "Pre-warm" is greyed out 🟢 (minor)
"Pre-warm model now" in the tray is `enabled: isProxyEnabled()` (`src/main/tray.ts`) — it
only un-greys when the **Valve** is on. Valve is intentionally off, so the button is
correctly greyed. Not needed: the model auto-loads on first offload. To warm manually
without the valve: `curl http://localhost:11434/api/generate -d '{"model":"qwen2.5-coder:14b","prompt":"","keep_alive":"30m"}'`.

### Problem 5 — Known telemetry gaps 🟢 (pre-existing, see HANDOFF.md)
Toll-Booth **outcome-stamping** (the "N offloaded" count / dollars) and per-category
toggles are not fully wired. Receipts record the *routing decision*; the *outcome* (did
the offload actually run) is a separate, incomplete path. So the gauge can lag reality.

---

## 4. Facts worth knowing (reference)

### 4a. Settings apply live — mostly no restart needed
Tray toggles (Toll booth mode Observe/Guard/Off; Sensitivity Careful/Normal/Eager;
Nudges; display; valve; launch-at-login) take effect **immediately** — the hook re-reads
mode from fuel on every `/decide` call. **The ONLY change that requires restarting Claude
Code is the hook *registration* itself** (installing/removing/re-registering the hook in
`settings.json`). Do not re-register the hook casually — it's already installed.

### 4b. The tray vs. the HUD panel
- The floating **HUD panel is click-through** except while the mouse is over it. Hovering
  lets you drag it and use its only button (▴/▾, roll up to the mini pill and back).
  Everything else is observe-only.
- All controls live on the **tray icon** (bottom-right, near the clock; click the `^`
  overflow chevron if hidden). **Right-click** = full menu. **Left-click** = just toggle
  the HUD. (Source: `src/main/tray.ts`.)
- Hotkeys: `Ctrl+Alt+F` show/hide · `Ctrl+Alt+I` interactive (stay clickable when not hovered) · `Ctrl+Alt+Q` quit.

### 4c. The router logic (why a given file routes where it does)
Six signals, verifiability-weighted blend, banded into local/gray/cloud, with hard guards
first (security-sensitive or verifiability below the floor → always cloud). `eager` preset:
`verifyFloor 0.30, localBand 0.55, cloudBand 0.42`. Example seen this session: a `.txt`
with verifiability 0 tripped the master gate → **cloud** (`not-cheaply-verifiable`), which
is correct. Source of truth: `src/main/nudge/sorter.ts`.

### 4d. Key files/paths
| Path | What |
|---|---|
| `%LOCALAPPDATA%\fuel\fuel.db` | All persisted data (`meta`, `receipts`, samples, events, nudges) |
| `~/.claude/settings.json` | Where the Code hooks are registered |
| `~/.claude/precheck.cjs` | Installed PreToolUse Toll-Booth hook (Code only) |
| `~/.claude/fuel-hook.cjs` | Installed PostToolUse nudge hook (Code only) |
| `~/.claude/CLAUDE.md` | Standing "offload to local" instruction (Code only) |
| `src/main/nudge/{signals,sorter,gate}.ts` | Toll Booth: signals → route → action |
| `integrations/precheck.cjs` | Source of the PreToolUse hook |
| `integrations/install.mjs` | Installer (`node integrations/install.mjs status` = read-only health check) |

### 4e. Commands to re-verify state (all read-only/safe)
```bash
# 1. Is the /decide endpoint alive + what does it say?
curl -s -X POST http://127.0.0.1:47113/decide -H "Content-Type: application/json" \
  -d '{"tool_name":"Write","tool_input":{"file_path":"/x/a.json","content":"{}"}}'

# 2. Is a model resident in VRAM?
ollama ps

# 3. Installer health (shim + hooks + Code + Desktop telemetry wiring)
node integrations/install.mjs status

# 4. Read fuel's live settings + recent routing receipts (Node with node:sqlite):
#    keys: toll.mode / toll.level / nudge.mode / proxy.enabled
#    receipts columns: id, ts, session_id, tool, file_hint, route, score, reasons, signals, outcome
#    -> a receipt whose session_id matches a running client PROVES that client's hook fired.
```

---

## 5. What still has to happen to hit the goal

### For Claude Code (terminal) — ✅ essentially done
Offload works and is proven live. Just **do offloadable work inside Claude Code**. Nothing
to fix. (Optionally pre-warm the model to avoid the first cold-start.)

### For Claude Desktop — ❌ the real work, currently unsolved
Desktop cannot use the Toll Booth hook. To make Desktop offload, a **different mechanism**
is required. Candidate paths, to be investigated/decided by Fable:

1. **MCP + standing instruction (most likely viable):**
   - Ensure the `ollama-coder` MCP server (exposing `local_coding_task`, backed by
     `qwen2.5-coder:14b`) is present in **Desktop's own MCP config**
     (`claude_desktop_config.json`), separate from Code's config. *(Unverified — check
     this first.)*
   - Give Desktop a **standing instruction** (Desktop's project/custom instructions, since
     it doesn't read `~/.claude/CLAUDE.md`) to prefer `local_coding_task` for mechanical,
     cheaply-verifiable work.
   - **Limitation:** there is NO automatic Toll-Booth gate in Desktop (Desktop has no
     PreToolUse hook system). This would be *instruction-driven advice only*, and would not
     produce Toll-Booth receipts unless the offload path itself reports to fuel.

2. **Telemetry for Desktop offloads:** to make Desktop offloads show on the gauge, the
   offload path (the MCP shim) must POST attributed events to fuel's `/ingest` endpoint.
   Verify whether the `ollama-coder`/fuel shim already does this for Desktop, or whether
   only Code is wired. (`install.mjs status` reportedly lists Desktop, but that likely
   means telemetry, not the gate — confirm.)

3. **Valve / in-path proxy (heavier, advanced):** fuel's Valve can sit in front of Ollama
   (`OLLAMA_HOST=127.0.0.1:11435`, relocation via `integrations/valve.mjs hook`). This
   intercepts *inference traffic*, not *tool decisions* — it would meter any client that
   hits Ollama but would NOT decide what to offload. Currently off/opt-in/load-bearing.
   Probably not the right lever for "route Desktop's mechanical work," but noted for
   completeness.

### Open questions for Fable to resolve
- [ ] Is `ollama-coder` (`local_coding_task`) actually available inside **Desktop**? Check
      `claude_desktop_config.json`.
- [ ] Does Desktop support ANY pre-tool gating/hook today? (Believed: no — MCP only.) If
      not, accept that Desktop offload is instruction-driven, not gated.
- [ ] Can Desktop offloads be made to register on the fuel gauge (via `/ingest`), or is the
      HUD inherently Code-only for now?
- [ ] Decide the intended UX: should Desktop simply be told "prefer local for mechanical
      work," accepting no Toll-Booth telemetry — or is gated/metered Desktop offload a real
      requirement that needs new plumbing?

---

## 6. TL;DR for the next session

1. **Offload works from Claude Code, proven** (Guard + eager, hook firing, receipts land).
2. **Offload does NOT work from Claude Desktop, and restarting Desktop won't change that** —
   Desktop runs neither the `settings.json` hook nor `~/.claude/CLAUDE.md`. This is
   architectural.
3. To offload from Desktop you need a **separate path**: the `ollama-coder` MCP in
   Desktop's config + an explicit standing instruction to use `local_coding_task`. There is
   **no automatic Toll Booth in Desktop** today.
4. Everything else (settings, endpoint, tray behavior, pre-warm greyed-out) is working as
   designed — see Problems 2–5, all minor.
5. Verify any claim here with the read-only commands in §4e before acting.

---

## 7. RESOLUTION — 2026-07-24, implemented and verified live

The chosen design: **the shim (`ollama_mcp.py`) is the single control point**, because it
is the one piece of code every MCP client loads. No per-client configuration needed.

### What changed (source: `integrations/ollama_mcp.py`, installed to `~/.claude/ollama_mcp.py`)
1. **`local_coding_task` description rewritten as the standing policy** — "PREFER THIS
   over writing the code yourself whenever the work is mechanical and cheaply
   verifiable…" Tool descriptions are the only instruction channel that reaches every
   client, including plain Desktop chats that read neither hooks nor `~/.claude/CLAUDE.md`.
2. **New `route_check` tool** — forwards a pending write to fuel's `/decide` using the
   same payload shape as `precheck.cjs`, renders the verdict (LOCAL / GRAY / CLOUD +
   reasons), and **lands a routing receipt** with `session_id = "mcp:<FUEL_CLIENT>"`
   (e.g. `mcp:claude-desktop`). Fails open with judgment guidance if fuel is down.

### Answers to §5's open questions
- `ollama-coder` in Desktop's config? **Yes** — verified in `claude_desktop_config.json`
  with `FUEL_CLIENT=claude-desktop`.
- Desktop pre-tool gating? **No** (chat sessions). But **Claude Code sessions launched
  from inside the Desktop app DO run `settings.json` hooks and read `~/.claude/CLAUDE.md`**
  — the gap only ever applied to plain chats.
- Desktop on the gauge? **Yes, already wired** — the shim POSTs attributed telemetry to
  `/ingest` (spool fallback), and `route_check` now adds routing receipts too.

### Verified live
- MCP stdio test against the installed shim: both tools listed; `route_check` on a JSON
  write → `LOCAL (shallow, contained)`; on auth logic → `CLOUD (security-sensitive,
  not-cheaply-verifiable)`. Receipts 31–32 in `fuel.db` carry `mcp:claude-desktop`.

### Remaining manual steps
- **Restart Claude Desktop once** so it relaunches the shim process with the new tools.
- *(Optional, belt-and-suspenders)* paste `integrations/DESKTOP-INSTRUCTIONS.md` into
  Desktop's profile preferences / project instructions.

_Recorded 2026-07-24 from a live Claude Code session on `main`. See `HANDOFF.md` and
`USAGE.md` for deeper background._
