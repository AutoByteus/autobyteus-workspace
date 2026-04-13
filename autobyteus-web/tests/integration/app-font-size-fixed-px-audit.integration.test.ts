import { readdirSync, readFileSync } from 'node:fs';
import { extname, relative, resolve, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

const SOURCE_EXTENSIONS = new Set([
  '.vue',
  '.ts',
  '.js',
  '.mjs',
  '.cjs',
]);

const EXCLUDED_DIRECTORIES = new Set([
  '__tests__',
  '__mocks__',
  '__snapshots__',
]);

const SETTINGS_COMPONENT_FILES = collectSourceFiles('components/settings');

const TARGETED_FILES = Array.from(new Set([
  ...SETTINGS_COMPONENT_FILES,
  'pages/settings.vue',
  'components/conversation/segments/renderer/MarkdownRenderer.vue',
  'components/conversation/segments/renderer/FileDisplay.vue',
  'components/fileExplorer/FileItem.vue',
  'components/workspace/agent/ArtifactList.vue',
  'components/workspace/agent/ArtifactItem.vue',
  'components/agentInput/AgentUserInputTextArea.vue',
  'components/agentInput/ContextFilePathInputArea.vue',
  'components/workspace/agent/AgentWorkspaceView.vue',
  'components/workspace/team/TeamWorkspaceView.vue',
  'components/workspace/common/WorkspaceHeaderActions.vue',
  'components/conversation/segments/InterAgentMessageSegment.vue',
  'components/workspace/agent/AgentConversationFeed.vue',
  'components/workspace/team/TeamMemberMonitorTile.vue',
  'components/workspace/running/TeamMemberRow.vue',
  'components/fileExplorer/MonacoEditor.vue',
  'components/workspace/tools/Terminal.vue',
  'components/workspace/history/WorkspaceHistoryWorkspaceSection.vue',
  'components/workspace/tools/VncHostTile.vue',
  'components/workspace/config/ModelConfigBasic.vue',
])).sort() as readonly string[];

const FIXED_PX_PATTERNS = [
  {
    label: 'hard-coded CSS font-size px',
    regex: /font-size\s*:\s*\d+(?:\.\d+)?px\b/g,
  },
  {
    label: 'Tailwind arbitrary text-[Npx]',
    regex: /text-\[\d+(?:\.\d+)?px\]/g,
  },
  {
    label: 'hard-coded JS fontSize number',
    regex: /fontSize\s*:\s*\d+(?:\.\d+)?\b/g,
  },
  {
    label: 'hard-coded JS fontSize px string',
    regex: /fontSize\s*:\s*['"]\d+(?:\.\d+)?px['"]/g,
  },
] as const;

function collectSourceFiles(relativeDirectory: string): string[] {
  const sourceFiles: string[] = [];
  const absoluteDirectory = resolve(process.cwd(), relativeDirectory);

  const walkDirectory = (currentDirectory: string): void => {
    for (const entry of readdirSync(currentDirectory, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (EXCLUDED_DIRECTORIES.has(entry.name)) {
          continue;
        }
        walkDirectory(resolve(currentDirectory, entry.name));
        continue;
      }

      if (!entry.isFile() || !SOURCE_EXTENSIONS.has(extname(entry.name))) {
        continue;
      }

      const absolutePath = resolve(currentDirectory, entry.name);
      sourceFiles.push(relative(process.cwd(), absolutePath).split(sep).join('/'));
    }
  };

  walkDirectory(absoluteDirectory);

  return sourceFiles.sort();
}

const findMatches = (relativePath: string): string[] => {
  const absolutePath = resolve(process.cwd(), relativePath);
  const source = readFileSync(absolutePath, 'utf8');
  const matches: string[] = [];

  for (const { label, regex } of FIXED_PX_PATTERNS) {
    for (const match of source.matchAll(regex)) {
      const matchIndex = match.index ?? 0;
      const lineNumber = source.slice(0, matchIndex).split('\n').length;
      const lineText = source.split('\n')[lineNumber - 1]?.trim() ?? '';
      matches.push(`${label} @ line ${lineNumber}: ${lineText}`);
    }
  }

  return matches;
};

describe('app font-size fixed-px audit', () => {
  it('keeps the corrected settings source perimeter enrolled in the durable audit', () => {
    expect(SETTINGS_COMPONENT_FILES.length).toBeGreaterThan(0);
    expect(SETTINGS_COMPONENT_FILES).toContain('components/settings/DisplaySettingsManager.vue');
    expect(SETTINGS_COMPONENT_FILES).toContain('components/settings/messaging/SetupChecklistCard.vue');
    expect(SETTINGS_COMPONENT_FILES).toContain('components/settings/VoiceInputExtensionCard.vue');
    expect(TARGETED_FILES).toContain('pages/settings.vue');
  });

  it('keeps the reviewed V1 typography perimeter free of fixed-px text sizing', () => {
    const failures = TARGETED_FILES.flatMap((relativePath) =>
      findMatches(relativePath).map((match) => `${relativePath} -> ${match}`),
    );

    expect(failures).toEqual([]);
  });
});
