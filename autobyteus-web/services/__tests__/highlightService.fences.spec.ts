// @vitest-environment jsdom
import MarkdownIt from 'markdown-it';
import { describe, expect, it } from 'vitest';
import highlightService from '~/services/highlightService';
import { markdownItPrism } from '~/utils/markdownItPrism';

/**
 * autobyteus-642 SR-006 (REQ-004, AC-004): chat messages highlight code blocks by their fence's name. `markdownItPrism`
 * hands the name to `highlightService.highlight`, which has a Prism grammar for each listed language and for the names
 * people write on fences (`rs`, `zsh`, `yml`, `sh`, `dockerfile`). Python, TypeScript, JSON and Markdown are unchanged.
 * Production: highlightService (its Prism grammars and aliases), markdownItPrism over a real markdown-it.
 */
const SAMPLES: ReadonlyArray<[fence: string, code: string]> = [
  ['yaml', 'name: app # the name\nports:\n  - 8080\n'],
  ['yml', 'debug: true\nlabel: "x"\n'],
  ['toml', '[package]\nname = "demo" # x\nversion = 1\n'],
  ['bash', 'if [ -n "$1" ]; then echo "hi $1"; fi\n'],
  ['sh', 'export PATH="$HOME/bin:$PATH" # path\n'],
  ['zsh', 'alias ll="ls -l"\nfor f in *; do echo $f; done\n'],
  ['go', 'package main\n\nfunc main() { fmt.Println("hi") } // x\n'],
  ['rust', 'fn main() { let x: u32 = 1; println!("{}", x); } // x\n'],
  ['rs', 'fn main() { let x: u32 = 1; } // x\n'],
  ['java', 'public class App { static int n = 1; } // x\n'],
  ['xml', '<?xml version="1.0"?>\n<project a="1"><!-- c --></project>\n'],
  ['ini', '[core]\nname = demo ; note\n'],
  ['docker', 'FROM node:22\nRUN npm ci # deps\n'],
  ['dockerfile', 'FROM node:22\nCMD ["node", "app.js"]\n'],
];

const UNCHANGED: ReadonlyArray<[fence: string, code: string]> = [
  ['python', 'def f(x):\n    return x + 1  # one\n'],
  ['typescript', 'const n: number = 1; // one\n'],
  ['json', '{ "a": 1, "b": [true] }\n'],
  ['markdown', '# Title\n\n*one* `two`\n'],
];

const tokenClasses = (html: string): Set<string> => new Set([...html.matchAll(/class="token ([\w-]+)/g)].map((match) => match[1]));

describe('highlightService: message code blocks by fence name (autobyteus-642 SR-006)', () => {
  it.each([...SAMPLES, ...UNCHANGED])('a ```%s block is highlighted (several token classes)', (fence, code) => {
    expect(tokenClasses(highlightService.highlight(code, fence)).size).toBeGreaterThan(1);
  });

  it('reaches the grammar from a message, through markdownItPrism', () => {
    const md = new MarkdownIt();
    md.use(markdownItPrism);
    const html = md.render('```rs\nfn main() { let x: u32 = 1; } // x\n```\n');
    expect(html).toContain('class="language-rs"');
    expect(tokenClasses(html).size).toBeGreaterThan(1);
  });

  it('leaves a fence with no grammar as plain, escaped text', () => {
    expect(highlightService.highlight('<b>a</b>', 'not-a-language')).toBe('&lt;b>a&lt;/b>');
  });
});
