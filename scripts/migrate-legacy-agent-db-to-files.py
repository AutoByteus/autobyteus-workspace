#!/usr/bin/env python3
"""
Migrate legacy SQLite-backed agent/team definitions into md-centric filesystem definitions.

Legacy source tables:
  - agent_definitions
  - prompts
  - agent_prompt_mappings
  - agent_team_definitions

Output layout under data root:
  - agents/<agent-id>/agent.md
  - agents/<agent-id>/agent-config.json
  - agent-teams/<team-id>/team.md
  - agent-teams/<team-id>/team-config.json

Usage:
  # Dry-run (no file writes)
  python3 scripts/migrate-legacy-agent-db-to-files.py \
    --mode dry-run \
    --db-path /path/to/production.db \
    --data-root /path/to/server-data

  # Apply migration
  python3 scripts/migrate-legacy-agent-db-to-files.py \
    --mode apply \
    --db-path /path/to/production.db \
    --data-root /path/to/server-data

  # Overwrite existing definition files (optional)
  python3 scripts/migrate-legacy-agent-db-to-files.py \
    --mode apply \
    --overwrite-existing \
    --db-path /path/to/production.db \
    --data-root /path/to/server-data
"""

from __future__ import annotations

import argparse
import json
import re
import sqlite3
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


def slugify(value: str, fallback: str) -> str:
    normalized = re.sub(r"[_\s]+", "-", value.strip().lower())
    normalized = re.sub(r"[^a-z0-9-]", "", normalized)
    normalized = re.sub(r"-+", "-", normalized).strip("-")
    return normalized or fallback


