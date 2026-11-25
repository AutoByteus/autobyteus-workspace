package org.autobyteus.mobile.media

import android.app.Activity
import android.content.pm.ActivityInfo
import android.content.res.Configuration
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.media3.common.Player
import androidx.media3.ui.PlayerView
import androidx.test.core.app.ActivityScenario
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Assume.assumeTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import java.io.File
import java.util.UUID

/**
 * autobyteus-574 on a real player (AC-001, AC-002, AC-004 on Android): a 20+ MB video from a file route throttled to
 * about 1.5 MB/s plays in under 2 s, a seek to the middle plays within 2 s by one range from there, every request carries
 * the credential in the header, a reopen reads nothing again of what it played, a changed file (new ETag) is read again,
 * full screen turns to landscape with the bars hidden and back to portrait at the same position, and a missing file says
 * it could not be played. Production: MediaPlayerActivity, NativeMediaPlayback, NodeMediaHttp, NodeMediaDataSource,
 * MediaCache (Media3's SimpleCache), DesktopFullScreenController; the node's file route is [RangeFileServer] on the
 * device.
 *
 * Needs the test video on the device: `adb push <a 20+ MB MP4> /data/local/tmp/autobyteus-574-video.mp4` (the evidence
 * README says how it is made); without it the test is skipped. Runs held in portrait:
 * `./gradlew :app:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=org.autobyteus.mobile.media.MediaPlayerActivityTest`.
 */
@RunWith(AndroidJUnit4::class)
class MediaPlayerActivityTest {
    private val instrumentation = InstrumentationRegistry.getInstrumentation()
    private val credential = "mra_video_test_credential"
    private lateinit var video: File
    private lateinit var server: RangeFileServer

    @Before
    fun serveTheVideo() {
        val pushed = File("/data/local/tmp/autobyteus-574-video.mp4")
        assumeTrue("push a 20+ MB MP4 to ${pushed.path}", pushed.canRead() && pushed.length() > 20_000_000)
        // A private copy, so the server can change it; a fresh version per run, so no earlier run's cache is used.
        video = File(instrumentation.targetContext.cacheDir, "clip.mp4").also { pushed.copyTo(it, overwrite = true) }
        server = RangeFileServer(video, version = "\"${video.length()}-${UUID.randomUUID()}\"", credential = credential)
    }

    @After
    fun stop() {
        if (this::server.isInitialized) server.close()
    }

    @Test
    fun playsAtOnceSeeksByRangeReopensFromTheCacheAndReadsAChangedFileAgain() {
        // UC-001: open. Plays in under 2 s, not after the whole file.
        val firstRanges = mutableListOf<LongRange>()
        open(server.url).use { scenario ->
            val opened = System.currentTimeMillis()
            awaitPlayer(scenario, "playing") { it.isPlaying }
            val startMs = System.currentTimeMillis() - opened
            report("first open: playing after $startMs ms; ${servedBytes()} of ${video.length()} bytes served by then")
            assertTrue("plays in under 2 s (took $startMs ms)", startMs < 2_000)
            assertTrue("not the whole file before playing", servedBytes() < video.length() / 2)

            // UC-002: a seek to the middle plays within 2 s, by a range from there.
            val requestsBefore = server.served.size
            onPlayer(scenario) { it.seekTo(30_000) }
            val sought = System.currentTimeMillis()
            awaitPlayer(scenario, "playing at the middle") { it.isPlaying && it.currentPosition >= 30_000 }
            val seekMs = System.currentTimeMillis() - sought
            report("seek to 30 s: playing there after $seekMs ms; ranges asked: ${server.served.map { it.range }}")
            assertTrue("a seek to the middle plays within 2 s (took $seekMs ms)", seekMs < 2_000)
            assertTrue("a range from the middle", server.served.drop(requestsBefore).any { it.start > video.length() / 3 })
            Thread.sleep(1_500)
            firstRanges += servedRanges()
        }
        assertTrue("every request carries the credential in the header", server.served.all { it.authorization == "Bearer $credential" })
        assertTrue("none of it as a whole file", server.served.none { it.status == 200 && it.sent == video.length() })

        // UC-002 reopen, same version: what the player cached (the parts it played) is not read again; only the 2-byte
        // probe touches it. (The server's own count also has bytes it wrote that the player never read, after a seek.)
        val cached = settledCachedRanges()
        assertTrue("both played parts are cached", cached.size >= 2 && cached.any { it.first >= video.length() / 3 })
        server.served.clear()
        open(server.url).use { scenario ->
            awaitPlayer(scenario, "playing again") { it.isPlaying }
            onPlayer(scenario) { it.seekTo(30_000) }
            awaitPlayer(scenario, "playing at the middle again") { it.isPlaying && it.currentPosition >= 30_000 }
        }
        val reread = overlap(servedRanges().filterNot { it.first == 0L && it.last <= 1L }, cached)
        report("reopen: ${cached.sumOf { it.last - it.first + 1 }} bytes cached before; served on reopen ${server.served.map { "${it.range}:${it.sent}" }}; read again of the cached: $reread")
        assertEquals("bytes read again of what was cached", 0L, reread)

        // A changed file (new ETag): read again from its start.
        server.version = "\"${video.length()}-${UUID.randomUUID()}\""
        server.served.clear()
        open(server.url).use { scenario -> awaitPlayer(scenario, "playing the changed file") { it.isPlaying } }
        report("changed file: served ${server.served.map { "${it.range}:${it.sent}" }}")
        assertTrue("the changed file is read again", overlap(servedRanges().filterNot { it.last <= 1L }, firstRanges) > 0)
    }

