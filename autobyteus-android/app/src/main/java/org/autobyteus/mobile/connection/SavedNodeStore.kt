package org.autobyteus.mobile.connection

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

class SavedNodeStore(context: Context) {
    private val preferences = context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)

    fun loadProfiles(): List<SavedNodeProfile> {
        val raw = preferences.getString(KEY_PROFILES, null) ?: return emptyList()
        return runCatching {
            val array = JSONArray(raw)
            buildList {
                for (index in 0 until array.length()) {
                    val json = array.optJSONObject(index) ?: continue
                    add(json.toProfile())
                }
            }.sortedByDescending { it.updatedAtEpochMillis }
        }.getOrDefault(emptyList())
    }

    fun loadSelectedProfile(): SavedNodeProfile? {
        val selectedId = preferences.getString(KEY_SELECTED_ID, null)
        val profiles = loadProfiles()
        return profiles.firstOrNull { it.id == selectedId } ?: profiles.firstOrNull()
    }

    fun saveProfile(profile: SavedNodeProfile): SavedNodeProfile {
        val existing = loadProfiles()
        val merged = listOf(profile) + existing.filterNot { it.id == profile.id }
        preferences.edit()
            .putString(KEY_PROFILES, JSONArray(merged.map { it.toJson() }).toString())
            .putString(KEY_SELECTED_ID, profile.id)
            .apply()
        return profile
    }

    fun removeProfile(profileId: String) {
        val remaining = loadProfiles().filterNot { it.id == profileId }
        val nextSelectedId = remaining.firstOrNull()?.id
        preferences.edit()
            .putString(KEY_PROFILES, JSONArray(remaining.map { it.toJson() }).toString())
            .putString(KEY_SELECTED_ID, nextSelectedId)
            .apply()
    }

    fun selectProfile(profileId: String) {
        if (loadProfiles().any { it.id == profileId }) {
            preferences.edit().putString(KEY_SELECTED_ID, profileId).apply()
        }
    }

    fun clear() {
        preferences.edit().clear().apply()
    }

    private fun JSONObject.toProfile(): SavedNodeProfile = SavedNodeProfile(
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

    private fun SavedNodeProfile.toJson(): JSONObject = JSONObject()
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
        const val KEY_PROFILES = "profiles"
        const val KEY_SELECTED_ID = "selected_profile_id"
    }
}
