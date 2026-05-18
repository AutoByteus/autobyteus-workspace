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
PROFESSOR_INSTRUCTIONS = (
    "You are Professor Agent. Explain concepts clearly, structure your answers, and check understanding."
)
STUDENT_INSTRUCTIONS = (
    "You are Student Agent. Ask concise follow-up questions and summarize what you learned."
)
TEAM_INSTRUCTIONS = (
    "You are the Professor Student Team coordinator. Route explanations to Professor and follow-up questions to Student."
)

NESTED_PROGRAM_MANAGER_AGENT_NAME = "Nested Program Manager Agent"
NESTED_REVIEW_LEAD_AGENT_NAME = "Nested Review Lead Agent"
NESTED_QA_SPECIALIST_AGENT_NAME = "Nested QA Specialist Agent"
NESTED_BUILD_SQUAD_TEAM_NAME = "Nested Build Squad Team"
NESTED_PARENT_TEAM_NAME = "Nested Mixed Runtime Delivery Team"
NESTED_COMMON_INSTRUCTIONS = """
You are participating in a seeded full-stack nested mixed-runtime team validation.

Rules:
1. Follow direct user instructions exactly.
2. Do not explore the environment or run diagnostics.
3. The only tool you may execute is send_message_to.
4. If the user asks you to call send_message_to with explicit JSON arguments, call send_message_to exactly once with those exact arguments and do not call any other tool.
5. If you receive a teammate message that asks for an exact token, reply in plain assistant text with that exact token and nothing else.
6. Do not use send_message_to unless the current direct user instruction explicitly provides JSON arguments for it.
7. Otherwise keep assistant text responses very short.
""".strip()
NESTED_BUILD_SQUAD_INSTRUCTIONS = (
    "Review Lead coordinates with QA Specialist for seeded nested team validation."
)
NESTED_PARENT_TEAM_INSTRUCTIONS = (
    "Program Manager delegates seeded validation tasks to the nested BuildSquad team."
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
    instructions: str,
    category: str = "seeded",
) -> str:
    definitions = client.execute(
        """
        query SeedAgentDefinitions {
          agentDefinitions {
            id
            name
            role
            description
            instructions
            category
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
        "instructions": instructions,
        "category": category,
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
        or current.get("instructions") != instructions
        or current.get("category") != category
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


def normalize_nodes(nodes: List[Dict[str, Any]]) -> List[tuple]:
    return sorted(
        [
            (
                node.get("memberName"),
                node.get("ref"),
                node.get("refType"),
                node.get("refScope"),
            )
            for node in nodes
        ]
    )


def ensure_team_definition(
    client: GraphqlClient,
    *,
    name: str,
    description: str,
    instructions: str,
    category: str,
    coordinator_member_name: str,
    nodes: List[Dict[str, Any]],
) -> str:
    teams = client.execute(
        """
        query SeedAgentTeamDefinitions {
          agentTeamDefinitions {
            id
            name
            description
            instructions
            category
            coordinatorMemberName
            nodes {
              memberName
              ref
              refType
              refScope
            }
          }
        }
        """
    ).get("agentTeamDefinitions") or []
    current = first_by_name(teams, name)

    if current is None:
        data = client.execute(
            """
            mutation SeedCreateTeam($input: CreateAgentTeamDefinitionInput!) {
              createAgentTeamDefinition(input: $input) { id name }
            }
            """,
            {
                "input": {
                    "name": name,
                    "description": description,
                    "instructions": instructions,
                    "category": category,
                    "coordinatorMemberName": coordinator_member_name,
                    "nodes": nodes,
                }
            },
        )
        team_id = str(data["createAgentTeamDefinition"]["id"])
        log(f"Team created: {name} (id={team_id})")
        return team_id

    update_needed = (
        current.get("description") != description
        or current.get("instructions") != instructions
        or current.get("category") != category
        or current.get("coordinatorMemberName") != coordinator_member_name
        or normalize_nodes(current.get("nodes") or []) != normalize_nodes(nodes)
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
                    "description": description,
                    "instructions": instructions,
                    "category": category,
                    "coordinatorMemberName": coordinator_member_name,
                    "nodes": nodes,
                }
            },
        )
        log(f"Team updated: {name} (id={current.get('id')})")
    else:
        log(f"Team unchanged: {name} (id={current.get('id')})")

    return str(current["id"])


def ensure_team(client: GraphqlClient, professor_agent_id: str, student_agent_id: str) -> None:
    ensure_team_definition(
        client,
        name=TEAM_NAME,
        description="Fixture team for Professor/Student communication tests.",
        instructions=TEAM_INSTRUCTIONS,
        category="seeded",
        coordinator_member_name="Professor",
        nodes=[
            {
                "memberName": "Professor",
                "ref": professor_agent_id,
                "refType": "AGENT",
                "refScope": "SHARED",
            },
            {
                "memberName": "Student",
                "ref": student_agent_id,
                "refType": "AGENT",
                "refScope": "SHARED",
            },
        ],
    )


def ensure_nested_mixed_team(
    client: GraphqlClient,
    *,
    program_manager_agent_id: str,
    review_lead_agent_id: str,
    qa_specialist_agent_id: str,
) -> None:
    child_team_id = ensure_team_definition(
        client,
        name=NESTED_BUILD_SQUAD_TEAM_NAME,
        description="Seeded nested child squad with Codex review lead and Claude QA specialist.",
        instructions=NESTED_BUILD_SQUAD_INSTRUCTIONS,
        category="seeded",
        coordinator_member_name="review_lead",
        nodes=[
            {
                "memberName": "review_lead",
                "ref": review_lead_agent_id,
                "refType": "AGENT",
                "refScope": "SHARED",
            },
            {
                "memberName": "qa_specialist",
                "ref": qa_specialist_agent_id,
                "refType": "AGENT",
                "refScope": "SHARED",
            },
        ],
    )

    ensure_team_definition(
        client,
        name=NESTED_PARENT_TEAM_NAME,
        description="Seeded full-stack fixture with AutoByteus parent and nested mixed-runtime BuildSquad.",
        instructions=NESTED_PARENT_TEAM_INSTRUCTIONS,
        category="seeded",
        coordinator_member_name="program_manager",
        nodes=[
            {
                "memberName": "program_manager",
                "ref": program_manager_agent_id,
                "refType": "AGENT",
                "refScope": "SHARED",
            },
            {
                "memberName": "BuildSquad",
                "ref": child_team_id,
                "refType": "AGENT_TEAM",
                "refScope": None,
            },
        ],
    )


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
        instructions=PROFESSOR_INSTRUCTIONS,
    )
    student_id = ensure_agent(
        client,
        name=STUDENT_AGENT_NAME,
        role="Student",
        description="Fixture student agent.",
        instructions=STUDENT_INSTRUCTIONS,
    )

    ensure_team(client, professor_agent_id=professor_id, student_agent_id=student_id)

    program_manager_id = ensure_agent(
        client,
        name=NESTED_PROGRAM_MANAGER_AGENT_NAME,
        role="Program Manager",
        description="Seeded AutoByteus parent coordinator for nested mixed-runtime full-stack validation.",
        instructions=NESTED_COMMON_INSTRUCTIONS,
    )
    review_lead_id = ensure_agent(
        client,
        name=NESTED_REVIEW_LEAD_AGENT_NAME,
        role="Review Lead",
        description="Seeded Codex child coordinator for nested mixed-runtime full-stack validation.",
        instructions=NESTED_COMMON_INSTRUCTIONS,
    )
    qa_specialist_id = ensure_agent(
        client,
        name=NESTED_QA_SPECIALIST_AGENT_NAME,
        role="QA Specialist",
        description="Seeded Claude child teammate for nested mixed-runtime full-stack validation.",
        instructions=NESTED_COMMON_INSTRUCTIONS,
    )
    ensure_nested_mixed_team(
        client,
        program_manager_agent_id=program_manager_id,
        review_lead_agent_id=review_lead_id,
        qa_specialist_agent_id=qa_specialist_id,
    )

    log("Fixture seed completed.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main(sys.argv[1:]))
    except Exception as error:  # noqa: BLE001
        print(f"error: {error}", file=sys.stderr)
        raise SystemExit(1)
