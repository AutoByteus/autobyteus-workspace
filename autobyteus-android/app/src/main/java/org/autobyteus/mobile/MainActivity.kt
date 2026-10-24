package org.autobyteus.mobile

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.widget.Toast
import org.autobyteus.mobile.connection.ConnectionDiagnostic
import org.autobyteus.mobile.connection.ConnectionValidationResult
import org.autobyteus.mobile.connection.ConnectionValidator
import org.autobyteus.mobile.connection.SavedNodeEntry
import org.autobyteus.mobile.connection.SavedNodeStore
import org.autobyteus.mobile.datamigrations.SavedNodeEntryKeysMigration
import org.autobyteus.mobile.shell.AndroidAppShellViewModel
import org.autobyteus.mobile.shell.AndroidExternalActions
import org.autobyteus.mobile.shell.ConnectionInputResolution
import org.autobyteus.mobile.shell.ConnectionInputResolver
import org.autobyteus.mobile.shell.QrScanCoordinator
import org.autobyteus.mobile.ui.ConnectionScreen
import org.autobyteus.mobile.ui.WebShellScreen
import org.autobyteus.mobile.web.AutoByteusWebView
import org.autobyteus.mobile.web.WebFileChooserCoordinator
import java.util.concurrent.Executors

class MainActivity : Activity() {
    private lateinit var savedNodeStore: SavedNodeStore
    private lateinit var validator: ConnectionValidator
    private lateinit var connectionScreen: ConnectionScreen
    private lateinit var webShellScreen: WebShellScreen
    private lateinit var inputResolver: ConnectionInputResolver
    private lateinit var externalActions: AndroidExternalActions
    private lateinit var qrScanCoordinator: QrScanCoordinator
    private lateinit var fileChooserCoordinator: WebFileChooserCoordinator
    private val viewModel = AndroidAppShellViewModel()
    private val executor = Executors.newSingleThreadExecutor()

    private var currentWebHost: AutoByteusWebView? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // autobyteus-290 SM-10: the saved entries' stored keys follow the code before the store first reads them.
        SavedNodeEntryKeysMigration.run(this)
        savedNodeStore = SavedNodeStore(this)
        validator = ConnectionValidator()
        connectionScreen = ConnectionScreen(this)
        webShellScreen = WebShellScreen(this)
        inputResolver = ConnectionInputResolver()
        externalActions = AndroidExternalActions(this)
        qrScanCoordinator = QrScanCoordinator(
            activity = this,
            onQrText = { decodedText -> submitInput(decodedText, httpAcknowledged = false) },
            onDiagnostic = { diagnostic -> showConnection(diagnostic) },
        )
        fileChooserCoordinator = WebFileChooserCoordinator(this) { diagnostic -> showWebDiagnostic(diagnostic) }

        val sharedText = extractSharedText(intent)
        if (!sharedText.isNullOrBlank()) {
            showConnection(initialInput = sharedText)
            submitInput(sharedText, httpAcknowledged = false)
            return
        }

        val savedEntry = savedNodeStore.loadSelectedEntry()
        if (savedEntry != null) {
            validateAndOpen(savedEntry, savedEntry.mobileUrl, saveAfterValidation = false)
        } else {
            showConnection()
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        val sharedText = extractSharedText(intent)
        if (!sharedText.isNullOrBlank()) {
            showConnection(initialInput = sharedText)
            submitInput(sharedText, httpAcknowledged = false)
        }
    }

