package org.autobyteus.mobile

import android.app.Activity
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.widget.Toast
import org.autobyteus.mobile.connection.CantReachReason
import org.autobyteus.mobile.connection.ConnectionDiagnostic
import org.autobyteus.mobile.connection.ConnectionDiagnosticMapper
import org.autobyteus.mobile.connection.ConnectionValidator
import org.autobyteus.mobile.connection.SavedNodeEntry
import org.autobyteus.mobile.connection.SavedNodeStore
import org.autobyteus.mobile.datamigrations.SavedNodeEntryKeysMigration
import org.autobyteus.mobile.shell.AndroidExternalActions
import org.autobyteus.mobile.shell.ConnectionInputResolver
import org.autobyteus.mobile.shell.EntryForm
import org.autobyteus.mobile.shell.NodeConnectionFlow
import org.autobyteus.mobile.shell.NodeReachability
import org.autobyteus.mobile.shell.OpenPageRestore
import org.autobyteus.mobile.shell.QrScanCoordinator
import org.autobyteus.mobile.ui.ShellUi
import org.autobyteus.mobile.ui.WebShellScreen
import org.autobyteus.mobile.ui.connect.CantReachScreen
import org.autobyteus.mobile.ui.connect.ConnectingScreen
import org.autobyteus.mobile.ui.connect.ScanScreen
import org.autobyteus.mobile.ui.sheets.RemoveNodeSheet
import org.autobyteus.mobile.ui.sheets.TypeAddressSheet
import org.autobyteus.mobile.ui.start.StartScreen
import org.autobyteus.mobile.web.AutoByteusWebView
import org.autobyteus.mobile.web.ShellBridge
import org.autobyteus.mobile.web.WebFileChooserCoordinator
import java.util.concurrent.Executor
import java.util.concurrent.Executors

/** The app's screens: the node list, the scanner, connecting and can't-reach, and the open node's page. */
class MainActivity : Activity(), NodeConnectionFlow.Screens {
    private enum class Screen { Start, SwitchList, Scan, Connecting, CantReach, Web }

    private lateinit var savedNodeStore: SavedNodeStore
    private lateinit var flow: NodeConnectionFlow
    private lateinit var reachability: NodeReachability
    private lateinit var externalActions: AndroidExternalActions
    private lateinit var qrScanCoordinator: QrScanCoordinator
    private lateinit var fileChooserCoordinator: WebFileChooserCoordinator
    private lateinit var ui: ShellUi
    private lateinit var startScreen: StartScreen
    private lateinit var scanScreen: ScanScreen
    private lateinit var webShellScreen: WebShellScreen
    private val checks = Executors.newFixedThreadPool(4)
    private val mainThread = Executor { runOnUiThread(it) }

    private var screen = Screen.Start
    /** Where the scanner and the can't-reach screen's back arrow return to. */
    private var listScreen = Screen.Start
    private var currentWebHost: AutoByteusWebView? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // autobyteus-290 SM-10: the saved entries' stored keys follow the code before the store first reads them.
        SavedNodeEntryKeysMigration.run(this)
        savedNodeStore = SavedNodeStore(this)
        val validator = ConnectionValidator()
        flow = NodeConnectionFlow(savedNodeStore, validator, ConnectionInputResolver(), checks, mainThread, this)
        reachability = NodeReachability(validator, checks, mainThread)
        externalActions = AndroidExternalActions(this)
        ui = ShellUi(this)
        startScreen = StartScreen(ui)
        scanScreen = ScanScreen(ui)
        webShellScreen = WebShellScreen(this)
        qrScanCoordinator = QrScanCoordinator(
            activity = this,
            onOpenScanner = ::showScanner,
            onPermissionDenied = {
                Toast.makeText(this, "AutoByteus needs the camera to scan the code. You can paste the link instead.", Toast.LENGTH_LONG).show()
            },
        )
        fileChooserCoordinator = WebFileChooserCoordinator(this) { diagnostic -> showWebDiagnostic(diagnostic) }

