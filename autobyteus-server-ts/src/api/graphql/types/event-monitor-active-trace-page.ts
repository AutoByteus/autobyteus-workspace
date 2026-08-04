import { createUnionType, Field, Float, ID, Int, ObjectType } from "type-graphql";
import { GraphQLJSON } from "graphql-scalars";

@ObjectType("EventMonitorActiveTraceAttachment")
class EventMonitorActiveTraceAttachmentObject {
  @Field(() => ID) attachmentId!: string;
  @Field(() => String) mediaType!: string;
  @Field(() => String) locator!: string;
}

@ObjectType("EventMonitorToolSummaryArgs")
class EventMonitorToolSummaryArgsObject {
  @Field(() => String, { nullable: true }) path?: string | null;
  @Field(() => String, { nullable: true }) file_path?: string | null;
  @Field(() => String, { nullable: true }) filepath?: string | null;
  @Field(() => String, { nullable: true }) filename?: string | null;
  @Field(() => String, { nullable: true }) target_path?: string | null;
  @Field(() => String, { nullable: true }) command?: string | null;
  @Field(() => String, { nullable: true }) cmd?: string | null;
  @Field(() => String, { nullable: true }) script?: string | null;
  @Field(() => String, { nullable: true }) query?: string | null;
  @Field(() => String, { nullable: true }) prompt?: string | null;
  @Field(() => String, { nullable: true }) url?: string | null;
  @Field(() => String, { nullable: true }) message?: string | null;
  @Field(() => String, { nullable: true }) text?: string | null;
  @Field(() => String, { nullable: true }) title?: string | null;
  @Field(() => String, { nullable: true }) name?: string | null;
  @Field(() => String, { nullable: true }) raw?: string | null;
}

@ObjectType("EventMonitorApprovalTarget")
class EventMonitorApprovalTargetObject {
  @Field(() => GraphQLJSON) executionAddress!: unknown;
}

@ObjectType("EventMonitorUserVisual")
class UserVisualObject {
  @Field(() => ID) visualId!: string;
  @Field(() => ID) eventId!: string;
  @Field(() => Int) kindOrdinal!: number;
  @Field(() => String) kind!: string;
  @Field(() => String) text!: string;
  @Field(() => [EventMonitorActiveTraceAttachmentObject]) attachments!: EventMonitorActiveTraceAttachmentObject[];
}
@ObjectType("EventMonitorAssistantTextVisual")
class AssistantTextVisualObject {
  @Field(() => ID) visualId!: string; @Field(() => ID) eventId!: string;
  @Field(() => Int) kindOrdinal!: number; @Field(() => String) kind!: string;
  @Field(() => String) content!: string;
}
@ObjectType("EventMonitorThinkingVisual")
class ThinkingVisualObject {
  @Field(() => ID) visualId!: string; @Field(() => ID) eventId!: string;
  @Field(() => Int) kindOrdinal!: number; @Field(() => String) kind!: string;
  @Field(() => String) content!: string;
}
@ObjectType("EventMonitorToolCardVisual")
class ToolCardVisualObject {
  @Field(() => ID) visualId!: string; @Field(() => ID) eventId!: string;
  @Field(() => Int) kindOrdinal!: number; @Field(() => String) kind!: string;
  @Field(() => String) invocationId!: string;
  @Field(() => String) cardKind!: string;
  @Field(() => String) toolName!: string;
  @Field(() => String) statusKey!: string;
  @Field(() => EventMonitorToolSummaryArgsObject) summaryArgs!: EventMonitorToolSummaryArgsObject;
  @Field(() => String, { nullable: true }) errorMessage?: string | null;
  @Field(() => EventMonitorApprovalTargetObject, { nullable: true }) approvalTarget?: EventMonitorApprovalTargetObject | null;
}
@ObjectType("EventMonitorMediaVisual")
class MediaVisualObject {
  @Field(() => ID) visualId!: string; @Field(() => ID) eventId!: string;
  @Field(() => Int) kindOrdinal!: number; @Field(() => String) kind!: string;
  @Field(() => String) mediaType!: string;
  @Field(() => [String]) urls!: string[];
}
@ObjectType("EventMonitorCompactionVisual")
class CompactionVisualObject {
  @Field(() => ID) visualId!: string; @Field(() => ID) eventId!: string;
  @Field(() => Int) kindOrdinal!: number; @Field(() => String) kind!: string;
  @Field(() => String) activityId!: string;
  @Field(() => String) phase!: string;
  @Field(() => String) message!: string;
  @Field(() => String, { nullable: true }) turnId?: string | null;
  @Field(() => Int, { nullable: true }) rawTraceCount?: number | null;
  @Field(() => Int, { nullable: true }) semanticFactCount?: number | null;
  @Field(() => String, { nullable: true }) provider?: string | null;
}

const visualTypes = {
  user: UserVisualObject,
  assistant_text: AssistantTextVisualObject,
  thinking: ThinkingVisualObject,
  tool_card: ToolCardVisualObject,
  media: MediaVisualObject,
  compaction: CompactionVisualObject,
} as const;

export const EventMonitorActiveTracePageVisualUnion = createUnionType({
  name: "EventMonitorActiveTracePageVisual",
  types: () => Object.values(visualTypes) as [
    typeof UserVisualObject, typeof AssistantTextVisualObject, typeof ThinkingVisualObject,
    typeof ToolCardVisualObject, typeof MediaVisualObject, typeof CompactionVisualObject,
  ],
  resolveType: (value) => visualTypes[(value as { kind: keyof typeof visualTypes }).kind],
});

@ObjectType("EventMonitorActiveTracePageEvent")
export class EventMonitorActiveTracePageEventObject {
  @Field(() => ID) eventId!: string;
  @Field(() => ID) turnGroupId!: string;
  @Field(() => Float, { nullable: true }) occurredAtMs?: number | null;
  @Field(() => [EventMonitorActiveTracePageVisualUnion]) visuals!: Array<typeof EventMonitorActiveTracePageVisualUnion>;
}

@ObjectType("EventMonitorActiveTracePage")
export class EventMonitorActiveTracePageObject {
  @Field(() => [EventMonitorActiveTracePageEventObject]) events!: EventMonitorActiveTracePageEventObject[];
  @Field(() => String, { nullable: true }) beforeCursor?: string | null;
  @Field(() => Boolean) hasEarlier!: boolean;
  @Field(() => Int) loadedEarlierCount!: number;
  @Field(() => String) activeGeneration!: string;
  @Field(() => String) cursorStatus!: string;
}
