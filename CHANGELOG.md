# fuel — Investigation & Decision Log

A running, dated record of what we tried, what broke, how we knew, and what we
decided. Newest entry on top. This is the narrative companion to
[HANDOFF.md](./HANDOFF.md) (state) and [SPEC.md](./SPEC.md) (design).

---

## 2026-10-09 — Drag anywhere, remembered placement, mini pill

**Asked for.** Ezra wanted to drag the HUD straight to any monitor instead of using the tray's
"Move to display", to have it come back to the same spot after a restart, and a third,
smaller size that shows only the dollar amount.

**Why dragging didn't work before.** It only worked in Interactive mode, which few people
knew about. Click-through mode (the default) passes every click to the window underneath.

**Hover-to-grab.** The main process already polls the cursor to drive hover-expand. It now
also turns click-through off while the cursor is over the HUD and back on when it leaves. So
the HUD can be dragged and its arrow clicked, and clicks everywhere else still pass through.
The whole HUD is a drag region. The Windows system menu that appears when you right-click a
drag region is suppressed, because its "Close" would quit fuel.

**Why placement drifted (three bugs).**
1. It was saved relative to the display's *bounds* but restored relative to its *workArea*,
   so a top or left taskbar shifted it on every launch.
2. It saved on every `move` event. That includes main shifting the tall expanded panel up off
   the bottom edge, so the HUD crept upward over time.
3. Any `display-metrics-changed` event reloaded the saved spot, which could undo a drag.

**Fix.** Placement is now a top-right *anchor* (`src/main/placement.ts`, pure and unit
tested). It is stored relative to the display's work area, with an absolute fallback point,
under `window.anchor`; the old `window.position` value is migrated once. Only a user drag
(`moved`, which on Windows fires at the end of a drag) or "Move to display" changes the
anchor. Each size (compact, expanded, mini) hangs from that corner and is clamped on-screen
without touching the anchor.

**Mini pill.** ▴ on the card rolls up to a 168×52 pill showing only the dollar amount, and
▾ rolls it back down. The pill never hover-expands. The state is persisted in `ui.mini` and
also available as a tray checkbox. It hangs from the same top-right corner as the card, so
after rolling up, the cursor is already over ▾.

---

## 2026-08-18 — fuel becomes a multi-tenant GPU instrument (layers 1–3)

**Where it started.** Ezra: "fuel doesn't seem to be firing" and "the PC locks up
for minutes sometimes." Both turned out to be the same story, and neither was what it
looked like.

**What we found (M0, in order):**

1. fuel *was* firing — 13,658 log events in 14 days at ~110 tok/s. What went quiet was
   Ezra's own offloading (16 coder calls in two weeks); the headline "offloaded" counter is
   fed by shim receipts, so heavy DJ traffic never moved it.
2. WEYLD's DJ (`llama3.1:8b`, called from the Jetson ~1,500×/day) and fuel's coder
   (`qwen2.5-coder:14b`) **could not co-reside**: 7.0 + 11 GB on a 16 GB card. Every
   delegation evicted the DJ, every pick evicted the coder — 40–96 cold starts/day, and
   on the worst morning 36–51 s coder loads. The two worst swap-storm hours in fuel's own
   DB (08-12 05h, 08-18 09h) line up exactly with Windows shell-hang events. That was
   the freeze.
3. fuel could not *show* any of this: `HudState.resident` was singular (`models[0]`),
   phase was a one-model lifecycle, log events were `client:null model:'unknown'`
   with the comment "every client is 127.0.0.1" — false since Ollama went on the LAN
   on 08-04. The GIN line carries the caller IP; fuel threw it away.

**Fixes to the workload first (M1–M3):** coder → `qwen2.5-coder:7b` (5.6 GB); DJ
`numCtx` 16384 → 8192 (5.9 GB, prompt is ~3.9k so still 2× headroom, 4/4 picks still
made a discovery tool call). Both resident, coder warm-loads in 0.14 s, DJ's next pick
paid no reload. **Then the correction Ezra asked for:** don't band-aid; make the
instrument tell the truth.

