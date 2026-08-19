import fs from 'node:fs';
import assert from 'node:assert/strict';
import { AgentDefinition } from '../../../../../../autobyteus-server-ts/dist/agent-definition/domain/models.js';
import { composeCarpenterPrompt } from '../../../../../../autobyteus-server-ts/dist/agent-execution/prompt/carpenter-prompt-composer.js';
import { renderMemberCollaborationInstruction } from '../../../../../../autobyteus-server-ts/dist/agent-team-execution/services/member-collaboration-instruction-renderer.js';

const artifactPath = new URL('../../../agent-team-collaboration-system-instruction.md', import.meta.url);
const artifact = fs.readFileSync(artifactPath, 'utf8');
const match = artifact.match(/## 2\. Exact Renderer Template\n\n```text\n([\s\S]*?)\n```/);
assert.ok(match, 'authoritative exact renderer template must be extractable');
const template = match[1];
const cases = [
  ['persistent', '/Teacher'],
  ['restored', '/Teacher'],
  ['task_agent', '/StudentStudyGroup/student_one'],
  ['task_agent_team_member', '/StudentStudyGroup/student_two'],
];
const summaries = [];
for (const [kind, memberAddress] of cases) {
  const rendered = renderMemberCollaborationInstruction({
    addressing: { rootTeamRunId: 'root-run-1', memberAddress },
  });
  const expected = template.replace('{{member_address}}', memberAddress);
  assert.equal(rendered, expected, `${kind} exact copy`);
  assert.equal((rendered.match(/^## AgentTeam Addressing$/gm) ?? []).length, 1);
  assert.equal((rendered.match(/^## AgentTeam Collaboration$/gm) ?? []).length, 1);
  assert.equal((rendered.match(new RegExp(memberAddress.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) ?? []).length, 1);
  assert.ok(!rendered.includes('## Team Runtime'));
  assert.ok(!rendered.includes('{{member_address}}'));
  summaries.push({ kind, memberAddress, bytes: Buffer.byteLength(rendered) });
}
const context = {
  teamInstruction: '## Local Coordination\n\nUse the current Team plan.',
  collaboration: {
    addressing: { rootTeamRunId: 'root-run-1', memberAddress: '/Teacher' },
    deliverInterAgentMessage: async () => undefined,
  },
};
const prompt = composeCarpenterPrompt({
  agentDefinition: new AgentDefinition({
    name: 'Teacher', description: 'Coordinates.', instructions: 'Teach carefully.',
  }),
  workspaceRootPath: '/tmp/api-rev-039-workspace',
  memberTeamContext: context,
});
const positions = Object.fromEntries([
  'teamInstruction', '## Team Instruction',
  'addressing', '## AgentTeam Addressing',
  'collaboration', '## AgentTeam Collaboration',
  'workingEnvironment', '## Working Environment',
].reduce((entries, value, index, all) => index % 2 === 0
  ? [...entries, [value, prompt.indexOf(all[index + 1])]] : entries, []));
assert.ok(positions.teamInstruction < positions.addressing);
assert.ok(positions.addressing < positions.collaboration);
assert.ok(positions.collaboration < positions.workingEnvironment);
assert.equal((prompt.match(/^## AgentTeam Addressing$/gm) ?? []).length, 1);
assert.equal((prompt.match(/^## AgentTeam Collaboration$/gm) ?? []).length, 1);
assert.ok(!prompt.includes('## Team Runtime'));
assert.ok(!prompt.includes('recipient_name'));
assert.ok(!prompt.includes('You can message:'));
assert.ok(!prompt.includes('{{'));
console.log(JSON.stringify({ result: 'PASS', exactArtifactCopy: true, cases: summaries, positions }, null, 2));
