/**
 * VRAM per resident model, measured rather than reported.
 *
 * Ollama's /api/ps `size_vram` under-reports what a loaded model really holds
 * on the card: it leaves out most of the KV cache and compute buffers that
 * NUM_PARALLEL and a long num_ctx allocate. On Ganymede, gemma4:12b
 * (NUM_PARALLEL=4, q8_0 KV, ctx 32768) reports ~1.9 GB while nvidia-smi shows
 * ~13-15 GB of the 16 GB 4080 in use. So VRAM numbers come from nvidia-smi;
 * /api/ps only says *which* models are loaded, and its sizes serve only as
 * weights when nvidia-smi's used total has to be split between residents.
 *
 * Returns one MB figure per resident (same order), summing to `usedMb` (the
 * driver's and desktop's share rides along with the models; it is small next
 * to a loaded LLM). Returns null when nvidia-smi gave no reading, so callers
 * can fall back to listing names only.
 */
export function residentVramMb(
  sizes: readonly number[],
  usedMb: number | null | undefined,
): number[] | null {
  if (usedMb == null || !Number.isFinite(usedMb)) return null
  const used = Math.max(0, usedMb)
  if (sizes.length === 0) return []
  const w = sizes.map((s) => (Number.isFinite(s) && s > 0 ? s : 0))
  const sum = w.reduce((a, b) => a + b, 0)
  return sum > 0 ? w.map((x) => (used * x) / sum) : w.map(() => used / sizes.length)
}
