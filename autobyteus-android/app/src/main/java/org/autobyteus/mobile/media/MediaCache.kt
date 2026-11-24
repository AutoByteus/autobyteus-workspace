package org.autobyteus.mobile.media

import android.content.Context
import androidx.annotation.OptIn
import androidx.media3.common.util.UnstableApi
import androidx.media3.database.StandaloneDatabaseProvider
import androidx.media3.datasource.cache.LeastRecentlyUsedCacheEvictor
import androidx.media3.datasource.cache.SimpleCache
import java.io.File
import java.util.concurrent.Executors

/**
 * The app's one media cache (autobyteus-574 DEC-003, D-7): the bytes of node videos and audio files already fetched, by
 * version ([MediaCacheKeys]), in the app's private cache folder, at most [MAX_BYTES] with the least recently used dropped
 * first. It holds only media bytes: never a credential. A node's entries are deleted when the node is removed from the app.
 */
@OptIn(UnstableApi::class)
object MediaCache {
    const val MAX_BYTES: Long = 500L * 1024 * 1024
    private const val FOLDER = "media-cache"

    private var cache: SimpleCache? = null
    private val deletions = Executors.newSingleThreadExecutor()

    /** The one cache of this process (a folder is used by one `SimpleCache` at a time). */
    @Synchronized
    fun get(context: Context): SimpleCache = cache ?: SimpleCache(
        File(context.applicationContext.cacheDir, FOLDER),
        LeastRecentlyUsedCacheEvictor(MAX_BYTES),
        StandaloneDatabaseProvider(context.applicationContext),
    ).also { cache = it }

    /** Deletes every cached file of [nodeId], off the main thread (a removed node's files leave the phone). */
    fun deleteNode(context: Context, nodeId: String) {
        val appContext = context.applicationContext
        deletions.execute { removeNode(get(appContext), nodeId) }
    }

    /** Removes the keys of [nodeId] from [cache]; other nodes' entries stay. */
    internal fun removeNode(cache: SimpleCache, nodeId: String) {
        val prefix = MediaCacheKeys.nodePrefix(nodeId)
        cache.keys.filter { it.startsWith(prefix) }.forEach { key -> cache.removeResource(key) }
    }
}
