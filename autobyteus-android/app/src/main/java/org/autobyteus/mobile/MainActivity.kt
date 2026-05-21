package org.autobyteus.mobile

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.widget.Toast
import org.autobyteus.mobile.connection.ConnectionDiagnostic
import org.autobyteus.mobile.connection.ConnectionValidationResult
import org.autobyteus.mobile.connection.ConnectionValidator
import org.autobyteus.mobile.connection.SavedNodeProfile
import org.autobyteus.mobile.connection.SavedNodeStore
import org.autobyteus.mobile.shell.AndroidAppShellViewModel
import org.autobyteus.mobile.shell.AndroidExternalActions
import org.autobyteus.mobile.shell.ConnectionInputResolution
import org.autobyteus.mobile.shell.ConnectionInputResolver
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
    private lateinit var fileChooserCoordinator: WebFileChooserCoordinator
    private val viewModel = AndroidAppShellViewModel()
    private val executor = Executors.newSingleThreadExecutor()

    private var currentWebHost: AutoByteusWebView? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        savedNodeStore = SavedNodeStore(this)
        validator = ConnectionValidator()
        connectionScreen = ConnectionScreen(this)
        webShellScreen = WebShellScreen(this)
        inputResolver = ConnectionInputResolver()
        externalActions = AndroidExternalActions(this) { diagnostic -> showConnection(diagnostic) }
        fileChooserCoordinator = WebFileChooserCoordinator(this) { diagnostic -> showWebDiagnostic(diagnostic) }

        val sharedText = extractSharedText(intent)
        if (!sharedText.isNullOrBlank()) {
            showConnection(initialInput = sharedText)
            submitInput(sharedText, httpAcknowledged = false)
            return
        }

        val savedProfile = savedNodeStore.loadSelectedProfile()
        if (savedProfile != null) {
            validateAndOpen(savedProfile, savedProfile.mobileUrl, saveAfterValidation = false)
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
        if (requestCode == AndroidExternalActions.QR_SCAN_REQUEST && resultCode == RESULT_OK) {
            data?.getStringExtra("SCAN_RESULT")?.takeIf { it.isNotBlank() }?.let { submitInput(it, false) }
        }
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
                savedProfiles = savedNodeStore.loadProfiles(),
                diagnostic = diagnostic,
                isBusy = isBusy,
                initialInput = initialInput,
                callbacks = ConnectionScreen.Callbacks(
                    onOpenSaved = { profile -> validateAndOpen(profile, profile.mobileUrl, saveAfterValidation = false) },
                    onRemoveSaved = { profile ->
                        savedNodeStore.removeProfile(profile.id)
                        showConnection()
                    },
                    onSubmitInput = ::submitInput,
                    onScanQr = { externalActions.startQrScan() },
                    onOpenTailscale = { externalActions.openTailscale() },
                ),
            ),
        )
    }

    private fun submitInput(rawText: String, httpAcknowledged: Boolean) {
        when (val resolution = inputResolver.resolve(rawText, httpAcknowledged)) {
            is ConnectionInputResolution.Success ->
                validateAndOpen(resolution.profile, resolution.webViewUrl, saveAfterValidation = true)
            is ConnectionInputResolution.Failure ->
                showConnection(resolution.diagnostic, initialInput = rawText)
        }
    }

    private fun validateAndOpen(
        profile: SavedNodeProfile,
        initialUrl: String,
        saveAfterValidation: Boolean,
    ) {
        viewModel.validating(profile)
        showConnection(isBusy = true)
        executor.execute {
            val result = validator.validate(profile)
            runOnUiThread {
                when (result) {
                    is ConnectionValidationResult.Reachable -> openReachableProfile(
                        profile = profile,
                        initialUrl = initialUrl,
                        serverName = result.status.serverName,
                        saveAfterValidation = saveAfterValidation,
                    )
                    is ConnectionValidationResult.Failed -> showConnection(result.diagnostic)
                }
            }
        }
    }

    private fun openReachableProfile(
        profile: SavedNodeProfile,
        initialUrl: String,
        serverName: String,
        saveAfterValidation: Boolean,
    ) {
        val stableProfile = profile.copy(
            displayName = serverName.ifBlank { profile.displayName },
            updatedAtEpochMillis = System.currentTimeMillis(),
        )
        if (saveAfterValidation || savedNodeStore.loadProfiles().none { it.id == stableProfile.id }) {
            savedNodeStore.saveProfile(stableProfile)
        } else {
            savedNodeStore.selectProfile(stableProfile.id)
        }
        openWebShell(stableProfile, initialUrl)
    }

    private fun openWebShell(profile: SavedNodeProfile, initialUrl: String) {
        currentWebHost?.destroy()
        viewModel.opening(profile, initialUrl)
        val webHost = AutoByteusWebView(
            context = this,
            profile = profile,
            fileChooserCoordinator = fileChooserCoordinator,
            onPageStarted = {
                viewModel.opening(profile, it)
                renderCurrentWebShell(null)
            },
            onPageFinished = {
                viewModel.active(profile)
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
        viewModel.recoverableError(diagnostic, webHost.profile)
        renderCurrentWebShell(diagnostic)
    }

    private fun renderCurrentWebShell(diagnostic: ConnectionDiagnostic?) {
        val webHost = currentWebHost ?: return
        setContentView(
            webShellScreen.render(
                webView = webHost.webView,
                profile = webHost.profile,
                diagnostic = diagnostic,
                callbacks = webCallbacks(webHost.profile),
            ),
        )
    }

    private fun webCallbacks(profile: SavedNodeProfile): WebShellScreen.Callbacks = WebShellScreen.Callbacks(
        onEditNode = {
            currentWebHost?.destroy()
            currentWebHost = null
            showConnection()
        },
        onRetry = { currentWebHost?.loadTrusted(profile.mobileUrl) ?: validateAndOpen(profile, profile.mobileUrl, false) },
        onOpenInBrowser = { externalActions.openExternal(profile.mobileUrl) },
    )

    private fun extractSharedText(intent: Intent?): String? {
        if (intent?.action != Intent.ACTION_SEND || intent.type != "text/plain") {
            return null
        }
        return intent.getStringExtra(Intent.EXTRA_TEXT)
    }
}
