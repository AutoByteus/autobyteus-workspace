package org.autobyteus.mobile.connection

import java.io.IOException
import java.net.SocketTimeoutException
import javax.net.ssl.SSLException

/** Why the Can't reach screen shows, in the approved design's plain words. */
enum class CantReachReason(val canRetry: Boolean, val offersTailscale: Boolean) {
    /** Nothing answered at the address: not on the same network, and no Tailscale. */
    NoSharedNetwork(canRetry = true, offersTailscale = true),
    /** The address answered with an error: the node is asleep or not serving. */
    NoAnswer(canRetry = true, offersTailscale = false),
    PhoneAccessOff(canRetry = true, offersTailscale = false),
    /** A typed address that could not be read. */
    AddressNotUsable(canRetry = false, offersTailscale = false),
    NotAnAutoByteusCode(canRetry = false, offersTailscale = false),
}

object ConnectionDiagnosticMapper {
    /** The body under "Can't reach <node>". */
    fun cantReachText(reason: CantReachReason, nodeName: String): String = when (reason) {
        CantReachReason.NoSharedNetwork -> "Connect to the same Wi-Fi or VPN as the computer, or turn on Tailscale."
        CantReachReason.NoAnswer -> "$nodeName didn’t answer. Check that the computer is on and awake."
        CantReachReason.PhoneAccessOff -> "$nodeName is reachable, but Phone access is off."
        CantReachReason.AddressNotUsable -> "Check the address and try again."
        CantReachReason.NotAnAutoByteusCode -> "That isn’t an AutoByteus QR code."
    }

    fun cantReachReasonFor(diagnostic: ConnectionDiagnostic): CantReachReason = when (diagnostic.kind) {
        ConnectionFailureKind.NetworkUnreachable -> CantReachReason.NoSharedNetwork
        ConnectionFailureKind.PhoneAccessDisabled -> CantReachReason.PhoneAccessOff
        ConnectionFailureKind.InvalidUrl, ConnectionFailureKind.HttpNeedsAcknowledgement -> CantReachReason.AddressNotUsable
        else -> CantReachReason.NoAnswer
    }

    // No text here carries an address, a URL or an exception's text (autobyteus-433 REQ-006, REQ-007).

    fun invalidUrl(): ConnectionDiagnostic = ConnectionDiagnostic(
        kind = ConnectionFailureKind.InvalidUrl,
        title = "Check the address",
        message = "The address could not be read.",
        recoveryAction = "Check the address and try again.",
    )

    fun httpNeedsAcknowledgement(): ConnectionDiagnostic = ConnectionDiagnostic(
        kind = ConnectionFailureKind.HttpNeedsAcknowledgement,
        title = "This address has no extra protection",
        message = "A plain http:// address needs the tick in Type an address.",
        recoveryAction = "Tick the box to use it.",
    )

    fun phoneAccessDisabled(nodeName: String? = null): ConnectionDiagnostic = ConnectionDiagnostic(
        kind = ConnectionFailureKind.PhoneAccessDisabled,
        title = "Phone access is off",
        message = "${nodeName ?: "This AutoByteus node"} is reachable, but Phone access is off.",
        recoveryAction = "On your computer, open Nodes › Phone Setup and turn Phone access on, then retry.",
    )

    /** The node answered with an error status; [nodeName] is the name the app shows for it, never its address. */
    fun fromHttpStatus(statusCode: Int, nodeName: String): ConnectionDiagnostic = when (statusCode) {
        401 -> ConnectionDiagnostic(
            kind = ConnectionFailureKind.AuthRequired,
            title = "Pair this phone again",
            message = "The node rejected the current mobile credential.",
            recoveryAction = "Remove the node in this app, show a new QR code on your computer, and scan it again.",
        )
        403 -> ConnectionDiagnostic(
            kind = ConnectionFailureKind.DeviceRevoked,
            title = "Phone credential was rejected",
            message = "Phone access may be off, or this phone may have been revoked on the computer.",
            recoveryAction = "Turn Phone access on, or show a new QR code on your computer and scan it again.",
        )
        // autobyteus-435 REQ-007, DEC-006: which node did not open and what to try, in plain words.
        else -> ConnectionDiagnostic(
            kind = ConnectionFailureKind.WebViewLoadFailed,
            title = "Can’t open $nodeName",
            message = "$nodeName answered, but its page didn’t open (error $statusCode).",
            recoveryAction = "Check that AutoByteus is running on the computer, then tap Retry.",
        )
    }

    /** The exception's own text is never used: an unresolved host's exception names the host. */
    fun fromException(error: Throwable): ConnectionDiagnostic {
        val likelyTls = error is SSLException
        return ConnectionDiagnostic(
            kind = ConnectionFailureKind.NetworkUnreachable,
            title = if (likelyTls) "Secure connection failed" else "AutoByteus node is unreachable",
            message = when (error) {
                is SocketTimeoutException -> "The request timed out before the desktop node responded."
                is IOException -> "The phone could not reach the node."
                else -> "The connection check failed."
            },
            recoveryAction = if (likelyTls) {
                "Use a valid Tailscale Serve HTTPS URL, or acknowledge private HTTP if you are using a LAN/tailnet URL."
            } else {
                "Connect Tailscale, confirm the desktop is online and awake, check split tunneling, then retry."
            },
        )
    }

    /** The open node's page did not load (the main frame's load error); the WebView's error text is not shown. */
    fun pageLoadFailed(nodeName: String): ConnectionDiagnostic = ConnectionDiagnostic(
        kind = ConnectionFailureKind.WebViewLoadFailed,
        title = "Can’t reach $nodeName",
        message = "Check that Tailscale or your Wi-Fi is on and the computer is awake.",
        recoveryAction = "Then tap Retry.",
    )

    /** A same-origin link outside the pages the app opens. */
    fun linkBlocked(): ConnectionDiagnostic = ConnectionDiagnostic(
        kind = ConnectionFailureKind.UnsafeNavigationBlocked,
        title = "This link can’t open here",
        message = "AutoByteus on your phone opens only its own pages.",
        recoveryAction = "Tap Retry to go back to your runs.",
    )

    /** A link to open outside the app that no installed app opens. */
    fun noAppForLink(): ConnectionDiagnostic = ConnectionDiagnostic(
        kind = ConnectionFailureKind.WebViewLoadFailed,
        title = "No app can open this link",
        message = "No app on this phone opens this kind of link.",
        recoveryAction = "Tap Retry to go back to your runs.",
    )

    fun noFilePicker(): ConnectionDiagnostic = ConnectionDiagnostic(
        kind = ConnectionFailureKind.WebViewLoadFailed,
        title = "Can’t pick files",
        message = "This phone has no app for picking files.",
        recoveryAction = "Install or turn on a file manager, then try again.",
    )
}
