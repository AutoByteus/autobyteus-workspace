import type { GitHubRepositoryClient } from "../../src/integrations/github/github-repository-client.js";
import type { GitHubRepositoryRevisionMetadata } from "../../src/integrations/github/types.js";

/**
 * The GitHub reads a test never reaches: its installer overrides what would download, or its client fakes only the
 * head read (spread this under it). A call fails the test loudly.
 */
export const UNUSED_GITHUB_CLIENT: Pick<GitHubRepositoryClient, "fetchRepositoryRevisionMetadata" | "downloadArchive"> = {
  fetchRepositoryRevisionMetadata: async (): Promise<GitHubRepositoryRevisionMetadata> => {
    throw new Error("unexpected GitHub metadata read");
  },
  downloadArchive: async (): Promise<void> => {
    throw new Error("unexpected GitHub download");
  },
};
