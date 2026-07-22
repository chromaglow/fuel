/**
 * fuel integration installer.
 *
 * Wires the fuel-instrumented MCP shim into Claude Code and Claude Desktop so
 * their offloads become visible and attributed:
 *
 *   - installs integrations/ollama_mcp.py over the shim Claude Code already
 *     references (backing up the original),
 *   - tags Claude Code's ollama-coder server with FUEL_CLIENT=claude-code,
 *   - adds an ollama-coder server to Claude Desktop (which currently has none)
 *     with FUEL_CLIENT=claude-desktop — enabling Desktop offloading for the
 *     first time.
 *
 * Every write is backed up first and every step is idempotent. This is a
 * manual, explicit action: run it with Claude Code and Desktop closed.
 *
 *   node integrations/install.mjs status      # show what would change
 *   node integrations/install.mjs install
 *   node integrations/install.mjs uninstall   # restore from backups
 */
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HOME = process.env.USERPROFILE ?? process.env.HOME ?? ''
const APPDATA = process.env.APPDATA ?? join(HOME, 'AppData', 'Roaming')
const HERE = dirname(fileURLToPath(import.meta.url))

const SHIM_SRC = join(HERE, 'ollama_mcp.py')
const SHIM_DEST = join(HOME, '.claude', 'ollama_mcp.py')
const CODE_CONFIG = join(HOME, '.claude.json')
const DESKTOP_CONFIG = join(APPDATA, 'Claude', 'claude_desktop_config.json')

/** Marker line proving the installed shim is the instrumented one. */
const SHIM_MARKER = 'fuel-instrumented'

const green = (s) => `\x1b[32m${s}\x1b[0m`
const yellow = (s) => `\x1b[33m${s}\x1b[0m`
const red = (s) => `\x1b[31m${s}\x1b[0m`
const dim = (s) => `\x1b[2m${s}\x1b[0m`

function backup(path) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const dest = `${path}.fuel-backup-${stamp}`
  copyFileSync(path, dest)
  return dest
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function writeJson(path, obj) {
  writeFileSync(path, JSON.stringify(obj, null, 2) + '\n', 'utf8')
}

function shimInstalled() {
  if (!existsSync(SHIM_DEST)) return false
  return readFileSync(SHIM_DEST, 'utf8').includes(SHIM_MARKER)
}

function codeStatus() {
  if (!existsSync(CODE_CONFIG)) return { present: false }
  const cfg = readJson(CODE_CONFIG)
  const srv = cfg.mcpServers?.['ollama-coder']
  return {
    present: true,
    hasServer: Boolean(srv),
    tagged: srv?.env?.FUEL_CLIENT === 'claude-code',
  }
}

function desktopStatus() {
  if (!existsSync(DESKTOP_CONFIG)) return { present: false }
  const cfg = readJson(DESKTOP_CONFIG)
  const srv = cfg.mcpServers?.['ollama-coder']
  return {
    present: true,
    hasServer: Boolean(srv),
    tagged: srv?.env?.FUEL_CLIENT === 'claude-desktop',
  }
}

function status() {
  const shim = shimInstalled()
  const code = codeStatus()
  const desk = desktopStatus()

  console.log('\nfuel integration status\n')
  console.log(
    `  instrumented shim   ${shim ? green('installed') : yellow('not installed')}  ${dim(SHIM_DEST)}`,
  )

  const codeLabel = !code.present
    ? red('config missing')
    : !code.hasServer
      ? yellow('no ollama-coder server')
      : code.tagged
        ? green('wired')
        : yellow('present, untagged')
  console.log(`  claude code         ${codeLabel}  ${dim(CODE_CONFIG)}`)

  const deskLabel = !desk.present
    ? red('config missing')
    : !desk.hasServer
      ? yellow('offloading not enabled')
      : desk.tagged
        ? green('wired')
        : yellow('present, untagged')
  console.log(`  claude desktop      ${deskLabel}  ${dim(DESKTOP_CONFIG)}`)

  const done = shim && code.tagged && (desk.present ? desk.tagged : true)
  console.log(
    `\n  ${done ? green('fully wired') : yellow('run `install` to wire everything')}\n`,
  )
}

