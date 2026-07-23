/** Tunables and well-known paths. Measured baselines come from SPEC.md §2. */

export const OLLAMA_BASE = process.env.FUEL_OLLAMA_URL ?? 'http://127.0.0.1:11434'

/** Poll cadences, ms. */
export const POLL_GPU_MS = 1000
export const POLL_PS_MS = 1000
export const POLL_TAGS_MS = 60_000

/** Sparkline window: 60 samples at 1 Hz = 60 s. */
export const UTIL_HISTORY_LEN = 60

/**
 * Measured on the target machine 2026-07-22 (SPEC.md §2.3).
 *
 * The 40.1 tok/s figure in the original spec came from the very first cold run
 * and is depressed by first-load effects. Two independent warm runs since
 * (19 tok and 610 tok) both settle at ~63 tok/s, so warm steady state — not
 * the cold figure — is what the gauge should be scaled against.
 */
export const TOK_PER_SEC_WARM = 63
export const TOK_PER_SEC_REDLINE = 70

/** A load phase longer than this means we paid a cold start (~33 s measured). */
export const COLD_START_NS = 1_000_000_000

/** Keep raw 1 Hz samples for this long before pruning. */
export const SAMPLE_RETENTION_DAYS = 30

/** Loopback ingest port for the Phase C collector. */
export const COLLECTOR_PORT = 47113
export const COLLECTOR_HOST = '127.0.0.1'

/**
 * Default context the instrumented MCP shim requests, replacing Ollama's
 * silent 4,096. Measured on the target machine (SPEC §12 Q5): 16,384 costs
 * 11.08 GB resident and leaves 3.2 GB free, versus 32,768 which leaves only
 * 0.57 GB — one browser tab from spilling into system RAM.
 */
export const DEFAULT_NUM_CTX = 16384

/**
 * How long a client-agnostic log event waits to be claimed by a richer MCP
 * event for the same inference before it's committed on its own. This setup
 * runs one generation at a time (single model, single slot), so pairing the
 * most recent unmatched pair within the window is unambiguous.
 */
export const RECONCILE_WINDOW_MS = 6000

export const WINDOW_WIDTH = 320
/** Compact: header + 240px gauge + footer. */
export const WINDOW_HEIGHT = 326
/** Hover-expanded, with the dense telemetry panel + nudge list revealed. */
export const WINDOW_HEIGHT_EXPANDED = 664

/**
 * Daily budget-ring target in USD. The ring fills toward this; anything past
 * it spills into the overflow ring rather than pinning. User-overridable.
 */
export const DEFAULT_DAILY_GOAL_USD = 2.0

/** How many recent tasks the expanded panel lists. */
export const RECENT_EVENT_LIMIT = 6

// ---- Nudge engine (M4) ----

/** A cluster scoring at least this much is flagged as unburned fuel. */
export const NUDGE_THRESHOLD = 4
/** Tool events within this window of each other form one burst. */
export const NUDGE_WINDOW_MS = 60_000
/** Don't re-nudge the same session+directory more than once per this period. */
export const NUDGE_DEBOUNCE_MS = 300_000
/** A reformat/import-reorder/comment block must touch at least this many lines
 *  to count as substantial on its own — one-line tidies aren't worth offloading. */
export const MECHANICAL_MIN_LINES = 4
/** Rough chars-per-token for the est-tokens display. */
export const CHARS_PER_TOKEN = 4
