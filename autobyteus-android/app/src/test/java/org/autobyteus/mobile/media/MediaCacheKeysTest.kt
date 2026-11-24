package org.autobyteus.mobile.media

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Test

// autobyteus-574 DEC-003, design N-4, D-7: a cache entry is one version of one node file; a changed file (new ETag) has
// a new key, so its old bytes are never served; keys are hashed (no path is spelled out); a node's keys share its prefix.
class MediaCacheKeysTest {
    private val node = "http://192.168.1.20:29695"
    private val url = "$node/rest/workspaces/agent_ws_ab12/content?path=demo%2Fplan.mp4"

    @Test
    fun theSameVersionOfTheSameFileHasOneKey_aNewVersionAnother() {
        val key = MediaCacheKeys.keyFor(node, url, "\"6632654-1795515300123\"")
        assertEquals(key, MediaCacheKeys.keyFor(node, url, "\"6632654-1795515300123\""))
        assertNotEquals(key, MediaCacheKeys.keyFor(node, url, "\"6632654-1795515399999\""))
        assertNotEquals(key, MediaCacheKeys.keyFor(node, "$node/rest/workspaces/agent_ws_ab12/content?path=demo%2Fother.mp4", "\"6632654-1795515300123\""))
        assertNotEquals(key, MediaCacheKeys.keyFor("http://192.168.1.21:29695", url.replace(".20:", ".21:"), "\"6632654-1795515300123\""))
    }

    @Test
    fun aKeyIsHashed_andStartsWithItsNodesPrefix() {
        val key = MediaCacheKeys.keyFor(node, url, "\"1-2\"")
        assertFalse(key.contains("plan"))
        assertFalse(key.contains("192.168"))
        assertTrue(key.startsWith(MediaCacheKeys.nodePrefix(node)))
        assertFalse(key.startsWith(MediaCacheKeys.nodePrefix("http://192.168.1.21:29695")))
        assertTrue(Regex("[0-9a-f]{64}:[0-9a-f]{64}").matches(key))
    }
}
