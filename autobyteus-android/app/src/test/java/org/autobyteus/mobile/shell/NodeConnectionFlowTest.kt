package org.autobyteus.mobile.shell

import org.autobyteus.mobile.connection.CantReachReason
import org.autobyteus.mobile.connection.ConnectionDiagnosticMapper
import org.autobyteus.mobile.connection.ConnectionValidationResult
import org.autobyteus.mobile.connection.NodeEntries
import org.autobyteus.mobile.connection.NodeStatusCheck
import org.autobyteus.mobile.connection.NodeUrlNormalizer
import org.autobyteus.mobile.connection.RemoteAccessStatus
import org.autobyteus.mobile.connection.SavedNodeEntry
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.net.ConnectException
import java.nio.charset.StandardCharsets
import java.util.Base64
import java.util.concurrent.Executor

// Synthetic nodes and codes; nothing real.
class NodeConnectionFlowTest {
    private class FakeEntries : NodeEntries {
        val saved = mutableListOf<SavedNodeEntry>()
        var selected: String? = null
        override fun loadEntries(): List<SavedNodeEntry> = saved.toList()
        override fun saveEntry(entry: SavedNodeEntry): SavedNodeEntry {
            saved.removeAll { it.id == entry.id }
            saved.add(0, entry)
            selected = entry.id
            return entry
        }
        override fun selectEntry(entryId: String) {
            selected = entryId
        }
    }

    private class FakeCheck(var result: (SavedNodeEntry) -> ConnectionValidationResult) : NodeStatusCheck {
        override fun validate(entry: SavedNodeEntry): ConnectionValidationResult = result(entry)
    }

    private class RecordingScreens : NodeConnectionFlow.Screens {
        val events = mutableListOf<String>()
        override fun showConnecting(nodeName: String) { events += "connecting:$nodeName" }
        override fun showCantReach(nodeName: String, reason: CantReachReason) { events += "cantReach:$nodeName:$reason" }
        override fun showTypeAddress(prefill: String) { events += "typeAddress:$prefill" }
        override fun openPage(entry: SavedNodeEntry, url: String, pairing: Boolean) { events += "page:${entry.displayName}:$pairing:$url" }
    }

    private val direct = Executor { it.run() }
    private val entries = FakeEntries()
    private val screens = RecordingScreens()
    private val reachable = FakeCheck { entry -> ConnectionValidationResult.Reachable(entry, RemoteAccessStatus(phoneAccessEnabled = true, pairingAvailable = true)) }
    private fun flow(check: NodeStatusCheck = reachable, background: Executor = direct) =
        NodeConnectionFlow(entries, check, ConnectionInputResolver(), background, direct, screens) { 42L }

    @Test
    fun aScannedCodeOpensThePageAndSavesTheNodeUnderItsQrNameOnlyWhenThePagePaired() {
        // E-10: the status carries no name; the saved entry keeps the QR's name ("Docker node 1"), not a constant.
        val link = pairingLink("http://192.168.1.25:8001", "Docker node 1")
        val flow = flow()

        flow.connect(link, EntryForm.Scan)

        assertEquals(listOf("connecting:Docker node 1", "page:Docker node 1:true:$link"), screens.events)
        assertTrue("nothing is saved before the page pairs", entries.saved.isEmpty())

        flow.onPaired("Docker node 1")
        assertEquals(listOf("Docker node 1"), entries.saved.map { it.displayName })
        assertEquals("http://192.168.1.25:8001", entries.selected)
        assertTrue(entries.saved.single().httpAcknowledged)
    }

    @Test
    fun aPageThatWasLeftWithoutPairingSavesNothing() {
        val flow = flow()
        flow.connect(pairingLink("http://192.168.1.25:8001", "Docker node 1"), EntryForm.Shared)
        flow.abandonPendingPairing()
        flow.onPaired("Docker node 1")
        assertTrue(entries.saved.isEmpty())
    }

    @Test
    fun aCodeWhoseAddressDoesNotAnswerSaysWhatIsMissing() {
        val unreachable = FakeCheck { ConnectionValidationResult.Failed(ConnectionDiagnosticMapper.fromException(ConnectException("refused"))) }
        flow(unreachable).connect(pairingLink("http://192.168.1.25:8001", "Docker node 2"), EntryForm.Scan)
        assertEquals("cantReach:Docker node 2:NoSharedNetwork", screens.events.last())
        assertTrue(entries.saved.isEmpty())
    }

    @Test
    fun scannedTextThatIsNotAPairingLinkIsNotAnAutoByteusCode_pastedTextGoesToTheAddressSheet() {
        val flow = flow()
        flow.connect("hello", EntryForm.Scan)
        flow.connect("http://192.168.1.25:29695", EntryForm.Paste)
        assertEquals(listOf("cantReach::NotAnAutoByteusCode", "typeAddress:http://192.168.1.25:29695"), screens.events)
    }

    @Test
    fun aSavedNodeOpensWithoutSavingAgainAndKeepsItsName() {
        val saved = SavedNodeEntry.fromNormalized(NodeUrlNormalizer.normalize("https://node.example.com"), displayName = "Office Mac")
        entries.saved += saved
        flow().open(saved)
        assertEquals(listOf("connecting:Office Mac", "page:Office Mac:false:https://node.example.com/mobile"), screens.events)
        assertEquals(saved.id, entries.selected)
        assertEquals(listOf(saved), entries.saved)
    }

    @Test
    fun aTypedAddressIsSavedWhenItAnswers() {
        flow().connectTyped("http://192.168.1.25:29695", httpAcknowledged = true)
        assertEquals("page:192.168.1.25:false:http://192.168.1.25:29695/mobile", screens.events.last())
        assertEquals(listOf("http://192.168.1.25:29695"), entries.saved.map { it.id })
    }

    @Test
    fun cancelDropsALateAnswer() {
        val queued = mutableListOf<Runnable>()
        val flow = flow(background = Executor { queued += it })
        flow.connect(pairingLink("http://192.168.1.25:8001", "Docker node 1"), EntryForm.Scan)
        flow.cancel()
        queued.forEach(Runnable::run)
        assertEquals(listOf("connecting:Docker node 1"), screens.events)
    }

    private fun pairingLink(serverBaseUrl: String, serverName: String): String {
        val json = """{"version":1,"serverBaseUrl":"$serverBaseUrl","pairingCode":"sample","expiresAt":"2026-11-07T00:05:00.000Z","serverName":"$serverName"}"""
        val encoded = Base64.getUrlEncoder().withoutPadding().encodeToString(json.toByteArray(StandardCharsets.UTF_8))
        return "$serverBaseUrl/mobile?pairing=$encoded"
    }
}
