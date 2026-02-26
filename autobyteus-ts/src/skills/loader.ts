import fs from 'fs';
import path from 'path';
import { Skill } from './model.js';

export class SkillLoader {
  static loadSkill(skillPath: string): Skill {
    if (!fs.existsSync(skillPath) || !fs.statSync(skillPath).isDirectory()) {
      throw new Error(`Skill directory not found: ${skillPath}`);
    }

    const skillFile = path.join(skillPath, 'SKILL.md');
    if (!fs.existsSync(skillFile)) {
      throw new Error(`SKILL.md not found in ${skillPath}`);
    }

    let rawContent: string;
    try {
      rawContent = fs.readFileSync(skillFile, 'utf-8');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to read SKILL.md at ${skillFile}: ${message}`);
    }

    return SkillLoader.parseSkill(rawContent, skillPath);
  }

  static parseSkill(rawContent: string, rootPath: string): Skill {
    const match = rawContent.match(/^\s*---\s*\r?\n([\s\S]*?)\r?\n\s*---\s*\r?\n([\s\S]*)/m);
    if (!match) {
      throw new Error("Invalid SKILL.md format: Could not find frontmatter block delimited by '---'");
    }

    const frontmatterText = match[1];
    const bodyContent = match[2].trim();

    const metadata: Record<string, string> = {};
    for (const line of frontmatterText.split(/\r?\n/)) {
      if (line.includes(':')) {
        const [key, ...rest] = line.split(':');
        const value = rest.join(':');
        metadata[key.trim().toLowerCase()] = value.trim();
      }
    }

    const name = metadata['name'];
    const description = metadata['description'];

    if (!name) {
      throw new Error("Missing 'name' in SKILL.md metadata");
    }
    if (!description) {
      throw new Error("Missing 'description' in SKILL.md metadata");
    }

    return new Skill(name, description, bodyContent, rootPath);
  }
}
