/** Dump what fuel has captured so far. Usage: node scripts/inspect.mjs */
import { DatabaseSync } from 'node:sqlite'
import { join } from 'node:path'

const dir = process.env.LOCALAPPDATA
  ? join(process.env.LOCALAPPDATA, 'fuel')
  : process.cwd()
const db = new DatabaseSync(join(dir, 'fuel.db'), { readOnly: true })

const count = (t) => db.prepare(`SELECT COUNT(*) c FROM ${t}`).get().c
console.log(`db      : ${join(dir, 'fuel.db')}`)
console.log(`samples : ${count('samples')}`)
console.log(`events  : ${count('events')}`)
console.log(`nudges  : ${count('nudges')}`)

console.log('\n--- last 6 samples ---')
const rows = db
  .prepare(
    `SELECT ts, gpu_util, vram_used_mb, vram_total_mb, temp_c, power_w,
            sm_clock_mhz, model_resident, evict_at
     FROM samples ORDER BY ts DESC LIMIT 6`,
  )
  .all()
for (const r of rows.reverse()) {
  const evict = r.evict_at
    ? ` evict+${Math.round((r.evict_at - r.ts) / 1000)}s`
    : ''
  console.log(
    `${new Date(r.ts).toLocaleTimeString()}  util ${String(r.gpu_util).padStart(3)}%  ` +
      `vram ${r.vram_used_mb}/${r.vram_total_mb}MB  ${r.temp_c}C  ` +
      `${String(r.power_w).padStart(6)}W  ${r.sm_clock_mhz}MHz  ` +
      `model:${r.model_resident ?? 'none'}${evict}`,
  )
}

console.log('\n--- events ---')
const events = db
  .prepare(
    `SELECT started_at, model, status, eval_tokens, total_ns, load_ns,
            truncated, cold_start
     FROM events ORDER BY started_at DESC LIMIT 10`,
  )
  .all()
if (events.length === 0) console.log('(none yet)')
for (const e of events.reverse()) {
  const secs = (e.total_ns / 1e9).toFixed(2)
  const tps =
    e.eval_tokens && e.total_ns
      ? (e.eval_tokens / ((e.total_ns - (e.load_ns ?? 0)) / 1e9)).toFixed(1)
      : '—'
  console.log(
    `${new Date(e.started_at).toLocaleTimeString()}  ${e.status}  ` +
      `${e.eval_tokens ?? '—'} tok  ${secs}s  ${tps} tok/s  ` +
      `cold:${e.cold_start} trunc:${e.truncated}`,
  )
}

console.log('\n--- meta ---')
for (const m of db.prepare('SELECT * FROM meta').all()) {
  console.log(`${m.key} = ${m.value}`)
}
db.close()
