package org.autobyteus.mobile

import java.io.File
import javax.xml.parsers.DocumentBuilderFactory
import org.junit.Assert.assertEquals
import org.junit.Test
import org.w3c.dom.Element

/**
 * autobyteus-415: rotation and window-size changes must not recreate MainActivity, which would
 * reopen the saved node's start page and lose the open screen.
 */
class MainActivityManifestTest {
    private val androidNamespace = "http://schemas.android.com/apk/res/android"

    @Test
    fun mainActivityHandlesRotationWindowSizeAndKeyboardChangesItself() {
        val manifest = DocumentBuilderFactory.newInstance()
            .apply { isNamespaceAware = true }
            .newDocumentBuilder()
            .parse(File("src/main/AndroidManifest.xml"))
        val activities = manifest.getElementsByTagName("activity")
        val mainActivity = (0 until activities.length)
            .map { activities.item(it) as Element }
            .single { it.getAttributeNS(androidNamespace, "name") == ".MainActivity" }

        assertEquals(
            setOf(
                "orientation",
                "screenSize",
                "screenLayout",
                "smallestScreenSize",
                "keyboard",
                "keyboardHidden",
                "navigation",
            ),
            mainActivity.getAttributeNS(androidNamespace, "configChanges").split('|').toSet(),
        )
    }
}
