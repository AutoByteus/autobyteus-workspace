import {
  Arg,
  Field,
  InputType,
  Mutation,
  ObjectType,
  Query,
  Resolver,
  registerEnumType,
} from "type-graphql";
import { GraphQLJSON } from "graphql-scalars";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { ContextFileType } from "autobyteus-ts/agent/message/context-file-type.js";
import {
  getApplicationSessionService,
  type CreateApplicationSessionInput as CreateApplicationSessionInputModel,
  type SendApplicationInputInput as SendApplicationInputInputModel,
} from "../../../application-sessions/services/application-session-service.js";
import type {
  ApplicationSessionBinding,
  ApplicationSessionSnapshot,
} from "../../../application-sessions/domain/models.js";

registerEnumType(SkillAccessMode, { name: "SkillAccessModeEnum" });
registerEnumType(ContextFileType, { name: "ContextFileTypeEnum" });

@ObjectType()
class ApplicationRuntimeTargetGraph {
  @Field(() => String)
  kind!: string;

  @Field(() => String)
  runId!: string;

  @Field(() => String)
  definitionId!: string;
}

@ObjectType()
class ApplicationSessionApplicationGraph {
  @Field(() => String)
  applicationId!: string;

  @Field(() => String)
  localApplicationId!: string;

  @Field(() => String)
  packageId!: string;

  @Field(() => String)
  name!: string;

  @Field(() => String, { nullable: true })
  description!: string | null;

  @Field(() => String, { nullable: true })
  iconAssetPath!: string | null;

  @Field(() => String)
  entryHtmlAssetPath!: string;

  @Field(() => Boolean)
  writable!: boolean;
}

@ObjectType()
class ApplicationProducerProvenanceGraph {
  @Field(() => String)
  memberRouteKey!: string;

  @Field(() => String)
  displayName!: string;

  @Field(() => [String])
  teamPath!: string[];

  @Field(() => String)
  runId!: string;

  @Field(() => String)
  runtimeKind!: string;
}

@ObjectType()
class ApplicationDeliveryStateProjectionGraph {
  @Field(() => String)
  publicationKey!: string;

  @Field(() => String)
  deliveryState!: string;

  @Field(() => String, { nullable: true })
  title!: string | null;

  @Field(() => String, { nullable: true })
  summary!: string | null;

  @Field(() => String, { nullable: true })
  artifactType!: string | null;

  @Field(() => GraphQLJSON, { nullable: true })
  artifactRef!: unknown;

  @Field(() => String)
  updatedAt!: string;

  @Field(() => ApplicationProducerProvenanceGraph)
  producer!: ApplicationProducerProvenanceGraph;
}

@ObjectType()
class ApplicationDeliveryProjectionGraph {
  @Field(() => ApplicationDeliveryStateProjectionGraph, { nullable: true })
  current!: ApplicationDeliveryStateProjectionGraph | null;
}

@ObjectType()
class ApplicationRuntimeMemberTargetGraph {
  @Field(() => String)
  runId!: string;

  @Field(() => String)
  runtimeKind!: string;
}

@ObjectType()
class ApplicationMemberProjectionGraph {
  @Field(() => String)
  memberRouteKey!: string;

  @Field(() => String)
  displayName!: string;

  @Field(() => [String])
  teamPath!: string[];

  @Field(() => ApplicationRuntimeMemberTargetGraph, { nullable: true })
  runtimeTarget!: ApplicationRuntimeMemberTargetGraph | null;

  @Field(() => GraphQLJSON)
  artifactsByKey!: Record<string, unknown>;

  @Field(() => String, { nullable: true })
  primaryArtifactKey!: string | null;

  @Field(() => GraphQLJSON)
  progressByKey!: Record<string, unknown>;

  @Field(() => String, { nullable: true })
  primaryProgressKey!: string | null;
}

@ObjectType()
class ApplicationSessionViewGraph {
  @Field(() => ApplicationDeliveryProjectionGraph)
  delivery!: ApplicationDeliveryProjectionGraph;

