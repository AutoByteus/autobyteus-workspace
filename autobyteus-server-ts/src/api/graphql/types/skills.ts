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
import type { Skill as SkillModel, SkillSourceInfo } from "../../../skills/domain/models.js";

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
export class SkillSource {
  @Field(() => String)
  path!: string;

  @Field(() => Int)
  skillCount!: number;

  @Field(() => Boolean)
  isDefault!: boolean;
}

@ObjectType()
export class SkillCatalogReloadResult {
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

  @Query(() => [SkillSource])
  skillSources(): SkillSource[] {
    const service = SkillService.getInstance();
    return service.getSkillSources().map(mapSkillSource);
  }

  @Mutation(() => Skill)
  createSkill(@Arg("input", () => CreateSkillInput) input: CreateSkillInput): Skill {
    const service = SkillService.getInstance();
    const skill = service.createSkill(input.name, input.description, input.content);
    return mapSkill(skill);
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
      skills: result.skills.map(mapSkill),
      skillSources: result.skillSources.map(mapSkillSource),
    };
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
}
