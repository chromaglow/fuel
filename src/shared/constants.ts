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

/** Loopback ingest port for the Phase C collector (not used in M1). */
export const COLLECTOR_PORT = 47113

export const WINDOW_WIDTH = 340
export const WINDOW_HEIGHT = 300
