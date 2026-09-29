"""Temporary live probe: browser MCP (stdio adapter) against an isolated AutoByteus instance.

Usage: uv run --frozen python mcp_probe.py <control_port> <workspace_dir> [attach_only_dead_port]
"""
from __future__ import annotations

import asyncio
import json
import os
import subprocess
import sys
import time
from pathlib import Path

from mcp import ClientSession
from mcp.client.stdio import StdioServerParameters, stdio_client

MCP = "/Users/normy/autobyteus_org/autobyteus_mcps-agent-isolated-app-recording/browser-automation/scripts/browser-mcp"


def result_of(call) -> dict:
    if call.isError:
        return {"isError": True, "text": " ".join(getattr(c, "text", "") for c in call.content)}
    value = call.structuredContent
    return value.get("result", value) if isinstance(value, dict) else {"raw": str(value)}


def params(port: int, workspace: Path) -> StdioServerParameters:
    env = dict(os.environ)
    env.update({"CHROME_REMOTE_DEBUGGING_PORT": str(port), "BROWSER_AUTOMATION_ATTACH_ONLY": "1",
                "BROWSER_AUTOMATION_WORKSPACE": str(workspace)})
    env.pop("CHROME_USER_DATA_DIR", None)
    return StdioServerParameters(command="bash", args=[MCP], env=env, cwd=str(workspace))


async def session_run(port: int, workspace: Path, body):
    errlog = (workspace / f"mcp-stderr-{time.time_ns()}.log").open("w")
    try:
        async with stdio_client(params(port, workspace), errlog=errlog) as (r, w):
            async with ClientSession(r, w) as session:
                await session.initialize()
                return await body(session)
    finally:
        errlog.close()


async def main() -> None:
    port = int(sys.argv[1])
    workspace = Path(sys.argv[2]).resolve()
    workspace.mkdir(parents=True, exist_ok=True)
    report: dict = {}

    async def first(session: ClientSession):
        tools = sorted(t.name for t in (await session.list_tools()).tools)
        report["tools"] = tools
        listed = result_of(await session.call_tool("list_tabs", {}))
        report["list_tabs"] = listed
        attached = result_of(await session.call_tool("attach_tab", {"url_contains": "/renderer/index.html"}))
        report["attach_tab"] = attached
        tab = attached["tab_id"]
        report["screenshot"] = result_of(await session.call_tool(
            "screenshot", {"tab_id": tab, "file_path": "mcp-shot.png", "full_page": False, "overwrite": True}))
        report["helper_nav"] = result_of(await session.call_tool(
            "run_script", {"tab_id": tab, "script": "async () => __abDemo.click({ text: 'Agents' })"}))
        report["start_recording"] = result_of(await session.call_tool(
            "start_recording", {"tab_id": tab, "output_file": "mcp-concurrent.mp4", "fps": 25, "overwrite": True}))
        report["start_again"] = result_of(await session.call_tool(
            "start_recording", {"tab_id": tab, "output_file": "other.mp4"}))
        concurrent = []
        for round_index in range(3):
            calls = [
                session.call_tool("run_script", {"tab_id": tab, "script":
                    f"async () => {{ await __abDemo.caption('MCP concurrent round {round_index}'); return __abDemo.hover({{ text: 'Reload' }}) }}"}),
                session.call_tool("screenshot", {"tab_id": tab, "file_path": f"during-{round_index}.png",
                                                 "full_page": False, "overwrite": True}),
                session.call_tool("dom_snapshot", {"tab_id": tab, "max_elements": 50}),
                session.call_tool("read_page", {"tab_id": tab, "cleaning_mode": "text"}),
                session.call_tool("list_tabs", {}),
            ]
            began = time.monotonic()
            results = await asyncio.gather(*calls)
            concurrent.append({"round": round_index, "seconds": round(time.monotonic() - began, 2),
                               "errors": [result_of(r) for r in results if r.isError]})
            await asyncio.sleep(1.0)
        report["concurrent"] = concurrent
        report["hide"] = result_of(await session.call_tool("run_script", {"tab_id": tab, "script": "__abDemo.hideCaption()"}))
        return tab

    tab = await session_run(port, workspace, first)
    report["first_session_closed_at"] = time.time()
    await asyncio.sleep(2.0)

    async def second(session: ClientSession):
        report["stop_from_second_process"] = result_of(await session.call_tool("stop_recording", {"tab_id": tab}))
        report["stop_again"] = result_of(await session.call_tool("stop_recording", {"tab_id": tab}))

    await session_run(port, workspace, second)

    artifact = report["stop_from_second_process"].get("artifact", {}).get("path")
    if artifact:
        probe = subprocess.run(["ffprobe", "-v", "error", "-show_entries",
                                "format=duration:stream=codec_name,width,height,nb_frames", "-of", "json", artifact],
                               capture_output=True, text=True)
        report["ffprobe"] = json.loads(probe.stdout or "{}")

    if len(sys.argv) > 3:
        dead = int(sys.argv[3])
        before = subprocess.run(["pgrep", "-f", f"remote-debugging-port={dead}"], capture_output=True, text=True).stdout

        async def dead_body(session: ClientSession):
            report["dead_tools"] = len((await session.list_tools()).tools)
            report["dead_list_tabs"] = result_of(await session.call_tool("list_tabs", {}))

        await session_run(dead, workspace, dead_body)
        after = subprocess.run(["pgrep", "-f", f"remote-debugging-port={dead}"], capture_output=True, text=True).stdout
        report["dead_browser_processes"] = {"before": before.split(), "after": after.split()}

    print(json.dumps(report, indent=1, default=str))


asyncio.run(main())
