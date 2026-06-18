package org.autobyteus.mobile.connection

import java.io.IOException
import java.net.SocketTimeoutException
import javax.net.ssl.SSLException

object ConnectionDiagnosticMapper {
    fun invalidUrl(message: String): ConnectionDiagnostic = ConnectionDiagnostic(
        kind = ConnectionFailureKind.InvalidUrl,
        title = "Check the AutoByteus URL",
        message = message,
        recoveryAction = "Use a stable Tailscale Serve, MagicDNS, LAN, or private-network URL that reaches the desktop node.",
    )

    fun cameraPermissionDenied(): ConnectionDiagnostic = ConnectionDiagnostic(
        kind = ConnectionFailureKind.InvalidUrl,
        title = "Camera permission is needed",
        message = "AutoByteus needs camera permission to scan the Phone Access QR.",
        recoveryAction = "Grant camera permission and scan again, or paste/manual-enter the Phone Access link text.",
    )

    fun qrScanCanceled(): ConnectionDiagnostic = ConnectionDiagnostic(
        kind = ConnectionFailureKind.InvalidUrl,
        title = "QR scan was not completed",
        message = "No QR text was returned from the scanner.",
        recoveryAction = "Scan the Phone Access QR again, or paste/manual-enter the Phone Access link text.",
    )

    fun qrScanUnavailable(): ConnectionDiagnostic = ConnectionDiagnostic(
        kind = ConnectionFailureKind.InvalidUrl,
        title = "QR scanner could not start",
        message = "The in-app QR scanner could not start on this device.",
        recoveryAction = "Try Scan QR again after checking camera permission, or paste/manual-enter the Phone Access link text.",
    )

    fun httpNeedsAcknowledgement(url: String): ConnectionDiagnostic = ConnectionDiagnostic(
        kind = ConnectionFailureKind.HttpNeedsAcknowledgement,
        title = "HTTP needs explicit acknowledgement",
        message = "$url uses cleartext HTTP. Prefer Tailscale Serve HTTPS for travel. Continue with HTTP only for a private LAN or tailnet you trust.",
        recoveryAction = "Tick the HTTP acknowledgement box or switch to an https:// Tailscale Serve URL.",
    )

    fun phoneAccessDisabled(serverName: String? = null): ConnectionDiagnostic = ConnectionDiagnostic(
        kind = ConnectionFailureKind.PhoneAccessDisabled,
        title = "Phone Access is disabled",
        message = "${serverName ?: "This AutoByteus node"} is reachable, but Phone Access is off.",
        recoveryAction = "Open AutoByteus on the desktop, go to Nodes -> Phone Setup, enable Phone Access, then retry.",
    )

    fun fromHttpStatus(statusCode: Int): ConnectionDiagnostic = when (statusCode) {
        401 -> ConnectionDiagnostic(
            kind = ConnectionFailureKind.AuthRequired,
            title = "Pair this phone again",
            message = "The node rejected the current mobile credential.",
            recoveryAction = "Reset the saved node in this app, create a fresh Phone Access QR/link on desktop, and pair again.",
        )
        403 -> ConnectionDiagnostic(
            kind = ConnectionFailureKind.DeviceRevoked,
            title = "Phone credential was rejected",
            message = "Phone Access may be disabled or this phone may have been revoked on the desktop node.",
            recoveryAction = "Enable Phone Access or revoke/re-pair from the desktop Phone Access card.",
        )
        426 -> ConnectionDiagnostic(
            kind = ConnectionFailureKind.ServerVersionIncompatible,
            title = "Desktop node needs an update",
            message = "The Android shell and desktop node reported incompatible remote-access versions.",
            recoveryAction = "Update AutoByteus on the desktop and rebuild/reinstall the Android app if needed.",
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
