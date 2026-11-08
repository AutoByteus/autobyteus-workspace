package org.autobyteus.mobile.connection

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.IOException
import java.net.SocketTimeoutException
import java.net.UnknownHostException
import javax.net.ssl.SSLHandshakeException

class ConnectionDiagnosticMapperTest {
    private val testHost = "test-desktop.example-tailnet.ts.net"

    private fun ConnectionDiagnostic.texts() = listOf(title, message, recoveryAction)

    private fun assertNoAddress(diagnostic: ConnectionDiagnostic) {
        for (text in diagnostic.texts()) {
            for (part in listOf(testHost, "test-desktop", "example-tailnet", "ts.net", "://", "Unable to resolve", "Details")) {
                assertFalse("\"$text\" contains \"$part\"", text.contains(part))
            }
        }
    }

    // autobyteus-433 AC-008: an exception's text (here an unresolved host's name) never reaches a diagnostic.
    @Test
    fun aStatusCheckExceptionNamingAHostGivesNoHostOrExceptionTextInAnyText() {
        val errors = listOf(
            UnknownHostException("Unable to resolve host \"$testHost\": No address associated with hostname"),
            IOException("Failed to connect to $testHost/100.64.0.7:443"),
            SSLHandshakeException("Hostname $testHost not verified"),
            IllegalStateException("Unexpected answer from https://$testHost/rest/remote-access/status"),
            SocketTimeoutException("timeout connecting to $testHost"),
        )
        for (error in errors) assertNoAddress(ConnectionDiagnosticMapper.fromException(error))
        assertEquals("The phone could not reach the node.", ConnectionDiagnosticMapper.fromException(UnknownHostException("x")).message)
        assertEquals("The connection check failed.", ConnectionDiagnosticMapper.fromException(IllegalStateException("x")).message)
        assertEquals(CantReachReason.NoSharedNetwork, ConnectionDiagnosticMapper.cantReachReasonFor(ConnectionDiagnosticMapper.fromException(errors[0])))
    }

    // AC-007: the in-page overlays' texts, word for word; none takes a URL.
    @Test
    fun thePageLoadFailureNamesTheNodeAndGivesThePlainAdvice() {
        val diagnostic = ConnectionDiagnosticMapper.pageLoadFailed("Test Desktop")
        assertEquals(ConnectionFailureKind.WebViewLoadFailed, diagnostic.kind)
        assertEquals("Can’t reach Test Desktop", diagnostic.title)
        assertEquals("Check that Tailscale or your Wi-Fi is on and the computer is awake.", diagnostic.message)
        assertEquals("Then tap Retry.", diagnostic.recoveryAction)
    }

    @Test
    fun theOtherPageAndAddressTextsCarryNoAddress() {
        assertEquals(
            listOf("This link can’t open here", "AutoByteus on your phone opens only its own pages.", "Tap Retry to go back to your runs."),
            ConnectionDiagnosticMapper.linkBlocked().texts(),
        )
        assertEquals(ConnectionFailureKind.UnsafeNavigationBlocked, ConnectionDiagnosticMapper.linkBlocked().kind)
        assertEquals(
            listOf("No app can open this link", "No app on this phone opens this kind of link.", "Tap Retry to go back to your runs."),
            ConnectionDiagnosticMapper.noAppForLink().texts(),
        )
        assertEquals(
            listOf("Can’t pick files", "This phone has no app for picking files.", "Install or turn on a file manager, then try again."),
            ConnectionDiagnosticMapper.noFilePicker().texts(),
        )
        assertEquals(
            listOf("Check the address", "The address could not be read.", "Check the address and try again."),
            ConnectionDiagnosticMapper.invalidUrl().texts(),
        )
        assertEquals(
            listOf("This address has no extra protection", "A plain http:// address needs the tick in Type an address.", "Tick the box to use it."),
            ConnectionDiagnosticMapper.httpNeedsAcknowledgement().texts(),
        )
        for (diagnostic in listOf(ConnectionDiagnosticMapper.linkBlocked(), ConnectionDiagnosticMapper.noAppForLink(), ConnectionDiagnosticMapper.noFilePicker(), ConnectionDiagnosticMapper.invalidUrl())) {
            assertNoAddress(diagnostic)
        }
    }

    @Test
    fun noDiagnosticFunctionTakesAUrlOrADescription() {
        val parameterNames = ConnectionDiagnosticMapper::class.java.declaredMethods
            .filter { java.lang.reflect.Modifier.isPublic(it.modifiers) && !it.isSynthetic }
            .flatMap { method -> method.parameterTypes.map { method.name to it } }
        val textParameters = parameterNames.filter { (_, type) -> type == String::class.java }.map { (name, _) -> name }.toSet()
        assertEquals(setOf("cantReachText", "phoneAccessDisabled", "pageLoadFailed"), textParameters)
    }
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