        // A recreated activity already handled the share that started it (autobyteus-426 REQ-003, CRR-003 F-API-002).
        val sharedText = OpenPageRestore.sharedTextToHandle(extractSharedText(intent), recreated = savedInstanceState != null)
        // After Android ended the process in the background, the page that was open (autobyteus-426 REQ-003).
        val restored = OpenPageRestore.read(savedInstanceState, savedNodeStore.loadEntries())
        val lastUsed = savedNodeStore.loadSelectedEntry()
        when {
            sharedText != null -> flow.connect(sharedText, EntryForm.Shared)
            restored != null -> flow.open(restored.entry, restored.url)
            // Opening the app still opens the last used node (REQ-012).
            lastUsed != null -> flow.open(lastUsed)
            else -> showStart()
        }
    }

    /** Only a saved node's page is kept; a pairing page that has not paired yet is not. */
    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        val webHost = currentWebHost ?: return
        val url = webHost.webView.url ?: return
        if (screen == Screen.Web && isPageSaved()) OpenPageRestore.save(outState, webHost.entry.id, url)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        extractSharedText(intent)?.takeIf { it.isNotBlank() }?.let { flow.connect(it, EntryForm.Shared) }
    }

    override fun onResume() {
        super.onResume()
        if (screen == Screen.Scan) scanScreen.resume()
    }

    override fun onPause() {
        if (screen == Screen.Scan) scanScreen.pause()
        super.onPause()
    }

    @Deprecated("Framework activity-result callback keeps the dependency-light Android shell compatible.")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        fileChooserCoordinator.handleActivityResult(requestCode, resultCode, data)
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        qrScanCoordinator.handleRequestPermissionsResult(requestCode, permissions, grantResults)
    }

    /** System Back walks sheet → list → page, and from a page back through its history. */
    @Suppress("OVERRIDE_DEPRECATION", "DEPRECATION")
    override fun onBackPressed() {
        when (screen) {
            Screen.Start -> if (startScreen.hasSheet()) startScreen.showSheet(null) else super.onBackPressed()
            Screen.SwitchList -> if (startScreen.hasSheet()) startScreen.showSheet(null) else showPage()
            Screen.Scan -> closeScanner()
            Screen.Connecting -> cancelConnecting()
            Screen.CantReach -> showList()
            Screen.Web -> {
                val webHost = currentWebHost
                if (webHost?.canGoBack() == true) webHost.goBack() else leavePage()
            }
        }
    }

    override fun onDestroy() {
        reachability.cancel()
        scanScreen.close()
        currentWebHost?.destroy()
        checks.shutdownNow()
        super.onDestroy()
    }

    // NodeConnectionFlow.Screens

    override fun showConnecting(nodeName: String) {
        leaveCurrentScreen(Screen.Connecting)
        setContentView(ConnectingScreen(ui).connecting(nodeName, ::cancelConnecting))
    }

    override fun showCantReach(nodeName: String, reason: CantReachReason) {
        leaveCurrentScreen(Screen.CantReach)
        val content = CantReachScreen.Content(
            title = if (nodeName.isBlank()) "Can’t connect" else "Can’t reach $nodeName",
            body = ConnectionDiagnosticMapper.cantReachText(reason, nodeName),
            link = if (reason.offersTailscale) "Open Tailscale" to { externalActions.openTailscale() } else null,
            primary = if (reason.canRetry) "Retry" to { flow.retry() } else null,
            secondary = "Scan again" to { qrScanCoordinator.startQrScan() },
        )
        setContentView(CantReachScreen(ui).render(content, ::showList))
    }

    override fun showTypeAddress(prefill: String) {
        showStart()
        openTypeAddressSheet(prefill)
    }

    override fun openPage(entry: SavedNodeEntry, url: String, pairing: Boolean) {
        if (!ShellBridge.isSupported()) {
            showUpdateWebView()
            return
        }
        currentWebHost?.destroy()
        var firstPageShown = false
        if (!pairing) setContentView(ConnectingScreen(ui).connected(entry.displayName))
        val webHost = AutoByteusWebView(
            context = this,
            entry = entry,
            fileChooserCoordinator = fileChooserCoordinator,
            shellBridge = ShellBridge(entry, bridgeActions),
            onPageStarted = {},
            onPageFinished = {
                if (!firstPageShown && currentWebHost?.entry == entry) {
                    firstPageShown = true
                    showPage()
                }
            },
            onDiagnostic = { diagnostic -> showWebDiagnostic(diagnostic) },
            onExternalUrl = { url -> Toast.makeText(this, "Opening outside AutoByteus: $url", Toast.LENGTH_SHORT).show() },
        )
        currentWebHost = webHost
        webHost.create(url)
    }

    // Screens

    private val bridgeActions = object : ShellBridge.Actions {
        override fun nodeCount(): Int = savedNodeStore.loadEntries().size
        override fun deviceName(): String = Build.MODEL.orEmpty()
        override fun onPaired(nodeName: String) = flow.onPaired(nodeName)
        override fun onShowNodeList() = showSwitchListOrStart()
        override fun onStartScan() {
            flow.abandonPendingPairing()
            listScreen = Screen.Start
            qrScanCoordinator.startQrScan()
        }
    }

    private fun showStart() = renderList(Screen.Start)

    private fun showList() = renderList(listScreen)

    /** From inside a page: the app's node list with this node marked (DS-006); a page that never paired has none. */
    private fun showSwitchListOrStart() {
        flow.abandonPendingPairing()
        val openEntryId = currentWebHost?.entry?.id
        if (openEntryId != null && savedNodeStore.loadEntries().any { it.id == openEntryId }) {
            renderList(Screen.SwitchList)
        } else {
            closePage()
            showStart()
        }
    }

    private fun renderList(mode: Screen) {
        leaveCurrentScreen(mode)
        listScreen = mode
        val entries = savedNodeStore.loadEntries()
        val switchMode = mode == Screen.SwitchList
        setContentView(startScreen.render(
            entries = entries,
            currentEntryId = currentWebHost?.entry?.id,
            switchMode = switchMode,
            callbacks = StartScreen.Callbacks(
                onOpenNode = { entry -> if (switchMode && entry.id == currentWebHost?.entry?.id) showPage() else flow.open(entry) },
                onMore = ::openRemoveSheet,
                onScan = { qrScanCoordinator.startQrScan() },
                onTypeAddress = { openTypeAddressSheet("") },
                onPasteLink = ::pasteLink,
                onBack = ::showPage,
            ),
        ))
        reachability.start(entries, startScreen::setReachability)
    }

    private fun openTypeAddressSheet(prefill: String) {
        startScreen.showSheet(TypeAddressSheet.build(ui, prefill, onConnect = { address, acknowledged ->
            startScreen.showSheet(null)
            flow.connectTyped(address, acknowledged)
        }, onClose = { startScreen.showSheet(null) }))
    }

    private fun openRemoveSheet(entry: SavedNodeEntry) {
        startScreen.showSheet(RemoveNodeSheet.build(ui, entry, onRemove = {
            savedNodeStore.removeEntry(entry.id)
            if (currentWebHost?.entry?.id == entry.id) {
                closePage()
                showStart()
            } else {
                showList()
            }
        }, onClose = { startScreen.showSheet(null) }))
    }

    private fun pasteLink() {
        val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        val pasted = clipboard.primaryClip?.getItemAt(0)?.coerceToText(this)?.toString().orEmpty()
        flow.connect(pasted, EntryForm.Paste)
    }

    private fun showScanner() {
        if (screen != Screen.Scan && screen != Screen.CantReach) listScreen = if (screen == Screen.SwitchList) Screen.SwitchList else Screen.Start
        leaveCurrentScreen(Screen.Scan)
        setContentView(scanScreen.render(
            onCode = { text ->
                scanScreen.close()
                flow.connect(text, EntryForm.Scan)
            },
            onClose = ::closeScanner,
        ))
        scanScreen.resume()
    }

    private fun closeScanner() {
        scanScreen.close()
        if (listScreen == Screen.SwitchList && currentWebHost != null) renderList(Screen.SwitchList) else showStart()
    }

    private fun cancelConnecting() {
        flow.cancel()
        if (currentWebHost != null && screen == Screen.Connecting && !isPageSaved()) closePage()
        showList()
    }

    private fun showPage() {
        val webHost = currentWebHost ?: return showStart()
        leaveCurrentScreen(Screen.Web)
        setContentView(webShellScreen.render(webView = webHost.webView, diagnostic = null, callbacks = webCallbacks(webHost.entry)))
    }

    /** Back from a page with no history: the node list. */
    private fun leavePage() {
        flow.abandonPendingPairing()
        closePage()
        showStart()
    }

    private fun closePage() {
        currentWebHost?.destroy()
        currentWebHost = null
    }

    private fun isPageSaved(): Boolean = currentWebHost?.entry?.id?.let { id -> savedNodeStore.loadEntries().any { it.id == id } } == true

    private fun showWebDiagnostic(diagnostic: ConnectionDiagnostic) {
        val webHost = currentWebHost ?: return
        if (screen != Screen.Web) leaveCurrentScreen(Screen.Web)
        setContentView(webShellScreen.render(webView = webHost.webView, diagnostic = diagnostic, callbacks = webCallbacks(webHost.entry)))
    }

    private fun webCallbacks(entry: SavedNodeEntry): WebShellScreen.Callbacks = WebShellScreen.Callbacks(
        onEditNode = ::leavePage,
        onRetry = { currentWebHost?.loadTrusted(entry.mobileUrl) ?: flow.open(entry) },
        onOpenInBrowser = { externalActions.openExternal(entry.mobileUrl) },
    )

    /** The phone's WebView is too old for the bridge (no WEB_MESSAGE_LISTENER): ask for an update instead of a page. */
    private fun showUpdateWebView() {
        leaveCurrentScreen(Screen.CantReach)
        val content = CantReachScreen.Content(
            title = "Update Android System WebView",
            body = "AutoByteus needs a newer Android System WebView to open your nodes. Update it, then try again.",
            primary = "Open Google Play" to { externalActions.openExternal("market://details?id=com.google.android.webview") },
        )
        setContentView(CantReachScreen(ui).render(content, ::showStart))
    }

    private fun leaveCurrentScreen(next: Screen) {
        if (screen == Screen.Start || screen == Screen.SwitchList) reachability.cancel()
        if (screen == Screen.Scan && next != Screen.Scan) scanScreen.close()
        screen = next
    }

    private fun extractSharedText(intent: Intent?): String? {
        if (intent?.action != Intent.ACTION_SEND || intent.type != "text/plain") {
            return null
        }
        return intent.getStringExtra(Intent.EXTRA_TEXT)
    }
}
