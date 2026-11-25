package org.autobyteus.mobile.web

import org.autobyteus.mobile.connection.NodeUrlNormalizer
import org.autobyteus.mobile.connection.SavedNodeEntry
import org.autobyteus.mobile.media.MediaKind
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

// AR-001: the bridge acts only on main-frame messages from the open node's origin.
class ShellBridgeMessagesTest {
    private val origin = "http://192.168.1.25:29695"

    @Test
    fun readsTheFiveMessagesFromTheMainFrameOfTheNodesOrigin() {
        assertEquals(ShellBridgeAction.Hello, read("""{"type":"hello"}"""))
        assertEquals(ShellBridgeAction.PageReady, read("""{"type":"pageReady"}"""))
        assertEquals(ShellBridgeAction.Paired("Docker node 1"), read("""{"type":"paired","nodeName":"Docker node 1"}"""))
        assertEquals(ShellBridgeAction.ShowNodeList, read("""{"type":"showNodeList"}"""))
        assertEquals(ShellBridgeAction.StartScan, read("""{"type":"startScan"}"""))
    }

    @Test
    fun ignoresSubframesOtherOriginsAndUnknownMessages() {
        assertNull(read("""{"type":"showNodeList"}""", isMainFrame = false))
        assertNull(read("""{"type":"showNodeList"}""", sourceOrigin = "http://192.168.1.25:8001"))
        assertNull(read("""{"type":"showNodeList"}""", sourceOrigin = "null"))
        // autobyteus-433 DS-006: "the page is ready" counts only from the node's own page, never a subframe or another origin
        // (WebView's error page has the origin chrome-error://chromewebdata and gets no bridge at all).
        assertNull(read("""{"type":"pageReady"}""", isMainFrame = false))
        assertNull(read("""{"type":"pageReady"}""", sourceOrigin = "http://192.168.1.25:8001"))
        assertNull(read("""{"type":"pageReady"}""", sourceOrigin = "chrome-error://chromewebdata"))
        assertNull(read("""{"type":"credential"}"""))
        assertNull(read("not json"))
        assertNull(read(null))
    }

    // autobyteus-432: the VNC Viewer's desktop full screen, under the same main-frame and origin rule.
    @Test
    fun readsDesktopFullScreenOnAndOffFromTheMainFrameOfTheNodesOrigin() {
        assertEquals(ShellBridgeAction.DesktopFullScreen(true), read("""{"type":"desktopFullScreen","on":true}"""))
        assertEquals(ShellBridgeAction.DesktopFullScreen(false), read("""{"type":"desktopFullScreen","on":false}"""))
    }

    @Test
    fun ignoresDesktopFullScreenFromASubframeAnotherOriginOrWithoutABooleanOn() {
        val on = """{"type":"desktopFullScreen","on":true}"""
        assertNull(read(on, isMainFrame = false))
        assertNull(read(on, sourceOrigin = "http://192.168.1.25:8001"))
        assertNull(read(on, sourceOrigin = "null"))
        assertNull(read("""{"type":"desktopFullScreen"}"""))
        assertNull(read("""{"type":"desktopFullScreen","on":"true"}"""))
        assertNull(read("""{"type":"desktopFullScreen","on":1}"""))
        assertNull(read("""{"type":"desktopFullScreen","on":null}"""))
    }

    @Test
    fun answersHelloWithTheNodeCountTheModelNameAndTheOpenNodesName() {
        val reply = JSONObject(ShellBridgeMessages.helloReply(nodeCount = 3, deviceName = "Pixel 8", nodeName = "Test Desktop"))
        assertEquals("shell", reply.getString("type"))
        assertEquals(3, reply.getInt("nodeCount"))
        assertEquals("Pixel 8", reply.getString("deviceName"))
        assertEquals("Test Desktop", reply.getString("nodeName"))
        // autobyteus-642 D-2: the file types the app's own player (Media3) plays, per kind.
        val player = reply.getJSONObject("mediaPlayer")
        val listed = { kind: String -> player.getJSONArray(kind).let { list -> List(list.length()) { list.getString(it) } } }
        assertEquals(listOf("mp4", "m4v", "mov", "webm", "mkv", "3gp"), listed("video"))
        assertEquals(listOf("mp3", "m4a", "aac", "wav", "ogg", "oga", "opus", "flac"), listed("audio"))
        assertEquals(setOf("video", "audio"), player.keys().asSequence().toSet())
        assertEquals(setOf("type", "nodeCount", "deviceName", "nodeName", "mediaPlayer"), reply.keys().asSequence().toSet())
    }

    @Test
    fun anOpenNodeWithNoNameIsAnsweredWithAnEmptyNameNotItsAddress() {
        // autobyteus-433: the bridge sends the entry's known name, so a typed address's host never reaches the page.
        val typed = SavedNodeEntry.fromNormalized(NodeUrlNormalizer.normalize("https://test-desktop.example-tailnet.ts.net"))
        val reply = ShellBridgeMessages.helloReply(nodeCount = 1, deviceName = "Pixel 8", nodeName = typed.knownName.orEmpty())
        assertEquals("", JSONObject(reply).getString("nodeName"))
        assertEquals(false, reply.contains("example-tailnet"))
    }

