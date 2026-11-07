package org.autobyteus.mobile.shell

import android.os.Bundle
import org.autobyteus.mobile.connection.SavedNodeEntry
import org.autobyteus.mobile.web.NavigationDecisionType
import org.autobyteus.mobile.web.TrustedNavigationPolicy
import java.net.URI

/**
 * The open page (a saved node and its `/mobile` URL), kept in the activity's saved state so that after Android ends the
 * process in the background the same page reopens (autobyteus-426 REQ-003). A saved URL the navigation policy would
 * not load in the WebView for that node, a URL outside `/mobile`, or a node no longer saved is not restored.
 */
object OpenPageRestore {
    private const val KEY_ENTRY_ID = "open_page_entry_id"
    private const val KEY_URL = "open_page_url"

    data class Restored(val entry: SavedNodeEntry, val url: String)

    fun save(outState: Bundle, entryId: String, url: String) {
        outState.putString(KEY_ENTRY_ID, entryId)
        outState.putString(KEY_URL, url)
    }

    fun read(savedState: Bundle?, entries: List<SavedNodeEntry>): Restored? =
        restore(savedState?.getString(KEY_ENTRY_ID), savedState?.getString(KEY_URL), entries)

    /** The restore decision itself. */
    fun restore(entryId: String?, url: String?, entries: List<SavedNodeEntry>): Restored? {
        if (entryId.isNullOrBlank() || url.isNullOrBlank()) return null
        val entry = entries.firstOrNull { it.id == entryId } ?: return null
        val decision = TrustedNavigationPolicy.classify(url, entry, isMainFrame = true)
        if (decision.type != NavigationDecisionType.AllowInWebView) return null
        val path = runCatching { URI(url).rawPath }.getOrNull().orEmpty()
        if (path != "/mobile" && !path.startsWith("/mobile/")) return null
        return Restored(entry, url)
    }
}
