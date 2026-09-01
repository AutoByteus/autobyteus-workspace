#!/usr/bin/env python3
"""Run one live Codex app-server turn that must execute a failing shell command.

The probe records the app-server messages relevant to the command lifecycle so
the requirements investigation can compare the provider payload with
AutoByteus' normalized event.
"""

from __future__ import annotations

import json
import pathlib
import queue
import subprocess
import sys
import tempfile
import threading
import time
from typing import Any


OUTPUT_PATH = pathlib.Path(__file__).with_name(
    "codex-app-server-failed-command-raw.jsonl"
)
COMMAND = "/bin/bash -lc 'printf CODEX_FAILURE_STDERR_MARKER >&2; exit 23'"


def send(proc: subprocess.Popen[str], payload: dict[str, Any]) -> None:
    assert proc.stdin is not None
    proc.stdin.write(json.dumps(payload, separators=(",", ":")) + "\n")
    proc.stdin.flush()


def main() -> int:
    workspace = tempfile.mkdtemp(prefix="codex-failed-command-probe-")
    proc = subprocess.Popen(
        ["codex", "app-server"],
        cwd=workspace,
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        bufsize=1,
    )
    messages: queue.Queue[dict[str, Any]] = queue.Queue()
    stderr_lines: list[str] = []

    def read_stdout() -> None:
        assert proc.stdout is not None
        for line in proc.stdout:
            line = line.strip()
            if not line:
                continue
            try:
                messages.put(json.loads(line))
            except json.JSONDecodeError:
                messages.put({"invalidJsonLine": line})

    def read_stderr() -> None:
        assert proc.stderr is not None
        for line in proc.stderr:
            stderr_lines.append(line.rstrip("\n"))

    threading.Thread(target=read_stdout, daemon=True).start()
    threading.Thread(target=read_stderr, daemon=True).start()

    retained: list[dict[str, Any]] = []

    def next_message(timeout: float = 120.0) -> dict[str, Any]:
        try:
            message = messages.get(timeout=timeout)
        except queue.Empty as exc:
            raise TimeoutError("Timed out waiting for Codex app-server output") from exc
        method = message.get("method")
        params = message.get("params") if isinstance(message.get("params"), dict) else {}
        item = params.get("item") if isinstance(params.get("item"), dict) else {}
        if (
            method in {
                "item/started",
                "item/completed",
                "item/commandExecution/outputDelta",
                "turn/started",
                "turn/completed",
                "error",
            }
            or item.get("type") == "commandExecution"
        ):
            retained.append(message)
        return message

    def wait_response(request_id: int) -> dict[str, Any]:
        while True:
            message = next_message()
            if message.get("id") == request_id and (
                "result" in message or "error" in message
            ):
                return message
            # The requested policy should avoid approvals. If Codex asks anyway,
            # accept so the probe can complete and preserve the request evidence.
            if "id" in message and "method" in message:
                send(
                    proc,
                    {"jsonrpc": "2.0", "id": message["id"], "result": {"decision": "accept"}},
                )

    try:
        send(
            proc,
            {
                "jsonrpc": "2.0",
                "id": 1,
                "method": "initialize",
                "params": {
                    "clientInfo": {
                        "name": "autobyteus-requirements-probe",
                        "version": "0.1.0",
                    },
                    "capabilities": {"experimentalApi": True},
                },
            },
        )
        initialize_response = wait_response(1)
        if "error" in initialize_response:
            raise RuntimeError(initialize_response["error"])
        send(proc, {"jsonrpc": "2.0", "method": "initialized", "params": {}})

        send(
            proc,
            {
                "jsonrpc": "2.0",
                "id": 2,
                "method": "thread/start",
                "params": {
                    "cwd": workspace,
                    "approvalPolicy": "never",
                    "sandbox": "workspace-write",
                    "ephemeral": True,
                    "experimentalRawEvents": True,
                },
            },
        )
        thread_response = wait_response(2)
        if "error" in thread_response:
            raise RuntimeError(thread_response["error"])
        thread_id = thread_response["result"]["thread"]["id"]

        prompt = (
            "Use the shell command tool exactly once to execute this exact command: "
            f"{COMMAND}. Do not replace it, do not retry it, and do not run any other "
            "command. After it fails, reply briefly that the requested probe completed."
        )
        send(
            proc,
            {
                "jsonrpc": "2.0",
                "id": 3,
                "method": "turn/start",
                "params": {
                    "threadId": thread_id,
                    "input": [{"type": "text", "text": prompt}],
                    "effort": "low",
                },
            },
        )
        turn_response = wait_response(3)
        if "error" in turn_response:
            raise RuntimeError(turn_response["error"])
        turn_id = turn_response["result"]["turn"]["id"]

        deadline = time.monotonic() + 180
        while time.monotonic() < deadline:
            message = next_message(timeout=max(1.0, deadline - time.monotonic()))
            if message.get("method") == "turn/completed":
                params = message.get("params", {})
                turn = params.get("turn", {}) if isinstance(params, dict) else {}
                if turn.get("id") == turn_id:
                    break
        else:
            raise TimeoutError("Timed out waiting for turn/completed")

        OUTPUT_PATH.write_text(
            "".join(json.dumps(row, sort_keys=True) + "\n" for row in retained),
            encoding="utf-8",
        )
        print(json.dumps({
            "workspace": workspace,
            "threadId": thread_id,
            "turnId": turn_id,
            "command": COMMAND,
            "outputPath": str(OUTPUT_PATH),
            "retainedMessageCount": len(retained),
            "appServerStderrTail": stderr_lines[-5:],
        }, indent=2))
        return 0
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=10)
        except subprocess.TimeoutExpired:
            proc.kill()
            proc.wait(timeout=5)


if __name__ == "__main__":
    sys.exit(main())
