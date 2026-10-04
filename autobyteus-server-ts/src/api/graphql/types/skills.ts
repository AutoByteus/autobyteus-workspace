import { SkillSourceService } from "../../../skills/services/skill-source-service.js";
import type { SkillSourceInfo } from "../../../skills/domain/skill-source.js";
import {
  Arg,
  Field,
  InputType,
  Int,
  Mutation,
  ObjectType,
  Query,
  Resolver,
} from "type-graphql";
import { SkillService } from "../../../skills/services/skill-service.js";
import type { Skill as SkillModel } from "../../../skills/domain/models.js";
import { withSkillNameConflictMapping } from "../errors/skill-name-conflict-graphql-error.js";

@ObjectType()
export class Skill {
  @Field(() => String)
  name!: string;

  @Field(() => String)
  description!: string;

  @Field(() => String)
  content!: string;

  @Field(() => String)
  rootPath!: string;

  @Field(() => Int)
  fileCount!: number;

  @Field(() => Boolean)
  isReadonly!: boolean;

  @Field(() => Boolean)
  isDisabled!: boolean;

  @Field(() => String, { nullable: true })
  createdAt?: string | null;

  @Field(() => String, { nullable: true })
  updatedAt?: string | null;
}

@InputType()
export class CreateSkillInput {
  @Field(() => String)
  name!: string;

  @Field(() => String)
  description!: string;

  @Field(() => String)
  content!: string;
}

@InputType()
export class UpdateSkillInput {
  @Field(() => String)
  name!: string;

  @Field(() => String, { nullable: true })
  description?: string | null;

  @Field(() => String, { nullable: true })
  content?: string | null;
}

@ObjectType()
export class DeleteSkillResult {
  @Field(() => Boolean)
  success!: boolean;

  @Field(() => String)
  message!: string;
}

@ObjectType()
export class GitHubSkillSource {
  @Field(() => String) repositoryUrl!: string;
  @Field(() => String) defaultBranch!: string;
  @Field(() => String) installedRevision!: string;
  @Field(() => String, { nullable: true }) latestRevision!: string | null;
  @Field(() => String, { nullable: true }) latestCheckedAt!: string | null;
  @Field(() => String) status!: string;
  @Field(() => String, { nullable: true }) lastError!: string | null;
}

@ObjectType()
export class SkillSource {
  @Field(() => String) sourceId!: string;
  @Field(() => String) sourceKind!: string;
  @Field(() => GitHubSkillSource, { nullable: true }) github!: GitHubSkillSource | null;

  @Field(() => String)
  path!: string;

  @Field(() => Int)
  skillCount!: number;

  @Field(() => Boolean)
  isDefault!: boolean;
}

@ObjectType()
export class SkillSourceOperationResult {
  @Field(() => [SkillSource]) sources!: SkillSource[];
  @Field(() => [String]) warnings!: string[];
}

/** Copies of a name the catalog ignores (Skills page banner, REQ-024). */
@ObjectType()
export class SkillNameIssue {
  @Field(() => String)
  name!: string;

  @Field(() => String)
  usedPath!: string;

  @Field(() => [String])
  ignoredPaths!: string[];

  /** `conflict` or `shadowed_runtime_default`. */
  @Field(() => String)
  kind!: string;
}

@ObjectType()
export class SkillCatalogReloadResult {
  @Field(() => String, { nullable: true }) skillSourceRegistryError!: string | null;
  @Field(() => [Skill])
  skills!: Skill[];

  @Field(() => [SkillSource])
  skillSources!: SkillSource[];
}

const decodeFileContent = (content: Buffer): string => {
  const utf8 = content.toString("utf-8");
  const reencoded = Buffer.from(utf8, "utf-8");
  if (reencoded.equals(content)) {
    return utf8;
  }
  return content.toString("latin1");
};

const mapSkill = (skill: SkillModel): Skill => ({
  name: skill.name,
  description: skill.description,
  content: skill.content,
  rootPath: skill.rootPath,
  fileCount: skill.fileCount,
  isReadonly: skill.isReadonly,
  isDisabled: skill.isDisabled,
  createdAt: skill.createdAt ? skill.createdAt.toISOString() : null,
  updatedAt: skill.updatedAt ? skill.updatedAt.toISOString() : null,
});

const mapSkillSource = (source: SkillSourceInfo): SkillSource => ({
  sourceId: source.sourceId, sourceKind: source.sourceKind, github: source.github,
  path: source.path,
  skillCount: source.skillCount,
  isDefault: source.isDefault,
});

@Resolver()
export class SkillResolver {
  @Query(() => [Skill])
  skills(): Skill[] {
    const service = SkillService.getInstance();
    return service.listSkills().map(mapSkill);
  }

  @Query(() => Skill, { nullable: true })
  skill(@Arg("name", () => String) name: string): Skill | null {
    const service = SkillService.getInstance();
    const skill = service.getSkill(name);
    if (!skill) {
      return null;
    }
    return mapSkill(skill);
  }

  @Query(() => String, { nullable: true })
  async skillFileTree(@Arg("name", () => String) name: string): Promise<string | null> {
    const service = SkillService.getInstance();
    try {
      const tree = await service.getSkillFileTree(name);
      return tree.toJson();
    } catch {
      return null;
    }
  }

