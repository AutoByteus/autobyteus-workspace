import type { Stats } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import type { FastifyInstance } from "fastify";
import type { AgentPackageDefinitionKind } from "../../agent-package-definitions/domain/agent-package-definition-types.js";
import { readDefinitionAvatar, type PackageAvatar } from "../../agent-package-definitions/domain/definition-avatar-file.js";
import {
  getStudioAgentDefinitionService,
  getStudioAgentOrgDefinitionService,
  getStudioAgentTeamDefinitionService,
} from "../graphql/studio-application-api-services.js";
import { sendUserFile } from "./user-file-reply.js";

/** A definition's package picture, as its kind's service holds it (null: no such definition, or no picture). */
export type DefinitionAvatarLookup = (kind: AgentPackageDefinitionKind, definitionId: string) => Promise<PackageAvatar | null>;

const KINDS: ReadonlySet<string> = new Set<AgentPackageDefinitionKind>(["agent", "agent_team", "agent_org"]);

const studioDefinitionAvatar: DefinitionAvatarLookup = async (kind, definitionId) => {
  if (kind === "agent") return (await getStudioAgentDefinitionService().getAgentDefinitionById(definitionId))?.packageAvatar ?? null;
  if (kind === "agent_team") return (await getStudioAgentTeamDefinitionService().getDefinitionById(definitionId))?.packageAvatar ?? null;
  return (await getStudioAgentOrgDefinitionService().getDefinitionById(definitionId))?.packageAvatar ?? null;
};

const notFound = { detail: "No package picture." } as const;

/**
 * `GET /rest/definition-avatars/:kind/:definitionId` (autobyteus-669 S-3): a definition's package picture, the file
 * `avatar.{png,jpg,jpeg,webp}` in its own folder. The path comes only from the definition the node read and the fixed
 * name, never from the request; the folder is read again here, so only a picture valid now (a regular file, of its
 * type, at most 1 MiB) is sent. Access is the default rule: owner and phone, never a peer.
 */
export async function registerDefinitionAvatarRoutes(
  app: FastifyInstance,
  lookup: DefinitionAvatarLookup = studioDefinitionAvatar,
): Promise<void> {
  app.get<{ Params: { kind: string; definitionId: string } }>("/definition-avatars/:kind/:definitionId", async (request, reply) => {
    const { kind, definitionId } = request.params;
    if (!KINDS.has(kind) || !definitionId) return reply.code(404).send(notFound);
    const known = await lookup(kind as AgentPackageDefinitionKind, definitionId);
    if (!known) return reply.code(404).send(notFound);
    const current = await readDefinitionAvatar(known.folder);
    if (current.status !== "valid") return reply.code(404).send(notFound);
    const filePath = path.join(current.avatar.folder, current.avatar.fileName);
    let stat: Stats;
    try {
      stat = await fs.stat(filePath);
    } catch {
      return reply.code(404).send(notFound);
    }
    return sendUserFile(reply, { mimeType: current.avatar.mimeType, path: filePath, size: stat.size, modifiedMs: stat.mtimeMs }, request);
  });
}
