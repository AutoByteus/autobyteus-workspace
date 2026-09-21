#!/usr/bin/env python3
"""Run one owned server launch and capture externally observed startup milestones."""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import pathlib
import signal
import subprocess
import time
import urllib.error
import urllib.request


def iso_now() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--worktree", required=True)
    parser.add_argument("--profile", required=True)
    parser.add_argument("--port", required=True, type=int)
    parser.add_argument("--run", required=True)
    parser.add_argument("--output-dir", required=True)
    args = parser.parse_args()

    worktree = pathlib.Path(args.worktree).resolve()
    profile = pathlib.Path(args.profile).resolve()
    output_dir = pathlib.Path(args.output_dir).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    log_path = output_dir / f"{args.run}-server.log"
    event_path = output_dir / f"{args.run}-observer.jsonl"
    summary_path = output_dir / f"{args.run}-summary.json"
    event_path.unlink(missing_ok=True)

    observer = output_dir / "full-startup-observer.mjs"
    server = worktree / "autobyteus-server-ts/dist/app.js"
    env = os.environ.copy()
    existing_node_options = env.get("NODE_OPTIONS", "").strip()
    preload = f"--import={observer}"
    env["NODE_OPTIONS"] = f"{existing_node_options} {preload}".strip()
    env["STARTUP_PROBE_OUTPUT"] = str(event_path)
    env["STARTUP_PROBE_WORKTREE"] = str(worktree)
    env["AUTOBYTEUS_SERVER_HOST"] = f"http://127.0.0.1:{args.port}"
    env["AUTOBYTEUS_MEMORY_DIR"] = str(profile / "memory")
    env["DB_NAME"] = str(profile / "db" / "production.db")
    env["DATABASE_URL"] = f"file:{profile / 'db' / 'production.db'}"

    command = [
        "node",
        str(server),
        "--data-dir",
        str(profile),
        "--host",
        "127.0.0.1",
        "--port",
        str(args.port),
    ]
    launched_at = iso_now()
    started = time.monotonic()
    health_attempts: list[dict[str, object]] = []
    health_status = None
    health_body = None
    process_exit_before_health = None

    with log_path.open("wb") as log:
        process = subprocess.Popen(
            command,
            cwd=worktree / "autobyteus-server-ts",
            env=env,
            stdout=log,
            stderr=subprocess.STDOUT,
            start_new_session=True,
        )
        try:
            deadline = started + 30.0
            while time.monotonic() < deadline:
                exit_code = process.poll()
                if exit_code is not None:
                    process_exit_before_health = exit_code
                    break
                attempt_started = time.monotonic()
                try:
                    with urllib.request.urlopen(
                        f"http://127.0.0.1:{args.port}/rest/health", timeout=0.5
                    ) as response:
                        body = response.read().decode("utf-8", errors="replace")
                        health_attempts.append(
                            {
                                "elapsedMs": round((time.monotonic() - started) * 1000, 3),
                                "durationMs": round((time.monotonic() - attempt_started) * 1000, 3),
                                "status": response.status,
                            }
                        )
                        if response.status == 200:
                            health_status = response.status
                            health_body = body
                            break
                except (urllib.error.URLError, TimeoutError, ConnectionError) as error:
                    health_attempts.append(
                        {
                            "elapsedMs": round((time.monotonic() - started) * 1000, 3),
                            "durationMs": round((time.monotonic() - attempt_started) * 1000, 3),
                            "errorType": type(error).__name__,
                        }
                    )
                time.sleep(0.05)

            first_health_ms = (
                round((time.monotonic() - started) * 1000, 3)
                if health_status == 200
                else None
            )
            # Allow asynchronous readiness/migration logging to settle without
            # issuing any provider or application operation.
            if health_status == 200:
                time.sleep(0.5)
        finally:
            if process.poll() is None:
                os.killpg(process.pid, signal.SIGTERM)
                try:
                    process.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    os.killpg(process.pid, signal.SIGKILL)
                    process.wait(timeout=5)

    events = []
    if event_path.exists():
        for line in event_path.read_text().splitlines():
            if line.strip():
                events.append(json.loads(line))

    summary = {
        "run": args.run,
        "port": args.port,
        "launchedAt": launched_at,
        "serverPid": process.pid,
        "firstHealthMs": first_health_ms,
        "healthStatus": health_status,
        "healthBody": health_body,
        "healthAttemptCount": len(health_attempts),
        "healthAttempts": health_attempts,
        "processExitBeforeHealth": process_exit_before_health,
        "finalExitCode": process.returncode,
        "observerEventCounts": {
            event_type: sum(1 for event in events if event.get("type") == event_type)
            for event_type in sorted({str(event.get("type")) for event in events})
        },
        "rawTraceReads": [event for event in events if event.get("type", "").startswith("raw-trace")],
        "externalFetches": [event for event in events if event.get("type") == "external-fetch"],
        "readiness": [event for event in events if event.get("type", "").startswith("readiness-")],
        "migrations": [event for event in events if event.get("type", "").startswith("app-data-migrations-")],
    }
    summary_path.write_text(json.dumps(summary, indent=2) + "\n")
    print(json.dumps(summary, indent=2))
    return 0 if health_status == 200 else 1


if __name__ == "__main__":
    raise SystemExit(main())
