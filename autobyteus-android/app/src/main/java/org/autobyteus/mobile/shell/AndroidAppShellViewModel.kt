package org.autobyteus.mobile.shell

import org.autobyteus.mobile.connection.ConnectionDiagnostic
import org.autobyteus.mobile.connection.SavedNodeProfile

sealed class AndroidAppShellState {
    data object AwaitingInput : AndroidAppShellState()
    data class ValidatingNode(val profile: SavedNodeProfile? = null) : AndroidAppShellState()
    data class OpeningWebView(val profile: SavedNodeProfile, val initialUrl: String) : AndroidAppShellState()
    data class WebViewActive(val profile: SavedNodeProfile) : AndroidAppShellState()
    data class RecoverableError(
        val diagnostic: ConnectionDiagnostic,
        val profile: SavedNodeProfile? = null,
    ) : AndroidAppShellState()
}

class AndroidAppShellViewModel {
    var state: AndroidAppShellState = AndroidAppShellState.AwaitingInput
        private set

    fun awaitingInput(): AndroidAppShellState = set(AndroidAppShellState.AwaitingInput)

    fun validating(profile: SavedNodeProfile? = null): AndroidAppShellState =
        set(AndroidAppShellState.ValidatingNode(profile))

    fun opening(profile: SavedNodeProfile, initialUrl: String): AndroidAppShellState =
        set(AndroidAppShellState.OpeningWebView(profile, initialUrl))

    fun active(profile: SavedNodeProfile): AndroidAppShellState =
        set(AndroidAppShellState.WebViewActive(profile))

    fun recoverableError(
        diagnostic: ConnectionDiagnostic,
        profile: SavedNodeProfile? = null,
    ): AndroidAppShellState = set(AndroidAppShellState.RecoverableError(diagnostic, profile))

    private fun set(nextState: AndroidAppShellState): AndroidAppShellState {
        state = nextState
        return nextState
    }
}
