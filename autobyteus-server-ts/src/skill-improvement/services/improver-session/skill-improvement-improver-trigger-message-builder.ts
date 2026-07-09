import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { SenderType } from "autobyteus-ts/agent/sender-type.js";
import { SKILL_IMPROVEMENT_TARGET_MESSAGE_TYPE } from "../../domain/messages.js";
import type { SkillImprovementSkillTarget } from "../../domain/models.js";
import type { SkillImprovementImproverSession, SkillImprovementImproverTriggerRequest } from "../../domain/improver-session.js";
import { SkillImprovementSkillPackageTreeRenderer } from "./skill-improvement-skill-package-tree-renderer.js";

export class SkillImprovementImproverTriggerMessageBuilder {
  constructor(
    private readonly packageTreeRenderer = new SkillImprovementSkillPackageTreeRenderer(),
  ) {}

  async build(
    request: SkillImprovementImproverTriggerRequest,
    _session: SkillImprovementImproverSession,
  ): Promise<AgentInputUserMessage> {
    const editablePackages = await this.renderEditablePackages(request.editableSkillTargets);
    const prompt = `Skill Improvement requested for the target run/agent.

Use the listed work trace files as the evidence package.
The task message and work trace manifest provide the target identity.

Work trace manifest: ${request.workTracePackage.manifestPath}
Work trace root: ${request.workTracePackage.workTraceRootPath}
Work trace files:
${request.workTracePackage.manifest.files.map((file, index) => `${index + 1}. ${file.filePath}`).join("\n")}

Editable skill packages:
${editablePackages}

Completion target:
- target_agent_run_id: ${request.targetAgentRunId}
- message_type: ${SKILL_IMPROVEMENT_TARGET_MESSAGE_TYPE}`;
    return new AgentInputUserMessage(prompt, SenderType.USER, null, {
      skill_improvement_work_trace_manifest_path: request.workTracePackage.manifestPath,
      skill_improvement_work_trace_root_path: request.workTracePackage.workTraceRootPath,
      skill_improvement_editable_skill_roots: request.editableSkillTargets.map((target) => target.skillRootPath),
      skill_improvement_primary_skill_paths: request.editableSkillTargets.map((target) => target.skillMdPath),
      skill_improvement_entry_skill_paths: request.editableSkillTargets.map((target) => target.skillMdPath),
      skill_improvement_target_agent_run_id: request.targetAgentRunId,
      skill_improvement_target_message_type: SKILL_IMPROVEMENT_TARGET_MESSAGE_TYPE,
    });
  }

  private async renderEditablePackages(skillTargets: SkillImprovementSkillTarget[]): Promise<string> {
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
