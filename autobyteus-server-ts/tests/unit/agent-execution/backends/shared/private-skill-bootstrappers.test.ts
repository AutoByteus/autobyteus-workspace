import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { ClaudeSessionBootstrapper } from '../../../../../src/agent-execution/backends/claude/backend/claude-session-bootstrapper.js';
import { CodexThreadBootstrapper } from '../../../../../src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.js';
import { AgentRunConfig } from '../../../../../src/agent-execution/domain/agent-run-config.js';
import { AgentRunContext } from '../../../../../src/agent-execution/domain/agent-run-context.js';
import { Skill } from '../../../../../src/skills/domain/models.js';
import type { RuntimeSkillProfile } from '../../../../../src/agent-execution/backends/shared/runtime-skill-profile.js';
import type { ConfiguredAgentSkillBinding } from '../../../../../src/skills/domain/configured-agent-skill-binding.js';

let root: string;
let skill: Skill;
let profiles: RuntimeSkillProfile[];
beforeEach(async () => {
  root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'bootstrap-private-')));
  profiles = [];
  for (const entry of ['project', 'memory', 'source']) await fs.mkdir(path.join(root, entry));
  await fs.writeFile(path.join(root, 'source', 'SKILL.md'), 'configured skill');
  skill = new Skill({ name: 'writer', description: 'fixture', content: '', rootPath: path.join(root, 'source') });
});
afterEach(async () => { for (const profile of profiles) await profile.release(); await fs.rm(root, {recursive:true,force:true}); });

function fixture(runtime: 'claude' | 'codex', bindings: ConfiguredAgentSkillBinding[], scope = 'CONFIGURED') {
  const resolver = { resolveWorkingDirectory: vi.fn(async () => path.join(root, 'project')) };
  const definitions = { getAgentDefinitionById: vi.fn(async () => ({name:'writer', instructions:'write', skillNames:['writer'], toolNames:[]})) };
  const skills = { resolveSkillScope: () => scope, resolveConfiguredSkillBindingsForAgent: () => bindings,
    resolveManagedSkillForMaterialization: vi.fn(() => skill) };
  const bootstrapper = runtime === 'claude'
    ? new ClaudeSessionBootstrapper(resolver as never, definitions as never, skills as never)
    : new CodexThreadBootstrapper({activateForRun: () => ({kind:'not_exposed'})} as never, resolver as never, definitions as never, skills as never);
  const context = new AgentRunContext({runId:'fixture-run', config: new AgentRunConfig({
    runtimeKind: runtime === 'claude' ? 'claude_agent_sdk' : 'codex_app_server', agentDefinitionId:'writer',
    llmModelIdentifier:'', autoExecuteTools:false, workspaceId:'registered', memoryDir:path.join(root,'memory'),
  }), runtimeContext:null});
  const guard = {assertAccepting:vi.fn(),ownSkillProfile:vi.fn((profile:RuntimeSkillProfile)=>profiles.push(profile))};
  return {bootstrapper,context,guard,skills};
}

describe.each(['claude','codex'] as const)('%s ordinary filesystem configured skills', runtime => {
  it('exposes resolved sources privately, skips unresolved, and leaves the project unchanged', async () => {
    const f = fixture(runtime, [{kind:'resolved',skill},{kind:'unresolved',name:'missing'}]);
    const result = await f.bootstrapper.bootstrapForCreate(f.context, f.guard);
    const profile = result.runtimeContext.privateSkillProfile!;
    expect(f.guard.ownSkillProfile).toHaveBeenCalledExactlyOnceWith(profile);
    expect(profile.exposures.map(entry=>entry.skill)).toEqual([skill]);
    expect(await fs.realpath(profile.exposures[0]!.linkRoot)).toBe(skill.rootPath);
    expect(await fs.readdir(path.join(root,'project'))).toEqual([]);
    await profile.release();
    expect(await fs.readFile(path.join(skill.rootPath,'SKILL.md'),'utf8')).toBe('configured skill');
  });
  it('does not acquire a profile when no skills are configured', async () => {
    const f=fixture(runtime,[]);
    const result=await f.bootstrapper.bootstrapForCreate(f.context,f.guard);
    expect(result.runtimeContext.privateSkillProfile).toBeNull();
    expect(f.guard.ownSkillProfile).not.toHaveBeenCalled();
    expect(await fs.readdir(path.join(root,'memory'))).toEqual([]);
  });
  it.each(['CONFIGURED','ALL_INSTALLED'])('preserves %s project-owned collision semantics without writing project files', async scope => {
    const projectSkill=path.join(root,'project',`.${runtime}`,'skills','writer');
    await fs.mkdir(projectSkill,{recursive:true});await fs.writeFile(path.join(projectSkill,'SKILL.md'),'user-owned');
    const f=fixture(runtime,[{kind:'resolved',skill}],scope);
    if(scope==='CONFIGURED') await expect(f.bootstrapper.bootstrapForCreate(f.context,f.guard)).rejects.toThrow('Workspace skill path collision');
    else expect((await f.bootstrapper.bootstrapForCreate(f.context,f.guard)).runtimeContext.privateSkillProfile!.exposures).toEqual([]);
    expect(await fs.readFile(path.join(projectSkill,'SKILL.md'),'utf8')).toBe('user-owned');
  });
  it('refreshes managed source identity before exposure', async () => {
    const initial=new Skill({name:'writer',description:'old',content:'',rootPath:'/nonexistent-old-generation'});
    initial.managedSource={sourceId:'source-id',generation:'old'};
    const f=fixture(runtime,[{kind:'resolved',skill:initial}]);
    const result=await f.bootstrapper.bootstrapForCreate(f.context,f.guard);
    expect(f.skills.resolveManagedSkillForMaterialization).toHaveBeenCalledExactlyOnceWith('source-id','writer');
    expect(result.runtimeContext.privateSkillProfile!.exposures[0]!.skill).toBe(skill);
  });
});
