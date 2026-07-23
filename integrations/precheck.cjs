#!/usr/bin/env node
/**
 * fuel PreToolUse gate (M4) for Claude Code.
 *
 * Fires before Write / Edit / MultiEdit. POSTs the *pending* tool action to
 * fuel's collector /decide, which runs the toll booth, records a routing
 * receipt, and returns a verdict. In 'guard' mode a clearly-local write comes
 * back action:'advise' and this hook surfaces a one-line suggestion to route it
 * to local_coding_task. In 'observe' mode (default) it only records and exits 0.
 *
 * Fails OPEN, always: if fuel is down, slow, or returns anything unexpected, the
 * tool proceeds untouched. A monitor must never block Claude's edits.
 *
 * Register in ~/.claude/settings.json under hooks.PreToolUse with matcher
 * "Write|Edit|MultiEdit".
 */
const http = require('node:http')

let input = ''
process.stdin.setEncoding('utf8')
process.stdin.on('data', (c) => {
  input += c
})
process.stdin.on('end', () => {
  let data
  try {
    data = JSON.parse(input)
  } catch {
    process.exit(0)
  }

  const ti = data.tool_input || {}
  const body = JSON.stringify({
    session_id: data.session_id ?? null,
    cwd: data.cwd ?? null,
    tool_name: data.tool_name ?? null,
    tool_input: {
      file_path: ti.file_path ?? null,
      content: ti.content ?? null,
      old_string: ti.old_string ?? null,
      new_string: ti.new_string ?? null,
      task: ti.task ?? null,
    },
  })

  const req = http.request(
    {
      host: '127.0.0.1',
      port: 47113,
      path: '/decide',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      timeout: 400,
    },
    (res) => {
      let out = ''
      res.setEncoding('utf8')
      res.on('data', (c) => {
        out += c
      })
      res.on('end', () => {
        let v
        try {
          v = JSON.parse(out)
        } catch {
          process.exit(0)
        }
        if (v && v.action === 'advise') {
          const why = Array.isArray(v.reasons)
            ? v.reasons.filter((r) => r !== 'ambiguous-default-cloud').slice(0, 3).join(', ')
            : ''
          const reason = `fuel: this looks like local work${why ? ` (${why})` : ''} — route it to local_coding_task, or split off the mechanical part.`
          process.stdout.write(
            JSON.stringify({
              hookSpecificOutput: {
                hookEventName: 'PreToolUse',
                permissionDecision: 'ask',
                permissionDecisionReason: reason,
              },
            }),
          )
        }
        process.exit(0)
      })
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

// Absolute backstop: never hang Claude's tool pipeline.
setTimeout(() => process.exit(0), 1500)
