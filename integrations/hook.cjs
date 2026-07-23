#!/usr/bin/env node
/**
 * fuel PostToolUse hook for Claude Code.
 *
 * Fires after Write / Edit / MultiEdit / local_coding_task. Reads the tool
 * action from stdin, forwards a compact record to fuel's collector, and exits
 * 0 — always, fast. It never blocks Claude and never fails the tool: if fuel
 * isn't running the POST times out silently and the action is simply not
 * counted (nudges are advisory; there's no HUD to nudge when fuel is closed,
 * so unlike offload telemetry there's nothing to spool).
 *
 * Registered in ~/.claude/settings.json by integrations/install.mjs with the
 * matcher "Write|Edit|MultiEdit|mcp__ollama-coder__local_coding_task".
 */
const http = require('node:http')
const crypto = require('node:crypto')

// Cap forwarded strings: the classifier only needs the diff shape, not whole
// files, and this keeps large or sensitive content off the wire.
const CAP = 4096
const clip = (s) => (typeof s === 'string' ? s.slice(0, CAP) : null)
const sha16 = (s) =>
  typeof s === 'string' && s.length
    ? crypto.createHash('sha256').update(s).digest('hex').slice(0, 16)
    : null

let input = ''
process.stdin.setEncoding('utf8')
process.stdin.on('data', (c) => {
  input += c
})
process.stdin.on('end', () => {
  // Any parse/shape problem: exit clean, do nothing. Never disturb the tool.
  let data
  try {
    data = JSON.parse(input)
  } catch {
    process.exit(0)
  }

  const ti = data.tool_input || {}
  const tr = data.tool_response
  const written = ti.content ?? ti.new_string ?? null

  const body = JSON.stringify({
    session_id: data.session_id ?? null,
    cwd: data.cwd ?? null,
    tool: data.tool_name ?? null,
    file_path: ti.file_path ?? null,
    old_string: clip(ti.old_string),
    new_string: clip(ti.new_string),
    content: clip(ti.content),
    content_hash: sha16(written),
    task: clip(ti.task),
    output_hash: sha16(typeof tr === 'string' ? tr : tr ? JSON.stringify(tr) : null),
  })

  const req = http.request(
    {
      host: '127.0.0.1',
      port: 47113,
      path: '/hook',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      timeout: 250,
    },
    (res) => {
      res.resume()
      res.on('end', () => process.exit(0))
    },
  )
  req.on('error', () => process.exit(0))
  req.on('timeout', () => {
    req.destroy()
    process.exit(0)
  })
  req.write(body)
  req.end()
})

// Absolute backstop: never let the hook hang Claude's tool pipeline.
setTimeout(() => process.exit(0), 1500)
