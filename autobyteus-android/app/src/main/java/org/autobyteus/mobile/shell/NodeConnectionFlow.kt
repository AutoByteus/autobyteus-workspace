package org.autobyteus.mobile.shell

import org.autobyteus.mobile.connection.CantReachReason
import org.autobyteus.mobile.connection.ConnectionDiagnosticMapper
import org.autobyteus.mobile.connection.ConnectionValidationResult
import org.autobyteus.mobile.connection.NodeEntries
import org.autobyteus.mobile.connection.NodeStatusCheck
import org.autobyteus.mobile.connection.SavedNodeEntry
import java.util.concurrent.Executor

/** How a connection started (the design's Android entry-form table). */
enum class EntryForm { Scan, Paste, Shared }

/**
 * The connect sequence (DS-004): parse → check the address answers → open the node's page; the entry is saved under
 * its QR name only when the page reports a successful pairing, so a failed code leaves nothing behind. Saved entries
 * (app start, a row, a Switch node pick) skip parsing and saving. If nothing answers, it says why in plain words.
 */
class NodeConnectionFlow(
    private val entries: NodeEntries,
    private val statusCheck: NodeStatusCheck,
    private val resolver: ConnectionInputResolver,
    private val background: Executor,
    private val mainThread: Executor,
    private val screens: Screens,
    private val clock: () -> Long = System::currentTimeMillis,
) {
    /** The activity's screens, as the flow drives them. */
    interface Screens {
        fun showConnecting(nodeName: String)
        fun showCantReach(nodeName: String, reason: CantReachReason)
        fun showTypeAddress(prefill: String)
        fun openPage(entry: SavedNodeEntry, url: String, pairing: Boolean)
    }

    private data class Attempt(val entry: SavedNodeEntry, val url: String, val save: Save)

    private enum class Save { OnPaired, OnReachable, AlreadySaved }

    private var attempt: Attempt? = null
    /** The entry of a pairing link whose page is open, saved when the page reports it paired. */
    private var pendingPairing: SavedNodeEntry? = null
    private var generation = 0

    /** A scanned, pasted or shared text: a pairing link connects at once (REQ-010, DEC-023). */
    fun connect(text: String, form: EntryForm) {
        val resolution = resolver.resolvePairingLink(text)
        if (resolution == null) {
            if (form == EntryForm.Scan) {
                screens.showCantReach(nodeName = "", reason = CantReachReason.NotAnAutoByteusCode)
            } else {
                screens.showTypeAddress(prefill = text.trim())
            }
            return
        }
        run(Attempt(resolution.entry, resolution.webViewUrl, Save.OnPaired))
    }

    /** "Type an address": a plain address, saved when it answers; plain `http://` needs the sheet's tick. */
    fun connectTyped(address: String, httpAcknowledged: Boolean) {
        when (val resolution = resolver.resolveTypedAddress(address, httpAcknowledged)) {
            is ConnectionInputResolution.Success -> run(Attempt(resolution.entry, resolution.webViewUrl, Save.OnReachable))
            is ConnectionInputResolution.Failure -> screens.showCantReach(
                nodeName = address.trim(),
                reason = ConnectionDiagnosticMapper.cantReachReasonFor(resolution.diagnostic),
            )
        }
    }

    /**
     * A saved node: the last used one at app start, a row tap, or a Switch node pick; [pageUrl] is the page that was
     * open before Android ended the process (its start page otherwise).
     */
    fun open(entry: SavedNodeEntry, pageUrl: String = entry.mobileUrl) {
        run(Attempt(entry, pageUrl, Save.AlreadySaved))
    }

    fun retry() {
        attempt?.let(::run)
    }

    /** Cancel on the Connecting screen: a late answer is dropped. */
    fun cancel() {
        generation += 1
        attempt = null
    }

    /**
     * The page reports the code was exchanged (bridge `paired`): the node is saved under its QR name (REQ-011).
     * The page's name is the same QR's; it is used only when the QR carried none (the entry then has its host).
     */
    fun onPaired(pageNodeName: String) {
        val entry = pendingPairing ?: return
        pendingPairing = null
        val qrHadName = entry.displayName != entry.host
        entries.saveEntry(entry.copy(
            displayName = if (qrHadName || pageNodeName.isBlank()) entry.displayName else pageNodeName,
            updatedAtEpochMillis = clock(),
        ))
    }

    /** The page with a pairing link was left without pairing (back to the list, Scan again). */
    fun abandonPendingPairing() {
        pendingPairing = null
    }

    private fun run(next: Attempt) {
        attempt = next
        val current = ++generation
        screens.showConnecting(next.entry.displayName)
        background.execute {
            val result = statusCheck.validate(next.entry)
            mainThread.execute {
                if (current != generation) return@execute
                when (result) {
                    is ConnectionValidationResult.Reachable -> opened(next)
                    is ConnectionValidationResult.Failed -> screens.showCantReach(
                        nodeName = next.entry.displayName,
                        reason = ConnectionDiagnosticMapper.cantReachReasonFor(result.diagnostic),
                    )
                }
            }
        }
    }

    private fun opened(reached: Attempt) {
        val now = clock()
        when (reached.save) {
            Save.OnPaired -> pendingPairing = reached.entry
            Save.OnReachable -> entries.saveEntry(reached.entry.copy(updatedAtEpochMillis = now))
            Save.AlreadySaved -> {
                pendingPairing = null
                entries.selectEntry(reached.entry.id)
            }
        }
        screens.openPage(reached.entry, reached.url, pairing = reached.save == Save.OnPaired)
    }
}
