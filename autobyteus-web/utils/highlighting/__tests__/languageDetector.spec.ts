// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from 'vitest';
import highlightService from '~/services/highlightService';
import { getMonacoLanguage, getPrismLanguage } from '~/utils/highlighting/languageDetector';
import { highlightWriteFileSegment } from '~/utils/highlighting/segmentHighlighter';
import type { WriteFileSegment } from '~/types/segments';

/**
 * autobyteus-642 D-4 (REQ-004, AC-004): one table of file types with each engine's language name. For each listed type a
 * sample is highlighted by Monaco (the file viewer: its own grammar for the name the table gives, tokenized) and by Prism
 * (chat file previews: token spans). Python, TypeScript, JSON and Markdown keep their names.
 */
const SAMPLES: ReadonlyArray<[path: string, monaco: string, prism: string, sample: string]> = [
  ['config/app.yaml', 'yaml', 'yaml', 'name: app # the name\nports:\n  - 8080\n'],
  ['config/app.yml', 'yaml', 'yaml', 'debug: true\nlabel: "x"\n'],
  ['Cargo.toml', 'ini', 'toml', '[package]\nname = "demo" # x\nversion = 1\n'],
  ['scripts/build.sh', 'shell', 'bash', '#!/bin/sh\nif [ -n "$1" ]; then echo "hi $1"; fi\n'],
  ['scripts/env.bash', 'shell', 'bash', 'export PATH="$HOME/bin:$PATH" # path\n'],
  ['scripts/rc.zsh', 'shell', 'bash', 'alias ll="ls -l"\nfor f in *; do echo $f; done\n'],
  ['cmd/main.go', 'go', 'go', 'package main\n\nfunc main() { fmt.Println("hi") } // x\n'],
  ['src/lib.rs', 'rust', 'rust', 'fn main() { let x: u32 = 1; println!("{}", x); } // x\n'],
  ['src/App.java', 'java', 'java', 'public class App { static int n = 1; } // x\n'],
  ['pom.xml', 'xml', 'markup', '<?xml version="1.0"?>\n<project a="1"><!-- c --></project>\n'],
  ['settings.ini', 'ini', 'ini', '[core]\nname = demo ; note\n'],
  ['Dockerfile', 'dockerfile', 'docker', 'FROM node:22\nRUN npm ci # deps\nCMD ["node", "app.js"]\n'],
  ['web/index.html', 'html', 'markup', '<!doctype html>\n<p class="x">Hi</p>\n'],
  ['web/App.vue', 'html', 'vue', '<template>\n  <p class="x">{{ msg }}</p>\n</template>\n<script setup lang="ts">\nconst msg = 1;\n</script>\n'],
];

const UNCHANGED: ReadonlyArray<[path: string, monaco: string, prism: string]> = [
  ['app/main.py', 'python', 'python'],
  ['src/index.ts', 'typescript', 'typescript'],
  ['package.json', 'json', 'json'],
  ['README.md', 'markdown', 'markdown'],
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

/** The distinct Prism token classes in the preview of `path`. */
const prismTokenClasses = (path: string, sample: string): Set<string> => {
  const segment = { type: 'write_file', invocationId: 'i', toolName: 'write_file', arguments: {}, status: 'parsed', logs: [],
    result: null, error: null, path, originalContent: sample, language: getPrismLanguage(path) } as WriteFileSegment;
  const html = highlightWriteFileSegment(segment).highlightedContent ?? '';
  return new Set([...html.matchAll(/class="token ([\w-]+)/g)].map((match) => match[1]));
};

describe('languageDetector (autobyteus-642 D-4)', () => {
  it.each(SAMPLES)('%s: Monaco %s, Prism %s', (path, monacoName, prismName) => {
    expect({ monaco: getMonacoLanguage(path), prism: getPrismLanguage(path) }).toEqual({ monaco: monacoName, prism: prismName });
  });

  it.each(UNCHANGED)('%s keeps Monaco %s and Prism %s', (path, monacoName, prismName) => {
    expect({ monaco: getMonacoLanguage(path), prism: getPrismLanguage(path) }).toEqual({ monaco: monacoName, prism: prismName });
  });

  it.each(['notes.txt', 'Makefile', 'archive.tar.gz', '.env', 'src/dockerfile.md.bak'])('%s is plain text in both', (path) => {
    expect({ monaco: getMonacoLanguage(path), prism: getPrismLanguage(path) }).toEqual({ monaco: 'plaintext', prism: 'plaintext' });
  });

  it('matches by the file name, not a folder, and ignores case', () => {
    expect(getMonacoLanguage('docker/Dockerfile')).toBe('dockerfile');
    expect(getPrismLanguage('C:\\work\\CONFIG.YML')).toBe('yaml');
    expect(getMonacoLanguage('src.yaml/notes')).toBe('plaintext');
  });

  it.each(SAMPLES)('%s is highlighted by Monaco (its %s grammar gives several token kinds)', async (path, _monaco, _prism, sample) => {
    expect((await monacoTokenKinds(getMonacoLanguage(path), sample)).size).toBeGreaterThan(1);
  });

  it.each(SAMPLES)('%s is highlighted by Prism (several token classes)', (path, _monaco, _prism, sample) => {
    expect(prismTokenClasses(path, sample).size).toBeGreaterThan(1);
  });

  it('highlights nothing Prism has no grammar for, as before', () => {
    expect(highlightService.highlight('a b', 'plaintext')).toBe('a b');
  });
});
