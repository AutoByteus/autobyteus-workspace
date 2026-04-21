const mapRow = (row) => ({
    briefId: row.brief_id,
    bindingId: row.binding_id,
    bindingIntentId: row.binding_intent_id,
    runId: row.run_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
});
export const createBriefBindingRepository = (db) => ({
    getByBindingId(bindingId) {
        const row = db
            .prepare(`SELECT brief_id, binding_id, binding_intent_id, run_id, created_at, updated_at
           FROM brief_bindings
          WHERE binding_id = ?`)
            .get(bindingId);
        return row ? mapRow(row) : null;
    },
    listByBriefId(briefId) {
        const rows = db
            .prepare(`SELECT brief_id, binding_id, binding_intent_id, run_id, created_at, updated_at
           FROM brief_bindings
          WHERE brief_id = ?
          ORDER BY datetime(created_at) DESC, binding_id DESC`)
            .all(briefId);
        return rows.map(mapRow);
    },
    upsertBinding(input) {
        db.prepare(`INSERT INTO brief_bindings (
         brief_id,
         binding_id,
         binding_intent_id,
         run_id,
         created_at,
         updated_at
       ) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(binding_id) DO UPDATE SET
         brief_id = excluded.brief_id,
         binding_intent_id = excluded.binding_intent_id,
         run_id = excluded.run_id,
         created_at = excluded.created_at,
         updated_at = excluded.updated_at`).run(input.briefId, input.bindingId, input.bindingIntentId, input.runId, input.createdAt, input.updatedAt);
    },
});