    @Test
    fun fullScreenTurnsToLandscapeWithTheBarsHiddenAndBackToPortraitAtTheSamePosition() {
        open(server.url).use { scenario ->
            awaitPlayer(scenario, "playing") { it.isPlaying && it.currentPosition > 500 }
            val orientationBefore = orientation(scenario)
            clickFullScreen(scenario)
            awaitWindow(scenario, "landscape") { it.resources.configuration.orientation == Configuration.ORIENTATION_LANDSCAPE }
            awaitWindow(scenario, "bars hidden") { barsVisible(it) == false }
            scenario.onActivity { assertEquals(ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE, it.requestedOrientation) }
            var positionInFullScreen = 0L
            onPlayer(scenario) { positionInFullScreen = it.currentPosition }
            assertTrue("still playing in full screen", positionInFullScreen > 500)

            scenario.onActivity { @Suppress("DEPRECATION") it.onBackPressed() }
            awaitWindow(scenario, "back to the phone's orientation") { it.resources.configuration.orientation == orientationBefore }
            awaitWindow(scenario, "bars shown") { barsVisible(it) == true }
            var positionAfter = 0L
            onPlayer(scenario) { positionAfter = it.currentPosition }
            report("full screen: landscape at ${positionInFullScreen} ms; back to portrait at $positionAfter ms")
            assertTrue("the position is kept ($positionInFullScreen → $positionAfter)", positionAfter >= positionInFullScreen)
            scenario.onActivity { assertTrue("still the player screen", !it.isFinishing) }
        }
    }

    @Test
    fun aMissingFileOrARefusedCredentialSaysItCouldNotBePlayedWithBack() {
        for (url in listOf("${server.origin}/rest/files/videos/missing.mp4")) {
            open(url).use { scenario -> awaitWindow(scenario, "could not play") { couldNotPlayShown(it) } }
        }
        open(server.url, credential = "mra_revoked").use { scenario -> awaitWindow(scenario, "could not play") { couldNotPlayShown(it) } }
        // A recreated player (after the process ended) finds no playback and says so too.
        ActivityScenario.launch<MediaPlayerActivity>(MediaPlayerActivity.intent(instrumentation.targetContext, "gone", MediaKind.VIDEO)).use { scenario ->
            awaitWindow(scenario, "could not play") { couldNotPlayShown(it) }
        }
    }

    // D-7 (REQ-002): removing a node from the app deletes its cached videos; another node's stay.
    @Test
    @androidx.annotation.OptIn(androidx.media3.common.util.UnstableApi::class)
    fun removingANodeDeletesItsCachedVideosAndNoOtherNodes() {
        val removed = "${server.origin}#removed-node"
        val kept = "${server.origin}#kept-node"
        for (nodeId in listOf(removed, kept)) {
            open(server.url, nodeId = nodeId).use { scenario -> awaitPlayer(scenario, "playing for $nodeId") { it.isPlaying && it.currentPosition > 300 } }
        }
        val cache = MediaCache.get(instrumentation.targetContext)
        val keyOf = { nodeId: String -> MediaCacheKeys.keyFor(nodeId, server.url, server.version) }
        awaitTrue("both nodes have cached bytes") { cache.getCachedBytes(keyOf(removed), 0, 1_000) > 0 && cache.getCachedBytes(keyOf(kept), 0, 1_000) > 0 }

        MediaCache.deleteNode(instrumentation.targetContext, removed)
        awaitTrue("the removed node's video is gone") { cache.keys.none { it.startsWith(MediaCacheKeys.nodePrefix(removed)) } }
        assertTrue("the other node's video stays", cache.getCachedBytes(keyOf(kept), 0, 1_000) > 0)
        report("node removal: ${cache.keys.count { it.startsWith(MediaCacheKeys.nodePrefix(kept)) }} entry left for the other node")
    }

    private fun awaitTrue(what: String, condition: () -> Boolean) {
        val deadline = System.currentTimeMillis() + 10_000
        while (System.currentTimeMillis() < deadline) {
            if (condition()) return
            Thread.sleep(100)
        }
        throw AssertionError("$what: not within 10 s")
    }