    @Deprecated("Framework activity-result callback keeps the dependency-light Android shell compatible.")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (fileChooserCoordinator.handleActivityResult(requestCode, resultCode, data)) return
        if (qrScanCoordinator.handleActivityResult(requestCode, resultCode, data)) return
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray,
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (qrScanCoordinator.handleRequestPermissionsResult(requestCode, permissions, grantResults)) return
    }

    @Suppress("OVERRIDE_DEPRECATION", "DEPRECATION")
    override fun onBackPressed() {
        val webHost = currentWebHost
        if (webHost?.canGoBack() == true) {
            webHost.goBack()
            return
        }
        if (webHost != null) {
            currentWebHost?.destroy()
            currentWebHost = null
            showConnection()
            return
        }
        super.onBackPressed()
    }

    override fun onDestroy() {
        currentWebHost?.destroy()
        executor.shutdownNow()
        super.onDestroy()
    }

    private fun showConnection(
        diagnostic: ConnectionDiagnostic? = null,
        isBusy: Boolean = false,
        initialInput: String = "",
    ) {
        if (!isBusy) {
            viewModel.awaitingInput()
        }
        setContentView(
            connectionScreen.render(
                savedEntries = savedNodeStore.loadEntries(),
                diagnostic = diagnostic,
                isBusy = isBusy,
                initialInput = initialInput,
                callbacks = ConnectionScreen.Callbacks(
                    onOpenSaved = { entry -> validateAndOpen(entry, entry.mobileUrl, saveAfterValidation = false) },
                    onRemoveSaved = { entry ->
                        savedNodeStore.removeEntry(entry.id)
                        showConnection()
                    },
                    onSubmitInput = ::submitInput,
                    onScanQr = { qrScanCoordinator.startQrScan() },
                    onOpenTailscale = { externalActions.openTailscale() },
                ),
            ),
        )
    }

    private fun submitInput(rawText: String, httpAcknowledged: Boolean) {
        when (val resolution = inputResolver.resolve(rawText, httpAcknowledged)) {
            is ConnectionInputResolution.Success ->
                validateAndOpen(resolution.entry, resolution.webViewUrl, saveAfterValidation = true)
            is ConnectionInputResolution.Failure ->
                showConnection(resolution.diagnostic, initialInput = rawText)
        }
    }

    private fun validateAndOpen(
        entry: SavedNodeEntry,
        initialUrl: String,
        saveAfterValidation: Boolean,
    ) {
        viewModel.validating(entry)
        showConnection(isBusy = true)
        executor.execute {
            val result = validator.validate(entry)
            runOnUiThread {
                when (result) {
                    is ConnectionValidationResult.Reachable -> openReachableEntry(
                        entry = entry,
                        initialUrl = initialUrl,
                        serverName = result.status.serverName,
                        saveAfterValidation = saveAfterValidation,
                    )
                    is ConnectionValidationResult.Failed -> showConnection(result.diagnostic)
                }
            }
        }
    }

    private fun openReachableEntry(
        entry: SavedNodeEntry,
        initialUrl: String,
        serverName: String,
        saveAfterValidation: Boolean,
    ) {
        val stableEntry = entry.copy(
            displayName = serverName.ifBlank { entry.displayName },
            updatedAtEpochMillis = System.currentTimeMillis(),
        )
        if (saveAfterValidation || savedNodeStore.loadEntries().none { it.id == stableEntry.id }) {
            savedNodeStore.saveEntry(stableEntry)
        } else {
            savedNodeStore.selectEntry(stableEntry.id)
        }
        openWebShell(stableEntry, initialUrl)
    }

    private fun openWebShell(entry: SavedNodeEntry, initialUrl: String) {
        currentWebHost?.destroy()
        viewModel.opening(entry, initialUrl)
        val webHost = AutoByteusWebView(
            context = this,
            entry = entry,
            fileChooserCoordinator = fileChooserCoordinator,
            onPageStarted = {
                viewModel.opening(entry, it)
                renderCurrentWebShell(null)
            },
            onPageFinished = {
                viewModel.active(entry)
                renderCurrentWebShell(null)
            },
            onDiagnostic = { diagnostic -> showWebDiagnostic(diagnostic) },
            onExternalUrl = { url -> Toast.makeText(this, "Opening outside AutoByteus: $url", Toast.LENGTH_SHORT).show() },
        )
        currentWebHost = webHost
        webHost.create(initialUrl)
        renderCurrentWebShell(null)
    }

    private fun showWebDiagnostic(diagnostic: ConnectionDiagnostic) {
        val webHost = currentWebHost ?: return
        viewModel.recoverableError(diagnostic, webHost.entry)
        renderCurrentWebShell(diagnostic)
    }

    private fun renderCurrentWebShell(diagnostic: ConnectionDiagnostic?) {
        val webHost = currentWebHost ?: return
        setContentView(
            webShellScreen.render(
                webView = webHost.webView,
                diagnostic = diagnostic,
                callbacks = webCallbacks(webHost.entry),
            ),
        )
    }

    private fun webCallbacks(entry: SavedNodeEntry): WebShellScreen.Callbacks = WebShellScreen.Callbacks(
        onEditNode = {
            currentWebHost?.destroy()
            currentWebHost = null
            showConnection()
        },
        onRetry = { currentWebHost?.loadTrusted(entry.mobileUrl) ?: validateAndOpen(entry, entry.mobileUrl, false) },
        onOpenInBrowser = { externalActions.openExternal(entry.mobileUrl) },
    )

    private fun extractSharedText(intent: Intent?): String? {
        if (intent?.action != Intent.ACTION_SEND || intent.type != "text/plain") {
            return null
        }
        return intent.getStringExtra(Intent.EXTRA_TEXT)
    }
}
