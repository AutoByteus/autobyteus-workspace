import { describe, expect, it } from "vitest";
import { commandLine } from "../../../src/agent-work-journal/rendering/journal-actions.js";
import { skillNameOfPlainRead } from "../../../src/agent-work-journal/rendering/skill-load.js";
import { OK } from "../../../src/agent-work-journal/rendering/tool-outcome.js";

/** AC-003: a plain read of one SKILL.md in a skills folder is a skill load, on every runtime. */
describe("skillNameOfPlainRead", () => {
  it.each([
    ["cat /home/me/.claude/skills/python-style/SKILL.md", "python-style"],
    ["cat -n /work/.agents/skills/code-review/SKILL.md", "code-review"],
    ["sed -n '1,220p' /home/me/.codex/skills/x/SKILL.md", "x"],
    ["sed -n '10,$p' /home/me/.codex/skills/x/SKILL.md", "x"],
    ["head -n 50 /home/me/.codex/skills/x/SKILL.md", "x"],
    ["head -20 /home/me/skills/x/SKILL.md", "x"],
    ["nl /home/me/skills/x/SKILL.md", "x"],
    ["cat -n /work/.claude/skills/code-review/SKILL.md | sed -n '5,40p'", "code-review"],
    ["cat '/Users/me/My Skills/skills/spaced/SKILL.md'", "spaced"],
    ["cat /srv/autobyteus-skills/deploy/SKILL.md", "deploy"],
    ["cat /srv/autobyteus-private-skills/deploy/SKILL.md", "deploy"],
    ["cat /home/me/.codex/skills/.system/imagegen/SKILL.md", "imagegen"],
    ["cat skills/relative/SKILL.md", "relative"],
  ])("%s → %s", (command, name) => expect(skillNameOfPlainRead(command)).toBe(name));

  it.each([
    ["cd /w/skills/x && cat SKILL.md"],
    ["cat /w/skills/x/SKILL.md /w/skills/y/SKILL.md"],
    ["cat /w/skills/x/SKILL.md | head -5"],
    ["cat /w/skills/x/SKILL.md > /tmp/copy"],
    ["cat /w/skills/x/SKILL.md; rm -rf /w"],
    ["cat $HOME/skills/x/SKILL.md"],
    ["ls /w/skills/x/SKILL.md"],
    ["grep -n use /w/skills/x/SKILL.md"],
    ["cat /w/skills/x/README.md"],
    ["cat /w/agents/x/SKILL.md"],
    ["cat /w/autobyteus-mcps/x/SKILL.md"],
    ["cat /w/origin/x/SKILL.md"],
    ["cat /w/SKILL.md"],
    ["cat /w/skills/SKILL.md"],
    ["cat /w/.system/x/SKILL.md"],
    ["sed -n '1,5p;9p' /w/skills/x/SKILL.md"],
    ["sed -i s/a/b/ /w/skills/x/SKILL.md"],
    ["cat \"/w/skills/x/SKILL.md"],
    ["cat"],
    [""],
  ])("%s stays a command", (command) => expect(skillNameOfPlainRead(command)).toBeNull());
});

describe("commandLine and the skill rule", () => {
  const ok = { outcome: OK, output: "# Skill text\nlong…" };

  it("prints Load skill without the skill's text, and ignores the working-folder note", () => {
    expect(commandLine("cat /home/me/.codex/skills/x/SKILL.md", ["in /work"], ok)).toEqual({ head: "Load skill: x", outcome: OK, parts: [] });
  });

  it("keeps a failure's text", () => {
    const failed = { outcome: { kind: "failed" as const, error: "No such file" }, output: null };
    expect(commandLine("cat /w/skills/x/SKILL.md", [], failed)).toEqual({ head: "Load skill: x", outcome: failed.outcome, parts: [] });
  });

  it("a background command is a command", () => {
    expect(commandLine("cat /w/skills/x/SKILL.md", ["background"], ok).head).toBe("Command: cat /w/skills/x/SKILL.md (background)");
  });

  it("a command with no text is a command", () => {
    expect(commandLine(null, [], ok).head).toBe("Command: (command not recorded)");
  });
});
