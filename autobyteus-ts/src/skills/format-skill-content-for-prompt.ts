import fs from 'fs';
import path from 'path';
import { Skill } from './model.js';

const MARKDOWN_LINK_PATTERN = /\[([^\]]+)\]\(([^)]+)\)/g;

function splitDestinationAndSuffix(rawTarget: string): { destination: string; suffix: string } {
  const trimmed = rawTarget.trim();
  const match = /^(\S+)([\s\S]*)$/.exec(trimmed);
  if (!match) {
    return { destination: trimmed, suffix: '' };
  }
  return {
    destination: match[1],
    suffix: match[2] ?? ''
  };
}

function isExternalOrNonRelativeTarget(destination: string): boolean {
  return (
    destination.length === 0 ||
    destination.startsWith('#') ||
    path.isAbsolute(destination) ||
    /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(destination) ||
    destination.startsWith('//')
  );
}

function splitFragment(destination: string): { filePath: string; fragment: string } {
  const hashIndex = destination.indexOf('#');
  if (hashIndex === -1) {
    return { filePath: destination, fragment: '' };
  }
  return {
    filePath: destination.slice(0, hashIndex),
    fragment: destination.slice(hashIndex)
  };
}

export function rewriteResolvableMarkdownLinks(content: string, skillRootPath: string): string {
  return content.replace(MARKDOWN_LINK_PATTERN, (fullMatch, label: string, rawTarget: string) => {
    const { destination, suffix } = splitDestinationAndSuffix(rawTarget);
    if (isExternalOrNonRelativeTarget(destination)) {
      return fullMatch;
    }

    const { filePath, fragment } = splitFragment(destination);
    if (!filePath) {
      return fullMatch;
    }

    const resolvedPath = path.resolve(skillRootPath, filePath);
    if (!fs.existsSync(resolvedPath)) {
      return fullMatch;
    }

    return `[${label}](${resolvedPath}${fragment}${suffix})`;
  });
}

export function formatSkillContentForPrompt(skill: Skill): string {
  return rewriteResolvableMarkdownLinks(skill.content, skill.rootPath);
}
