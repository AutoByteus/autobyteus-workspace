import { describe, it, expect, beforeEach } from 'vitest';
import { defaultToolRegistry } from '../../../../src/tools/registry/tool-registry.js';
import { ToolDefinition } from '../../../../src/tools/registry/tool-definition.js';
import { ParameterSchema, ParameterDefinition, ParameterType } from '../../../../src/utils/parameter-schema.js';
import { PatchApplicationError, registerEditFileTool } from '../../../../src/tools/file/edit-file.js';
import { registerReadFileTool } from '../../../../src/tools/file/read-file.js';
import { BaseTool } from '../../../../src/tools/base-tool.js';
import fs from 'fs/promises';
import path from 'path';

const TOOL_NAME_EDIT_FILE = 'edit_file';

type MockContext = { agentId: string; workspaceRootPath: string | null };

describe('edit_file tool', () => {
  beforeEach(() => {
    defaultToolRegistry.clear();
    registerEditFileTool();
    registerReadFileTool();
  });

  const getPatchTool = (): BaseTool => defaultToolRegistry.createTool(TOOL_NAME_EDIT_FILE) as BaseTool;
  const getReadTool = (): BaseTool => defaultToolRegistry.createTool('read_file') as BaseTool;

  it('registers definition with expected schema', () => {
    const definition = defaultToolRegistry.getToolDefinition(TOOL_NAME_EDIT_FILE);
    expect(definition).toBeInstanceOf(ToolDefinition);
    expect(definition?.name).toBe(TOOL_NAME_EDIT_FILE);
    expect(definition?.description).toContain('Applies a context-located patch');
    expect(definition?.description).toContain('simplified unified-diff-style format');
    expect(definition?.description).toContain('read the current relevant file region unless it was just read');
    expect(definition?.description).toContain('do not reconstruct them from memory');
    expect(definition?.description).toContain('After an intervening edit or a context-match failure');
    expect(definition?.description).toContain('use `write_file` only for a deliberate whole-file rewrite');

    const schema = definition?.argumentSchema;
    expect(schema).toBeInstanceOf(ParameterSchema);
    expect(schema?.parameters.length).toBe(3);

    const pathParam = schema?.getParameter('path');
    expect(pathParam).toBeInstanceOf(ParameterDefinition);
    expect(pathParam?.type).toBe(ParameterType.STRING);
    expect(pathParam?.required).toBe(true);
    expect(pathParam?.description).toContain('If path is relative, you must provide an absolute base_dir');
    expect(schema?.getParameter('base_dir')?.required).toBe(false);

    const patchParam = schema?.getParameter('patch');
    expect(patchParam).toBeInstanceOf(ParameterDefinition);
    expect(patchParam?.type).toBe(ParameterType.STRING);
    expect(patchParam?.required).toBe(true);
    expect(patchParam?.description).toContain('bare `@@` line');
    expect(patchParam?.description).toContain('Copy unchanged and removal lines exactly');
    expect(patchParam?.description).toContain('`diff --git`, `---`, or `+++`');
    expect(patchParam?.description).toContain('numeric hunk coordinates');
    expect(patchParam?.description).toContain('`*** Begin Patch` and `*** End Patch`');
    expect(patchParam?.description).toContain(
      "Example patch:\n@@\n-const mode = 'old'\n+const mode = 'new'\n const keep = true"
    );
  });

  it('applies a context-located patch in an existing file', async () => {
    const tmpDir = await fs.mkdtemp(path.join(process.cwd(), 'tmp-edit-file-'));
    const filePath = path.join(tmpDir, 'sample.txt');
    await fs.writeFile(filePath, 'line1\nline2\nline3\n', 'utf-8');
    const patch = `@@
 line1
-line2
+line2 updated
 line3
`;

    const tool = getPatchTool();
    const context: MockContext = { agentId: 'agent', workspaceRootPath: tmpDir };
    const result = await tool.execute(context, { path: filePath, patch });

    expect(result).toBe(`File edited successfully at ${filePath}`);
    const content = await fs.readFile(filePath, 'utf-8');
    expect(content).toBe('line1\nline2 updated\nline3\n');
  });

  it('rejects git file headers because path is supplied separately', async () => {
    const tmpDir = await fs.mkdtemp(path.join(process.cwd(), 'tmp-edit-file-'));
    const filePath = path.join(tmpDir, 'sample_git_diff.txt');
    await fs.writeFile(filePath, 'line1\nline2\nline3\n', 'utf-8');

    const patch = `diff --git a/sample_git_diff.txt b/sample_git_diff.txt
index 1111111..2222222 100644
--- a/sample_git_diff.txt
+++ b/sample_git_diff.txt
@@
 line1
-line2
+line2 updated
 line3
`;

    const tool = getPatchTool();
    const context: MockContext = { agentId: 'agent', workspaceRootPath: tmpDir };
    await expect(tool.execute(context, { path: filePath, patch }))
      .rejects.toThrow(/unsupported patch header/i);
    expect(await fs.readFile(filePath, 'utf-8')).toBe('line1\nline2\nline3\n');
  });

  it('raises a concise unique-candidate PatchApplicationError without writing', async () => {
    const tmpDir = await fs.mkdtemp(path.join(process.cwd(), 'tmp-edit-file-'));
    const filePath = path.join(tmpDir, 'sample_failure.txt');
    await fs.writeFile(filePath, 'alpha\nbeta\ngamma\n', 'utf-8');

    const patch = `@@
 alpha
-delta
+theta
 gamma
`;

    const tool = getPatchTool();
    const context: MockContext = { agentId: 'agent', workspaceRootPath: tmpDir };

    await expect(tool.execute(context, { path: filePath, patch })).rejects.toThrow(PatchApplicationError);
    await expect(tool.execute(context, { path: filePath, patch }))
      .rejects.toThrow(
        'Unique one-line-difference target at lines 1-3 (diagnostic only; not applied); ' +
        'mismatch at line 2:\n-delta\n+beta'
      );
    expect(await fs.readFile(filePath, 'utf-8')).toBe('alpha\nbeta\ngamma\n');
  });

  it('reports the exact concise retained four-hunk failure and writes nothing', async () => {
    const tmpDir = await fs.mkdtemp(path.join(process.cwd(), 'tmp-edit-file-'));
    const filePath = path.join(tmpDir, 'renderer.ts');
    const original = [
      ...Array.from({ length: 10 }, (_, index) => `header ${index + 1}`),
      '  mode = old',
      'separator',
      '  private readonly particles = new Particles()',
      '  private time = 0',
      'between',
      '  color = old',
      'tail',
      '  speed = old',
      'done',
      ''
    ].join('\n');
    await fs.writeFile(filePath, original, 'utf-8');
    const patch = [
      '@@',
      '-  mode = old',
      '+  mode = new',
      '@@',
      '-  private particles = new Particles()',
      '+  private particles = createParticles()',
      '   private time = 0',
      '@@',
      '-  color = old',
      '+  color = new',
      '@@',
      '-  speed = old',
      '+  speed = new',
      ''
    ].join('\n');

    const tool = getPatchTool();
    const context: MockContext = { agentId: 'agent', workspaceRootPath: tmpDir };
    const expectedMessage =
      'Could not apply context hunk 2 of 4 after exact and whitespace-tolerant matching.\n' +
      'Unique one-line-difference target at lines 13-14 (diagnostic only; not applied); ' +
      'mismatch at line 13:\n' +
      '-  private particles = new Particles()\n' +
      '+  private readonly particles = new Particles()\n' +
      'Read target lines 13-14 and retry with exact unchanged/removal context. ' +
      'No file changes were written.';

    await expect(tool.execute(context, { path: filePath, patch })).rejects.toThrow(expectedMessage);
    expect(await fs.readFile(filePath, 'utf-8')).toBe(original);
    expect(expectedMessage).not.toContain('private time = 0');
    expect(expectedMessage).not.toMatch(/Expected|Candidate|Difference/);
  });

  it('reports zero diagnostic candidates without exposing patch or file content', async () => {
    const tmpDir = await fs.mkdtemp(path.join(process.cwd(), 'tmp-edit-file-'));
    const filePath = path.join(tmpDir, 'zero-candidate.txt');
    const original = 'alpha\nbeta\ngamma\n';
    await fs.writeFile(filePath, original, 'utf-8');

    const tool = getPatchTool();
    const context: MockContext = { agentId: 'agent', workspaceRootPath: tmpDir };
    const promise = tool.execute(context, {
      path: filePath,
      patch: '@@\n-missing one\n missing two\n+replacement\n'
    });

    await expect(promise).rejects.toThrow(
      'No one-line-difference target was found in the eligible region.'
    );
    await promise.catch((error) => {
      expect(String(error)).not.toMatch(/missing one|missing two|alpha|beta|gamma/);
    });
    expect(await fs.readFile(filePath, 'utf-8')).toBe(original);
  });

  it('reports multiple diagnostic candidates without selecting or exposing one', async () => {
    const tmpDir = await fs.mkdtemp(path.join(process.cwd(), 'tmp-edit-file-'));
    const filePath = path.join(tmpDir, 'multiple-candidates.txt');
    const original = 'actual one\nstable anchor\nseparator\nactual two\nstable anchor\n';
    await fs.writeFile(filePath, original, 'utf-8');

    const tool = getPatchTool();
    const context: MockContext = { agentId: 'agent', workspaceRootPath: tmpDir };
    const promise = tool.execute(context, {
      path: filePath,
      patch: '@@\n-expected value\n stable anchor\n+replacement\n'
    });

    await expect(promise).rejects.toThrow(
      'Multiple one-line-difference targets were found in the eligible region; ' +
      'none was selected or applied.'
    );
    await promise.catch((error) => {
      expect(String(error)).not.toMatch(/expected value|actual one|actual two|lines \d|mismatch/i);
    });
    expect(await fs.readFile(filePath, 'utf-8')).toBe(original);
  });

  it('rejects ambiguous context without writing the file', async () => {
    const tmpDir = await fs.mkdtemp(path.join(process.cwd(), 'tmp-edit-file-'));
    const filePath = path.join(tmpDir, 'ambiguous.txt');
    const original = 'status: draft\nseparator\nstatus: draft\n';
    await fs.writeFile(filePath, original, 'utf-8');

    const tool = getPatchTool();
    const context: MockContext = { agentId: 'agent', workspaceRootPath: tmpDir };
    await expect(tool.execute(context, {
      path: filePath,
      patch: '@@\n-status: draft\n+status: ready\n'
    })).rejects.toThrow(
      'Could not apply context hunk 1 of 1 after exact and whitespace-tolerant matching: ' +
      'unchanged/removal context matched 2 eligible target locations. No location was selected or applied.'
    );
    expect(await fs.readFile(filePath, 'utf-8')).toBe(original);
  });

  it('reports hunk identity for invalid hunk bodies without writing', async () => {
    const tmpDir = await fs.mkdtemp(path.join(process.cwd(), 'tmp-edit-file-'));
    const filePath = path.join(tmpDir, 'invalid-hunk.txt');
    const original = 'one\ntwo\nthree\n';
    await fs.writeFile(filePath, original, 'utf-8');

    const tool = getPatchTool();
    const context: MockContext = { agentId: 'agent', workspaceRootPath: tmpDir };
    await expect(tool.execute(context, {
      path: filePath,
      patch: '@@\n-one\n+ONE\n@@\n two\n@@\n-three\n+THREE\n'
    })).rejects.toThrow(
      'Invalid context hunk 2 of 3: contains no addition or removal. ' +
      'No file changes were written.'
    );
    expect(await fs.readFile(filePath, 'utf-8')).toBe(original);
  });

  it('does not write a partially applied multi-hunk patch', async () => {
    const tmpDir = await fs.mkdtemp(path.join(process.cwd(), 'tmp-edit-file-'));
    const filePath = path.join(tmpDir, 'atomic.txt');
    const original = 'alpha: old\nmiddle\nomega: old\n';
    await fs.writeFile(filePath, original, 'utf-8');

    const tool = getPatchTool();
    const context: MockContext = { agentId: 'agent', workspaceRootPath: tmpDir };
    const patch = `@@
-alpha: old
+alpha: new
@@
-missing: old
+missing: new
`;
    await expect(tool.execute(context, { path: filePath, patch })).rejects.toThrow(/could not apply/i);
    expect(await fs.readFile(filePath, 'utf-8')).toBe(original);
  });

  it('does not split prefixed delimiter context into noncontiguous hunks or write', async () => {
    const tmpDir = await fs.mkdtemp(path.join(process.cwd(), 'tmp-edit-file-'));
    const filePath = path.join(tmpDir, 'noncontiguous-context.txt');
    const original = 'old1\n@@\nunrelated\nold2\n';
    await fs.writeFile(filePath, original, 'utf-8');

    const tool = getPatchTool();
    const context: MockContext = { agentId: 'agent', workspaceRootPath: tmpDir };
    const patch = '@@\n-old1\n+new1\n @@\n-old2\n+new2\n';

    await expect(tool.execute(context, { path: filePath, patch })).rejects.toThrow(/could not apply/i);
    expect(await fs.readFile(filePath, 'utf-8')).toBe(original);
  });

  it('retries with whitespace tolerance', async () => {
    const tmpDir = await fs.mkdtemp(path.join(process.cwd(), 'tmp-edit-file-'));
    const filePath = path.join(tmpDir, 'whitespace_patch.txt');
    await fs.writeFile(filePath, 'alpha\n  beta\ngamma\n', 'utf-8');

    const patch = `@@
 alpha
- beta
+ BETA
 gamma
`;

    const tool = getPatchTool();
    const context: MockContext = { agentId: 'agent', workspaceRootPath: tmpDir };
    const result = await tool.execute(context, { path: filePath, patch });

    expect(result).toBe(`File edited successfully at ${filePath}`);
    const content = await fs.readFile(filePath, 'utf-8');
    expect(content).toBe('alpha\n BETA\ngamma\n');
  });

  it('uses the unique exact match before considering whitespace-tolerant candidates', async () => {
    const tmpDir = await fs.mkdtemp(path.join(process.cwd(), 'tmp-edit-file-'));
    const filePath = path.join(tmpDir, 'exact_first.txt');
    await fs.writeFile(filePath, 'key: old\n key: old\n', 'utf-8');

    const tool = getPatchTool();
    const context: MockContext = { agentId: 'agent', workspaceRootPath: tmpDir };
    await tool.execute(context, {
      path: filePath,
      patch: '@@\n-key: old\n+key: new\n'
    });

    expect(await fs.readFile(filePath, 'utf-8')).toBe('key: new\n key: old\n');
  });

  it('raises error when file is missing', async () => {
    const tmpDir = await fs.mkdtemp(path.join(process.cwd(), 'tmp-edit-file-'));
    const filePath = path.join(tmpDir, 'nonexistent.txt');

    const tool = getPatchTool();
    const context: MockContext = { agentId: 'agent', workspaceRootPath: tmpDir };
    await expect(tool.execute(context, { path: filePath, patch: '@@\n-line1\n+line1 updated\n' })).rejects.toThrow('does not exist');
  });

  it('resolves relative paths from an explicit absolute base directory', async () => {
    const tmpDir = await fs.mkdtemp(path.join(process.cwd(), 'tmp-edit-file-'));
    const filePath = path.join(tmpDir, 'rel_patch.txt');
    await fs.writeFile(filePath, 'line1\nline2\n', 'utf-8');

    const tool = getPatchTool();
    const context: MockContext = {
      agentId: 'agent',
      workspaceRootPath: tmpDir 
    };

    const result = await tool.execute(context, {
      path: 'rel_patch.txt',
      base_dir: tmpDir,
      patch: '@@\n line1\n-line2\n+line2 updated\n'
    });
    expect(result).toBe(`File edited successfully at ${filePath}`);
    expect(await fs.readFile(filePath, 'utf-8')).toBe('line1\nline2 updated\n');
  });

  it('rejects relative paths without an explicit base directory', async () => {
    const tool = getPatchTool();

    await expect(tool.execute(
      { agentId: 'agent', workspaceRootPath: '/tmp' } satisfies MockContext,
      {
        path: 'rel_patch.txt',
        patch: '@@\n-line1\n+line1 updated\n'
      }
    )).rejects.toThrow('Provide an absolute path or an absolute base_dir');
  });

  it('read then patch flow', async () => {
    const tmpDir = await fs.mkdtemp(path.join(process.cwd(), 'tmp-edit-file-'));
    const filePath = path.join(tmpDir, 'flow_test.txt');
    await fs.writeFile(filePath, 'line1\nline2\n', 'utf-8');

    const patchTool = getPatchTool();
    const readTool = getReadTool();
    const context: MockContext = { agentId: 'agent', workspaceRootPath: tmpDir };

    const content = await readTool.execute(context, { path: filePath });
    expect(content).toBe('1: line1\n2: line2\n');

    const result = await patchTool.execute(context, {
      path: filePath,
      patch: '@@\n line1\n-line2\n+line2 modified\n'
    });
    expect(result).toBe(`File edited successfully at ${filePath}`);
    const updated = await fs.readFile(filePath, 'utf-8');
    expect(updated).toBe('line1\nline2 modified\n');
  });
});
