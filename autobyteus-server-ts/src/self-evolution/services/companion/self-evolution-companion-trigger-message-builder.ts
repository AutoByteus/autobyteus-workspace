import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { SenderType } from "autobyteus-ts/agent/sender-type.js";
import { SELF_EVOLUTION_TARGET_MESSAGE_TYPE } from "../../domain/messages.js";
import type { SelfEvolutionSkillTarget } from "../../domain/models.js";
import type { SelfEvolutionCompanionSession, SelfEvolutionCompanionTriggerRequest } from "../../domain/evolver-session.js";
import { SelfEvolutionSkillPackageTreeRenderer } from "./self-evolution-skill-package-tree-renderer.js";

export class SelfEvolutionCompanionTriggerMessageBuilder {
  constructor(
    private readonly packageTreeRenderer = new SelfEvolutionSkillPackageTreeRenderer(),
  ) {}

  async build(
    request: SelfEvolutionCompanionTriggerRequest,
    session: SelfEvolutionCompanionSession,
  ): Promise<AgentInputUserMessage> {
    const editablePackages = await this.renderEditablePackages(request.editableSkillTargets);
    const priorRuns = session.state.priorEvolverRunIds.length
      ? `\nPrevious evolver run ids for continuity context: ${session.state.priorEvolverRunIds.join(", ")}`
      : "";
    const prompt = `Self-improvement requested for the target worker.

Use the listed work trace files as the evidence package.

Work trace manifest: ${request.workTracePackage.manifestPath}
Work trace root: ${request.workTracePackage.workTraceRootPath}
Work trace files:
${request.workTracePackage.manifest.files.map((file, index) => `${index + 1}. ${file.filePath}`).join("\n")}
${priorRuns}

Editable skill packages:
${editablePackages}

Completion target:
- target_agent_run_id: ${request.targetAgentRunId}
- message_type: ${SELF_EVOLUTION_TARGET_MESSAGE_TYPE}`;
    return new AgentInputUserMessage(prompt, SenderType.USER, null, {
      self_evolution_work_trace_manifest_path: request.workTracePackage.manifestPath,
      self_evolution_work_trace_root_path: request.workTracePackage.workTraceRootPath,
      self_evolution_editable_skill_roots: request.editableSkillTargets.map((target) => target.skillRootPath),
      self_evolution_primary_skill_paths: request.editableSkillTargets.map((target) => target.skillMdPath),
      self_evolution_entry_skill_paths: request.editableSkillTargets.map((target) => target.skillMdPath),
      self_evolution_target_agent_run_id: request.targetAgentRunId,
      self_evolution_target_message_type: SELF_EVOLUTION_TARGET_MESSAGE_TYPE,
    });
  }

  private async renderEditablePackages(skillTargets: SelfEvolutionSkillTarget[]): Promise<string> {
    const packageSections = await Promise.all(skillTargets.map(async (target, index) => {
      const tree = await this.packageTreeRenderer.render(target);
      const indentedTree = tree.split("\n").map((line) => `   ${line}`).join("\n");
      return [
        `${index + 1}. ${target.skillName}`,
        `   Root directory: ${target.skillRootPath}`,
        "   Package tree:",
        indentedTree,
      ].join("\n");
    }));
    return packageSections.join("\n");
  }
}
