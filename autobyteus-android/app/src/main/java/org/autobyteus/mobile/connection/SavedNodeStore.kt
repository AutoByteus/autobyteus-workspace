package org.autobyteus.mobile.connection

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

class SavedNodeStore(context: Context) {
    private val preferences = context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)

    fun loadEntries(): List<SavedNodeEntry> {
        val raw = preferences.getString(KEY_ENTRIES, null) ?: return emptyList()
        return runCatching {
            val array = JSONArray(raw)
            buildList {
                for (index in 0 until array.length()) {
                    val json = array.optJSONObject(index) ?: continue
                    add(json.toEntry())
                }
            }.sortedByDescending { it.updatedAtEpochMillis }
        }.getOrDefault(emptyList())
    }

    fun loadSelectedEntry(): SavedNodeEntry? {
        val selectedId = preferences.getString(KEY_SELECTED_ID, null)
        val entries = loadEntries()
        return entries.firstOrNull { it.id == selectedId } ?: entries.firstOrNull()
    }

    fun saveEntry(entry: SavedNodeEntry): SavedNodeEntry {
        val existing = loadEntries()
        val merged = listOf(entry) + existing.filterNot { it.id == entry.id }
        preferences.edit()
            .putString(KEY_ENTRIES, JSONArray(merged.map { it.toJson() }).toString())
            .putString(KEY_SELECTED_ID, entry.id)
            .apply()
        return entry
    }

    fun removeEntry(entryId: String) {
        val remaining = loadEntries().filterNot { it.id == entryId }
        val nextSelectedId = remaining.firstOrNull()?.id
        preferences.edit()
            .putString(KEY_ENTRIES, JSONArray(remaining.map { it.toJson() }).toString())
            .putString(KEY_SELECTED_ID, nextSelectedId)
            .apply()
    }

    fun selectEntry(entryId: String) {
        if (loadEntries().any { it.id == entryId }) {
            preferences.edit().putString(KEY_SELECTED_ID, entryId).apply()
        }
    }

    fun clear() {
        preferences.edit().clear().apply()
    }

    private fun JSONObject.toEntry(): SavedNodeEntry = SavedNodeEntry(
        id = getString("id"),
        displayName = optString("displayName", optString("host", "AutoByteus")),
        baseUrl = getString("baseUrl"),
        mobileUrl = getString("mobileUrl"),
        scheme = getString("scheme"),
        host = getString("host"),
        port = if (has("port") && !isNull("port")) getInt("port") else null,
        httpAcknowledged = optBoolean("httpAcknowledged", false),
        createdAtEpochMillis = optLong("createdAtEpochMillis", System.currentTimeMillis()),
        updatedAtEpochMillis = optLong("updatedAtEpochMillis", System.currentTimeMillis()),
    )

    private fun SavedNodeEntry.toJson(): JSONObject = JSONObject()
        .put("id", id)
        .put("displayName", displayName)
        .put("baseUrl", baseUrl)
        .put("mobileUrl", mobileUrl)
        .put("scheme", scheme)
        .put("host", host)
        .put("port", port)
        .put("httpAcknowledged", httpAcknowledged)
        .put("createdAtEpochMillis", createdAtEpochMillis)
        .put("updatedAtEpochMillis", updatedAtEpochMillis)

    private companion object {
        const val PREFERENCES_NAME = "saved_nodes"
        const val KEY_ENTRIES = "entries"
        const val KEY_SELECTED_ID = "selected_entry_id"
    }
}
