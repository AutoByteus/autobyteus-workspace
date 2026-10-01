import fs from 'node:fs';
import {expect,it} from 'vitest';
import {inspectDirectSummaryRequest} from '../../../../../test-support/live-e2e/live-e2e-harness.js';
it('accepts the exact previously rejected live request without editing model text',()=>{
 const original=JSON.parse(fs.readFileSync(new URL('./managed_compaction_all_exit.json',import.meta.url),'utf8'));
 expect(inspectDirectSummaryRequest(original.summaryRequests[0])).toEqual({sourceToolTailVerified:true});
});
