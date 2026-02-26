import fs from "node:fs";
import path from "node:path";
import { Skill } from "./domain/models.js";

export class SkillLoader {
  loadSkill(skillDirPath: string, isReadonly = false): Skill {
    const skillMdPath = path.join(skillDirPath, "SKILL.md");
    if (!fs.existsSync(skillMdPath)) {
      throw new Error(`SKILL.md not found in ${skillDirPath}`);
    }

    const content = fs.readFileSync(skillMdPath, "utf-8");
    const { metadata, body } = this.parseFrontmatter(content);

    const fileCount = this.countFiles(skillDirPath);

    return new Skill({
      name: metadata.name,
      description: metadata.description,
      content: body,
      rootPath: path.resolve(skillDirPath),
      fileCount,
      isReadonly,
    });
  }

  private countFiles(directory: string): number {
    let count = 0;
    const entries = fs.readdirSync(directory, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === ".git") {
        continue;
      }
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        count += this.countFiles(entryPath);
      } else if (entry.isFile()) {
        count += 1;
      }
    }
    return count;
  }

  parseFrontmatter(content: string): { metadata: { name: string; description: string }; body: string } {
    if (!content.startsWith("---")) {
      throw new Error("SKILL.md must start with frontmatter (---)");
    }

    const parts = content.split("---", 3);
    if (parts.length < 3) {
      throw new Error("Invalid SKILL.md format: frontmatter must be enclosed by ---");
    }

    const frontmatter = parts[1]?.replace(/^\n/, "").replace(/\n$/, "") ?? "";
    const lines = frontmatter.split(/\r?\n/);
    let nameIndex: number | null = null;
    let descriptionIndex: number | null = null;

    for (let idx = 0; idx < lines.length; idx += 1) {
      const line = lines[idx] ?? "";
      if (line.startsWith("name:")) {
        if (nameIndex !== null) {
          throw new Error("SKILL.md frontmatter must include a single 'name' field");
        }
        nameIndex = idx;
        continue;
      }
      if (line.startsWith("description:")) {
        if (descriptionIndex !== null) {
          throw new Error("SKILL.md frontmatter must include a single 'description' field");
        }
        descriptionIndex = idx;
        continue;
      }
    }

    if (nameIndex === null || descriptionIndex === null) {
      throw new Error("SKILL.md frontmatter must include 'name' and 'description' fields");
    }

    if (nameIndex > descriptionIndex) {
      throw new Error("SKILL.md frontmatter must list 'name' before 'description'");
    }

    const nameLine = lines[nameIndex];
    const descLine = lines[descriptionIndex];
    const nameValue = nameLine.slice(nameLine.indexOf(":") + 1).trimStart();
    const descFirst = descLine.slice(descLine.indexOf(":") + 1).trimStart();
    let descriptionValue = descFirst;
    if (descriptionIndex + 1 < lines.length) {
      const descRest = lines.slice(descriptionIndex + 1).join("\n");
      descriptionValue = `${descFirst}\n${descRest}`;
    }

    const body = parts[2]?.trim() ?? "";

    return {
      metadata: {
        name: nameValue,
        description: descriptionValue,
      },
      body,
    };
  }
}
