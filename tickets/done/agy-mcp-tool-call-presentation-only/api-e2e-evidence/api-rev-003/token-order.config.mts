import base from '/Users/normy/autobyteus_org/autobyteus-worktrees/agy-mcp-tool-call-presentation-only/autobyteus-server-ts/vitest.config.ts';
class Ordered { shard(tests) { return tests; } sort(tests) { const rank=(x)=> x.moduleId.includes("unit-prices") ? 0 : x.moduleId.includes("provider-semantics") ? 1 : x.moduleId.includes("ledger-graphql") ? 2 : 3; return tests.sort((a,b)=>rank(a)-rank(b)); } }
export default {...base,test:{...base.test,sequence:{sequencer:Ordered}}};