  @Field(() => [ApplicationMemberProjectionGraph])
  members!: ApplicationMemberProjectionGraph[];
}

@ObjectType()
export class ApplicationSessionGraph {
  @Field(() => String)
  applicationSessionId!: string;

  @Field(() => ApplicationSessionApplicationGraph)
  application!: ApplicationSessionApplicationGraph;

  @Field(() => ApplicationRuntimeTargetGraph)
  runtime!: ApplicationRuntimeTargetGraph;

  @Field(() => ApplicationSessionViewGraph)
  view!: ApplicationSessionViewGraph;

  @Field(() => String)
  createdAt!: string;

  @Field(() => String, { nullable: true })
  terminatedAt!: string | null;
}

@ObjectType()
export class ApplicationSessionBindingGraph {
  @Field(() => String)
  applicationId!: string;

  @Field(() => String, { nullable: true })
  requestedSessionId!: string | null;

  @Field(() => String, { nullable: true })
  resolvedSessionId!: string | null;

  @Field(() => String)
  resolution!: string;

  @Field(() => ApplicationSessionGraph, { nullable: true })
  session!: ApplicationSessionGraph | null;
}

@ObjectType()
class ApplicationSessionCommandResult {
  @Field(() => Boolean)
  success!: boolean;

  @Field(() => String)
  message!: string;

  @Field(() => ApplicationSessionGraph, { nullable: true })
  session!: ApplicationSessionGraph | null;
}

@InputType()
class CreateApplicationSessionMemberConfigInput {
  @Field(() => String)
  memberName!: string;

  @Field(() => String, { nullable: true })
  memberRouteKey?: string | null;

  @Field(() => String)
  agentDefinitionId!: string;

  @Field(() => String)
  llmModelIdentifier!: string;

  @Field(() => Boolean)
  autoExecuteTools!: boolean;

  @Field(() => SkillAccessMode)
  skillAccessMode!: SkillAccessMode;

  @Field(() => String, { nullable: true })
  workspaceId?: string | null;

  @Field(() => String, { nullable: true })
  workspaceRootPath?: string | null;

  @Field(() => GraphQLJSON, { nullable: true })
  llmConfig?: Record<string, unknown> | null;

  @Field(() => String, { nullable: true })
  runtimeKind?: string | null;
}

@InputType()
class CreateApplicationSessionInput {
  @Field(() => String)
  applicationId!: string;

  @Field(() => String, { nullable: true })
  workspaceRootPath?: string | null;

  @Field(() => String, { nullable: true })
  workspaceId?: string | null;

  @Field(() => String, { nullable: true })
  llmModelIdentifier?: string | null;

  @Field(() => Boolean, { nullable: true })
  autoExecuteTools?: boolean | null;

  @Field(() => GraphQLJSON, { nullable: true })
  llmConfig?: Record<string, unknown> | null;

  @Field(() => SkillAccessMode, { nullable: true })
  skillAccessMode?: SkillAccessMode | null;

  @Field(() => String, { nullable: true })
  runtimeKind?: string | null;

  @Field(() => [CreateApplicationSessionMemberConfigInput], { nullable: true })
  memberConfigs?: CreateApplicationSessionMemberConfigInput[] | null;
}

@InputType()
class ApplicationUserContextFileInput {
  @Field(() => String)
  uri!: string;

  @Field(() => ContextFileType, { nullable: true })
  fileType?: ContextFileType | null;

  @Field(() => String, { nullable: true })
  fileName?: string | null;

  @Field(() => GraphQLJSON, { nullable: true })
  metadata?: Record<string, unknown> | null;
}

@InputType()
class SendApplicationInputInput {
  @Field(() => String)
  applicationSessionId!: string;

  @Field(() => String)
  text!: string;

  @Field(() => String, { nullable: true })
  targetMemberName?: string | null;

  @Field(() => [ApplicationUserContextFileInput], { nullable: true })
  contextFiles?: ApplicationUserContextFileInput[] | null;

