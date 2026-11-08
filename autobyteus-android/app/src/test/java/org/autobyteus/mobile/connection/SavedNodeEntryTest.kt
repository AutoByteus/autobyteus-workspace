package org.autobyteus.mobile.connection

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

// autobyteus-433: a node is shown by its name, never by its address. Test names and addresses only.
class SavedNodeEntryTest {
    private val tailnet = NodeUrlNormalizer.normalize("https://test-desktop.example-tailnet.ts.net")

    @Test
    fun aQrNameIsTheKnownAndShownName() {
        val entry = SavedNodeEntry.fromNormalized(tailnet, displayName = "Test Desktop")
        assertEquals("Test Desktop", entry.knownName)
        assertEquals("Test Desktop", entry.shownName)
    }

    @Test
    fun aTypedAddressHasNoKnownNameAndIsShownAsAutoByteusNode() {
        val entry = SavedNodeEntry.fromNormalized(tailnet)
        assertEquals("test-desktop.example-tailnet.ts.net", entry.displayName)
        assertNull(entry.knownName)
        assertEquals("AutoByteus node", entry.shownName)
    }

    @Test
    fun aSavedEntryWhoseStoredNameIsItsHostReadsAsUnnamed() {
        val legacy = SavedNodeEntry.fromNormalized(NodeUrlNormalizer.normalize("http://192.168.1.25:29695"))
            .copy(displayName = "192.168.1.25")
        assertNull(legacy.knownName)
        assertEquals("AutoByteus node", legacy.shownName)
        assertNull(SavedNodeEntry.fromNormalized(tailnet).copy(displayName = "Test-Desktop.Example-Tailnet.ts.net").knownName)
    }

    @Test
    fun aBlankStoredNameReadsAsUnnamed() {
        assertEquals("AutoByteus node", SavedNodeEntry.fromNormalized(tailnet).copy(displayName = "  ").shownName)
    }
}
