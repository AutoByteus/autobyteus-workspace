import { registerGetAvailableSkillsTool } from "./get-available-skills.js";
import { registerGetSkillContentTool } from "./get-skill-content.js";

export function registerSkillsTools(): void {
  registerGetAvailableSkillsTool();
  registerGetSkillContentTool();
}
