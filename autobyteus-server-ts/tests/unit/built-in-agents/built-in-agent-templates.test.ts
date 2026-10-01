import {promises as fs} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {describe,expect,it} from 'vitest';
import {BUILT_IN_AGENT_DEFINITIONS} from '../../../src/built-in-agents/built-in-agent-registry.js';
describe('retired compactor builtin',()=>{
 it('has neither a registry entry nor production template',async()=>{
   expect(JSON.stringify(BUILT_IN_AGENT_DEFINITIONS)).not.toContain('autobyteus-memory-compactor');
   await expect(fs.stat(fileURLToPath(new URL('../../../src/built-in-agents/templates/memory-compactor',import.meta.url)))).rejects.toMatchObject({code:'ENOENT'});
 });
});
