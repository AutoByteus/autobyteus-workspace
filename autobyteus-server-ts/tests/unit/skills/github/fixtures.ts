import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { create } from "tar";
import { GitHubSkillSourceStore } from "../../../../src/skills/stores/github-skill-source-store.js";
import { GitHubSkillRepository } from "../../../../src/skills/installers/github-skill-repository.js";
import { SkillService } from "../../../../src/skills/services/skill-service.js";
import { SkillSourceService } from "../../../../src/skills/services/skill-source-service.js";

export const writeSkill = (directory: string, name = "writer", body = "v1") => {
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, "SKILL.md"), `---\nname: ${name}\ndescription: Write things\n---\n${body}\n`);
};
export function fixture() {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "github-skill-unit-")));
  const data = path.join(root, "data");
  const skills = path.join(data, "skills");
  fs.mkdirSync(skills, { recursive: true });
  const upstream = path.join(root, "wrapper");
  writeSkill(upstream);
  let localPaths: string[] = [];
  let revision = "a".repeat(40);
  let metadataError: Error | null = null;
  const config = { getSkillsDir: () => skills, getAppDataDir: () => data,
    getAdditionalSkillsDirs: () => localPaths, getAdditionalAgentPackageRoots: () => [],
    getAgentOrgsDir: () => path.join(data, "agent-orgs"), get: () => localPaths.join(",") };
  const store = new GitHubSkillSourceStore(data);
  const catalog = new SkillService({ config, sourceStore: store,
    isRuntimeDefaultSkillFolder: directory => directory.endsWith("runtime-default") });
  let downloads = 0;
  const repository = new GitHubSkillRepository(store.root, { download: async (_metadata, target) => {
    downloads++;
    await create({ gzip: true, file: target, cwd: root, portable: true }, ["wrapper"]);
  } });
  const client = { fetchRepositoryRevisionMetadata: async () => {
    if (metadataError) throw metadataError;
    return { owner: "acme", repo: "skills", canonicalUrl: "https://github.com/acme/skills",
      defaultBranch: "main", latestRevision: revision };
  } };
  const service = new SkillSourceService({ config, catalog, store, repository, client, invalidateWorkspaces: async () => {},
    updateSetting: (_key, value) => { localPaths = value.split(",").filter(Boolean); return [true, ""]; } });
  return { root, data, upstream, skills, config, store, catalog, service, repository, client,
    setRevision(value: string) { revision = value; }, setError(error: Error | null) { metadataError = error; },
    get downloads() { return downloads; }, cleanup() { fs.rmSync(root, { recursive: true, force: true }); } };
}
