import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { SenderType } from "autobyteus-ts/agent/sender-type.js";
import { SELF_EVOLUTION_TARGET_MESSAGE_TYPE } from "../../domain/messages.js";
import type { SelfEvolutionSkillTarget } from "../../domain/models.js";
import type { SelfEvolutionCompanionSession, SelfEvolutionCompanionTriggerRequest } from "../../domain/evolver-session.js";

export class SelfEvolutionCompanionTriggerMessageBuilder {
  build(request: SelfEvolutionCompanionTriggerRequest, session: SelfEvolutionCompanionSession): AgentInputUserMessage {
    const editablePackages = this.renderEditablePackages(request.editableSkillTargets);
    const priorRuns = session.state.priorEvolverRunIds.length
      ? `\nPrevious evolver run ids for continuity context: ${session.state.priorEvolverRunIds.join(", ")}`
      : "";
    const prompt = `Self Improve requested for the target worker. Read the provided self-evolution work trace files as needed; do not read raw_traces*.jsonl files.\n\nWork trace manifest: ${request.workTracePackage.manifestPath}\nWork trace root: ${request.workTracePackage.workTraceRootPath}\nWork trace files:\n${request.workTracePackage.manifest.files.map((file, index) => `${index + 1}. ${file.filePath}`).join("\n")}\n${priorRuns}\n\nEditable skill packages:\n${editablePackages}\n\nRules:\n1. Use the work trace files as coaching evidence. They are semantically complete for self-evolution and hide backend protocol fields.\n2. You may inspect and edit files only inside the listed editable skill roots.\n3. Do not edit agent/team definitions, run memory, source code, tool/MCP configuration, raw trace files, or sibling skills that are not listed.\n4. If no durable reusable improvement is warranted, make no file changes and explain why.\n5. Do not copy secrets, private data, one-off paths, raw trace internals, or transient task specifics into durable skill content.\n6. At the end, if and only if you made meaningful durable skill package file changes, call send_message_to exactly once with target_agent_run_id "${request.targetAgentRunId}", message_type "${SELF_EVOLUTION_TARGET_MESSAGE_TYPE}", self-contained content that explains the durable skill guidance change, and reference_files from updated or directly relevant surviving files inside the editable skill roots.`;
    return new AgentInputUserMessage(prompt, SenderType.USER, null, {
      self_evolution_work_trace_manifest_path: request.workTracePackage.manifestPath,
      self_evolution_work_trace_root_path: request.workTracePackage.workTraceRootPath,
      self_evolution_editable_skill_roots: request.editableSkillTargets.map((target) => target.skillRootPath),
      self_evolution_primary_skill_paths: request.editableSkillTargets.map((target) => target.skillMdPath),
      self_evolution_target_agent_run_id: request.targetAgentRunId,
      self_evolution_target_message_type: SELF_EVOLUTION_TARGET_MESSAGE_TYPE,
    });
  }

  private renderEditablePackages(skillTargets: SelfEvolutionSkillTarget[]): string {
    return skillTargets.map((target, index) => [
      `${index + 1}. ${target.skillName}`,
      `   Root directory: ${target.skillRootPath}`,
      `   Primary guidance file: ${target.skillMdPath}`,
    ].join("\n")).join("\n");
  }
}
