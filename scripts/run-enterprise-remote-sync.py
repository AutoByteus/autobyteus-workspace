#!/usr/bin/env python3
"""
Run full sync from the local embedded/registry node to discovered remote nodes.
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
    "PROMPT",
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
        with urllib.request.urlopen(request, timeout=15) as response:
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


def derive_discovery_base_url(graphql_url: str) -> str:
    normalized = graphql_url.rstrip("/")
    if normalized.endswith("/graphql"):
        normalized = normalized[: -len("/graphql")]
    return f"{normalized}/rest/node-discovery"


def fetch_self_node(discovery_base_url: str) -> Dict[str, str]:
    payload = request_json(f"{discovery_base_url}/self")
    node_id = str(payload.get("nodeId") or "").strip()
    base_url = str(payload.get("baseUrl") or "").strip()
    if not node_id or not base_url:
        raise RuntimeError(f"Invalid self discovery payload: {payload}")
    return {"nodeId": node_id, "baseUrl": base_url}


def normalize_targets(peers: List[Dict[str, Any]], source_node_id: str) -> List[Dict[str, str]]:
    targets: List[Dict[str, str]] = []
    seen: set[str] = set()
    for peer in peers:
        node_id = str(peer.get("nodeId") or "").strip()
        base_url = str(peer.get("baseUrl") or "").strip()
        status = str(peer.get("status") or "").strip().lower()
        if not node_id or not base_url:
            continue
        if node_id == source_node_id:
            continue
        if status and status not in {"ready"}:
            continue
        if node_id in seen:
            continue
        seen.add(node_id)
        targets.append({"nodeId": node_id, "baseUrl": base_url})
    return targets


def wait_for_targets(
    discovery_base_url: str,
    source_node_id: str,
    expected_remote_count: int,
    retries: int,
    retry_delay: float,
) -> List[Dict[str, str]]:
    last_count = 0
    for attempt in range(1, retries + 1):
        payload = request_json(f"{discovery_base_url}/peers")
        peers = payload.get("peers") or []
        if not isinstance(peers, list):
            peers = []
        targets = normalize_targets(peers, source_node_id)
        last_count = len(targets)
        if last_count >= expected_remote_count:
            log(f"Discovered {last_count} ready remote node(s).")
            return targets
        time.sleep(retry_delay)
        if attempt % 5 == 0:
            log(
                f"Waiting for remote discovery ({last_count}/{expected_remote_count} ready) "
                f"attempt {attempt}/{retries}..."
            )
    raise RuntimeError(
        f"Only {last_count} ready remote node(s) discovered after {retries} retries; "
        f"expected at least {expected_remote_count}."
    )


def run_full_sync(
    graphql_url: str,
    source: Dict[str, str],
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
            "source": source,
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
    parser = argparse.ArgumentParser(description="Run full sync from embedded node to discovered remotes.")
    parser.add_argument("--graphql-url", required=True, help="GraphQL endpoint URL, e.g. http://127.0.0.1:63362/graphql")
    parser.add_argument(
        "--discovery-base-url",
        default=None,
        help="Discovery REST base URL, e.g. http://127.0.0.1:63362/rest/node-discovery",
    )
    parser.add_argument(
        "--source-base-url",
        default="http://127.0.0.1:8000",
        help="Source endpoint base URL used by runNodeSync preflight from inside main container.",
    )
    parser.add_argument("--expected-remote-count", type=int, default=1, help="Minimum number of discovered ready remotes to wait for.")
    parser.add_argument("--retries", type=int, default=90, help="Discovery readiness retries.")
    parser.add_argument("--retry-delay", type=float, default=1.0, help="Seconds between retries.")
    return parser.parse_args(argv)


def main(argv: List[str]) -> int:
    args = parse_args(argv)
    if args.expected_remote_count < 1:
        raise RuntimeError("--expected-remote-count must be >= 1")
    discovery_base_url = args.discovery_base_url or derive_discovery_base_url(args.graphql_url)
    log(f"Discovery base URL: {discovery_base_url}")
    self_node = fetch_self_node(discovery_base_url)
    source = {
        "nodeId": self_node["nodeId"],
        "baseUrl": args.source_base_url.strip(),
    }
    if not source["baseUrl"]:
        raise RuntimeError("--source-base-url cannot be empty")
    log(
        f"Source node: {source['nodeId']} "
        f"(discovery={self_node['baseUrl']} sync={source['baseUrl']})"
    )
    targets = wait_for_targets(
        discovery_base_url,
        source_node_id=source["nodeId"],
        expected_remote_count=args.expected_remote_count,
        retries=args.retries,
        retry_delay=args.retry_delay,
    )
    result = run_full_sync(args.graphql_url, source, targets)

    status = str(result.get("status") or "").strip().lower()
    target_results = result.get("targetResults") or []
    failed_targets = [item for item in target_results if str(item.get("status") or "").lower() != "success"]
    if status != "success" or failed_targets:
        details = ", ".join(
            f"{item.get('targetNodeId')}:{item.get('status')}:{item.get('message') or 'no-message'}"
            for item in failed_targets
        )
        error_text = str(result.get("error") or "").strip()
        raise RuntimeError(
            f"runNodeSync status={status or 'unknown'} "
            f"error={error_text or 'none'} failed_targets=[{details}]"
        )

    log(f"runNodeSync completed successfully for {len(target_results)} target(s).")
    for item in target_results:
        summary = item.get("summary") or {}
        log(
            f"target={item.get('targetNodeId')} processed={summary.get('processed', 0)} "
            f"created={summary.get('created', 0)} updated={summary.get('updated', 0)} "
            f"deleted={summary.get('deleted', 0)} skipped={summary.get('skipped', 0)}"
        )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main(sys.argv[1:]))
    except Exception as error:  # noqa: BLE001
        print(f"error: {error}", file=sys.stderr)
        raise SystemExit(1)
