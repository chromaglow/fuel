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

Instrumentation is strictly fire-and-forget: if fuel is down, the collector
POST fails fast, the record is spooled to disk, and the coding task returns
normally regardless. Telemetry must never be able to break the tool.

Environment:
  FUEL_CLIENT     attribution tag, e.g. "claude-code" or "claude-desktop"
  FUEL_NUM_CTX    override the requested context window
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

MODEL = os.environ.get("FUEL_MODEL", "qwen2.5-coder:14b")
OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://localhost:11434")
COLLECTOR_URL = os.environ.get("FUEL_COLLECTOR", "http://127.0.0.1:47113")
CLIENT = os.environ.get("FUEL_CLIENT", "unknown")
NUM_CTX = int(os.environ.get("FUEL_NUM_CTX", "16384"))

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
                "Run a coding task on the local Qwen2.5-Coder-14B model. "
                "Use this for mechanical, repetitive, or boilerplate coding work: "
                "generating similar files, filling in patterns, writing tests from specs, "
                "reformatting code, writing docstrings, scaffolding components. "
                "Not for architecture decisions or novel problem-solving."
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
        )
    ]


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
