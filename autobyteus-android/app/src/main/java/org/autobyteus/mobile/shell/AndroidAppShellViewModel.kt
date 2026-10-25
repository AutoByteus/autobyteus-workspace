package org.autobyteus.mobile.shell

import org.autobyteus.mobile.connection.ConnectionDiagnostic
import org.autobyteus.mobile.connection.SavedNodeEntry

sealed class AndroidAppShellState {
    data object AwaitingInput : AndroidAppShellState()
    data class ValidatingNode(val entry: SavedNodeEntry? = null) : AndroidAppShellState()
    data class OpeningWebView(val entry: SavedNodeEntry, val initialUrl: String) : AndroidAppShellState()
    data class WebViewActive(val entry: SavedNodeEntry) : AndroidAppShellState()
    data class RecoverableError(
        val diagnostic: ConnectionDiagnostic,
        val entry: SavedNodeEntry? = null,
    ) : AndroidAppShellState()
}

class AndroidAppShellViewModel {
    var state: AndroidAppShellState = AndroidAppShellState.AwaitingInput
        private set

    fun awaitingInput(): AndroidAppShellState = set(AndroidAppShellState.AwaitingInput)

    fun validating(entry: SavedNodeEntry? = null): AndroidAppShellState =
        set(AndroidAppShellState.ValidatingNode(entry))

    fun opening(entry: SavedNodeEntry, initialUrl: String): AndroidAppShellState =
        set(AndroidAppShellState.OpeningWebView(entry, initialUrl))

    fun active(entry: SavedNodeEntry): AndroidAppShellState =
        set(AndroidAppShellState.WebViewActive(entry))

    fun recoverableError(
        diagnostic: ConnectionDiagnostic,
        entry: SavedNodeEntry? = null,
    ): AndroidAppShellState = set(AndroidAppShellState.RecoverableError(diagnostic, entry))

    private fun set(nextState: AndroidAppShellState): AndroidAppShellState {
        state = nextState
        return nextState
    }
}
