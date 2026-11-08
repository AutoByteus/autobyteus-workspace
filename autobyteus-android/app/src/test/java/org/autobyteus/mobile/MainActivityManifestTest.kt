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

    @Test
    fun mainActivityDeclaresNoOrientationSoThePhonesSettingDecides() {
        // autobyteus-432: leaving desktop full screen hands the orientation back as SCREEN_ORIENTATION_UNSPECIFIED,
        // which is the phone's own setting only while the activity declares none.
        val manifest = DocumentBuilderFactory.newInstance()
            .apply { isNamespaceAware = true }
            .newDocumentBuilder()
            .parse(File("src/main/AndroidManifest.xml"))
        val activities = manifest.getElementsByTagName("activity")
        val mainActivity = (0 until activities.length)
            .map { activities.item(it) as Element }
            .single { it.getAttributeNS(androidNamespace, "name") == ".MainActivity" }
        assertEquals("", mainActivity.getAttributeNS(androidNamespace, "screenOrientation"))
    }

    @Test
    fun theAppHoldsNoNewPermission() {
        // one-step-phone-pairing QR-003: the scanner, the bridge (androidx.webkit, a library) and the node list need
        // no permission beyond the ones the app already held.
        val manifest = DocumentBuilderFactory.newInstance()
            .apply { isNamespaceAware = true }
            .newDocumentBuilder()
            .parse(File("src/main/AndroidManifest.xml"))
        val permissions = manifest.getElementsByTagName("uses-permission")
        assertEquals(
            setOf("android.permission.INTERNET", "android.permission.ACCESS_NETWORK_STATE", "android.permission.CAMERA"),
            (0 until permissions.length).map { (permissions.item(it) as Element).getAttributeNS(androidNamespace, "name") }.toSet(),
        )
    }
}
