import fs from "node:fs";
import path from "node:path";
import { appConfigProvider } from "../../config/app-config-provider.js";
import {
  parseDraftContextFileOwnerDescriptor,
} from "../domain/context-file-owner-types.js";
import {
  parseFinalContextFileOwnerDescriptor,
  type ContextFileFinalOwnerDescriptor,
} from "../domain/context-file-owner-types.js";
import { ContextFileLayout } from "../store/context-file-layout.js";

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
  constructor(private readonly layout: ContextFileLayout = new ContextFileLayout()) {}

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
          draftTeamRunId: decodePathSegment(teamDraftMatch[1]),
          memberRouteKey: decodePathSegment(teamDraftMatch[2]),
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
          memberRouteKey: decodePathSegment(teamMatch[2]),
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
        const configuredBaseUrl = appConfigProvider.config.getBaseUrl();
        const configuredOrigin = new URL(configuredBaseUrl).origin;
        if (parsed.origin !== configuredOrigin && !isLoopbackHostname(parsed.hostname)) {
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
      const filePath = this.layout.getFinalFilePath(owner, storedFilename);
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
