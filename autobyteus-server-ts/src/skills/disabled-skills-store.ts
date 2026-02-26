import fs from "node:fs";
import path from "node:path";

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};

export class DisabledSkillsStore {
  private storePath: string;
  private disabledSkills: string[] = [];

  constructor(storePath: string) {
    this.storePath = storePath;
    this.load();
  }

  private load(): void {
    if (!fs.existsSync(this.storePath)) {
      this.disabledSkills = [];
      return;
    }

    try {
      const content = fs.readFileSync(this.storePath, "utf-8");
      const data = JSON.parse(content);
      if (Array.isArray(data)) {
        this.disabledSkills = data.filter((item): item is string => typeof item === "string");
      } else {
        logger.warn(
          `Invalid disabled_skills.json format, expected list, got ${typeof data}`,
        );
        this.disabledSkills = [];
      }
    } catch (error) {
      if (error instanceof SyntaxError) {
        logger.warn(
          `Failed to parse disabled_skills.json: ${String(error)}. Starting with empty list.`,
        );
      } else {
        logger.error(`Error loading disabled_skills.json: ${String(error)}`);
      }
      this.disabledSkills = [];
    }
  }

  private save(): void {
    try {
      fs.mkdirSync(path.dirname(this.storePath), { recursive: true });
      fs.writeFileSync(
        this.storePath,
        JSON.stringify(this.disabledSkills, null, 2),
        "utf-8",
      );
    } catch (error) {
      logger.error(`Failed to save disabled_skills.json: ${String(error)}`);
    }
  }

  getDisabledSkills(): string[] {
    return [...this.disabledSkills];
  }

  add(skillName: string): void {
    if (!this.disabledSkills.includes(skillName)) {
      this.disabledSkills.push(skillName);
      this.save();
    }
  }

  remove(skillName: string): void {
    if (this.disabledSkills.includes(skillName)) {
      this.disabledSkills = this.disabledSkills.filter((name) => name !== skillName);
      this.save();
    }
  }

  isDisabled(skillName: string): boolean {
    return this.disabledSkills.includes(skillName);
  }
}
