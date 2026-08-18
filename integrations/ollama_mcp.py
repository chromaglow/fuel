"""
ollama-coder MCP server — fuel-instrumented (marker: fuel-instrumented).

Runs a coding task on the local Qwen2.5-Coder model, exposed as the
`local_coding_task` tool. This is the fuel-instrumented replacement for the
original stdio server; it is a drop-in (same tool name, same inputs) that adds:

  1. Streaming  — reads Ollama's response token-by-token so the exact per-phase
                  timings are captured, instead of one opaque blob.
  2. num_ctx    — requests a real context window (default 16384) instead of
                  silently running at Ollama's 4096 default.
  3. Telemetry  — POSTs a rich, attributed record of each call to fuel's local
                  collector, with a spool-file fallback when fuel isn't running.
  4. route_check — a second tool that forwards a pending piece of work to the
                  Toll Booth's /decide endpoint, so clients WITHOUT hook support
                  (Claude Desktop) can still consult the router and land routing
                  receipts. Fails open when fuel is down.

The tool descriptions double as the standing "offload mechanical work" policy:
they are the only instruction channel that reaches every MCP client with zero
per-client configuration.

Instrumentation is strictly fire-and-forget: if fuel is down, the collector
POST fails fast, the record is spooled to disk, and the coding task returns
normally regardless. Telemetry must never be able to break the tool.

Environment:
  FUEL_CLIENT     attribution tag, e.g. "claude-code" or "claude-desktop"
  FUEL_NUM_CTX    override the requested context window
  FUEL_KEEP_ALIVE how long Ollama keeps the model in VRAM after a call (default 30m)
  FUEL_COLLECTOR  override the collector URL (default http://127.0.0.1:47113)
  OLLAMA_URL      override the Ollama endpoint
"""

import asyncio
import hashlib
import json
import os
import time
import urllib.request

import httpx
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp import types

# 7b (~5 GB resident) rather than 14b (~11 GB): on the 16 GB 4080 SUPER the 14b
# could not co-reside with WEYLD's DJ model (llama3.1:8b, ~5.5-7 GB), so every
# delegation evicted the DJ and every DJ pick evicted the coder — 36-51 s
# reloads that froze the desktop (2026-08-18). 7b + DJ fit together.
MODEL = os.environ.get("FUEL_MODEL", "qwen2.5-coder:7b")
OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://localhost:11434")
COLLECTOR_URL = os.environ.get("FUEL_COLLECTOR", "http://127.0.0.1:47113")
CLIENT = os.environ.get("FUEL_CLIENT", "unknown")
NUM_CTX = int(os.environ.get("FUEL_NUM_CTX", "16384"))
# Keep the model resident between calls; Ollama's 5m default means a ~9s cold
# start after every quiet spell.
KEEP_ALIVE = os.environ.get("FUEL_KEEP_ALIVE", "30m")

# Spool next to fuel's database so it drains on next launch.
SPOOL_PATH = os.path.join(
    os.environ.get("LOCALAPPDATA", os.path.expanduser("~")), "fuel", "spool.jsonl"
)

server = Server("ollama-coder")


@server.list_tools()
async def list_tools():
    return [
        types.Tool(
            name="local_coding_task",
            description=(
                "PREFER THIS over writing the code yourself whenever the work is "
                "mechanical and cheaply verifiable — it runs FREE on the user's local "
                "GPU (Qwen2.5-Coder-14B via Ollama) and consumes no cloud tokens. "
                "Standing policy: before writing repetitive or boilerplate code by hand, "
                "delegate it here. Good fits: generating similar files from a clear "
                "pattern or schema, writing straightforward tests from an explicit spec, "
                "mechanical refactors/renames/reformatting across many spots, docstrings "
                "and comments for already-written code, scaffolding components from an "
                "established template. NOT for architecture or design decisions, novel "
                "problem-solving, subtle debugging, or security-sensitive code. Always "
                "review the output before using it — treat it as a draft you are "
                "responsible for verifying. Unsure whether a task qualifies? Call "
                "route_check first."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "task": {
                        "type": "string",
                        "description": "Clear description of the coding task to perform",
                    },
                    "context": {
                        "type": "string",
                        "description": "Relevant code, file contents, or constraints the model needs",
                    },
                    "output_format": {
                        "type": "string",
                        "description": "What format to return: 'code', 'explanation', 'both'",
                        "default": "code",
                    },
                },
                "required": ["task"],
            },
        ),
        types.Tool(
            name="route_check",
            description=(
                "Ask fuel's Toll Booth router whether a pending piece of coding work "
                "should be offloaded to the local GPU model (local_coding_task) or done "
                "by Claude directly. Call this BEFORE writing a nontrivial file when the "
                "work might be mechanical. Returns a verdict — local / gray / cloud — "
                "with the router's reasons, and records a routing receipt on the fuel "
                "gauge. Instant and side-effect-free for your work; if fuel is not "
                "running it says so and you should use your own judgment."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "file_path": {
                        "type": "string",
                        "description": "Path of the file about to be written or edited",
                    },
                    "content": {
                        "type": "string",
                        "description": "The code about to be written (or a representative sample)",
                    },
                    "task": {
                        "type": "string",
                        "description": "Short description of the work, if no content yet",
                    },
                },
            },
        ),
    ]


