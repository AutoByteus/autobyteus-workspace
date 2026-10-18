import fs from "node:fs";
import path from "node:path";

/**
 * A run's message log as the current app writes it (`MessageLog`): `<base>_active.jsonl` in the run's
 * folder, one message per `\n`-terminated line. For fixtures of current packages; released JSON logs are
 * written by the migration fixtures themselves.
 */
export type MessageLogFixtureBaseName = "communication_messages" | "team_communication_messages" | "agent_org_communication_messages";

export function writeMessageLogFixtureSync(dir: string, baseName: MessageLogFixtureBaseName, messages: readonly unknown[] = []): void {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${baseName}_active.jsonl`), messages.map((message) => `${JSON.stringify(message)}\n`).join(""));
}
