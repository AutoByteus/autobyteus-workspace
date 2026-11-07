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

    fun invalidUrl(message: String): ConnectionDiagnostic = ConnectionDiagnostic(
        kind = ConnectionFailureKind.InvalidUrl,
        title = "Check the address",
        message = message,
        recoveryAction = "Check the address and try again.",
    )

    fun httpNeedsAcknowledgement(url: String): ConnectionDiagnostic = ConnectionDiagnostic(
        kind = ConnectionFailureKind.HttpNeedsAcknowledgement,
        title = "This address has no extra protection",
        message = "$url has no extra protection. Fine at home or in your office; on public Wi-Fi, use Tailscale.",
        recoveryAction = "Tick the box to use it.",
    )

    fun phoneAccessDisabled(nodeName: String? = null): ConnectionDiagnostic = ConnectionDiagnostic(
        kind = ConnectionFailureKind.PhoneAccessDisabled,
        title = "Phone access is off",
        message = "${nodeName ?: "This AutoByteus node"} is reachable, but Phone access is off.",
        recoveryAction = "On your computer, open Nodes › Phone Setup and turn Phone access on, then retry.",
    )

    fun fromHttpStatus(statusCode: Int): ConnectionDiagnostic = when (statusCode) {
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
        else -> ConnectionDiagnostic(
            kind = ConnectionFailureKind.WebViewLoadFailed,
            title = "AutoByteus returned HTTP $statusCode",
            message = "The saved node was reached, but the mobile shell could not load successfully.",
            recoveryAction = "Verify the saved URL, Phone Access state, and that the desktop server is serving /mobile.",
        )
    }

    fun fromException(error: Throwable): ConnectionDiagnostic {
        val detail = error.message?.takeIf { it.isNotBlank() } ?: error::class.java.simpleName
        val likelyTls = error is SSLException
        return ConnectionDiagnostic(
            kind = ConnectionFailureKind.NetworkUnreachable,
            title = if (likelyTls) "Secure connection failed" else "AutoByteus node is unreachable",
            message = when (error) {
                is SocketTimeoutException -> "The request timed out before the desktop node responded."
                is IOException -> "The phone could not reach the saved AutoByteus node. Details: $detail"
                else -> "The connection check failed. Details: $detail"
            },
            recoveryAction = if (likelyTls) {
                "Use a valid Tailscale Serve HTTPS URL, or acknowledge private HTTP if you are using a LAN/tailnet URL."
            } else {
                "Connect Tailscale, confirm the desktop is online and awake, check split tunneling, then retry."
            },
        )
    }

    fun unsafeNavigationBlocked(url: String): ConnectionDiagnostic = ConnectionDiagnostic(
        kind = ConnectionFailureKind.UnsafeNavigationBlocked,
        title = "Navigation blocked",
        message = "The app blocked an untrusted in-WebView navigation: $url",
        recoveryAction = "Open unrelated links in the system browser. AutoByteus mobile stays on the saved node origin.",
    )

    fun webViewLoadFailed(description: String): ConnectionDiagnostic = ConnectionDiagnostic(
        kind = ConnectionFailureKind.WebViewLoadFailed,
        title = "Mobile shell failed to load",
        message = description,
        recoveryAction = "Retry, connect Tailscale, verify the desktop is online, or reset and pair again.",
    )
}
