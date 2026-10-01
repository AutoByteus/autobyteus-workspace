import fs from 'node:fs';
import {describe,expect,it} from 'vitest';
import {inspectDirectSummaryRequest} from '../../../../../test-support/live-e2e/live-e2e-harness.js';
const observation=JSON.parse(fs.readFileSync(new URL('./managed_compaction_all_exit.json',import.meta.url),'utf8'));
const original=observation.summaryRequests[0];
const task:string=original.messages[1].content;
const entries=[...task.matchAll(/(?:^|\n\n)(User|Assistant|Tool \([^\n]+\)):\n/gu)].map((m,i,all)=>({role:m[1],text:task.slice(m.index!,all[i+1]?.index??task.length)}));
const unicodeTools=entries.filter(e=>e.role.startsWith('Tool (')&&e.text.includes('<script setup>')&&e.text.includes('</template>'));
describe('API-F006 unchanged-inspector offline origin replay',()=>{
 it('reproduces the original failure despite safe omitted tool evidence and a legitimate assistant-only shield',()=>{
  expect(inspectDirectSummaryRequest(original)).toEqual({sourceToolTailVerified:true,shieldOmissionPressureVerified:false});
  expect(unicodeTools).toHaveLength(1);
  expect(unicodeTools[0].text).toContain('… [');
  expect(unicodeTools[0].text).not.toContain('🛡️');
  expect(unicodeTools[0].text).not.toContain('\uFFFD');
  const withShield=entries.filter(e=>e.text.includes('🛡️'));
  expect(withShield).toHaveLength(1);
  expect(withShield[0].role).toBe('Assistant');
  expect(withShield[0].text).toContain('Preserved as ordinary evidence');
 });
 it('changes only the assistant echo and flips the global assertion without changing any tool evidence',()=>{
  const changed=structuredClone(original);
  changed.messages[1].content=task.replace('🛡️','shield');
  expect(task.split('🛡️').length-1).toBe(1);
  const beforeTools=entries.filter(e=>e.role.startsWith('Tool (')).map(e=>e.text);
  const altered:string=changed.messages[1].content;
  const afterTools=[...altered.matchAll(/(?:^|\n\n)(User|Assistant|Tool \([^\n]+\)):\n/gu)]
    .map((m,i,all)=>({role:m[1],text:altered.slice(m.index!,all[i+1]?.index??altered.length)}))
    .filter(e=>e.role.startsWith('Tool (')).map(e=>e.text);
  expect(afterTools).toEqual(beforeTools);
  expect(inspectDirectSummaryRequest(changed)).toEqual({sourceToolTailVerified:true,shieldOmissionPressureVerified:true});
 });
});