  @Query(() => String, { nullable: true })
  skillFileContent(
    @Arg("skillName", () => String) skillName: string,
    @Arg("path", () => String) filePath: string,
  ): string | null {
    const service = SkillService.getInstance();
    try {
      const content = service.readFile(skillName, filePath);
      return decodeFileContent(content);
    } catch {
      return null;
    }
  }

  @Query(() => [SkillNameIssue])
  skillNameIssues(): SkillNameIssue[] {
    return SkillService.getInstance().listSkillNameIssues().map((issue) => ({
      name: issue.name,
      usedPath: issue.usedPath,
      ignoredPaths: [...issue.ignoredPaths],
      kind: issue.kind,
    }));
  }

  @Query(() => [SkillSource])
  skillSources(): SkillSource[] {
    const service = SkillSourceService.getInstance();
    return service.getSkillSources().map(mapSkillSource);
  }

  @Mutation(() => Skill)
  createSkill(@Arg("input", () => CreateSkillInput) input: CreateSkillInput): Promise<Skill> {
    const service = SkillService.getInstance();
    return withSkillNameConflictMapping(() =>
      mapSkill(service.createSkill(input.name, input.description, input.content)));
  }

  @Mutation(() => Skill)
  updateSkill(@Arg("input", () => UpdateSkillInput) input: UpdateSkillInput): Skill {
    const service = SkillService.getInstance();
    const skill = service.updateSkill(input.name, input.description ?? null, input.content ?? null);
    return mapSkill(skill);
  }

  @Mutation(() => DeleteSkillResult)
  deleteSkill(@Arg("name", () => String) name: string): DeleteSkillResult {
    const service = SkillService.getInstance();
    const success = service.deleteSkill(name);
    return {
      success,
      message: success ? `Skill '${name}' deleted` : `Skill '${name}' not found`,
    };
  }

  @Mutation(() => Boolean)
  uploadSkillFile(
    @Arg("skillName", () => String) skillName: string,
    @Arg("path", () => String) filePath: string,
    @Arg("content", () => String) content: string,
  ): boolean {
    const service = SkillService.getInstance();
    try {
      return service.uploadFile(skillName, filePath, content);
    } catch {
      return false;
    }
  }

  @Mutation(() => Boolean)
  deleteSkillFile(
    @Arg("skillName", () => String) skillName: string,
    @Arg("path", () => String) filePath: string,
  ): boolean {
    const service = SkillService.getInstance();
    try {
      return service.deleteFile(skillName, filePath);
    } catch {
      return false;
    }
  }

  @Mutation(() => Skill)
  disableSkill(@Arg("name", () => String) name: string): Skill {
    const service = SkillService.getInstance();
    const skill = service.disableSkill(name);
    return mapSkill(skill);
  }

  @Mutation(() => Skill)
  enableSkill(@Arg("name", () => String) name: string): Skill {
    const service = SkillService.getInstance();
    const skill = service.enableSkill(name);
    return mapSkill(skill);
  }

  @Mutation(() => SkillCatalogReloadResult)
  reloadSkillCatalog(): SkillCatalogReloadResult {
    const service = SkillService.getInstance();
    const result = service.reloadSkillCatalog();

    return {
      skills: result.map(mapSkill),
      skillSources: SkillSourceService.getInstance().getSkillSources().map(mapSkillSource),
      skillSourceRegistryError: SkillSourceService.getInstance().getRegistryError(),
    };
  }

  @Mutation(() => [SkillSource])
  addSkillSource(@Arg("path", () => String) pathValue: string): Promise<SkillSource[]> {
    const service = SkillSourceService.getInstance();
    return withSkillNameConflictMapping(() => service.addSkillSource(pathValue).map(mapSkillSource));
  }

  @Mutation(() => [SkillSource])
  removeSkillSource(@Arg("path", () => String) pathValue: string): SkillSource[] {
    const service = SkillSourceService.getInstance();
    return service.removeSkillSource(pathValue).map(mapSkillSource);
  }
  @Query(() => String, { nullable: true })
  skillSourceRegistryError(): string | null { return SkillSourceService.getInstance().getRegistryError(); }

  @Mutation(() => SkillSourceOperationResult)
  importGitHubSkillSource(@Arg("repositoryUrl", () => String) url: string): Promise<SkillSourceOperationResult> {
    return withSkillNameConflictMapping(() => SkillSourceService.getInstance().importGitHubSkillSource(url));
  }
  @Mutation(() => SkillSourceOperationResult)
  checkGitHubSkillSourceUpdates(@Arg("sourceIds", () => [String], { nullable: true }) ids?: string[]): Promise<SkillSourceOperationResult> {
    return SkillSourceService.getInstance().checkGitHubSkillSourceUpdates(ids);
  }
  @Mutation(() => SkillSourceOperationResult)
  updateGitHubSkillSource(@Arg("sourceId", () => String) id: string): Promise<SkillSourceOperationResult> {
    return withSkillNameConflictMapping(() => SkillSourceService.getInstance().updateGitHubSkillSource(id));
  }
  @Mutation(() => SkillSourceOperationResult)
  removeGitHubSkillSource(@Arg("sourceId", () => String) id: string): Promise<SkillSourceOperationResult> {
    return SkillSourceService.getInstance().removeGitHubSkillSource(id);
  }

}
