package org.autobyteus.mobile.media

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertSame
import org.junit.Test

// autobyteus-574 D-5 (REQ-003): the credential reaches the player screen through memory only, once; the Intent carries a
// random token, and nothing prints the credential.
class NativeMediaPlaybackTest {
    private fun request(credential: String = "mra_phone_credential") = NativeMediaPlayback.Request(
        nodeId = "http://192.168.1.20:29695", nodeOrigin = "http://192.168.1.20:29695",
        url = "http://192.168.1.20:29695/rest/workspaces/w/content?path=private%2Fplan.mp4", title = "plan.mp4", credential = credential,
    )

    @Test
    fun aPlaybackIsTakenOnceByItsToken() {
        val held = request()
        val token = NativeMediaPlayback.put(held)
        assertFalse(token.contains("mra_phone_credential"))
        assertNull(NativeMediaPlayback.take("another-token"))
        assertSame(held, NativeMediaPlayback.take(token))
        assertNull(NativeMediaPlayback.take(token))
    }

    @Test
    fun aNewPlaybackReplacesTheOneNotYetTaken_andAMissingTokenFindsNothing() {
        val first = NativeMediaPlayback.put(request("mra_first"))
        val second = NativeMediaPlayback.put(request("mra_second"))
        assertNull(NativeMediaPlayback.take(first))
        assertEquals("mra_second", NativeMediaPlayback.take(second)?.credential)
        assertNull(NativeMediaPlayback.take(null))
    }

    @Test
    fun aPlaybackNeverPrintsItsCredentialOrUrl() {
        val printed = request("mra_SECRET").toString()
        assertFalse(printed.contains("mra_SECRET"))
        assertFalse(printed.contains("private"))
    }
}
