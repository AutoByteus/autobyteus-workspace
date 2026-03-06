#!/usr/bin/env python3
"""
Run full sync from main all-in-one node to one or more remote-server containers.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
import urllib.error
import urllib.request
from typing import Any, Dict, List

DEFAULT_SCOPE = [
    "AGENT_DEFINITION",
    "AGENT_TEAM_DEFINITION",
    "MCP_SERVER_CONFIGURATION",
]


def log(message: str) -> None:
    print(f"[sync] {message}")


def request_json(url: str, payload: Dict[str, Any] | None = None) -> Dict[str, Any]:
    data = None
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        url=url,
        data=data,
        method="POST" if data is not None else "GET",
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        body = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {error.code} from {url}: {body}") from error
    except urllib.error.URLError as error:
        raise RuntimeError(f"Request failed for {url}: {error}") from error


def graphql_request(url: str, query: str, variables: Dict[str, Any] | None = None) -> Dict[str, Any]:
    response = request_json(url, {"query": query, "variables": variables or {}})
    errors = response.get("errors") or []
    if errors:
        first = errors[0]
        raise RuntimeError(f"GraphQL error: {first.get('message') or first}")
    data = response.get("data")
    if not isinstance(data, dict):
        raise RuntimeError("GraphQL response missing data payload.")
    return data


def build_targets(project: str, remote_count: int, service_name: str) -> List[Dict[str, str]]:
    targets: List[Dict[str, str]] = []
    for i in range(1, remote_count + 1):
        host = f"{project}-{service_name}-{i}"
        targets.append(
            {
                "nodeId": f"remote-{i}",
                "baseUrl": f"http://{host}:8000",
            }
        )
    return targets


def run_full_sync(
    graphql_url: str,
    source_node_id: str,
    source_base_url: str,
    targets: List[Dict[str, str]],
) -> Dict[str, Any]:
    mutation = """
      mutation RunNodeSync($input: RunNodeSyncInput!) {
        runNodeSync(input: $input) {
          status
          sourceNodeId
          error
          targetResults {
            targetNodeId
            status
            message
            summary {
              processed
              created
              updated
              deleted
              skipped
            }
          }
        }
      }
    """
    variables = {
        "input": {
            "source": {"nodeId": source_node_id, "baseUrl": source_base_url},
            "targets": targets,
            "scope": DEFAULT_SCOPE,
            "selection": None,
            "conflictPolicy": "SOURCE_WINS",
            "tombstonePolicy": "SOURCE_DELETE_WINS",
        }
    }
    data = graphql_request(graphql_url, mutation, variables)
    result = data.get("runNodeSync")
    if not isinstance(result, dict):
        raise RuntimeError(f"Unexpected runNodeSync response: {data}")
    return result


def parse_args(argv: List[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run full sync from main node to remote containers.")
    parser.add_argument("--graphql-url", required=True, help="GraphQL endpoint URL")
    parser.add_argument("--project", required=True, help="Compose project name")
    parser.add_argument("--remote-count", type=int, default=1, help="Remote server count")
    parser.add_argument("--remote-service", default="remote-server")
    parser.add_argument("--source-node-id", default="main-allinone")
    parser.add_argument("--source-base-url", default="http://127.0.0.1:8000")
    parser.add_argument("--retries", type=int, default=90)
    parser.add_argument("--retry-delay", type=float, default=1.0)
    return parser.parse_args(argv)


def main(argv: List[str]) -> int:
    args = parse_args(argv)

    if args.remote_count < 1:
        raise RuntimeError("--remote-count must be >= 1")

    targets = build_targets(args.project, args.remote_count, args.remote_service)
    last_error: Exception | None = None

    for attempt in range(1, args.retries + 1):
        try:
            result = run_full_sync(
                graphql_url=args.graphql_url,
                source_node_id=args.source_node_id,
                source_base_url=args.source_base_url,
                targets=targets,
            )
            status = str(result.get("status") or "").lower()
            target_results = result.get("targetResults") or []
            failed = [r for r in target_results if str(r.get("status") or "").lower() != "success"]
            if status == "success" and not failed:
                log(f"runNodeSync completed successfully for {len(target_results)} target(s).")
                for item in target_results:
                    summary = item.get("summary") or {}
                    log(
                        "target=%s processed=%s created=%s updated=%s deleted=%s skipped=%s"
                        % (
                            item.get("targetNodeId"),
                            summary.get("processed", 0),
                            summary.get("created", 0),
                            summary.get("updated", 0),
                            summary.get("deleted", 0),
                            summary.get("skipped", 0),
                        )
                    )
                return 0
            raise RuntimeError(f"runNodeSync status={status} details={result}")
        except Exception as error:  # noqa: BLE001
            last_error = error
            if attempt % 5 == 0:
                log(f"Waiting for remotes sync readiness attempt {attempt}/{args.retries}: {error}")
            time.sleep(args.retry_delay)

    raise RuntimeError(f"Remote full sync failed after {args.retries} retries: {last_error}")


if __name__ == "__main__":
    try:
        raise SystemExit(main(sys.argv[1:]))
    except Exception as error:  # noqa: BLE001
        print(f"error: {error}", file=sys.stderr)
        raise SystemExit(1)
