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
        assertTrue(diagnostic.recoveryAction.contains("Nodes -> Phone Setup"))
    }

    @Test
    fun mapsNetworkExceptionToTailscaleRecoveryHints() {
        val diagnostic = ConnectionDiagnosticMapper.fromException(SocketTimeoutException("timeout"))

        assertEquals(ConnectionFailureKind.NetworkUnreachable, diagnostic.kind)
        assertTrue(diagnostic.recoveryAction.contains("Tailscale"))
        assertTrue(diagnostic.recoveryAction.contains("split tunneling"))
    }
}
