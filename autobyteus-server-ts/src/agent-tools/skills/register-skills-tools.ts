import { registerGetAvailableSkillsTool } from "./get-available-skills.js";
import { registerGetSkillContentTool } from "./get-skill-content.js";
import { registerLoadSkillTool } from "./load-skill.js";

export function registerSkillsTools(): void {
  registerGetAvailableSkillsTool();
  registerGetSkillContentTool();
  registerLoadSkillTool();
}
