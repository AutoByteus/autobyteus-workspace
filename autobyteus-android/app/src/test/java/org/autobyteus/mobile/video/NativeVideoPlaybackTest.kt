package org.autobyteus.mobile.video

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertSame
import org.junit.Test

// autobyteus-574 D-5 (REQ-003): the credential reaches the player screen through memory only, once; the Intent carries a
// random token, and nothing prints the credential.
class NativeVideoPlaybackTest {
    private fun request(credential: String = "mra_phone_credential") = NativeVideoPlayback.Request(
        nodeId = "http://192.168.1.20:29695", nodeOrigin = "http://192.168.1.20:29695",
        url = "http://192.168.1.20:29695/rest/workspaces/w/content?path=private%2Fplan.mp4", title = "plan.mp4", credential = credential,
    )

    @Test
    fun aPlaybackIsTakenOnceByItsToken() {
        val held = request()
        val token = NativeVideoPlayback.put(held)
        assertFalse(token.contains("mra_phone_credential"))
        assertNull(NativeVideoPlayback.take("another-token"))
        assertSame(held, NativeVideoPlayback.take(token))
        assertNull(NativeVideoPlayback.take(token))
    }

    @Test
    fun aNewPlaybackReplacesTheOneNotYetTaken_andAMissingTokenFindsNothing() {
        val first = NativeVideoPlayback.put(request("mra_first"))
        val second = NativeVideoPlayback.put(request("mra_second"))
        assertNull(NativeVideoPlayback.take(first))
        assertEquals("mra_second", NativeVideoPlayback.take(second)?.credential)
        assertNull(NativeVideoPlayback.take(null))
    }

    @Test
    fun aPlaybackNeverPrintsItsCredentialOrUrl() {
        val printed = request("mra_SECRET").toString()
        assertFalse(printed.contains("mra_SECRET"))
        assertFalse(printed.contains("private"))
    }
}