def _route_check(arguments: dict) -> str:
    """
    Forward a pending piece of work to fuel's /decide (same payload shape as the
    Claude Code PreToolUse hook, precheck.cjs) and render the verdict as text.
    Fails open: any error returns guidance instead of raising.
    """
    body = json.dumps(
        {
            "session_id": os.environ.get("FUEL_SESSION_ID") or f"mcp:{CLIENT}",
            "cwd": os.getcwd(),
            "tool_name": "Write",
            "tool_input": {
                "file_path": arguments.get("file_path"),
                "content": arguments.get("content"),
                "old_string": None,
                "new_string": None,
                "task": arguments.get("task"),
            },
        }
    ).encode("utf-8")
    try:
        req = urllib.request.Request(
            f"{COLLECTOR_URL}/decide",
            data=body,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=1.0) as resp:
            verdict = json.loads(resp.read().decode("utf-8"))
    except Exception:
        return (
            "fuel is not running — no verdict. Use your own judgment: if the work is "
            "mechanical AND cheaply verifiable, offload it to local_coding_task; "
            "otherwise do it yourself."
        )

    route = verdict.get("route", "unknown")
    reasons = ", ".join(verdict.get("reasons", [])) or "no reasons given"
    if route == "local":
        advice = "Verdict: LOCAL — offload this to local_coding_task."
    elif route == "gray":
        advice = (
            "Verdict: GRAY (ambiguous) — default is cloud, but consider splitting off "
            "the mechanical part and offloading that to local_coding_task."
        )
    else:
        advice = "Verdict: CLOUD — do this yourself; it is not a cheap-verify fit."
    return f"{advice} Reasons: {reasons}."


def _emit(record: dict) -> None:
    """
    Send one telemetry record to fuel. Fire-and-forget: a short-timeout POST,
    and on any failure the record is appended to the spool file for fuel to
    drain later. Never raises — the coding task's result must not depend on it.
    """
    payload = json.dumps(record).encode("utf-8")
    try:
        req = urllib.request.Request(
            f"{COLLECTOR_URL}/ingest",
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        urllib.request.urlopen(req, timeout=0.25).close()
        return
    except Exception:
        pass  # fuel not running / slow — fall through to the spool.

    try:
        os.makedirs(os.path.dirname(SPOOL_PATH), exist_ok=True)
        with open(SPOOL_PATH, "a", encoding="utf-8") as fh:
            fh.write(json.dumps(record) + "\n")
    except Exception:
        pass  # Even the spool failing must not surface to the caller.


@server.call_tool()
async def call_tool(name: str, arguments: dict):
    if name == "route_check":
        return [types.TextContent(type="text", text=_route_check(arguments))]
    if name != "local_coding_task":
        raise ValueError(f"Unknown tool: {name}")

    task = arguments["task"]
    context = arguments.get("context", "")
    output_format = arguments.get("output_format", "code")

    format_instruction = {
        "code": "Return only the code, no explanation unless critical.",
        "explanation": "Explain the approach clearly without unnecessary code.",
        "both": "Provide the code with a brief explanation of key decisions.",
    }.get(output_format, "Return only the code.")

    prompt = (
        f"{context}\n\n---\nTask: {task}\n\n{format_instruction}"
        if context
        else f"Task: {task}\n\n{format_instruction}"
    )

    started_ms = int(time.time() * 1000)
    final = {}
    text_parts = []
    error = None

    async with httpx.AsyncClient() as client:
        try:
            # Stream so per-phase timings and token counts are captured. The
            # final streamed object carries the aggregate metrics.
            async with client.stream(
                "POST",
                f"{OLLAMA_URL}/api/generate",
                json={
                    "model": MODEL,
                    "prompt": prompt,
                    "stream": True,
                    "keep_alive": KEEP_ALIVE,
                    "options": {"num_ctx": NUM_CTX},
                },
                timeout=300.0,
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if not line:
                        continue
                    chunk = json.loads(line)
                    piece = chunk.get("response")
                    if piece:
                        text_parts.append(piece)
                    if chunk.get("done"):
                        final = chunk
        except httpx.ConnectError:
            error = "Ollama is not running. Start it with: ollama serve"
        except Exception as e:  # noqa: BLE001 — surface any failure as tool text.
            error = str(e)

    ended_ms = int(time.time() * 1000)
    result_text = "".join(text_parts)

    # Report to fuel regardless of outcome. This is the only place a delegation
    # becomes attributable to a specific Claude client.
    _emit(
        {
            "client": CLIENT,
            "session_id": os.environ.get("FUEL_SESSION_ID"),
            "model": MODEL,
            "status": "error" if error else "ok",
            "error": error,
            "prompt_tokens": final.get("prompt_eval_count"),
            "eval_tokens": final.get("eval_count"),
            "prompt_eval_ns": final.get("prompt_eval_duration"),
            "eval_ns": final.get("eval_duration"),
            "load_ns": final.get("load_duration"),
            "total_ns": final.get("total_duration"),
            "num_ctx": NUM_CTX,
            "started_at": started_ms,
            "ended_at": ended_ms,
            "task_summary": task[:120],
            "output_hash": hashlib.sha256(result_text.encode("utf-8")).hexdigest()[:16]
            if result_text
            else None,
        }
    )

    if error:
        return [types.TextContent(type="text", text=f"ERROR: {error}")]
    return [types.TextContent(type="text", text=result_text)]


async def main():
    async with stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream, write_stream, server.create_initialization_options()
        )


if __name__ == "__main__":
    asyncio.run(main())
