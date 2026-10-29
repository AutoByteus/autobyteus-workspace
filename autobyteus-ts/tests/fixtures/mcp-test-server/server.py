"""Tiny MCP test server (Python, official MCP SDK) for the autobyteus-ts MCP integration tests.

Purpose: a real MCP server of the kind users run (`uv run`, Python SDK), with the same tools as the
Node fixture `../mcp-stdio-fixture-server.mjs`, so the tests are implementation-agnostic:
  echo(text) -> text | add(a, b) -> structured {"sum"} | fail(message) -> tool error
  slow(ms) -> "slept <ms> ms" | report_env_and_cwd(name) -> {"value", "cwd"} as JSON text
Modes: --mode normal | exit-at-start (exit 1) | hang-at-start (never answers).
Transports: --transport stdio (default) | http --port N [--require-token T] (streamable HTTP at /mcp;
  every request without "Authorization: Bearer T" gets 401). HTTP prints "MCP_TEST_SERVER_READY <url>"
  and one "MCP_TEST_SERVER_REQUEST auth=ok|missing|wrong method=<M>" line per request to stderr.
Env: MCP_TEST_SERVER_PID_FILE=<path> makes the server write its pid there first.
Run (normally via the launcher in tests/integration/tools/mcp/mcp-test-server-launcher.ts):
  UV_PROJECT_ENVIRONMENT=<dir outside the repo> uv run --frozen --project <this folder> python server.py
Values: tests pass dummy values only.
"""

import argparse
import asyncio
import json
import os
import sys
import time
from typing import TypedDict

from mcp.server.mcpserver import MCPServer
from mcp.server.mcpserver.exceptions import ToolError

server = MCPServer(name="autobyteus-mcp-test-server", version="1.0.0")


class Sum(TypedDict):
    sum: float


@server.tool(description="Returns the given text.")
def echo(text: str) -> str:
    return text


@server.tool(description="Adds two numbers and returns the sum as structured content.")
def add(a: float, b: float) -> Sum:
    return {"sum": a + b}


@server.tool(description="Always fails with the given message as a tool error.")
def fail(message: str) -> str:
    raise ToolError(message)


@server.tool(description="Waits the given number of milliseconds, then answers.")
async def slow(ms: int) -> str:
    await asyncio.sleep(ms / 1000)
    return f"slept {ms} ms"


@server.tool(description="Reports one environment variable and the working directory of this server.")
def report_env_and_cwd(name: str) -> str:
    return json.dumps({"value": os.environ.get(name), "cwd": os.getcwd()})


def with_token_check(app, token):
    """ASGI wrapper: logs every HTTP request's auth outcome (never the value) and enforces the token."""

    async def checked(scope, receive, send):
        if scope["type"] != "http":
            return await app(scope, receive, send)
        headers = dict(scope.get("headers") or [])
        value = headers.get(b"authorization", b"").decode()
        auth = "ok" if value == f"Bearer {token}" else ("missing" if not value else "wrong")
        if token is None:
            auth = "ok" if not value else "unexpected"
        print(f"MCP_TEST_SERVER_REQUEST auth={auth} method={scope['method']}", file=sys.stderr, flush=True)
        if token is not None and auth != "ok":
            await send({"type": "http.response.start", "status": 401, "headers": [(b"content-type", b"text/plain")]})
            return await send({"type": "http.response.body", "body": b"unauthorized"})
        return await app(scope, receive, send)

    return checked


def serve_http(port, token):
    import uvicorn

    app = with_token_check(server.streamable_http_app(stateless_http=True), token)
    config = uvicorn.Config(app, host="127.0.0.1", port=port, log_level="warning")
    http_server = uvicorn.Server(config)

    async def run():
        task = asyncio.create_task(http_server.serve())
        while not http_server.started:
            await asyncio.sleep(0.02)
        print(f"MCP_TEST_SERVER_READY http://127.0.0.1:{port}/mcp", file=sys.stderr, flush=True)
        await task

    asyncio.run(run())


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--transport", choices=["stdio", "http"], default="stdio")
    parser.add_argument("--port", type=int, default=0)
    parser.add_argument("--require-token", default=None)
    parser.add_argument("--mode", choices=["normal", "exit-at-start", "hang-at-start"], default="normal")
    args = parser.parse_args()

    pid_file = os.environ.get("MCP_TEST_SERVER_PID_FILE")
    if pid_file:
        with open(pid_file, "w") as handle:
            handle.write(str(os.getpid()))

    if args.mode == "exit-at-start":
        print("mcp test server: exiting at start (mode exit-at-start)", file=sys.stderr, flush=True)
        sys.exit(1)
    if args.mode == "hang-at-start":
        while True:
            time.sleep(3600)

    if args.transport == "http":
        serve_http(args.port, args.require_token)
    else:
        server.run("stdio")


if __name__ == "__main__":
    main()