function install() {
  console.log('\ninstalling fuel integration\n')

  // 1. The instrumented shim, over the path Claude Code references.
  if (!existsSync(SHIM_SRC)) {
    console.error(red(`  cannot find instrumented shim at ${SHIM_SRC}`))
    process.exit(1)
  }
  mkdirSync(dirname(SHIM_DEST), { recursive: true })
  if (existsSync(SHIM_DEST) && !shimInstalled()) {
    const b = backup(SHIM_DEST)
    console.log(`  backed up original shim  ${dim(b)}`)
  }
  copyFileSync(SHIM_SRC, SHIM_DEST)
  console.log(`  installed shim           ${green(SHIM_DEST)}`)

  // 2. Tag Claude Code's ollama-coder server.
  if (existsSync(CODE_CONFIG)) {
    const cfg = readJson(CODE_CONFIG)
    const srv = cfg.mcpServers?.['ollama-coder']
    if (srv) {
      if (srv.env?.FUEL_CLIENT !== 'claude-code') {
        const b = backup(CODE_CONFIG)
        srv.env = { ...(srv.env ?? {}), FUEL_CLIENT: 'claude-code' }
        srv.args = [SHIM_DEST]
        writeJson(CODE_CONFIG, cfg)
        console.log(
          `  tagged claude code       ${green('FUEL_CLIENT=claude-code')}  ${dim(`(backup ${b})`)}`,
        )
      } else {
        console.log(`  claude code              ${dim('already tagged')}`)
      }
    } else {
      console.log(
        yellow('  claude code has no ollama-coder server; skipping (add it first)'),
      )
    }
  }

  // 3. Enable Claude Desktop — it has no mcpServers at all today.
  if (existsSync(DESKTOP_CONFIG)) {
    const cfg = readJson(DESKTOP_CONFIG)
    const existing = cfg.mcpServers?.['ollama-coder']
    if (existing?.env?.FUEL_CLIENT === 'claude-desktop') {
      console.log(`  claude desktop           ${dim('already enabled')}`)
    } else {
      const b = backup(DESKTOP_CONFIG)
      cfg.mcpServers = cfg.mcpServers ?? {}
      cfg.mcpServers['ollama-coder'] = {
        command: 'python',
        args: [SHIM_DEST],
        env: { FUEL_CLIENT: 'claude-desktop' },
      }
      writeJson(DESKTOP_CONFIG, cfg)
      console.log(
        `  enabled claude desktop   ${green('offloading now possible')}  ${dim(`(backup ${b})`)}`,
      )
    }
  } else {
    console.log(yellow(`  desktop config not found at ${DESKTOP_CONFIG}; skipping`))
  }

  console.log(
    `\n  ${green('done')} — restart Claude Code / Desktop to pick up the change.\n`,
  )
}

function latestBackup(path) {
  const dir = dirname(path)
  const base = path.slice(dir.length + 1)
  if (!existsSync(dir)) return null
  const candidates = readdirSync(dir)
    .filter((f) => f.startsWith(`${base}.fuel-backup-`))
    .sort()
  return candidates.length ? join(dir, candidates[candidates.length - 1]) : null
}

function uninstall() {
  console.log('\nrestoring from the most recent fuel backups\n')
  for (const target of [SHIM_DEST, CODE_CONFIG, DESKTOP_CONFIG]) {
    const b = latestBackup(target)
    if (b) {
      copyFileSync(b, target)
      console.log(`  restored ${green(target)}  ${dim(`from ${b}`)}`)
    } else {
      console.log(`  ${dim(`no backup for ${target}`)}`)
    }
  }
  console.log(
    `\n  ${yellow('note')}: Desktop had no ollama-coder server before install; ` +
      `if no backup existed, remove it manually.\n`,
  )
}

const cmd = process.argv[2] ?? 'status'
if (cmd === 'status') status()
else if (cmd === 'install') install()
else if (cmd === 'uninstall') uninstall()
else {
  console.error(`unknown command: ${cmd}\nusage: install.mjs [status|install|uninstall]`)
  process.exit(1)
}
