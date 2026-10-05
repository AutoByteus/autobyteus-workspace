// Evidence-only schema prerequisite probe; not a durable test or product acceptance.
// Run from assigned worktree. Only freshly created disposable SQLite DB is touched.
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createRequire } from 'node:module';
const server = path.resolve('autobyteus-server-ts');
const require = createRequire(path.join(server, 'package.json'));
const { PrismaClient, Prisma } = require('@prisma/client');
const ids = [
 '20260624090000_add_token_usage_ledger_events',
 '20260625193000_token_usage_component_pricing_explainability',
 '20260629120000_add_token_usage_display_fields',
 '20260702093000_token_usage_execution_address',
 '20260730090000_add_token_usage_provider_name',
 '20260801090000_token_usage_member_display_name',
 '20260819090000_add_token_usage_run_records',
];
const root = await fs.mkdtemp(path.join(os.tmpdir(), 'crr-003-schema-proof-'));
const dbPath = path.join(root, 'fixture.sqlite');
const result = { fixtureMigrations: ids, sourceColumn: 'claude_sdk_usage_state_json' };
let prisma;
try {
 let db = new DatabaseSync(dbPath);
 try {
  for (const id of ids) db.exec(await fs.readFile(path.join(server,'prisma','migrations',id,'migration.sql'),'utf8'));
  result.fixtureHasColumn = db.prepare('PRAGMA table_info(token_usage_run_records)').all().some(row=>row.name===result.sourceColumn);
 } finally { db.close(); }
 const model = Prisma.dmmf.datamodel.models.find(m=>m.name==='TokenUsageRunRecord');
 result.installedClientField = model.fields.find(f=>f.name==='claudeSdkUsageStateJson').dbName;
 prisma = new PrismaClient({ datasourceUrl: `file:${dbPath}` });
 try { await prisma.tokenUsageRunRecord.findMany({ take: 1 }); result.beforeExpansion='unexpected success'; }
 catch (error) { result.beforeExpansion={ code:error.code, column:error.meta?.column, messageHasMissingColumn: String(error.message).includes(result.sourceColumn) }; }
 await prisma.$disconnect(); prisma=undefined;
 db = new DatabaseSync(dbPath);
 try {
  db.exec(await fs.readFile(path.join(server,'prisma','migrations','20260923130000_add_claude_sdk_usage_state','migration.sql'),'utf8'));
  result.expandedHasColumn=db.prepare('PRAGMA table_info(token_usage_run_records)').all().some(row=>row.name===result.sourceColumn);
 } finally { db.close(); }
 prisma = new PrismaClient({ datasourceUrl: `file:${dbPath}` });
 result.afterExpansionRows = await prisma.tokenUsageRunRecord.findMany({ take:1 });
 if(result.fixtureHasColumn || result.installedClientField!==result.sourceColumn || result.beforeExpansion?.code!=='P2022' || !result.expandedHasColumn || result.afterExpansionRows.length!==0) throw new Error('schema prerequisite witness did not hold');
 console.log(JSON.stringify(result,null,2));
} finally {
 if(prisma) await prisma.$disconnect();
 await fs.rm(root,{recursive:true,force:true});
 console.log('OWNED_SCRATCH_REMOVED=true');
}
