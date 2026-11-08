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
import org.junit.Assert.assertFalse
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
        // The activity shows the page's entry by its shown name ("Connected to …").
        override fun openPage(entry: SavedNodeEntry, url: String, pairing: Boolean) { events += "page:${entry.shownName}:$pairing:$url" }
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
    fun aTypedAddressIsSavedWhenItAnswersAndIsShownAsAutoByteusNodeNotItsHost() {
        // autobyteus-433 AC-004: a typed address has no name; the screens never show its host.
        flow().connectTyped("http://192.168.1.25:29695", httpAcknowledged = true)
        assertEquals(
            listOf("connecting:AutoByteus node", "page:AutoByteus node:false:http://192.168.1.25:29695/mobile"),
            screens.events,
        )
        assertEquals(listOf("http://192.168.1.25:29695"), entries.saved.map { it.id })
    }

    @Test
    fun aTypedTailnetAddressThatDoesNotAnswerSaysCantReachAutoByteusNode() {
        val unreachable = FakeCheck { ConnectionValidationResult.Failed(ConnectionDiagnosticMapper.fromException(ConnectException("refused"))) }
        flow(unreachable).connectTyped("https://$TEST_TAILNET_HOST", httpAcknowledged = false)
        assertEquals(listOf("connecting:AutoByteus node", "cantReach:AutoByteus node:NoSharedNetwork"), screens.events)
        screens.events.forEach { assertFalse(it, it.contains("example-tailnet")) }
    }

    @Test
    fun aSavedEntryWhoseStoredNameIsItsHostIsShownAsAutoByteusNode() {
        val legacy = SavedNodeEntry.fromNormalized(NodeUrlNormalizer.normalize("https://$TEST_TAILNET_HOST"), displayName = TEST_TAILNET_HOST)
        entries.saved += legacy
        flow().open(legacy)
        assertEquals(listOf("connecting:AutoByteus node", "page:AutoByteus node:false:https://$TEST_TAILNET_HOST/mobile"), screens.events)
    }

    @Test
    fun aTypedAddressThatCannotBeUsedSaysCantConnectWithoutRepeatingTheTypedText() {
        // AC-006: no name goes to the Can't reach screen, so its title is "Can't connect".
        val flow = flow()
        flow.connectTyped("http://test-node.local:29695", httpAcknowledged = false)
        flow.connectTyped("http://[not an address", httpAcknowledged = true)
        assertEquals(listOf("cantReach::AddressNotUsable", "cantReach::AddressNotUsable"), screens.events)
        assertTrue(entries.saved.isEmpty())
    }

    @Test
    fun theOpenPageOfATypedNodeThatPairsSavesTheNodeUnderTheQrName() {
        // AC-005: the first page then lists it as "Test Node".
        val flow = flow()
        flow.connectTyped("https://$TEST_TAILNET_HOST", httpAcknowledged = false)
        flow.onPaired("Test Node")
        assertEquals(listOf("Test Node"), entries.saved.map { it.shownName })
        assertEquals("https://$TEST_TAILNET_HOST", entries.selected)
        assertEquals(42L, entries.saved.single().updatedAtEpochMillis)
    }

    @Test
    fun aLegacyHostNamedNodeIsNamedWhenItsPagePairs() {
        val legacy = SavedNodeEntry.fromNormalized(NodeUrlNormalizer.normalize("https://$TEST_TAILNET_HOST"), displayName = TEST_TAILNET_HOST, nowEpochMillis = 7L)
        entries.saved += legacy
        val flow = flow()
        flow.open(legacy)
        flow.onPaired("  Test Node  ")
        assertEquals(listOf("Test Node"), entries.saved.map { it.displayName })
        assertEquals(7L, entries.saved.single().createdAtEpochMillis)
    }

    @Test
    fun aNamedNodeIsNotRenamedByItsPage_andAPairingWithoutANameChangesNothing() {
        val named = SavedNodeEntry.fromNormalized(NodeUrlNormalizer.normalize("https://node.example.com"), displayName = "Test Desktop")
        entries.saved += named
        val flow = flow()
        flow.open(named)
        flow.onPaired("Test Node")
        assertEquals(listOf(named), entries.saved)

        entries.saved.clear()
        flow.connectTyped("https://$TEST_TAILNET_HOST", httpAcknowledged = false)
        val typed = entries.saved.single()
        flow.onPaired("")
        assertEquals(listOf(typed), entries.saved)
        assertEquals(null, entries.saved.single().knownName)
    }

    @Test
    fun aQrWithoutANameIsSavedUnnamedWhenThePageReportsNoName() {
        val flow = flow()
        flow.connect(pairingLinkWithoutName("http://192.168.1.25:8001"), EntryForm.Scan)
        assertEquals("connecting:AutoByteus node", screens.events.first())
        flow.onPaired("")
        assertEquals(listOf("AutoByteus node"), entries.saved.map { it.shownName })
        assertEquals(null, entries.saved.single().knownName)
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

    private fun pairingLink(serverBaseUrl: String, serverName: String): String =
        encodedLink(serverBaseUrl, """{"version":1,"serverBaseUrl":"$serverBaseUrl","pairingCode":"sample","expiresAt":"2026-11-07T00:05:00.000Z","serverName":"$serverName"}""")

    private fun pairingLinkWithoutName(serverBaseUrl: String): String =
        encodedLink(serverBaseUrl, """{"version":1,"serverBaseUrl":"$serverBaseUrl","pairingCode":"sample","expiresAt":"2026-11-07T00:05:00.000Z"}""")

    private fun encodedLink(serverBaseUrl: String, json: String): String {
        val encoded = Base64.getUrlEncoder().withoutPadding().encodeToString(json.toByteArray(StandardCharsets.UTF_8))
        return "$serverBaseUrl/mobile?pairing=$encoded"
    }

    private companion object {
        const val TEST_TAILNET_HOST = "test-desktop.example-tailnet.ts.net"
    }
}
