import { describe, expect, it } from 'vitest';
import { mapAbsolutePathToWorkspaceRelative } from '../absoluteWorkspacePathMapping';

describe('absolute workspace path mapping', () => {
  const workspace = {
    workspaceId: 'workspace-1',
    workspaceRootPath: '/Users/name/project',
  };

  it('maps only paths contained by the active workspace', () => {
    expect(mapAbsolutePathToWorkspaceRelative('/Users/name/project/docs/report.md', workspace)).toEqual({
      workspaceId: 'workspace-1',
      relativePath: 'docs/report.md',
    });
    expect(mapAbsolutePathToWorkspaceRelative('/Users/name/other/report.md', workspace)).toBeNull();
    expect(mapAbsolutePathToWorkspaceRelative('/Users/name/project', workspace)).toBeNull();
  });

  it('handles Windows separator and drive casing differences', () => {
    expect(mapAbsolutePathToWorkspaceRelative('c:\\Work\\Docs\\report.md', {
      workspaceId: 'workspace-2',
      workspaceRootPath: 'C:\\Work',
    })).toEqual({ workspaceId: 'workspace-2', relativePath: 'Docs/report.md' });
  });
});