def parse_json_array(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return [str(v) for v in value if isinstance(v, str)]
    if not isinstance(value, str):
        return []
    try:
        parsed = json.loads(value)
    except Exception:
        return []
    if not isinstance(parsed, list):
        return []
    return [str(v) for v in parsed if isinstance(v, str)]


def sanitize_frontmatter_value(value: str) -> str:
    return value.replace("\r\n", " ").replace("\n", " ").strip()


def serialize_agent_md(*, name: str, description: str, role: str | None, instructions: str) -> str:
    lines = [
        "---",
        f"name: {sanitize_frontmatter_value(name)}",
        f"description: {sanitize_frontmatter_value(description)}",
    ]
    if role:
        lines.append(f"role: {sanitize_frontmatter_value(role)}")
    lines.append("---")
    lines.append("")
    lines.append(instructions)
    return "\n".join(lines)


def serialize_team_md(*, name: str, description: str, category: str | None, instructions: str) -> str:
    lines = [
        "---",
        f"name: {sanitize_frontmatter_value(name)}",
        f"description: {sanitize_frontmatter_value(description)}",
    ]
    if category:
        lines.append(f"category: {sanitize_frontmatter_value(category)}")
    lines.append("---")
    lines.append("")
    lines.append(instructions)
    return "\n".join(lines)


@dataclass
class MigrationStats:
    agent_total: int = 0
    team_total: int = 0
    agent_created: int = 0
    team_created: int = 0
    agent_skipped_existing: int = 0
    team_skipped_existing: int = 0
    warnings: list[str] = field(default_factory=list)


class LegacyDbToFileMigrator:
    def __init__(
        self,
        *,
        db_path: Path,
        data_root: Path,
        apply: bool,
        overwrite_existing: bool,
    ) -> None:
        self.db_path = db_path
        self.data_root = data_root
        self.apply = apply
        self.overwrite_existing = overwrite_existing
        self.agents_dir = data_root / "agents"
        self.teams_dir = data_root / "agent-teams"
        self.stats = MigrationStats()

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(str(self.db_path))
        connection.row_factory = sqlite3.Row
        return connection

    def _assert_required_tables(self, connection: sqlite3.Connection) -> None:
        names = {
            row[0]
            for row in connection.execute(
                "SELECT name FROM sqlite_master WHERE type='table'"
            ).fetchall()
        }
        required = {
            "agent_definitions",
            "prompts",
            "agent_prompt_mappings",
            "agent_team_definitions",
        }
        missing = sorted(required - names)
        if missing:
            raise RuntimeError(f"Required legacy table(s) missing: {', '.join(missing)}")

    def _load_prompts(self, connection: sqlite3.Connection) -> dict[tuple[str, str], list[sqlite3.Row]]:
        grouped: dict[tuple[str, str], list[sqlite3.Row]] = {}
        rows = connection.execute(
            """
            SELECT id, name, category, prompt_content, version, is_active
            FROM prompts
            ORDER BY name ASC, category ASC, is_active DESC, version DESC, id DESC
            """
        ).fetchall()
        for row in rows:
            key = (str(row["name"]), str(row["category"]))
            grouped.setdefault(key, []).append(row)
        return grouped

    def _load_prompt_mappings(self, connection: sqlite3.Connection) -> dict[int, list[sqlite3.Row]]:
        grouped: dict[int, list[sqlite3.Row]] = {}
        rows = connection.execute(
            """
            SELECT id, agent_definition_id, prompt_name, prompt_category
            FROM agent_prompt_mappings
            ORDER BY agent_definition_id ASC, id ASC
            """
        ).fetchall()
        for row in rows:
            grouped.setdefault(int(row["agent_definition_id"]), []).append(row)
        return grouped

    def _resolve_instructions(
        self,
        *,
        agent_row: sqlite3.Row,
        mapping_rows: list[sqlite3.Row],
        prompts_by_key: dict[tuple[str, str], list[sqlite3.Row]],
    ) -> str:
        agent_name = str(agent_row["name"])
        if not mapping_rows:
            self.stats.warnings.append(
                f"Agent '{agent_name}' has no prompt mapping; falling back to description."
            )
            return str(agent_row["description"] or "")

        mapping = mapping_rows[0]
        key = (str(mapping["prompt_name"]), str(mapping["prompt_category"]))
        candidates = prompts_by_key.get(key, [])
        if not candidates:
            self.stats.warnings.append(
                f"Agent '{agent_name}' mapping points to missing prompt {key}; falling back to description."
            )
            return str(agent_row["description"] or "")

        active = [row for row in candidates if int(row["is_active"] or 0) == 1]
        selected = active[0] if active else candidates[0]
        if not active:
            self.stats.warnings.append(
                f"Agent '{agent_name}' has no active prompt for {key}; using highest version fallback."
            )
        return str(selected["prompt_content"] or "")

    def _next_available_id(self, base: str, used: set[str]) -> str:
        if base not in used:
            used.add(base)
            return base
        suffix = 2
        while True:
            candidate = f"{base}-{suffix}"
            if candidate not in used:
                used.add(candidate)
                return candidate
            suffix += 1

    def _build_agent_id_map(self, agent_rows: list[sqlite3.Row]) -> dict[int, str]:
        existing_ids = {
            entry.name for entry in self.agents_dir.iterdir() if entry.is_dir()
        } if self.agents_dir.exists() else set()
        used = set(existing_ids)
        result: dict[int, str] = {}
        for row in agent_rows:
            old_id = int(row["id"])
            base = slugify(str(row["name"]), "agent")
            # If base exists and overwrite is disabled, keep existing folder mapping.
            if base in existing_ids and not self.overwrite_existing:
                result[old_id] = base
                used.add(base)
                continue
            result[old_id] = self._next_available_id(base, used)
        return result

    def _build_team_id_map(self, team_rows: list[sqlite3.Row]) -> dict[int, str]:
        existing_ids = {
            entry.name for entry in self.teams_dir.iterdir() if entry.is_dir()
        } if self.teams_dir.exists() else set()
        used = set(existing_ids)
        result: dict[int, str] = {}
        for row in team_rows:
            old_id = int(row["id"])
            base = slugify(str(row["name"]), "team")
            if base in existing_ids and not self.overwrite_existing:
                result[old_id] = base
                used.add(base)
                continue
            result[old_id] = self._next_available_id(base, used)
        return result

    def _write_if_needed(self, path: Path, content: str) -> None:
        if self.apply:
            path.write_text(content, encoding="utf-8")

    def _write_json_if_needed(self, path: Path, payload: dict[str, Any]) -> None:
        if self.apply:
            text = json.dumps(payload, ensure_ascii=False, indent=2) + "\n"
            path.write_text(text, encoding="utf-8")

    def _migrate_agents(
        self,
        *,
        agent_rows: list[sqlite3.Row],
        agent_id_map: dict[int, str],
        prompt_mappings: dict[int, list[sqlite3.Row]],
        prompts_by_key: dict[tuple[str, str], list[sqlite3.Row]],
    ) -> None:
        self.stats.agent_total = len(agent_rows)

        for row in agent_rows:
            old_id = int(row["id"])
            new_id = agent_id_map[old_id]
            agent_dir = self.agents_dir / new_id
            md_path = agent_dir / "agent.md"
            cfg_path = agent_dir / "agent-config.json"

            if not self.overwrite_existing and (md_path.exists() or cfg_path.exists()):
                self.stats.agent_skipped_existing += 1
                continue

            instructions = self._resolve_instructions(
                agent_row=row,
                mapping_rows=prompt_mappings.get(old_id, []),
                prompts_by_key=prompts_by_key,
            )

            md_content = serialize_agent_md(
                name=str(row["name"]),
                description=str(row["description"] or ""),
                role=str(row["role"]) if row["role"] else None,
                instructions=instructions,
            )
            cfg_payload = {
                "toolNames": parse_json_array(row["tool_names"]),
                "skillNames": parse_json_array(row["skill_names"]),
                "inputProcessorNames": parse_json_array(row["input_processor_names"]),
                "llmResponseProcessorNames": parse_json_array(row["llm_response_processor_names"]),
                "systemPromptProcessorNames": parse_json_array(row["system_prompt_processor_names"]),
                "toolExecutionResultProcessorNames": parse_json_array(
                    row["tool_execution_result_processor_names"]
                ),
                "toolInvocationPreprocessorNames": parse_json_array(
                    row["tool_invocation_preprocessor_names"]
                ),
                "lifecycleProcessorNames": parse_json_array(row["lifecycle_processor_names"]),
                "avatarUrl": row["avatar_url"],
            }

            if self.apply:
                agent_dir.mkdir(parents=True, exist_ok=True)
            self._write_if_needed(md_path, md_content)
            self._write_json_if_needed(cfg_path, cfg_payload)
            self.stats.agent_created += 1

    def _parse_legacy_nodes(self, raw_nodes: Any) -> list[dict[str, Any]]:
        if not isinstance(raw_nodes, str) or not raw_nodes.strip():
            return []
        try:
            parsed = json.loads(raw_nodes)
        except Exception:
            return []
        if not isinstance(parsed, list):
            return []
        return [entry for entry in parsed if isinstance(entry, dict)]

    def _normalize_ref_type(self, value: Any) -> str | None:
        if not isinstance(value, str):
            return None
        upper = value.strip().upper()
        if upper in {"AGENT", "agent".upper()}:
            return "agent"
        if upper in {"AGENT_TEAM", "TEAM", "agent_team".upper()}:
            return "agent_team"
        return None

    def _parse_int(self, value: Any) -> int | None:
        if isinstance(value, int):
            return value
        if isinstance(value, str) and value.strip().isdigit():
            return int(value.strip())
        return None

    def _rewrite_team_members(
        self,
        legacy_nodes: list[dict[str, Any]],
        *,
        agent_id_map: dict[int, str],
        team_id_map: dict[int, str],
        team_name: str,
    ) -> list[dict[str, str]]:
        members: list[dict[str, str]] = []

        for index, node in enumerate(legacy_nodes, start=1):
            member_name = node.get("member_name") or node.get("memberName") or f"member-{index}"
            raw_ref_type = node.get("reference_type") or node.get("referenceType") or node.get("refType")
            ref_type = self._normalize_ref_type(raw_ref_type)
            raw_ref = node.get("reference_id") or node.get("referenceId") or node.get("ref")

            if not ref_type:
                self.stats.warnings.append(
                    f"Team '{team_name}' member '{member_name}' has unknown refType '{raw_ref_type}', skipping."
                )
                continue

            parsed_ref = self._parse_int(raw_ref)
            if ref_type == "agent":
                if parsed_ref is not None and parsed_ref in agent_id_map:
                    ref = agent_id_map[parsed_ref]
                elif isinstance(raw_ref, str) and raw_ref.strip():
                    ref = raw_ref.strip()
                else:
                    self.stats.warnings.append(
                        f"Team '{team_name}' member '{member_name}' has unresolved agent ref '{raw_ref}', skipping."
                    )
                    continue
            else:
                if parsed_ref is not None and parsed_ref in team_id_map:
                    ref = team_id_map[parsed_ref]
                elif isinstance(raw_ref, str) and raw_ref.strip():
                    ref = raw_ref.strip()
                else:
                    self.stats.warnings.append(
                        f"Team '{team_name}' member '{member_name}' has unresolved team ref '{raw_ref}', skipping."
                    )
                    continue

            members.append({
                "memberName": str(member_name),
                "ref": ref,
                "refType": ref_type,
            })

        return members

    def _migrate_teams(
        self,
        *,
        team_rows: list[sqlite3.Row],
        team_id_map: dict[int, str],
        agent_id_map: dict[int, str],
    ) -> None:
        self.stats.team_total = len(team_rows)

        for row in team_rows:
            old_id = int(row["id"])
            new_id = team_id_map[old_id]
            team_dir = self.teams_dir / new_id
            md_path = team_dir / "team.md"
            cfg_path = team_dir / "team-config.json"

            if not self.overwrite_existing and (md_path.exists() or cfg_path.exists()):
                self.stats.team_skipped_existing += 1
                continue

            team_name = str(row["name"])
            description = str(row["description"] or "")
            category = str(row["role"]) if row["role"] else None
            instructions = (
                description
                if description
                else "Migrated legacy team definition. Please update team instructions."
            )
            legacy_nodes = self._parse_legacy_nodes(row["nodes"])
            members = self._rewrite_team_members(
                legacy_nodes,
                agent_id_map=agent_id_map,
                team_id_map=team_id_map,
                team_name=team_name,
            )

            md_content = serialize_team_md(
                name=team_name,
                description=description,
                category=category,
                instructions=instructions,
            )
            cfg_payload = {
                "coordinatorMemberName": str(row["coordinator_member_name"] or ""),
                "avatarUrl": row["avatar_url"],
                "members": members,
            }

            if self.apply:
                team_dir.mkdir(parents=True, exist_ok=True)
            self._write_if_needed(md_path, md_content)
            self._write_json_if_needed(cfg_path, cfg_payload)
            self.stats.team_created += 1

    def _post_verify(self, *, agent_id_map: dict[int, str], team_id_map: dict[int, str]) -> None:
        missing: list[str] = []

        for _, new_id in sorted(agent_id_map.items()):
            agent_dir = self.agents_dir / new_id
            if not (agent_dir / "agent.md").exists():
                missing.append(str(agent_dir / "agent.md"))
            if not (agent_dir / "agent-config.json").exists():
                missing.append(str(agent_dir / "agent-config.json"))

        for _, new_id in sorted(team_id_map.items()):
            team_dir = self.teams_dir / new_id
            cfg_path = team_dir / "team-config.json"
            if not (team_dir / "team.md").exists():
                missing.append(str(team_dir / "team.md"))
            if not cfg_path.exists():
                missing.append(str(cfg_path))
                continue

            try:
                payload = json.loads(cfg_path.read_text(encoding="utf-8"))
            except Exception as error:
                raise RuntimeError(f"Invalid JSON in {cfg_path}: {error}") from error

            members = payload.get("members")
            if not isinstance(members, list):
                continue
            for member in members:
                if not isinstance(member, dict):
                    continue
                ref = member.get("ref")
                if isinstance(ref, str) and ref.isdigit():
                    self.stats.warnings.append(
                        f"Found numeric team ref after migration in {cfg_path}: {member}"
                    )

        if missing:
            raise RuntimeError(
                "Post-migration verification failed, missing files:\n- " + "\n- ".join(missing)
            )

    def run(self) -> MigrationStats:
        if not self.db_path.exists():
            raise RuntimeError(f"Database file does not exist: {self.db_path}")

        with self._connect() as connection:
            self._assert_required_tables(connection)

            agent_rows = connection.execute(
                """
                SELECT id, name, role, description,
                       tool_names, input_processor_names, llm_response_processor_names,
                       system_prompt_processor_names, tool_execution_result_processor_names,
                       tool_invocation_preprocessor_names, lifecycle_processor_names,
                       skill_names, avatar_url
                FROM agent_definitions
                ORDER BY id ASC
                """
            ).fetchall()
            team_rows = connection.execute(
                """
                SELECT id, name, description, role, nodes,
                       coordinator_member_name, avatar_url
                FROM agent_team_definitions
                ORDER BY id ASC
                """
            ).fetchall()

            prompts_by_key = self._load_prompts(connection)
            prompt_mappings = self._load_prompt_mappings(connection)

        agent_id_map = self._build_agent_id_map(agent_rows)
        team_id_map = self._build_team_id_map(team_rows)

        self._migrate_agents(
            agent_rows=agent_rows,
            agent_id_map=agent_id_map,
            prompt_mappings=prompt_mappings,
            prompts_by_key=prompts_by_key,
        )
        self._migrate_teams(
            team_rows=team_rows,
            team_id_map=team_id_map,
            agent_id_map=agent_id_map,
        )

        if self.apply:
            self._post_verify(agent_id_map=agent_id_map, team_id_map=team_id_map)

        print("Legacy DB -> file migration summary")
        print(f"  mode: {'apply' if self.apply else 'dry-run'}")
        print(f"  db: {self.db_path}")
        print(f"  data_root: {self.data_root}")
        print(f"  agents: total={self.stats.agent_total} created={self.stats.agent_created} skipped_existing={self.stats.agent_skipped_existing}")
        print(f"  teams: total={self.stats.team_total} created={self.stats.team_created} skipped_existing={self.stats.team_skipped_existing}")

        if agent_id_map:
            print("  agent_id_map:")
            for old_id, new_id in sorted(agent_id_map.items()):
                print(f"    {old_id} -> {new_id}")
        if team_id_map:
            print("  team_id_map:")
            for old_id, new_id in sorted(team_id_map.items()):
                print(f"    {old_id} -> {new_id}")

        if self.stats.warnings:
            print("  warnings:")
            for warning in self.stats.warnings:
                print(f"    - {warning}")

        return self.stats


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Migrate legacy DB definitions into md-centric files.")
    parser.add_argument(
        "--db-path",
        default="/home/autobyteus/data/db/production.db",
        help="Path to legacy SQLite DB file.",
    )
    parser.add_argument(
        "--data-root",
        default="/home/autobyteus/data",
        help="Root directory containing agents/ and agent-teams/.",
    )
    parser.add_argument(
        "--mode",
        choices=["dry-run", "apply"],
        default="dry-run",
        help="Dry-run prints actions without writing; apply performs writes.",
    )
    parser.add_argument(
        "--overwrite-existing",
        action="store_true",
        help="Overwrite existing migrated files when target folder already exists.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    migrator = LegacyDbToFileMigrator(
        db_path=Path(args.db_path),
        data_root=Path(args.data_root),
        apply=args.mode == "apply",
        overwrite_existing=args.overwrite_existing,
    )
    migrator.run()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
