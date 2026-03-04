#!/usr/bin/env python3
"""
Seed deterministic test fixtures into a running AutoByteus backend via GraphQL.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from dataclasses import dataclass
from typing import Any, Dict, List, Optional
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

PROFESSOR_AGENT_NAME = "Professor Agent"
STUDENT_AGENT_NAME = "Student Agent"
TEAM_NAME = "Professor Student Team"
SEED_PROMPT_CATEGORY = "Seeded Agents"
PROFESSOR_PROMPT_NAME = "Professor Agent Prompt"
STUDENT_PROMPT_NAME = "Student Agent Prompt"
PROFESSOR_PROMPT_CONTENT = (
    "You are Professor Agent. Explain concepts clearly, structure your answers, and check understanding."
)
STUDENT_PROMPT_CONTENT = (
    "You are Student Agent. Ask concise follow-up questions and summarize what you learned."
)


def log(message: str) -> None:
    print(message, flush=True)


class GraphqlError(RuntimeError):
    pass


@dataclass
class GraphqlClient:
    endpoint: str

    def execute(self, query: str, variables: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        payload = {"query": query, "variables": variables or {}}
        req = Request(
            self.endpoint,
            data=json.dumps(payload).encode("utf-8"),
            headers={"content-type": "application/json"},
            method="POST",
        )
        try:
            with urlopen(req, timeout=10) as response:
                body = response.read()
        except HTTPError as error:
            detail = error.read().decode("utf-8", errors="replace")
            raise GraphqlError(f"GraphQL HTTP error {error.code}: {detail}") from error
        except URLError as error:
            raise GraphqlError(f"GraphQL connection error: {error}") from error

        try:
            parsed = json.loads(body.decode("utf-8"))
        except json.JSONDecodeError as error:
            raise GraphqlError(f"Invalid JSON from GraphQL endpoint: {error}") from error

        errors = parsed.get("errors")
        if errors:
            messages = "; ".join(
                str(item.get("message", "unknown GraphQL error"))
                for item in errors
                if isinstance(item, dict)
            )
            raise GraphqlError(messages or "Unknown GraphQL errors")

        data = parsed.get("data")
        if not isinstance(data, dict):
            raise GraphqlError("GraphQL response missing data object")
        return data


def wait_for_backend(client: GraphqlClient, retries: int, delay_seconds: float) -> None:
    health_query = "query SeedHealth { __typename }"
    last_error: Optional[Exception] = None
    for _ in range(retries):
        try:
            client.execute(health_query)
            return
        except Exception as error:  # noqa: BLE001
            last_error = error
            time.sleep(delay_seconds)
    raise RuntimeError(f"Backend GraphQL endpoint not ready: {last_error}")


def first_by_name(entries: List[Dict[str, Any]], name: str) -> Optional[Dict[str, Any]]:
    for entry in entries:
        if entry.get("name") == name:
            return entry
    return None


def ensure_agent(
    client: GraphqlClient,
    *,
    name: str,
    role: str,
    description: str,
) -> str:
    definitions = client.execute(
        """
        query SeedAgentDefinitions {
          agentDefinitions {
            id
            name
            role
            description
            toolNames
          }
        }
        """
    ).get("agentDefinitions") or []
    current = first_by_name(definitions, name)

    expected_tool_names = ["send_message_to"]
    expected = {
        "name": name,
        "role": role,
        "description": description,
        "toolNames": expected_tool_names,
    }

    if current is None:
        data = client.execute(
            """
            mutation SeedCreateAgentDefinition($input: CreateAgentDefinitionInput!) {
              createAgentDefinition(input: $input) { id name }
            }
            """,
            {
                "input": {
                    **expected,
                    "inputProcessorNames": [],
                    "llmResponseProcessorNames": [],
                    "systemPromptProcessorNames": [],
                    "toolExecutionResultProcessorNames": [],
                    "toolInvocationPreprocessorNames": [],
                    "lifecycleProcessorNames": [],
                    "skillNames": [],
                }
            },
        )
        created = data["createAgentDefinition"]
        agent_id = str(created["id"])
        log(f"Agent created: {name} (id={agent_id})")
        return agent_id

    update_needed = (
        current.get("role") != role
        or current.get("description") != description
        or sorted(current.get("toolNames") or []) != sorted(expected_tool_names)
    )
    if update_needed:
        client.execute(
            """
            mutation SeedUpdateAgentDefinition($input: UpdateAgentDefinitionInput!) {
              updateAgentDefinition(input: $input) { id name }
            }
            """,
            {
                "input": {
                    "id": current.get("id"),
                    **expected,
                    "inputProcessorNames": [],
                    "llmResponseProcessorNames": [],
                    "systemPromptProcessorNames": [],
                    "toolExecutionResultProcessorNames": [],
                    "toolInvocationPreprocessorNames": [],
                    "lifecycleProcessorNames": [],
                    "skillNames": [],
                }
            },
        )
        log(f"Agent updated: {name} (id={current.get('id')})")
    else:
        log(f"Agent unchanged: {name} (id={current.get('id')})")

    return str(current["id"])


def ensure_team(client: GraphqlClient, professor_agent_id: str, student_agent_id: str) -> None:
    teams = client.execute(
        """
        query SeedAgentTeamDefinitions {
          agentTeamDefinitions {
            id
            name
            description
            coordinatorMemberName
            nodes {
              memberName
              referenceId
              referenceType
            }
          }
        }
        """
    ).get("agentTeamDefinitions") or []
    current = first_by_name(teams, TEAM_NAME)

    expected_nodes = [
        {
            "memberName": "Professor",
            "referenceId": professor_agent_id,
            "referenceType": "AGENT",
        },
        {
            "memberName": "Student",
            "referenceId": student_agent_id,
            "referenceType": "AGENT",
        },
    ]
    expected_description = "Fixture team for Professor/Student communication tests."
    expected_coordinator = "Professor"

    if current is None:
        client.execute(
            """
            mutation SeedCreateTeam($input: CreateAgentTeamDefinitionInput!) {
              createAgentTeamDefinition(input: $input) { id name }
            }
            """,
            {
                "input": {
                    "name": TEAM_NAME,
                    "description": expected_description,
                    "coordinatorMemberName": expected_coordinator,
                    "nodes": expected_nodes,
                }
            },
        )
        log(f"Team created: {TEAM_NAME}")
        return

    nodes_normalized = sorted(
        [
            (
                node.get("memberName"),
                node.get("referenceId"),
                node.get("referenceType"),
            )
            for node in (current.get("nodes") or [])
        ]
    )
    expected_nodes_normalized = sorted(
        [(node["memberName"], node["referenceId"], node["referenceType"]) for node in expected_nodes]
    )

    update_needed = (
        current.get("description") != expected_description
        or current.get("coordinatorMemberName") != expected_coordinator
        or nodes_normalized != expected_nodes_normalized
    )

    if update_needed:
        client.execute(
            """
            mutation SeedUpdateTeam($input: UpdateAgentTeamDefinitionInput!) {
              updateAgentTeamDefinition(input: $input) { id name }
            }
            """,
            {
                "input": {
                    "id": current.get("id"),
                    "description": expected_description,
                    "coordinatorMemberName": expected_coordinator,
                    "nodes": expected_nodes,
                }
            },
        )
        log(f"Team updated: {TEAM_NAME} (id={current.get('id')})")
    else:
        log(f"Team unchanged: {TEAM_NAME} (id={current.get('id')})")


def ensure_prompt(
    client: GraphqlClient,
    *,
    name: str,
    category: str,
    prompt_content: str,
) -> str:
    prompts = client.execute(
        """
        query SeedPrompts {
          prompts {
            id
            name
            category
            promptContent
            version
            isActive
          }
        }
        """
    ).get("prompts") or []

    family = [
        prompt
        for prompt in prompts
        if prompt.get("name") == name and prompt.get("category") == category
    ]

    if not family:
        created = client.execute(
            """
            mutation SeedCreatePrompt($input: CreatePromptInput!) {
              createPrompt(input: $input) { id name category version isActive }
            }
            """,
            {
                "input": {
                    "name": name,
                    "category": category,
                    "promptContent": prompt_content,
                }
            },
        )["createPrompt"]
        prompt_id = str(created["id"])
        log(f"Prompt created: {category}/{name} (id={prompt_id}, version={created.get('version')})")
        return prompt_id

    active_prompt = next((prompt for prompt in family if prompt.get("isActive")), None)
    if active_prompt is None:
        active_prompt = max(
            family,
            key=lambda prompt: int(prompt.get("version") or 0),
        )

    if active_prompt.get("promptContent") == prompt_content:
        prompt_id = str(active_prompt["id"])
        log(
            f"Prompt unchanged: {category}/{name} (id={prompt_id}, version={active_prompt.get('version')})"
        )
        return prompt_id

    revised = client.execute(
        """
        mutation SeedAddNewPromptRevision($input: AddNewPromptRevisionInput!) {
          addNewPromptRevision(input: $input) { id version isActive }
        }
        """,
        {
            "input": {
                "id": str(active_prompt["id"]),
                "newPromptContent": prompt_content,
            }
        },
    )["addNewPromptRevision"]

    client.execute(
        """
        mutation SeedMarkActivePrompt($input: MarkActivePromptInput!) {
          markActivePrompt(input: $input) { id isActive }
        }
        """,
        {"input": {"id": str(revised["id"])}},
    )

    prompt_id = str(revised["id"])
    log(f"Prompt updated: {category}/{name} (id={prompt_id}, version={revised.get('version')})")
    return prompt_id


def parse_args(argv: List[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Seed personal Docker test fixtures.")
    parser.add_argument("--graphql-url", required=True, help="GraphQL endpoint URL")
    parser.add_argument("--wait-retries", type=int, default=60)
    parser.add_argument("--wait-delay", type=float, default=1.0)
    return parser.parse_args(argv)


def main(argv: List[str]) -> int:
    args = parse_args(argv)
    client = GraphqlClient(endpoint=args.graphql_url)

    wait_for_backend(client, retries=args.wait_retries, delay_seconds=args.wait_delay)

    professor_id = ensure_agent(
        client,
        name=PROFESSOR_AGENT_NAME,
        role="Professor",
        description="Fixture professor agent.",
    )
    student_id = ensure_agent(
        client,
        name=STUDENT_AGENT_NAME,
        role="Student",
        description="Fixture student agent.",
    )

    ensure_team(client, professor_agent_id=professor_id, student_agent_id=student_id)
    ensure_prompt(
        client,
        name=PROFESSOR_PROMPT_NAME,
        category=SEED_PROMPT_CATEGORY,
        prompt_content=PROFESSOR_PROMPT_CONTENT,
    )
    ensure_prompt(
        client,
        name=STUDENT_PROMPT_NAME,
        category=SEED_PROMPT_CATEGORY,
        prompt_content=STUDENT_PROMPT_CONTENT,
    )

    log("Fixture seed completed.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main(sys.argv[1:]))
    except Exception as error:  # noqa: BLE001
        print(f"error: {error}", file=sys.stderr)
        raise SystemExit(1)
