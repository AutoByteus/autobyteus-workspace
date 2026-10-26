package org.autobyteus.mobile.datamigrations

import android.content.SharedPreferences
import java.io.File
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** autobyteus-290 SM-10: the saved entries' SharedPreferences keys are renamed once; the values are unchanged. */
class SavedNodeEntryKeysMigrationTest {
    /** The released writer's exact output (`SavedNodeStore.saveProfile` before autobyteus-290). */
    private val releasedEntries = """[{"id":"https://one.tailnet.ts.net","displayName":"Home Desktop","baseUrl":"https://one.tailnet.ts.net","mobileUrl":"https://one.tailnet.ts.net/mobile","scheme":"https","host":"one.tailnet.ts.net","port":null,"httpAcknowledged":true,"createdAtEpochMillis":1,"updatedAtEpochMillis":2}]"""

    @Test
    fun renamesTheReleasedKeysKeepingTheValuesAndABackup() {
        val preferences = MemoryPreferences(mutableMapOf("profiles" to releasedEntries, "selected_profile_id" to "https://one.tailnet.ts.net"))

        SavedNodeEntryKeysMigration.run(preferences)

        assertEquals(
            mapOf(
                "entries" to releasedEntries,
                "selected_entry_id" to "https://one.tailnet.ts.net",
                "profiles:backup" to releasedEntries,
                "selected_profile_id:backup" to "https://one.tailnet.ts.net",
            ),
            preferences.values,
        )
    }

    @Test
    fun reRunChangesNothingAndThenRemovesTheBackups() {
        val preferences = MemoryPreferences(mutableMapOf("profiles" to releasedEntries))
        SavedNodeEntryKeysMigration.run(preferences)

        SavedNodeEntryKeysMigration.run(preferences)

        assertEquals(mapOf("entries" to releasedEntries), preferences.values)
    }

    @Test
    fun finishesAStepInterruptedAfterTheNewKeyWasWritten() {
        val preferences = MemoryPreferences(mutableMapOf("profiles" to releasedEntries, "profiles:backup" to releasedEntries, "entries" to releasedEntries))

        SavedNodeEntryKeysMigration.run(preferences)

        assertFalse(preferences.contains("profiles"))
        assertEquals(releasedEntries, preferences.getString("entries", null))
    }

    @Test
    fun keepsTheOldKeyWhenTheNewOneWasNotConvertedFromIt() {
        val preferences = MemoryPreferences(mutableMapOf("profiles" to releasedEntries, "entries" to "[]"))

        SavedNodeEntryKeysMigration.run(preferences)

        assertEquals(mapOf("profiles" to releasedEntries, "entries" to "[]"), preferences.values)
    }

    @Test
    fun aFreshInstallHasNothingToConvert() {
        val preferences = MemoryPreferences(mutableMapOf())
        SavedNodeEntryKeysMigration.run(preferences)
        assertNull(preferences.getString("entries", null))
        assertEquals(emptyMap<String, String?>(), preferences.values)
    }

    /** N-911 boundary: only `MainActivity` references the migration package; the old key names exist only there. */
    @Test
    fun onlyTheStartUpCallSiteReferencesTheMigrationPackage() {
        val sources = File("src/main/java").walkTopDown().filter { it.extension == "kt" }
            .filterNot { it.invariantSeparatorsPath.contains("/datamigrations/") }.toList()
        assertTrue("no sources found from ${File(".").absolutePath}", sources.isNotEmpty())
        val references = sources.filter { it.readText().contains("datamigrations") }.map { it.name }
        val oldKeys = sources.filter { source -> source.readText().let { "\"profiles\"" in it || "selected_profile_id" in it } }.map { it.name }
        assertEquals(listOf("MainActivity.kt"), references)
        assertEquals(emptyList<String>(), oldKeys)
    }

    private class MemoryPreferences(val values: MutableMap<String, String?>) : SharedPreferences {
        override fun getAll(): Map<String, *> = values.toMap()
        override fun getString(key: String, defValue: String?): String? = if (key in values) values[key] else defValue
        override fun getStringSet(key: String, defValues: Set<String>?): Set<String>? = defValues
        override fun getInt(key: String, defValue: Int): Int = defValue
        override fun getLong(key: String, defValue: Long): Long = defValue
        override fun getFloat(key: String, defValue: Float): Float = defValue
        override fun getBoolean(key: String, defValue: Boolean): Boolean = defValue
        override fun contains(key: String): Boolean = key in values
        override fun edit(): SharedPreferences.Editor = Editor()
        override fun registerOnSharedPreferenceChangeListener(listener: SharedPreferences.OnSharedPreferenceChangeListener) = Unit
        override fun unregisterOnSharedPreferenceChangeListener(listener: SharedPreferences.OnSharedPreferenceChangeListener) = Unit

        private inner class Editor : SharedPreferences.Editor {
            private val puts = mutableMapOf<String, String?>()
            private val removes = mutableSetOf<String>()
            override fun putString(key: String, value: String?) = apply { if (value == null) removes += key else puts[key] = value }
            override fun putStringSet(key: String, values: Set<String>?) = this
            override fun putInt(key: String, value: Int) = this
            override fun putLong(key: String, value: Long) = this
            override fun putFloat(key: String, value: Float) = this
            override fun putBoolean(key: String, value: Boolean) = this
            override fun remove(key: String) = apply { removes += key }
            override fun clear() = apply { removes += values.keys }
            override fun commit(): Boolean { removes.forEach { values.remove(it) }; values.putAll(puts); return true }
            override fun apply() { commit() }
        }
    }
}
