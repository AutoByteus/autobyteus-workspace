import { assertContainedContextFileSync } from "./context-file-path-validation.js";
import fs from "node:fs";
import path from "node:path";
import {
  parseDraftContextFileLocator,
  parseFinalContextFileOwnerDescriptor,
  type ContextFileDraftOwnerDescriptor,
  type ContextFileFinalOwnerDescriptor,
} from "../domain/context-file-owner-types.js";
import { ContextFileLayout } from "../store/context-file-layout.js";
import { ContextFileOwnerResolver } from "./context-file-owner-resolver.js";

const AGENT_FINAL_ROUTE = /^\/rest\/runs\/([^/]+)\/context-files\/([^/?#]+)$/;
const TEAM_MEMBER_FINAL_ROUTE =
  /^\/rest\/team-runs\/([^/]+)\/agent-runs\/([^/]+)\/context-files\/([^/?#]+)$/;
const ORG_MEMBER_FINAL_ROUTE =
  /^\/rest\/agent-org-runs\/([^/]+)\/agent-runs\/([^/]+)\/context-files\/([^/?#]+)$/;
const AGENT_COLLABORATION_MEMBER_FINAL_ROUTE =
  /^\/rest\/agent-collaborations\/([^/]+)\/agent-runs\/([^/]+)\/context-files\/([^/?#]+)$/;

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
  private readonly ownerResolver: Pick<ContextFileOwnerResolver, "resolveFinalOwnerSync" | "validateDraftOwnerSync">;
  private readonly configuredOrigin: string;

  constructor(input: {
    layout: ContextFileLayout;
    ownerResolver: Pick<ContextFileOwnerResolver, "resolveFinalOwnerSync" | "validateDraftOwnerSync">;
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

    const draft = this.parseDraftLocator(pathname);
    if (draft) {
      return this.resolveExistingDraftPath(draft.owner, draft.storedFilename);
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
          agentRunId: decodePathSegment(teamMatch[2]),
        }),
        decodePathSegment(teamMatch[3]),
      );
    }

    const orgMatch = pathname.match(ORG_MEMBER_FINAL_ROUTE);
    if (orgMatch?.[1] && orgMatch?.[2] && orgMatch?.[3]) {
      return this.resolveExistingFinalPath(parseFinalContextFileOwnerDescriptor({
        kind: "org_member_final",
        orgRunId: decodePathSegment(orgMatch[1]),
        agentRunId: decodePathSegment(orgMatch[2]),
      }), decodePathSegment(orgMatch[3]));
    }

    const collaborationMatch = pathname.match(AGENT_COLLABORATION_MEMBER_FINAL_ROUTE);
    if (collaborationMatch?.[1] && collaborationMatch?.[2] && collaborationMatch?.[3]) {
      return this.resolveExistingFinalPath(parseFinalContextFileOwnerDescriptor({
        kind: "agent_collaboration_member_final",
        hostRunId: decodePathSegment(collaborationMatch[1]),
        agentRunId: decodePathSegment(collaborationMatch[2]),
      }), decodePathSegment(collaborationMatch[3]));
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

    const pathname = locator.split(/[?#]/, 1)[0]!;
    if (pathname.startsWith("rest/")) {
      return `/${pathname}`;
    }

    return pathname.startsWith("/") ? pathname : null;
  }

  private parseDraftLocator(pathname: string): ReturnType<typeof parseDraftContextFileLocator> {
    try {
      return parseDraftContextFileLocator(pathname);
    } catch {
      return null;
    }
  }

  private resolveExistingFinalPath(
    owner: ContextFileFinalOwnerDescriptor,
    storedFilename: string,
  ): string | null {
    try {
      const resolvedOwner = this.ownerResolver.resolveFinalOwnerSync(owner);
      const filePath = this.layout.getFinalFilePath(resolvedOwner, storedFilename);
      const resolvedPath = path.resolve(filePath);
      assertContainedContextFileSync(this.layout.getMemoryRootDirPath(), resolvedPath);
      return resolvedPath;
    } catch {
      return null;
    }
  }

  private resolveExistingDraftPath(
    owner: ContextFileDraftOwnerDescriptor,
    storedFilename: string,
  ): string | null {
    try {
      this.ownerResolver.validateDraftOwnerSync(owner);
      const filePath = this.layout.getDraftFilePath(owner, storedFilename);
      const resolvedPath = path.resolve(filePath);
      return fs.existsSync(resolvedPath) ? resolvedPath : null;
    } catch {
      return null;
    }
  }
}