    @Test
    fun theOriginRuleIsTheEntrysOriginIncludingAPlainHttpIpv4AndPort() {
        val http = SavedNodeEntry.fromNormalized(NodeUrlNormalizer.normalize("http://192.168.1.25:29695/mobile"))
        val https = SavedNodeEntry.fromNormalized(NodeUrlNormalizer.normalize("https://desktop.example-tailnet.ts.net/mobile"))
        assertEquals("http://192.168.1.25:29695", ShellBridge.allowedOriginRule(http))
        assertEquals("https://desktop.example-tailnet.ts.net", ShellBridge.allowedOriginRule(https))
    }

    // autobyteus-472 REQ-004/REQ-005: a PDF or an image to save to Downloads, under a plain name matching its type.
    private fun save(fileName: Any?, mimeType: Any?, base64: Any? = "JVBERi0x") =
        JSONObject().put("type", "saveFile").put("fileName", fileName).put("mimeType", mimeType).put("base64", base64).toString()

    @Test
    fun readsASaveOfAPdfOrAnImageFromTheMainFrameOfTheNodesOrigin() {
        assertEquals(ShellBridgeAction.SaveFile("resume.pdf", "application/pdf", "JVBERi0x"), read(save("resume.pdf", "application/pdf")))
        assertEquals(ShellBridgeAction.SaveFile("Chart 2.PNG", "image/png", "JVBERi0x"), read(save("Chart 2.PNG", "image/png")))
        assertEquals(ShellBridgeAction.SaveFile("photo.jpeg", "image/jpeg", "JVBERi0x"), read(save("photo.jpeg", "image/jpeg")))
        assertEquals(ShellBridgeAction.SaveFile("photo.jpg", "image/jpeg", "JVBERi0x"), read(save("photo.jpg", "image/jpeg")))
        assertEquals(ShellBridgeAction.SaveFile("plan.svg", "image/svg+xml", "JVBERi0x"), read(save("plan.svg", "image/svg+xml")))
        for ((mime, name) in listOf("image/gif" to "a.gif", "image/webp" to "a.webp", "image/bmp" to "a.bmp")) {
            assertEquals(ShellBridgeAction.SaveFile(name, mime, "JVBERi0x"), read(save(name, mime)))
        }
    }

    @Test
    fun ignoresASaveFromASubframeOrAnotherOrigin() {
        val pdf = save("resume.pdf", "application/pdf")
        assertNull(read(pdf, isMainFrame = false))
        assertNull(read(pdf, sourceOrigin = "http://192.168.1.25:8001"))
        assertNull(read(pdf, sourceOrigin = "null"))
    }

    @Test
    fun ignoresASaveOfAnotherTypeOrANameThatDoesNotMatchItsType() {
        assertNull(read(save("notes.md", "text/markdown")))
        assertNull(read(save("page.html", "text/html")))
        assertNull(read(save("app.apk", "application/vnd.android.package-archive")))
        assertNull(read(save("clip.mp4", "video/mp4")))
        assertNull(read(save("resume.png", "application/pdf")))
        assertNull(read(save("resume.pdf", "image/png")))
        assertNull(read(save("resume.pdf.exe", "application/pdf")))
        assertNull(read(save("resume", "application/pdf")))
        assertNull(read(save("photo.jpg", "image/*")))
    }

    @Test
    fun ignoresASaveWhoseNameIsNotAPlainFileName() {
        assertNull(read(save("../resume.pdf", "application/pdf")))
        assertNull(read(save("docs/resume.pdf", "application/pdf")))
        assertNull(read(save("docs\\resume.pdf", "application/pdf")))
        assertNull(read(save("/sdcard/Download/resume.pdf", "application/pdf")))
        assertNull(read(save("resume\u0000.pdf", "application/pdf")))
        assertNull(read(save("resume\n.pdf", "application/pdf")))
        assertNull(read(save(".pdf", "application/pdf")))
        assertNull(read(save(" resume.pdf", "application/pdf")))
        assertNull(read(save("", "application/pdf")))
        assertNull(read(save("a".repeat(197) + ".pdf", "application/pdf")))
        assertEquals("a".repeat(196) + ".pdf", (read(save("a".repeat(196) + ".pdf", "application/pdf")) as ShellBridgeAction.SaveFile).fileName)
    }

    @Test
    fun ignoresASaveWithoutItsFieldsOrBytes() {
        assertNull(read(save("resume.pdf", "application/pdf", base64 = "")))
        assertNull(read(save("resume.pdf", "application/pdf", base64 = 42)))
        assertNull(read("""{"type":"saveFile","fileName":"resume.pdf","mimeType":"application/pdf"}"""))
        assertNull(read("""{"type":"saveFile","mimeType":"application/pdf","base64":"JVBERi0x"}"""))
        assertNull(read("""{"type":"saveFile","fileName":"resume.pdf","base64":"JVBERi0x"}"""))
        assertNull(read(save(7, "application/pdf")))
    }

