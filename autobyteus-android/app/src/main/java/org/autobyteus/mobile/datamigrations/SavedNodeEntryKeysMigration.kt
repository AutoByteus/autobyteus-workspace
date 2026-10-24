package org.autobyteus.mobile.datamigrations

import android.content.Context
import android.content.SharedPreferences

/**
 * autobyteus-290 SM-10: the saved node entries' SharedPreferences keys say "entry", not "profile" (`DESIGN.md`
 * rule 10). The stored values are copied unchanged. Called once in `MainActivity.onCreate`, before `SavedNodeStore`
 * is created; current code knows only the new keys. Old key names live only in this package.
 *
 * Per key, by structure: the old key present and the new one absent is converted (old value to `<old>:backup` and
 * the new key, committed, then the old key removed). Both keys with the backup is a finished step whose old key is
 * removed. Both keys without the backup keeps the old key for recovery. The backup is removed at the next start that
 * finds only the new key.
 */
object SavedNodeEntryKeysMigration {
    private const val PREFERENCES_NAME = "saved_nodes"
    private val renamedKeys = listOf(
        "profiles" to "entries",
        "selected_profile_id" to "selected_entry_id",
    )

    fun run(context: Context) {
        run(context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE))
    }

    fun run(preferences: SharedPreferences) {
        for ((source, target) in renamedKeys) migrate(preferences, source, target)
    }

    private fun migrate(preferences: SharedPreferences, source: String, target: String) {
        val backup = "$source:backup"
        val hasTarget = preferences.contains(target)
        val hasBackup = preferences.contains(backup)
        if (!preferences.contains(source)) {
            if (hasTarget && hasBackup) preferences.edit().remove(backup).commit()
            return
        }
        if (hasTarget) {
            if (hasBackup) preferences.edit().remove(source).commit()
            return
        }
        val value = preferences.getString(source, null)
        preferences.edit().putString(backup, value).putString(target, value).commit()
        preferences.edit().remove(source).commit()
    }
}
