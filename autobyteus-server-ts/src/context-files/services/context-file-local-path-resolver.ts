import fs from "node:fs";
import path from "node:path";
import {
  parseDraftContextFileOwnerDescriptor,
} from "../domain/context-file-owner-types.js";
import {
  parseFinalContextFileOwnerDescriptor,
  type ContextFileFinalOwnerDescriptor,
} from "../domain/context-file-owner-types.js";
import { ContextFileLayout } from "../store/context-file-layout.js";
import { ContextFileOwnerResolver } from "./context-file-owner-resolver.js";

const AGENT_FINAL_ROUTE = /^\/rest\/runs\/([^/]+)\/context-files\/([^/?#]+)$/;
const TEAM_MEMBER_FINAL_ROUTE =
  /^\/rest\/team-runs\/([^/]+)\/members\/([^/]+)\/context-files\/([^/?#]+)$/;
const AGENT_DRAFT_ROUTE = /^\/rest\/drafts\/agent-runs\/([^/]+)\/context-files\/([^/?#]+)$/;
const TEAM_MEMBER_DRAFT_ROUTE =
  /^\/rest\/drafts\/team-runs\/([^/]+)\/members\/([^/]+)\/context-files\/([^/?#]+)$/;

const isLoopbackHostname = (hostname: string): boolean =>
  hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";

const decodePathSegment = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

export class ContextFileLocalPathResolver {
  private readonly layout: ContextFileLayout;
  private readonly ownerResolver: Pick<ContextFileOwnerResolver, "resolveFinalOwnerSync">;
  private readonly configuredOrigin: string;

  constructor(input: {
    layout: ContextFileLayout;
    ownerResolver: Pick<ContextFileOwnerResolver, "resolveFinalOwnerSync">;
    baseUrl: string;
  }) {
    if (!input?.layout || !input.ownerResolver || typeof input.ownerResolver.resolveFinalOwnerSync !== "function") {
      throw new Error("ContextFileLocalPathResolver layout and ownerResolver are required.");
    }
    const baseUrl = typeof input.baseUrl === "string" ? input.baseUrl.trim() : "";
    let parsed: URL;
    try {
      parsed = new URL(baseUrl);
    } catch {
      throw new Error("ContextFileLocalPathResolver baseUrl must be an absolute HTTP(S) URL.");
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("ContextFileLocalPathResolver baseUrl must be an absolute HTTP(S) URL.");
    }
    this.layout = input.layout;
    this.ownerResolver = input.ownerResolver;
    this.configuredOrigin = parsed.origin;
  }

  resolve(locator: string): string | null {
    const normalizedLocator = locator.trim();
    if (!normalizedLocator) {
      return null;
    }

    const pathname = this.extractPathname(normalizedLocator);
    if (!pathname) {
      return null;
    }

    const agentDraftMatch = pathname.match(AGENT_DRAFT_ROUTE);
    if (agentDraftMatch?.[1] && agentDraftMatch?.[2]) {
      return this.resolveExistingDraftPath(
        parseDraftContextFileOwnerDescriptor({
          kind: "agent_draft",
          draftRunId: decodePathSegment(agentDraftMatch[1]),
        }),
        decodePathSegment(agentDraftMatch[2]),
      );
    }

    const teamDraftMatch = pathname.match(TEAM_MEMBER_DRAFT_ROUTE);
    if (teamDraftMatch?.[1] && teamDraftMatch?.[2] && teamDraftMatch?.[3]) {
      return this.resolveExistingDraftPath(
        parseDraftContextFileOwnerDescriptor({
          kind: "team_member_draft",
          teamDraftId: decodePathSegment(teamDraftMatch[1]),
          memberAddress: decodePathSegment(teamDraftMatch[2]),
        }),
        decodePathSegment(teamDraftMatch[3]),
      );
    }

    const agentMatch = pathname.match(AGENT_FINAL_ROUTE);
    if (agentMatch?.[1] && agentMatch?.[2]) {
      return this.resolveExistingFinalPath(
        {
          kind: "agent_final",
          runId: decodePathSegment(agentMatch[1]),
        },
        decodePathSegment(agentMatch[2]),
      );
    }

    const teamMatch = pathname.match(TEAM_MEMBER_FINAL_ROUTE);
    if (teamMatch?.[1] && teamMatch?.[2] && teamMatch?.[3]) {
      return this.resolveExistingFinalPath(
        parseFinalContextFileOwnerDescriptor({
          kind: "team_member_final",
          teamRunId: decodePathSegment(teamMatch[1]),
          memberAddress: decodePathSegment(teamMatch[2]),
        }),
        decodePathSegment(teamMatch[3]),
      );
    }

    return null;
  }

  private extractPathname(locator: string): string | null {
    if (locator.startsWith("http://") || locator.startsWith("https://")) {
      try {
        const parsed = new URL(locator);
        if (parsed.origin !== this.configuredOrigin && !isLoopbackHostname(parsed.hostname)) {
          return null;
        }
        return parsed.pathname;
      } catch {
        return null;
      }
    }

    if (locator.startsWith("rest/")) {
      return `/${locator}`;
    }

    return locator.startsWith("/") ? locator : null;
  }

  private resolveExistingFinalPath(
    owner: ContextFileFinalOwnerDescriptor,
    storedFilename: string,
  ): string | null {
    try {
      const resolvedOwner = this.ownerResolver.resolveFinalOwnerSync(owner);
      const filePath = this.layout.getFinalFilePath(resolvedOwner, storedFilename);
      const resolvedPath = path.resolve(filePath);
      return fs.existsSync(resolvedPath) ? resolvedPath : null;
    } catch {
      return null;
    }
  }

  private resolveExistingDraftPath(
    owner: ReturnType<typeof parseDraftContextFileOwnerDescriptor>,
    storedFilename: string,
  ): string | null {
    try {
      const filePath = this.layout.getDraftFilePath(owner, storedFilename);
      const resolvedPath = path.resolve(filePath);
      return fs.existsSync(resolvedPath) ? resolvedPath : null;
    } catch {
      return null;
    }
  }
}
