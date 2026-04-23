const mapRow = (row) => ({
    bindingIntentId: row.binding_intent_id,
    briefId: row.brief_id,
    status: row.status,
    bindingId: row.binding_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    committedAt: row.committed_at,
});
export const createPendingBindingIntentRepository = (db) => ({
    getByBindingIntentId(bindingIntentId) {
        const row = db
            .prepare(`SELECT binding_intent_id, brief_id, status, binding_id, created_at, updated_at, committed_at
           FROM pending_binding_intents
          WHERE binding_intent_id = ?`)
            .get(bindingIntentId);
        return row ? mapRow(row) : null;
    },
    insertPendingIntent(input) {
        db.prepare(`INSERT INTO pending_binding_intents (
         binding_intent_id,
         brief_id,
         status,
         binding_id,
         created_at,
         updated_at,
         committed_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(input.bindingIntentId, input.briefId, input.status, input.bindingId, input.createdAt, input.updatedAt, input.committedAt);
    },
    markCommitted(input) {
        db.prepare(`UPDATE pending_binding_intents
          SET status = 'COMMITTED',
              binding_id = ?,
              updated_at = ?,
              committed_at = COALESCE(committed_at, ?)
        WHERE binding_intent_id = ?`).run(input.bindingId, input.committedAt, input.committedAt, input.bindingIntentId);
    },
});