    @Test
    fun aSaveRequestNeverPrintsItsBytes() {
        val request = ShellBridgeAction.SaveFile("resume.pdf", "application/pdf", "SECRET-BYTES-BASE64")
        assertEquals(false, request.toString().contains("SECRET-BYTES-BASE64"))
        assertEquals(true, request.toString().contains("resume.pdf"))
    }

    // autobyteus-574 D-2, D-5 (AC-003), autobyteus-642 D-2: a file to play is read only from the node's main frame, for a
    // file route of that node, of a kind the app plays; the credential goes nowhere else, and neither it nor the URL is
    // ever printed.
    @Test
    fun readsAPlayMediaForAFileRouteOfTheNodeWithItsKindTitleAndCredential() {
        val url = "$origin/rest/workspaces/agent_ws_ab12/content?path=demo%2Fplan.mp4"
        assertEquals(ShellBridgeAction.PlayMedia(MediaKind.VIDEO, url, "plan.mp4", "mra_phone_credential"), read(play(url)))
        val audio = "$origin/rest/workspaces/agent_ws_ab12/content?path=notes%2Fmemo.m4a"
        assertEquals(
            ShellBridgeAction.PlayMedia(MediaKind.AUDIO, audio, "memo.m4a", "mra_phone_credential"),
            read(play(audio, title = "memo.m4a", kind = "audio")),
        )
        // A title that is not a plain name is dropped, not trusted.
        assertEquals(ShellBridgeAction.PlayMedia(MediaKind.VIDEO, url, "", "mra_phone_credential"), read(play(url, title = "../../etc/passwd")))
    }

    @Test
    fun ignoresAPlayMediaWithoutAKindTheAppPlays_andTheRenamedPlayVideo() {
        val url = "$origin/rest/files/videos/a.mp4"
        assertNull(read(play(url, kind = "image")))
        assertNull(read(play(url, kind = null)))
        assertNull(read(JSONObject().put("type", "playVideo").put("url", url).put("title", "a.mp4").put("credential", "mra_x").toString()))
    }

    @Test
    fun ignoresAPlayMediaForAnotherSiteAnotherRouteOrFromAnotherFrame() {
        val url = "$origin/rest/node-files/content?path=%2Ftmp%2Fclip.mp4"
        assertNull(read(play(url), isMainFrame = false))
        assertNull(read(play(url), sourceOrigin = "http://192.168.1.25:8001"))
        assertNull(read(play("https://videos.example.com/rest/workspaces/w/content?path=a.mp4")))
        assertNull(read(play("http://192.168.1.25:8001/rest/workspaces/w/content?path=a.mp4")))
        assertNull(read(play("https://192.168.1.25:29695/rest/workspaces/w/content?path=a.mp4")))
        assertNull(read(play("$origin/mobile/index.html")))
        assertNull(read(play("http://user:pass@192.168.1.25:29695/rest/files/a.mp4")))
        assertNull(read(play("javascript:alert(1)")))
    }

    @Test
    fun ignoresAPlayMediaWithoutACredentialOrWithOneThatIsNotOneToken() {
        val url = "$origin/rest/files/videos/a.mp4"
        assertNull(read(play(url, credential = "")))
        assertNull(read(play(url, credential = "mra_a b")))
        assertNull(read(play(url, credential = "mra_a\nInjected: header")))
        assertNull(read(JSONObject().put("type", "playMedia").put("kind", "video").put("url", url).put("title", "a.mp4").toString()))
        assertNull(read(JSONObject().put("type", "playMedia").put("kind", "video").put("title", "a.mp4").put("credential", "mra_x").toString()))
    }

    @Test
    fun aPlayMediaNeverPrintsItsCredentialOrItsUrl() {
        val request = ShellBridgeAction.PlayMedia(MediaKind.AUDIO, "$origin/rest/workspaces/w/content?path=private%2Fplan.mp3", "plan.mp3", "mra_SECRET")
        assertEquals(false, request.toString().contains("mra_SECRET"))
        assertEquals(false, request.toString().contains("private"))
        assertEquals(true, request.toString().contains("plan.mp3"))
    }

    private fun play(url: String, title: String = "plan.mp4", credential: String = "mra_phone_credential", kind: String? = "video"): String =
        JSONObject().put("type", "playMedia").apply { if (kind != null) put("kind", kind) }
            .put("url", url).put("title", title).put("credential", credential).toString()

    private fun read(data: String?, sourceOrigin: String = origin, isMainFrame: Boolean = true) =
        ShellBridgeMessages.read(data, sourceOrigin, isMainFrame, expectedOrigin = origin)
}
