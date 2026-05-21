package org.autobyteus.mobile.connection

enum class ConnectionFailureKind {
    InvalidUrl,
    HttpNeedsAcknowledgement,
    NetworkUnreachable,
    PhoneAccessDisabled,
    AuthRequired,
    DeviceRevoked,
    WebSocketBlocked,
    ServerVersionIncompatible,
    UnsafeNavigationBlocked,
    WebViewLoadFailed,
}

data class ConnectionDiagnostic(
    val kind: ConnectionFailureKind,
    val title: String,
    val message: String,
    val recoveryAction: String,
)
