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
import { SkillVersioningService } from "../../../skills/services/skill-versioning-service.js";
import type { Skill as SkillModel, SkillSourceInfo } from "../../../skills/domain/models.js";
import type { SkillVersion as SkillVersionModel } from "../../../skills/domain/skill-version.js";

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

  @Field(() => Boolean)
  isVersioned!: boolean;

  @Field(() => String, { nullable: true })
  activeVersion?: string | null;

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
export class SkillSource {
  @Field(() => String)
  path!: string;

  @Field(() => Int)
  skillCount!: number;

  @Field(() => Boolean)
  isDefault!: boolean;
}

@ObjectType()
export class SkillVersion {
  @Field(() => String)
  tag!: string;

  @Field(() => String)
  commitHash!: string;

  @Field(() => String)
  message!: string;

  @Field(() => String)
  createdAt!: string;

  @Field(() => Boolean)
  isActive!: boolean;
}

@ObjectType()
export class SkillDiff {
  @Field(() => String)
  fromVersion!: string;

  @Field(() => String)
  toVersion!: string;

  @Field(() => String)
  diffContent!: string;
}

@InputType()
export class ActivateSkillVersionInput {
  @Field(() => String)
  skillName!: string;

  @Field(() => String)
  version!: string;
}

@InputType()
export class EnableSkillVersioningInput {
  @Field(() => String)
  skillName!: string;
}

const decodeFileContent = (content: Buffer): string => {
  const utf8 = content.toString("utf-8");
  const reencoded = Buffer.from(utf8, "utf-8");
  if (reencoded.equals(content)) {
    return utf8;
  }
  return content.toString("latin1");
};

const mapSkill = (
  skill: SkillModel,
  versioningService: SkillVersioningService,
): Skill => {
  const isVersioned = versioningService.isVersioned(skill.rootPath);
  const activeVersion = isVersioned ? versioningService.getActiveVersion(skill.rootPath) : null;

  return {
    name: skill.name,
    description: skill.description,
    content: skill.content,
    rootPath: skill.rootPath,
    fileCount: skill.fileCount,
    isReadonly: skill.isReadonly,
    isDisabled: skill.isDisabled,
    isVersioned,
    activeVersion: activeVersion?.tag ?? null,
    createdAt: skill.createdAt ? skill.createdAt.toISOString() : null,
    updatedAt: skill.updatedAt ? skill.updatedAt.toISOString() : null,
  };
};

const mapSkillSource = (source: SkillSourceInfo): SkillSource => ({
  path: source.path,
  skillCount: source.skillCount,
  isDefault: source.isDefault,
});

const mapSkillVersion = (version: SkillVersionModel): SkillVersion => ({
  tag: version.tag,
  commitHash: version.commitHash,
  message: version.message,
  createdAt: version.createdAt.toISOString(),
  isActive: version.isActive,
});

@Resolver()
export class SkillResolver {
  @Query(() => [Skill])
  skills(): Skill[] {
    const service = SkillService.getInstance();
    const versioningService = SkillVersioningService.getInstance();
    return service.listSkills().map((skill) => mapSkill(skill, versioningService));
  }

  @Query(() => Skill, { nullable: true })
  skill(@Arg("name", () => String) name: string): Skill | null {
    const service = SkillService.getInstance();
    const versioningService = SkillVersioningService.getInstance();
    const skill = service.getSkill(name);
    if (!skill) {
      return null;
    }
    return mapSkill(skill, versioningService);
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

  @Query(() => [SkillSource])
  skillSources(): SkillSource[] {
    const service = SkillService.getInstance();
    return service.getSkillSources().map(mapSkillSource);
  }

  @Query(() => [SkillVersion])
  skillVersions(@Arg("skillName", () => String) skillName: string): SkillVersion[] {
    const service = SkillService.getInstance();
    const versioningService = SkillVersioningService.getInstance();
    const skill = service.getSkill(skillName);
    if (!skill) {
      return [];
    }
    return versioningService.listVersions(skill.rootPath).map(mapSkillVersion);
  }

  @Query(() => SkillDiff, { nullable: true })
  skillVersionDiff(
    @Arg("skillName", () => String) skillName: string,
    @Arg("fromVersion", () => String) fromVersion: string,
    @Arg("toVersion", () => String) toVersion: string,
  ): SkillDiff | null {
    const service = SkillService.getInstance();
    const versioningService = SkillVersioningService.getInstance();
    const skill = service.getSkill(skillName);
    if (!skill) {
      return null;
    }
    try {
      const diff = versioningService.diffVersions(skill.rootPath, fromVersion, toVersion);
      return {
        fromVersion,
        toVersion,
        diffContent: diff,
      };
    } catch {
      return null;
    }
  }

  @Mutation(() => Skill)
  createSkill(@Arg("input", () => CreateSkillInput) input: CreateSkillInput): Skill {
    const service = SkillService.getInstance();
    const versioningService = SkillVersioningService.getInstance();
    const skill = service.createSkill(input.name, input.description, input.content);
    return mapSkill(skill, versioningService);
  }

  @Mutation(() => Skill)
  updateSkill(@Arg("input", () => UpdateSkillInput) input: UpdateSkillInput): Skill {
    const service = SkillService.getInstance();
    const versioningService = SkillVersioningService.getInstance();
    const skill = service.updateSkill(input.name, input.description ?? null, input.content ?? null);
    return mapSkill(skill, versioningService);
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
    const versioningService = SkillVersioningService.getInstance();
    const skill = service.disableSkill(name);
    return mapSkill(skill, versioningService);
  }

  @Mutation(() => Skill)
  enableSkill(@Arg("name", () => String) name: string): Skill {
    const service = SkillService.getInstance();
    const versioningService = SkillVersioningService.getInstance();
    const skill = service.enableSkill(name);
    return mapSkill(skill, versioningService);
  }

  @Mutation(() => [SkillSource])
  addSkillSource(@Arg("path", () => String) pathValue: string): SkillSource[] {
    const service = SkillService.getInstance();
    return service.addSkillSource(pathValue).map(mapSkillSource);
  }

  @Mutation(() => [SkillSource])
  removeSkillSource(@Arg("path", () => String) pathValue: string): SkillSource[] {
    const service = SkillService.getInstance();
    return service.removeSkillSource(pathValue).map(mapSkillSource);
  }

  @Mutation(() => SkillVersion)
  activateSkillVersion(
    @Arg("input", () => ActivateSkillVersionInput) input: ActivateSkillVersionInput,
  ): SkillVersion {
    const service = SkillService.getInstance();
    const versioningService = SkillVersioningService.getInstance();
    const skill = service.getSkill(input.skillName);
    if (!skill) {
      throw new Error(`Skill '${input.skillName}' not found`);
    }
    const version = versioningService.activateVersion(skill.rootPath, input.version);
    return mapSkillVersion(version);
  }

  @Mutation(() => SkillVersion)
  enableSkillVersioning(
    @Arg("input", () => EnableSkillVersioningInput) input: EnableSkillVersioningInput,
  ): SkillVersion {
    const service = SkillService.getInstance();
    const version = service.enableSkillVersioning(input.skillName);
    return mapSkillVersion(version);
  }
}
