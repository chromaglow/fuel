/**
 * fuel valve relocator (M5, Phase B).
 *
 * Engaging the valve means fuel binds Ollama's usual port (11434) and the real
 * Ollama is moved to 11435. That relocation is a persistent, outward-facing
 * system change — it sets the OLLAMA_HOST user environment variable — so, like
 * the M3 installer, it is a manual, explicit action, never done automatically.
 *
 *   node integrations/valve.mjs status     # is Ollama relocated? which ports answer?
 *   node integrations/valve.mjs hook        # set OLLAMA_HOST=127.0.0.1:11435
 *   node integrations/valve.mjs unhook      # remove it (the escape hatch)
 *
 * After `hook` or `unhook` you must restart Ollama (quit from its tray and
 * relaunch) for it to bind the new port. Only once `status` shows Ollama
 * answering on 11435 should you engage the valve from fuel's tray. fuel also
 * exposes `electron . --unhook` for GUI-independent recovery.
 */
import { execFileSync } from 'node:child_process'

const OLLAMA_HOST_VALUE = '127.0.0.1:11435'
const REG_KEY = 'HKCU\\Environment'

const green = (s) => `\x1b[32m${s}\x1b[0m`
const yellow = (s) => `\x1b[33m${s}\x1b[0m`
const red = (s) => `\x1b[31m${s}\x1b[0m`
const dim = (s) => `\x1b[2m${s}\x1b[0m`

/** Current persisted OLLAMA_HOST from the registry, or null if unset. */
function currentOllamaHost() {
  try {
    const out = execFileSync('reg', ['query', REG_KEY, '/v', 'OLLAMA_HOST'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
    const m = out.match(/OLLAMA_HOST\s+REG_\w+\s+(.+)/)
    return m ? m[1].trim() : null
  } catch {
    // reg exits non-zero when the value doesn't exist.
    return null
  }
}

async function answers(url) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 1500)
  try {
    const res = await fetch(`${url}/api/version`, { signal: ctrl.signal })
    return res.ok
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}

async function status() {
  const host = currentOllamaHost()
  const on11434 = await answers('http://127.0.0.1:11434')
  const on11435 = await answers('http://127.0.0.1:11435')

  console.log('\nfuel valve status\n')
  console.log(
    `  OLLAMA_HOST          ${host === OLLAMA_HOST_VALUE ? green(host) : host ? yellow(host) : dim('unset')}`,
  )
  console.log(`  :11434 (fuel/ollama) ${on11434 ? green('answering') : dim('silent')}`)
  console.log(`  :11435 (real ollama) ${on11435 ? green('answering') : dim('silent')}`)

  const relocated = host === OLLAMA_HOST_VALUE && on11435
  console.log(
    relocated
      ? `\n  ${green('relocated')} — engage the valve from fuel's tray.\n`
      : host === OLLAMA_HOST_VALUE
        ? `\n  ${yellow('OLLAMA_HOST set but :11435 is silent')} — restart Ollama to pick it up.\n`
        : `\n  ${yellow('not relocated')} — run \`valve.mjs hook\`, then restart Ollama.\n`,
  )
}

function hook() {
  console.log('\nengaging valve relocation\n')
  // setx persists to HKCU\Environment and broadcasts WM_SETTINGCHANGE.
  execFileSync('setx', ['OLLAMA_HOST', OLLAMA_HOST_VALUE], { stdio: 'ignore' })
  console.log(`  set ${green(`OLLAMA_HOST=${OLLAMA_HOST_VALUE}`)}`)
  console.log(
    `\n  ${yellow('next')}: quit Ollama from its tray and relaunch so it binds :11435,\n` +
      `        then run \`valve.mjs status\` and engage the valve in fuel's tray.\n`,
  )
}

function unhook() {
  console.log('\nreleasing valve relocation\n')
  try {
    execFileSync('reg', ['delete', REG_KEY, '/v', 'OLLAMA_HOST', '/f'], { stdio: 'ignore' })
    console.log(`  removed ${green('OLLAMA_HOST')}`)
  } catch {
    console.log(`  ${dim('OLLAMA_HOST was not set')}`)
  }
  console.log(
    `\n  ${yellow('next')}: restart Ollama so it returns to :11434, and disable the valve in fuel.\n`,
  )
}

const cmd = process.argv[2] ?? 'status'
if (cmd === 'status') await status()
else if (cmd === 'hook') hook()
else if (cmd === 'unhook') unhook()
else {
  console.error(red(`unknown command: ${cmd}\nusage: valve.mjs [status|hook|unhook]`))
  process.exit(1)
}
