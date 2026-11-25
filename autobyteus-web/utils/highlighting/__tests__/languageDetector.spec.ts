// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from 'vitest';
import { getMonacoLanguage } from '~/utils/highlighting/languageDetector';

/**
 * autobyteus-642 D-4, SR-006 (REQ-004, AC-004): the table of file types the file viewer highlights, with each one's Monaco
 * language. For each listed type a sample is highlighted by Monaco's own grammar for the name the table gives. Python,
 * TypeScript, JSON and Markdown keep their names. Message code blocks are `highlightService`'s (its fence spec).
 */
const SAMPLES: ReadonlyArray<[path: string, monaco: string, sample: string]> = [
  ['config/app.yaml', 'yaml', 'name: app # the name\nports:\n  - 8080\n'],
  ['config/app.yml', 'yaml', 'debug: true\nlabel: "x"\n'],
  ['Cargo.toml', 'ini', '[package]\nname = "demo" # x\nversion = 1\n'],
  ['scripts/build.sh', 'shell', '#!/bin/sh\nif [ -n "$1" ]; then echo "hi $1"; fi\n'],
  ['scripts/env.bash', 'shell', 'export PATH="$HOME/bin:$PATH" # path\n'],
  ['scripts/rc.zsh', 'shell', 'alias ll="ls -l"\nfor f in *; do echo $f; done\n'],
  ['cmd/main.go', 'go', 'package main\n\nfunc main() { fmt.Println("hi") } // x\n'],
  ['src/lib.rs', 'rust', 'fn main() { let x: u32 = 1; println!("{}", x); } // x\n'],
  ['src/App.java', 'java', 'public class App { static int n = 1; } // x\n'],
  ['pom.xml', 'xml', '<?xml version="1.0"?>\n<project a="1"><!-- c --></project>\n'],
  ['settings.ini', 'ini', '[core]\nname = demo ; note\n'],
  ['Dockerfile', 'dockerfile', 'FROM node:22\nRUN npm ci # deps\nCMD ["node", "app.js"]\n'],
  ['web/index.html', 'html', '<!doctype html>\n<p class="x">Hi</p>\n'],
  ['web/App.vue', 'html', '<template>\n  <p class="x">{{ msg }}</p>\n</template>\n<script setup lang="ts">\nconst msg = 1;\n</script>\n'],
];

const UNCHANGED: ReadonlyArray<[path: string, monaco: string]> = [
  ['app/main.py', 'python'],
  ['src/index.ts', 'typescript'],
  ['package.json', 'json'],
  ['README.md', 'markdown'],
];

type MonacoApi = typeof import('monaco-editor/esm/vs/editor/editor.api.js');
let monaco: MonacoApi;

beforeAll(async () => {
  // Monaco's theme service reads the OS colour scheme; jsdom has no matchMedia.
  window.matchMedia = (() => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} })) as never;
  monaco = await import('monaco-editor/esm/vs/editor/editor.api.js');
});

/** The distinct token kinds Monaco's own grammar for `language` gives `sample`, whitespace left out. */
const monacoTokenKinds = async (language: string, sample: string): Promise<Set<string>> => {
  const grammar = await import(`../../../node_modules/monaco-editor/esm/vs/basic-languages/${language}/${language}.js`);
  monaco.languages.register({ id: language });
  monaco.languages.setMonarchTokensProvider(language, grammar.language);
  const kinds = monaco.editor.tokenize(sample, language).flat().map((token) => token.type.replace(`.${language}`, ''));
  return new Set(kinds.filter((kind) => kind !== '' && kind !== 'white'));
};

describe('languageDetector (autobyteus-642 D-4)', () => {
  it.each(SAMPLES)('%s: Monaco %s', (path, monacoName) => {
    expect(getMonacoLanguage(path)).toBe(monacoName);
  });

  it.each(UNCHANGED)('%s keeps Monaco %s', (path, monacoName) => {
    expect(getMonacoLanguage(path)).toBe(monacoName);
  });

  it.each(['notes.txt', 'Makefile', 'archive.tar.gz', '.env', 'src/dockerfile.md.bak'])('%s is plain text', (path) => {
    expect(getMonacoLanguage(path)).toBe('plaintext');
  });

  it('matches by the file name, not a folder, and ignores case', () => {
    expect(getMonacoLanguage('docker/Dockerfile')).toBe('dockerfile');
    expect(getMonacoLanguage('C:\\work\\CONFIG.YML')).toBe('yaml');
    expect(getMonacoLanguage('src.yaml/notes')).toBe('plaintext');
  });

  it.each(SAMPLES)('%s is highlighted by Monaco (its %s grammar gives several token kinds)', async (path, _monaco, sample) => {
    expect((await monacoTokenKinds(getMonacoLanguage(path), sample)).size).toBeGreaterThan(1);
  });
});
