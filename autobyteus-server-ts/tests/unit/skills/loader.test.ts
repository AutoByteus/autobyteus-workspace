import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { SkillLoader } from "../../../src/skills/loader.js";

describe("SkillLoader", () => {
  let loader: SkillLoader;
  let tempDir: string;

  beforeEach(() => {
    loader = new SkillLoader();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "autobyteus-skill-"));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  const writeSkillMd = (content: string): string => {
    const skillDir = path.join(tempDir, "test_skill");
    fs.mkdirSync(skillDir, { recursive: true });
    fs.writeFileSync(path.join(skillDir, "SKILL.md"), content, "utf-8");
    return skillDir;
  };

  it("loads skill with valid SKILL.md", () => {
    const skillContent = `---
name: test_skill
description: A test skill for validation
---

# Test Skill

This is the body of the skill.

## Features
- Feature 1
- Feature 2
`;
    const skillDir = writeSkillMd(skillContent);

    const skill = loader.loadSkill(skillDir);

    expect(skill.name).toBe("test_skill");
    expect(skill.description).toBe("A test skill for validation");
    expect(skill.content).toContain("# Test Skill");
    expect(skill.content).toContain("Feature 1");
    expect(skill.rootPath).toBe(path.resolve(skillDir));
    expect(skill.fileCount).toBe(1);
  });

  it("throws when SKILL.md is missing", () => {
    const skillDir = path.join(tempDir, "missing_skill");
    fs.mkdirSync(skillDir, { recursive: true });
    expect(() => loader.loadSkill(skillDir)).toThrowError(/SKILL.md not found/);
  });

  it("throws when frontmatter is invalid", () => {
    const skillDir = writeSkillMd("# Test Skill\n\nNo frontmatter here.");
    expect(() => loader.loadSkill(skillDir)).toThrowError(/must start with frontmatter/);
  });

  it("throws when frontmatter is incomplete", () => {
    const content = `---
name: test_skill
description: Test
Body starts here without closing frontmatter marker
`;
    const skillDir = writeSkillMd(content);
    expect(() => loader.loadSkill(skillDir)).toThrowError(/frontmatter must be enclosed/);
  });

  it("throws when frontmatter missing name", () => {
    const content = `---
description: A test skill
---

# Test Skill
`;
    const skillDir = writeSkillMd(content);
    expect(() => loader.loadSkill(skillDir)).toThrowError(/'name' and 'description'/);
  });

  it("throws when frontmatter missing description", () => {
    const content = `---
name: test_skill
---

# Test Skill
`;
    const skillDir = writeSkillMd(content);
    expect(() => loader.loadSkill(skillDir)).toThrowError(/'name' and 'description'/);
  });

  it("counts additional files", () => {
    const content = `---
name: multi_file_skill
description: Skill with multiple files
---

# Multi-File Skill
`;
    const skillDir = writeSkillMd(content);

    fs.writeFileSync(path.join(skillDir, "script.sh"), "#!/bin/bash\necho 'test'");
    fs.writeFileSync(path.join(skillDir, "config.json"), '{"key": "value"}');
    const scriptsDir = path.join(skillDir, "scripts");
    fs.mkdirSync(scriptsDir, { recursive: true });
    fs.writeFileSync(path.join(scriptsDir, "helper.py"), "# Helper script");

    const skill = loader.loadSkill(skillDir);
    expect(skill.fileCount).toBe(4);
  });

  it("parses multiline descriptions", () => {
    const content = `---
name: skill_name
description: First line
Second line
Third line
---

Body content here.
`;

    const result = loader.parseFrontmatter(content);
    expect(result.metadata.name).toBe("skill_name");
    expect(result.metadata.description).toBe("First line\nSecond line\nThird line");
    expect(result.body).toBe("Body content here.");
  });

  it("preserves bracket descriptions", () => {
    const content = `---
name: skill_name
description: [TODO: Complete and informative explanation, file types, or tasks that trigger it.]
---

Body content.
`;

    const result = loader.parseFrontmatter(content);
    expect(result.metadata.description).toBe(
      "[TODO: Complete and informative explanation, file types, or tasks that trigger it.]",
    );
    expect(result.body).toBe("Body content.");
  });
});