  @Field(() => GraphQLJSON, { nullable: true })
  metadata?: Record<string, unknown> | null;
}

const toGraph = (session: ApplicationSessionSnapshot | null): ApplicationSessionGraph | null => {
  if (!session) {
    return null;
  }

  return {
    applicationSessionId: session.applicationSessionId,
    application: { ...session.application },
    runtime: { ...session.runtime },
    view: {
      delivery: {
        current: session.view.delivery.current
          ? {
              ...session.view.delivery.current,
              producer: { ...session.view.delivery.current.producer },
            }
          : null,
      },
      members: session.view.members.map((member) => ({
        memberRouteKey: member.memberRouteKey,
        displayName: member.displayName,
        teamPath: [...member.teamPath],
        runtimeTarget: member.runtimeTarget ? { ...member.runtimeTarget } : null,
        artifactsByKey: member.artifactsByKey,
        primaryArtifactKey: member.primaryArtifactKey,
        progressByKey: member.progressByKey,
        primaryProgressKey: member.primaryProgressKey,
      })),
    },
    createdAt: session.createdAt,
    terminatedAt: session.terminatedAt,
  };
};

const toBindingGraph = (binding: ApplicationSessionBinding): ApplicationSessionBindingGraph => ({
  applicationId: binding.applicationId,
  requestedSessionId: binding.requestedSessionId,
  resolvedSessionId: binding.resolvedSessionId,
  resolution: binding.resolution,
  session: toGraph(binding.session),
});

@Resolver()
export class ApplicationSessionResolver {
  private readonly service = getApplicationSessionService();

  @Query(() => ApplicationSessionGraph, { nullable: true })
  async applicationSession(
    @Arg("id", () => String) id: string,
  ): Promise<ApplicationSessionGraph | null> {
    return toGraph(this.service.getSessionById(id));
  }

  @Query(() => ApplicationSessionBindingGraph)
  async applicationSessionBinding(
    @Arg("applicationId", () => String) applicationId: string,
    @Arg("requestedSessionId", () => String, { nullable: true }) requestedSessionId?: string | null,
  ): Promise<ApplicationSessionBindingGraph> {
    return toBindingGraph(
      await this.service.applicationSessionBinding(applicationId, requestedSessionId ?? null),
    );
  }

  @Mutation(() => ApplicationSessionCommandResult)
  async createApplicationSession(
    @Arg("input", () => CreateApplicationSessionInput) input: CreateApplicationSessionInput,
  ): Promise<ApplicationSessionCommandResult> {
    try {
      const session = await this.service.createApplicationSession(input as CreateApplicationSessionInputModel);
      return {
        success: true,
        message: "Application session created successfully.",
        session: toGraph(session),
      };
    } catch (error) {
      return {
        success: false,
        message: String(error),
        session: null,
      };
    }
  }

  @Mutation(() => ApplicationSessionCommandResult)
  async terminateApplicationSession(
    @Arg("applicationSessionId", () => String) applicationSessionId: string,
  ): Promise<ApplicationSessionCommandResult> {
    try {
      const session = await this.service.terminateSession(applicationSessionId);
      return {
        success: Boolean(session),
        message: session
          ? "Application session terminated successfully."
          : "Application session was not found.",
        session: toGraph(session),
      };
    } catch (error) {
      return {
        success: false,
        message: String(error),
        session: null,
      };
    }
  }

  @Mutation(() => ApplicationSessionCommandResult)
  async sendApplicationInput(
    @Arg("input", () => SendApplicationInputInput) input: SendApplicationInputInput,
  ): Promise<ApplicationSessionCommandResult> {
    try {
      const session = await this.service.sendInput(input as SendApplicationInputInputModel);
      return {
        success: true,
        message: "Application input sent successfully.",
        session: toGraph(session),
      };
    } catch (error) {
      return {
        success: false,
        message: String(error),
        session: null,
      };
    }
  }
}
