"""Temporary live probe: real AutoByteus remove-node confirm through the browser MCP over stdio.

Usage: uv run --frozen python mcp_electron_dialogs.py <control_port> <workspace>
"""
from __future__ import annotations

import asyncio
import json
import os
import sys
import time
from pathlib import Path

from mcp import ClientSession
from mcp.client.stdio import StdioServerParameters, stdio_client

MCP = "/Users/normy/autobyteus_org/autobyteus_mcps-project-testing-guideline/browser-automation/scripts/browser-mcp"


def value(call):
    if call.isError:
        return {"isError": True, "text": " ".join(getattr(c, "text", "") for c in call.content)}
    sc = call.structuredContent or {}
    return sc.get("result", sc) if "result" in sc and isinstance(sc.get("result"), dict) and "tab_id" in sc["result"] else sc


async def main() -> None:
    port, workspace = int(sys.argv[1]), Path(sys.argv[2])
    env = dict(os.environ, CHROME_REMOTE_DEBUGGING_PORT=str(port), BROWSER_AUTOMATION_ATTACH_ONLY="1",
               BROWSER_AUTOMATION_WORKSPACE=str(workspace))
    report: dict = {}
    params = StdioServerParameters(command="bash", args=[MCP], env=env, cwd=str(workspace))
    async with stdio_client(params, errlog=(workspace / "mcp.err").open("w")) as (r, w):
        async with ClientSession(r, w) as s:
            await s.initialize()
            tools = {t.name: t for t in (await s.list_tools()).tools}
            report["tools"] = sorted(tools)
            report["run_script_params"] = sorted(tools["run_script"].inputSchema["properties"])
            report["navigate_to_params"] = sorted(tools["navigate_to"].inputSchema["properties"])
            tab = value(await s.call_tool("attach_tab", {"url_contains": "/renderer/index.html"}))["tab_id"]

            async def script(src, **extra):
                return value(await s.call_tool("run_script", {"tab_id": tab, "script": src, **extra}))

            added = await script("""async () => {
                await __abDemo.type({ selector: "[data-testid=node-name-input]" }, "MCP Disposable Node");
                await __abDemo.type({ selector: "[data-testid=node-url-input]" }, "http://127.0.0.1:9");
                await __abDemo.click({ selector: "[data-testid=add-node-button]" });
                await new Promise(r => setTimeout(r, 3000));
                return [...document.querySelectorAll("[data-testid^=remove-node-]")].map(b => b.getAttribute("data-testid"));
            }""")
            report["added"] = added
            sel = f"[data-testid={added['result'][0]}]"
            click = f"async () => __abDemo.click({{ selector: '{sel}' }})"
            present = f"() => !!document.querySelector('{sel}')"
            report["plain_no_dialog"] = await script("1 + 1")
            began = time.monotonic()
            report["undecided"] = await script(click)
            report["undecided_seconds"] = round(time.monotonic() - began, 2)
            report["present_after_undecided"] = (await script(present))["result"]
            report["dismissed"] = await script(click, dialog="dismiss")
            report["present_after_dismiss"] = (await script(present))["result"]
            report["accepted"] = await script(click, dialog="accept")
            await asyncio.sleep(1.5)
            report["present_after_accept"] = (await script(present))["result"]
    print(json.dumps(report, indent=1, default=str))


asyncio.run(main())
