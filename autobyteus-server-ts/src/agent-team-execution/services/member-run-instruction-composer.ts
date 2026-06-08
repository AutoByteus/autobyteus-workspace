import type { MemberTeamContext } from "../domain/member-team-context.js";
import {
  buildTeamMembershipRosterManifest,
  renderTeamMembershipRosterManifest,
} from "./member-team-roster-manifest.js";

type MemberRunInstructionComposerInput = {
  teamInstruction: string | null;
  agentInstruction: string | null;
  memberTeamContext: MemberTeamContext | null;
  sendMessageToEnabled: boolean;
  taskDelegationEnabled?: boolean;
};

export type MemberRunInstructionComposition = {
  teamInstruction: string | null;
  agentInstruction: string | null;
  runtimeInstruction: string | null;
};

export const composeMemberRunInstructions = (
  input: MemberRunInstructionComposerInput,
): MemberRunInstructionComposition => {
  const memberTeamContext = input.memberTeamContext;
  const communicationRecipients = memberTeamContext?.communicationRecipients ?? [];
  const hasRosterRecipients = communicationRecipients.length > 0;
  const sendMessageToAvailable = input.sendMessageToEnabled && Boolean(memberTeamContext);
  const taskDelegationAvailable = input.taskDelegationEnabled === true && Boolean(memberTeamContext);

  const runtimeLines: string[] = [];
  if (memberTeamContext?.memberName) {
    runtimeLines.push(`Current team member: ${memberTeamContext.memberName}`);
  }

  if (sendMessageToAvailable) {
    runtimeLines.push(
      "If you use `send_message_to`, choose exactly one target selector.",
    );
    if (hasRosterRecipients) {
      runtimeLines.push(
        "Set `recipient_name` to one allowed roster name for a logical teammate.",
      );
    } else {
      runtimeLines.push(
        "No logical `recipient_name` roster recipients are currently listed for this run.",
      );
    }
    runtimeLines.push(
      "Set `target_agent_run_id` to an exact active/recoverable AgentRun id supplied by a task packet, task event, or prior message when the message must reach that exact run.",
    );
    runtimeLines.push(
      "Use `send_message_to` only for actual teammate delivery; plain text does not deliver a teammate message.",
    );
    runtimeLines.push(
      "When sending files the teammate may need to inspect, keep `content` self-contained like an email body and also list those absolute paths in `reference_files` for Team Communication messages.",
    );
    runtimeLines.push(
      "Example: content explains the handoff and may mention `/Users/me/project/implementation-handoff.md`; reference_files includes [`/Users/me/project/implementation-handoff.md`].",
    );
    runtimeLines.push("Do not claim teammate delivery unless the tool call succeeds.");
    const manifestText = renderTeamMembershipRosterManifest(
      buildTeamMembershipRosterManifest(memberTeamContext!),
    );
    if (manifestText) {
      runtimeLines.push("");
      runtimeLines.push(manifestText);
    }
  } else if (hasRosterRecipients) {
    runtimeLines.push(
      "Do not attempt `send_message_to`; it is not exposed for this run even though teammates exist.",
    );
  }

  if (taskDelegationAvailable) {
    if (runtimeLines.length > 0) {
      runtimeLines.push("");
    }
    runtimeLines.push("Task delegation protocol");
    runtimeLines.push("- Use `delegate_tasks` to assign bounded work to exact logical team members; use a one-item `tasks` list for a single task. The framework derives you as the delegator from tool context; do not pass delegator.");
    runtimeLines.push("- Do not use `create_task`, `create_tasks`, `get_my_tasks`, `get_task_plan_status`, or `assign_task_to`; they are not part of this delegation workflow.");
    runtimeLines.push("- Each `delegate_tasks` task item must include `member_name` and rich `description`; do not pass task_name, assignee_name, dependencies, completion_criteria, or expected_deliverables.");
    runtimeLines.push("- Activated task-agent instances receive task details directly in a work packet. The framework marks them active/running internally; do not report in_progress.");
    runtimeLines.push("- Task-agent progress, blockers, completion reports, feedback, and revision responses use ordinary `send_message_to` messages. Task-agents should send reports to the delegator reply recipient shown in their work packet.");
    runtimeLines.push("- `delegate_tasks` returns generated `task_id` values and `target_agent_run_id` values for concrete task-agent runs; use `send_message_to` with `target_agent_run_id` when feedback must reach that exact active task-agent.");
    runtimeLines.push("- Do not pass task-specific raw selector fields to `send_message_to`; the exact-run selector is the general `target_agent_run_id` field.");
    runtimeLines.push("- Original-delegator acceptance uses `accept_task` with the generated `task_id` after the task-agent's message report is satisfactory.");
    runtimeLines.push("- After the original delegator accepts the task, the task-agent's `target_agent_run_id` is no longer an active reachable message target and the framework settles or exits the final task-agent instance after that instance becomes idle and no delegated work remains for that instance.");
  }

  return {
    teamInstruction: input.teamInstruction,
    agentInstruction: input.agentInstruction,
    runtimeInstruction: runtimeLines.length > 0 ? runtimeLines.join("\n") : null,
  };
};