**Layer 1 — truth.** Tenants (`config/tenants.json`: byIp for requests, byModel for
residents; per-machine override merged). `residents[]` from every `/api/ps` row,
tenant-tagged, with `sizeTotal` vs `sizeVram` (CPU-split alarm) and observed
`keepAliveSec`. `EvictionDetector` (tested): a resident leaving >5 s before its own
`expires_at` is contention; a newcomer within 20 s gets the blame; deadline timeouts
are not evictions. Log events keep `clientIp`, get `client` = tenant id and an
inferred model. UI: header names tenants; **VRAM budget bar** (segments per tenant,
"other" for the desktop, free; amber < 2 GB; hatched + red edge for a CPU-split
resident); footer `evicted N ✓/⚠`; panel: per-resident rows, reloads vs evictions,
contention log, recent tasks labelled by tenant. **Ring laps** (Ezra's ask): one ring,
each lap of the daily goal advances red → yellow → orange → green → blue; the purple
overflow ring is gone.

**Layer 2 — policy.** `OLLAMA_KEEP_ALIVE=1h` at the Ollama layer (user env var). Every
caller that sends no keep-alive — subwave does not — inherits it; the DJ's 40–80
self-reloads/day are gone; the Valve's 127.0.0.1-only pin stops mattering for the LAN
tenant. fuel shows the keep-alive each resident *actually* gets, not the config.

**Layer 3 — economics.** Each tenant priced at its own counterfactual Claude model
(`pricing.json` → `tenants`): DJ @ `claude-sonnet-5` (what it was really billed to on
08-13), local/unattributed @ default, embed null. Headline = the sum. First-day
effect: **≈$7.84 → ≈$4.85** — the DJ had been priced at Opus. Lower, and honest.
`scripts/backfill-client-ip.py` re-attributed 4,967 older events from Ollama's logs.

**Gotchas paid for today (all recorded in HANDOFF.md):**

- `SetEnvironmentVariable(...,'User')` doesn't touch the current shell; Ollama launched
  from that shell came up with `OLLAMA_KEEP_ALIVE:5m0s`. Read `server.log`, not the
  registry.
- `Stop-Process ollama` orphans `llama-server.exe` runners that keep their VRAM. Three
  orphans → the DJ's next load landed **45 % on the CPU** (18/33 layers). This is the
  freeze mechanism, caused by the fix. fuel now flags it; kill runners whose parent
  isn't the live `ollama.exe`.
- A Claude session keeps the shim it started with: a delegation from a pre-switch
  session loaded the 14b and evicted the DJ — the detector's first real catch
  (`llama3.1:8b 3569 s early ← qwen2.5-coder:14b`).
- Real headroom with both models is ~2 GB, not 4.5: the desktop holds ~2.6 GB. Room
  for the embed model, not a third LLM.
- The debug-endpoint regexes first used to read WEYLD's ring buffer produced wrong
  dates (a hard-coded `08-13`) and briefly a wrong story ("DJ on sonnet for a day").
  Ollama's own logs on the PC settled it: the DJ was on llama the whole time. Parse
  JSON on the Jetson side; never regex a 1.3 MB payload with duplicate keys.
- Earlier claim corrected: `samples.ts` is `INTEGER PRIMARY KEY` — the startup
  `prune()` was never a full scan.

**Numbers to check tomorrow (M4 soak):** `evicted 0 ✓` all day; reloads in the panel
near zero; no shell-hang events; the DJ's row shows `ka 1h`.

---

## 2026-07-24 — Toll Booth enforce mode; Desktop findings

- **Enforce** added to the gate: clearly-local writes are *denied* (not just advised)
  unless a delegation completed within a 10-min grace window, so the delegated result
  can land. `precheck.cjs` returns the deny; tray exposes the mode; tests cover the
  grace path.
- **FIXES.md**: full findings on why offload wasn't reaching Claude Desktop, resolved
  by moving the policy into the shim itself (`route_check` + self-advertising tool
  descriptions). `integrations/DESKTOP-INSTRUCTIONS.md`: optional paste-in reinforcement.

---

## 2026-07-23 (activation) — Toll Booth activated + usage docs

- **Activated** in **observe** mode: restarted the app on the new build (`/decide`
  verified live on the wire), copied `precheck.cjs` → `~/.claude/precheck.cjs`, and
  registered it as a `PreToolUse` hook (matcher `Write|Edit|MultiEdit`) in
  `~/.claude/settings.json`. Verified end-to-end — a real hook invocation reached
  `/decide` and recorded a receipt. The hook fires in Claude Code sessions started
  *after* registration (hooks load at startup).
- **Persistence:** added a Startup-folder shortcut (`fuel.lnk`) launching
  `electron.exe "<fuel dir>"` at login. The tray "Launch at login" toggle is unreliable
  for an unpackaged app (registers bare `electron.exe`), so a Startup shortcut is used
  instead.
- **Docs:** new **USAGE.md** (every command, tray controls, the Toll Booth, and
  troubleshooting); **README.md** refreshed (Toll Booth + M5 in status, `node:sqlite`
  stack fix, documentation links); HANDOFF marked activated.
- **Remaining:** watch observe-mode data, then flip tray → Toll booth → **Guard**;
  outcome-stamping (offloaded count) and per-category toggles still open.

---

## 2026-07-23 (later) — Toll Booth built: 6 modules shipped (M1–M6)

**Supersedes the "nothing in the codebase changed" status in the entry below.**
After the diagnosis + plan, the user picked the full toll-booth scope and we
built all six modules under their Operating Rules (one module at a time, each
tested + checkpointed + committed). Suite **41 → 72**, all pushed to `main`.

### The modules (module → file → commit)

| # | Module | Files | Commit |
|---|---|---|---|
| M1 | **Net** — pure `extractSignals()` → 6 designators | `src/main/nudge/signals.ts` | `2b56179` |
| M2 | **Sorter** — pure `decide()` → route + receipt (verifiability-first, cloud-default, aggressiveness presets) | `src/main/nudge/sorter.ts` | `09ae97f` |
| M3 | **Receipts** — `receipts` table + `insert/recent/todayCatchStats`; `ReceiptRecord`/`CatchStats` types | `src/main/db/index.ts`, `src/shared/types.ts` | `6cc37ec` |
| M4 | **Catch** — real-time `PreToolUse` gate (observe/guard/off) + `/decide` endpoint + hook | `src/main/nudge/gate.ts`, `collector/server.ts`, `integrations/precheck.cjs` | `0ff4f34` |
| M5 | **Dashboard** — catch-rate tile + live decision feed on the HUD | `src/renderer/{panel,hud}.ts`, `index.html`, `style.css` | `5731b2a` |
| M6 | **Controls** — tray Toll booth submenu (mode + sensitivity) | `src/main/tray.ts`, `index.ts` | `d93d3e9` |

### Notable

- **Dogfooded M3 on the local model.** The receipts CRUD was drafted via
  `local_coding_task` (registered on the gauge as a ~673-token offload, warm
  ~55 tok/s); the tests and the fixes (JSON.parse type-safety + `safeParseJson`
  guard, house style, schema folded into `SCHEMA`) are Claude's. First time the
  offload loop was proven live — building fuel *with* fuel.
- **Design principle locked:** cost is never the routing criterion; **verifiability
  is the master gate** ("if the cheap model errs, do I catch it immediately?").
  This is what stops the naive "route everything to Ollama" failure mode.
- Fixed the test resolve hook to map relative `.js`→`.ts` (`test/alias-hook.mjs`)
  so modules with runtime relative imports load under `node --test`.
- Naming clash noted: the toll-booth's internal modules M1–M6 are **distinct**
  from the project's original M1–M5 milestones.

### State: built + inert (awaiting activation)

Nothing is live yet. Activation = restart app on the new build → register
`precheck.cjs` as a `PreToolUse` hook (matcher `Write|Edit|MultiEdit`) → run
`observe`, then flip to `guard`. Full walkthrough in **HANDOFF.md →
"Activating the Toll Booth."**

### Known gaps (safe to activate without)

- **Outcome stamping** — the `offloaded` count stays 0 until advise→actual is
  reconciled on the PostToolUse side.
- **Per-category toggles** — need a category filter in the Sorter (M2).

---

## 2026-07-23 — "Nothing's happening" → root cause → the toll-booth plan

### TL;DR

The user opened fuel and it said **"no model loaded, nothing going on."** Nothing
was actually broken — the model had simply been evicted from VRAM. But chasing
that led to the real finding: **fuel measures offloading but nothing causes it,
and its miss-detector (M4) has recorded zero nudges across ~104 sessions.** We
traced M4 end to end, proved every link works, and found the root cause is the
**classifier's scoring model** — it only catches repetitive bursts, not the
common case (one boilerplate file). We then designed a replacement — the
**toll booth** — and broke it into a 6-module build plan (below), pending the
user's go-ahead.

---

### 1. Where we started (the symptom)

- **User report:** "How do I get this project working — it still says *no model
  loaded*, doesn't look like anything's going on."
- **Assumption going in** (from stale HANDOFF.md): the installer had never been
  run, so the gauge sat near zero.

### 2. First diagnosis — nothing was broken

Probed the live system instead of trusting the docs:

| Check | Result |
|---|---|
| Ollama running | ✅ v0.32.3 on :11434 |
| Model installed | ✅ `qwen2.5-coder:14b` |
| Model **resident** | ❌ `ollama ps` empty — VRAM at 2.3 GB |
| fuel app running | ✅ 4 electron processes, built, HUD up |
| Sensor working | ✅ 72,154 GPU samples captured at 1 Hz |
| Installer wiring | ✅ **fully wired** (shim + Claude Code + Desktop + nudge hook) |

**Finding:** "No model loaded" was *accurate*, not a bug. The model had been
evicted — Ollama's default `keep_alive` is 5 min and the last local inference was
hours earlier. **The HANDOFF was stale**: the installer *had* been run since it
was written.

**Proof it was only idle:** fired one `/api/generate` with `num_ctx: 16384,
keep_alive: 10m`. Model loaded (11 GB, 100% GPU, ctx 16384). The HUD sensor
flipped within one tick:

```
before:  vram  2305 MB   model:none
after:   vram 13941 MB   model:qwen2.5-coder:14b  evict+600s
```

### 3. The real problem surfaces

- **User asked:** can you see what Claude Desktop is doing right now — should any
  of it be offloaded?
- **I told them:** fuel only sees *local GPU inference*; Claude Desktop's work
  runs in the cloud and is invisible to fuel. At that moment the GPU was idle at
  3% — so nothing was being offloaded at all.
- **User then asked:** should the work *I* had just done (a spec rewrite, a PDF
  worksheet, a repo push) have been offloaded?
- **I told them:** the ~400-line `reportlab` PDF-build script **should** have gone
  to the local model (mechanical, template-following); the spec/design work
  correctly stayed on Opus. **This was fuel's thesis happening live** — fully
  wired, model warm, and I *still* hand-wrote the one delegatable chunk.
- **User asked:** how do we make fuel actually functional — "we're wired but
  nothing triggers, and I don't know what I don't know."
- **I told them:** fuel *measures* offloading but nothing *causes* it; the loop is
  open. Red flag: `inspect.mjs` showed **`nudges: 0`** — the M4 detector had never
  fired. Recommended tracing whether detection even works before anything else.
- **User said:** trace the M4 hook, find why zero nudges, fan out if needed.

### 4. The M4 hook trace — what we tested and how we know

Traced every link from tool-action → nudge-in-DB. **All infrastructure works:**

| Link | Test | Result |
|---|---|---|
| Hook registered | read `~/.claude/settings.json` | ✅ matcher `Write\|Edit\|MultiEdit\|…local_coding_task` |
| Installed hook = source | `diff` vs `integrations/hook.cjs` | ✅ identical (`~/.claude/fuel-hook.cjs`) |
| `node` resolves as Claude spawns it | `cmd /c node --version` (via PowerShell) | ✅ **v24.13.0** — earlier "missing" was a git-bash quoting artifact, not a real PATH gap |
| Collector listening | `netstat` :47113 | ✅ PID 4668 (fuel) |
| Downstream pipeline | POST synthetic 3-file burst → :47113/hook | ✅ nudge recorded (**0 → 1**) |
| **Live hook, real session** | **3 real `Write` calls via my tools** | ✅ nudge recorded (**1 → 2**), tagged with this session's ID |

The last row is the clincher: the hook fired on genuine tool calls, scored, and
persisted. Recorded nudge:
`score 4 · ["sibling-burst","file-scaffolding"] · Write · sid 76a077ce…` (this
session). **M4 works end to end.** (Test nudges were then deleted → clean `0`
baseline.)

### 5. Root cause — the classifier's definition of "delegatable" is too narrow

`src/main/nudge/classify.ts` (`scoreBurst`) only crosses threshold (`4`) on:

- **3+ sibling files** in one dir within 60 s (`sibling-burst`, +3), **or**
- **2+ substantial mechanical reformats** / import-reorders (+2 each), **or**
- **2+ comment-only** blocks (+2 each).

A **single substantial new file** written from a pattern scores **0**:

```
edits = [1 Write]
  sibling-burst? needs ≥3 → no
  mechanical?    Write isn't a reformat → no
  scaffold?      needs ≥2 → no
TOTAL = 0  → never nudges
```

That single-file-scaffold case is the **most common and highest-value miss** — it
is exactly the `reportlab` script from earlier. The detector watches for
repetitive *sweeps* (rare in normal work) and is blind to "Claude hand-wrote one
whole boilerplate file" (constant in normal work). **That is why 104 sessions
produced zero nudges. It is a calibration gap, not a broken pipe.**

Constants: `NUDGE_THRESHOLD=4`, `NUDGE_WINDOW_MS=60_000`,
`NUDGE_DEBOUNCE_MS=300_000`, `MECHANICAL_MIN_LINES=4` (`src/shared/constants.ts`).

### 6. Prior-art research — don't reinvent the wheel

- **User asked:** find how others solve this, or give me a research prompt.
- **Findings:**
  - [`claude-ollama-agents`](https://github.com/PratikHotchandani22/claude-ollama-agents)
    is a near-twin (Claude Code subagents delegating to Ollama) — but states
    plainly **"there's no real-time detection; delegation is explicit."** Its
    trigger is a blunt `~/.claude/CLAUDE.md` rule ("never write code >5 lines").
  - [RouteLLM](https://github.com/lm-sys/RouteLLM) / vLLM Semantic Router / LLMRouter
    = trained difficulty routers, but they route **whole prompts**, not tool-call
    subtasks (impedance mismatch).
  - [Claude Code Router](https://dev.to/stevengonsalvez/claude-code-router-use-any-model-with-claude-codes-interface-c6a) /
    LiteLLM / `ANTHROPIC_BASE_URL=localhost` = **the trap to avoid**: they route the
    *entire session* to local, replacing the brain. fuel keeps Opus as orchestrator.
- **Key insight:** nobody has cracked real-time auto-detection. **fuel is ahead of
  the field on measurement, behind on the trigger — and the field's trigger is a
  one-line CLAUDE.md rule.** Borrow the harness + the simple rule; keep fuel's
  superior gauge.

### 7. The design — the toll booth

- **User asked:** make it "sexy," break the low-effort "Ollama writes everything"
  pattern, find the gray area and the key designators, build a "toll booth."
- **Core principle:** **cost is never the criterion — nature of work is.** Routing
  on cost produces slop (the 14B botches judgment work). The free lane is
  "well-specified, cheaply-verified, pattern-following, contained work"; default
  on any doubt is the cloud lane (asymmetric risk: a bad offload ≫ a missed one).
- **Master designator — verifiability:** *"If the cheap model gets this wrong, do I
  find out immediately and for free?"* Yes (won't compile / test fails / eyeball
  it) → local. No (subtle, late, security, concurrency) → cloud. This auto-excludes
  everything dangerous.
- **Other designators:** spec-completeness, pattern-analog, blast-radius,
  reasoning-depth, context-locality.
- **Parsing the gray area:** (1) **decompose, don't classify** — Opus does the
  judgment core, hands the mechanical residue to local; (2) **cloud-default** the
  ambiguous, but log it as "gray" for review; (3) **verification-gate** — never
  offload without a cheap verifier available.
- **Receipts:** every routing decision logs *why* it was eligible → auditable, so
  offloading is never a black-box cost-dodge.
- **Sexy:** a live decision feed on the HUD, per-decision receipts, an honest
  "free-lane rate on eligible work" score (not a $ claim), a gray-zone review ritual.

### 8. The plan — 6 modules (pending confirmation)

Adopted the user's **Operating Rules** (brevity, modular, checkpointed,
one-module-at-a-time). Decomposition:

1. **Net (feature extraction)** — extract signals (verifiability, spec-completeness,
   pattern-analog, blast-radius, reasoning-depth, context-locality) from a work
   item. Pure. *Deps: none.*
2. **Sorter (toll-booth decision)** — signals → route (`local`/`cloud`/`gray`),
   verifiability-first + cloud-default + guards. Pure. *Deps: M1.*
3. **Receipts (decision log)** — persist readings + route + outcome to SQLite.
   *Deps: M2.*
4. **Catch (real-time gate)** — `PreToolUse` hook runs M1+M2 on a *pending* write
   and injects a just-in-time nudge to redirect/split before I type it. *Deps: M1, M2.*
5. **Dashboard (HUD)** — live decision feed + catch-rate tile. *Deps: M3.*
6. **Controls (tray)** — dial (`off/careful/normal/eager`) + category toggles,
   persisted to meta, feeding M2. *Deps: M2.*

**Flow:** M1 → M2 → {M3, M4, M6}; M3 → M5.
**MVP** (offloading starts happening): **M1 + M2 + M4** + a minimal M5 tile.
M3 (schema) and M6 (tray) are the most mechanical → first candidates to dogfood on
the local 14B.

### 9. Status / next step

- **Nothing in the codebase changed this session** — this was diagnosis, research,
  design, and planning only. The M4 pipeline is confirmed working; the classifier
  is confirmed mis-calibrated; the 6-module plan awaits the user's go-ahead.
- **Immediate next action:** confirm the breakdown, then execute **Module 1 (Net)**
  under the Operating Rules (one module, then checkpoint).

### Appendix — corrections logged this session

- HANDOFF.md said the installer was unrun → **it is fully wired.**
- HANDOFF.md said M5 was committed-but-unpushed → **it is pushed** (HEAD = origin/main).
- Earlier "`node` not on PATH in cmd" → **false**, a git-bash↔cmd quoting artifact;
  `node` resolves as v24.13.0.
