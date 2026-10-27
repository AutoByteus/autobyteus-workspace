// API/E2E helper (ticket evidence, not product code), used as /private/tmp/wjs-api/sync.mjs during this run
const hub='http://127.0.0.1:53568/graphql', src='http://127.0.0.1:59037/graphql'
const gq=async(u,query,variables)=>{const r=await (await fetch(u,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({query,variables})})).json(); if(r.errors) throw new Error(JSON.stringify(r.errors)); return r.data}
const h=await gq(hub,`mutation { createMemoryHubSourceCredential(input:{label:"api-e2e source", boundMemorySyncSourceId:"api-e2e-source-node"}) { plaintextToken credential { status } } }`)
await gq(hub,`mutation { updateMemoryHubConfig(input:{enabled:true, advertisedHubBaseUrl:"http://127.0.0.1:53568"}) { __typename } }`)
const token=h.createMemoryHubSourceCredential.plaintextToken
await gq(src,`mutation($t:String!){ updateMemorySyncSourceConfig(input:{enabled:true, memorySyncSourceId:"api-e2e-source-node", displayName:"API E2E source", hubBaseUrl:"http://127.0.0.1:53568", hubToken:$t}) { __typename } }`,{t:token})
const test=await gq(src,`mutation { testMemoryHubConnection(input:{mode: SAVED}) { __typename ... on MemoryHubConnectionTestResultGql { ok message } } }`).catch(e=>({err:String(e).slice(0,300)}))
console.log('test', JSON.stringify(test))
const run=await gq(src,`mutation { startMemorySync { __typename } }`)
console.log('sync', JSON.stringify(run))