    private fun open(url: String, credential: String = this.credential, nodeId: String = server.origin): ActivityScenario<MediaPlayerActivity> {
        val token = NativeMediaPlayback.put(NativeMediaPlayback.Request(
            nodeId = nodeId, nodeOrigin = server.origin, url = url, title = "clip.mp4", credential = credential,
        ))
        return ActivityScenario.launch(MediaPlayerActivity.intent(instrumentation.targetContext, token, MediaKind.VIDEO))
    }

    private fun servedBytes(): Long = server.served.sumOf { it.sent }

    /** The measured numbers, for the evidence (`adb logcat -s MediaPlayerActivityTest`); no credential or path. */
    private fun report(line: String) {
        android.util.Log.i("MediaPlayerActivityTest", line)
    }

    /** [cachedRanges] once the released player has written its last span (the release finishes on its own thread). */
    private fun settledCachedRanges(): List<LongRange> {
        var previous = cachedRanges()
        repeat(30) {
            Thread.sleep(200)
            val current = cachedRanges()
            if (current == previous && current.isNotEmpty()) return current
            previous = current
        }
        return previous
    }

    /** The byte ranges the player's cache holds for this version of the file (the parts it read). */
    @androidx.annotation.OptIn(androidx.media3.common.util.UnstableApi::class)
    private fun cachedRanges(): List<LongRange> {
        val key = MediaCacheKeys.keyFor(server.origin, server.url, server.version)
        return MediaCache.get(instrumentation.targetContext).getCachedSpans(key)
            .filter { it.isCached }
            .map { it.position until it.position + it.length }
    }

    private fun servedRanges(): List<LongRange> = server.served.filter { it.sent > 0 }.map { it.start until it.start + it.sent }

    private fun overlap(ranges: List<LongRange>, others: List<LongRange>): Long = ranges.sumOf { range ->
        others.sumOf { other -> maxOf(0L, minOf(range.last, other.last) - maxOf(range.first, other.first) + 1) }
    }

    private fun findPlayerView(view: View): PlayerView? = when (view) {
        is PlayerView -> view
        is ViewGroup -> (0 until view.childCount).firstNotNullOfOrNull { findPlayerView(view.getChildAt(it)) }
        else -> null
    }

    private fun findText(view: View, text: String): Boolean = when (view) {
        is TextView -> view.text.toString() == text && view.isShown
        is ViewGroup -> (0 until view.childCount).any { findText(view.getChildAt(it), text) }
        else -> false
    }

    private fun couldNotPlayShown(activity: Activity): Boolean =
        findText(activity.window.decorView, MediaPlayerActivity.couldNotPlay(MediaKind.VIDEO)) && findText(activity.window.decorView, "Back")

    private fun onPlayer(scenario: ActivityScenario<MediaPlayerActivity>, action: (Player) -> Unit) {
        scenario.onActivity { activity -> findPlayerView(activity.window.decorView)?.player?.let(action) }
    }

    private fun clickFullScreen(scenario: ActivityScenario<MediaPlayerActivity>) {
        scenario.onActivity { activity ->
            val view = findPlayerView(activity.window.decorView)!!
            view.showController()
            view.findViewById<View>(androidx.media3.ui.R.id.exo_fullscreen).performClick()
        }
    }

    private fun orientation(scenario: ActivityScenario<MediaPlayerActivity>): Int {
        var value = Configuration.ORIENTATION_UNDEFINED
        scenario.onActivity { value = it.resources.configuration.orientation }
        return value
    }

    private fun barsVisible(activity: Activity): Boolean? {
        val insets = ViewCompat.getRootWindowInsets(activity.window.decorView) ?: return null
        val status = insets.isVisible(WindowInsetsCompat.Type.statusBars())
        val navigation = insets.isVisible(WindowInsetsCompat.Type.navigationBars())
        return if (status == navigation) status else null
    }

    private fun awaitPlayer(scenario: ActivityScenario<MediaPlayerActivity>, what: String, condition: (Player) -> Boolean) {
        val deadline = System.currentTimeMillis() + 20_000
        while (System.currentTimeMillis() < deadline) {
            var met = false
            onPlayer(scenario) { met = condition(it) }
            if (met) return
            Thread.sleep(50)
        }
        throw AssertionError("$what: not within 20 s")
    }

    private fun awaitWindow(scenario: ActivityScenario<MediaPlayerActivity>, what: String, condition: (Activity) -> Boolean) {
        val deadline = System.currentTimeMillis() + 10_000
        while (System.currentTimeMillis() < deadline) {
            instrumentation.waitForIdleSync()
            var met = false
            scenario.onActivity { met = condition(it) }
            if (met) return
            Thread.sleep(100)
        }
        throw AssertionError("$what: not within 10 s")
    }
}
