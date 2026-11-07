package org.autobyteus.mobile.connection

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.net.SocketTimeoutException

class ConnectionDiagnosticMapperTest {
    @Test
    fun mapsDisabledStatusToTailscaleRelevantRecoveryCopy() {
        val diagnostic = ConnectionDiagnosticMapper.phoneAccessDisabled("Home Desktop")

        assertEquals(ConnectionFailureKind.PhoneAccessDisabled, diagnostic.kind)
        assertTrue(diagnostic.recoveryAction.contains("Nodes › Phone Setup"))
        assertEquals("Home Desktop is reachable, but Phone access is off.", diagnostic.message)
    }

    @Test
    fun mapsNetworkExceptionToTailscaleRecoveryHints() {
        val diagnostic = ConnectionDiagnosticMapper.fromException(SocketTimeoutException("timeout"))

        assertEquals(ConnectionFailureKind.NetworkUnreachable, diagnostic.kind)
        assertTrue(diagnostic.recoveryAction.contains("Tailscale"))
        assertTrue(diagnostic.recoveryAction.contains("split tunneling"))
    }

    @Test
    fun givesTheDesignsPlainReasonsForTheCantReachScreen() {
        assertEquals(
            CantReachReason.NoSharedNetwork,
            ConnectionDiagnosticMapper.cantReachReasonFor(ConnectionDiagnosticMapper.fromException(SocketTimeoutException("timeout"))),
        )
        assertEquals(
            "Connect to the same Wi-Fi or VPN as the computer, or turn on Tailscale.",
            ConnectionDiagnosticMapper.cantReachText(CantReachReason.NoSharedNetwork, "Docker node 2"),
        )
        assertTrue(CantReachReason.NoSharedNetwork.offersTailscale)
        assertEquals(CantReachReason.NoAnswer, ConnectionDiagnosticMapper.cantReachReasonFor(ConnectionDiagnosticMapper.fromHttpStatus(502)))
        assertEquals(
            "Docker node 2 didn’t answer. Check that the computer is on and awake.",
            ConnectionDiagnosticMapper.cantReachText(CantReachReason.NoAnswer, "Docker node 2"),
        )
        assertEquals("That isn’t an AutoByteus QR code.", ConnectionDiagnosticMapper.cantReachText(CantReachReason.NotAnAutoByteusCode, ""))
        assertEquals(false, CantReachReason.NotAnAutoByteusCode.canRetry)
    }
}
