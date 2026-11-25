package org.autobyteus.mobile.media

import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.media3.common.Player
import androidx.media3.ui.PlayerView
import androidx.test.core.app.ActivityScenario
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Assume.assumeTrue
import org.junit.Test
import org.junit.runner.RunWith
import java.io.File
import java.util.UUID

/**
 * autobyteus-642 on a real player (AC-002 on Android): an MP3 and an M4A from a file route throttled to about 1.5 MB/s
 * play through the same player as video, in under 2 s; the screen shows the file's name and the audio controls, which
 * stay shown, with no full-screen button; a seek to the middle plays by a range from there; every request carries the
 * credential in the header; and a reopen reads nothing again of what it played. Production: MediaPlayerActivity
 * (audio), NativeMediaPlayback, NodeMediaHttp, NodeMediaDataSource, MediaCache; the node's file route is
 * [RangeFileServer] on the device.
 *
 * Needs the test audio on the device: `adb push <a 3+ MB MP3> /data/local/tmp/autobyteus-642-audio.mp3` and
 * `adb push <a 3+ MB M4A> /data/local/tmp/autobyteus-642-audio.m4a`, each longer than 60 s (the evidence says how they
 * are made); without them the test is skipped.
 */
@RunWith(AndroidJUnit4::class)
class MediaPlayerActivityAudioTest {
    private val instrumentation = InstrumentationRegistry.getInstrumentation()
    private val credential = "mra_audio_test_credential"

    @Test
    fun anMp3PlaysWithItsTitleAndControlsSeeksByRangeAndReopensFromTheCache() =
        playsSeeksAndReopens("autobyteus-642-audio.mp3", "audio/memo.mp3", "audio/mpeg")

    @Test
    fun anM4aPlaysWithItsTitleAndControlsSeeksByRangeAndReopensFromTheCache() =
        playsSeeksAndReopens("autobyteus-642-audio.m4a", "audio/memo.m4a", "audio/mp4")

    private fun playsSeeksAndReopens(pushedName: String, name: String, contentType: String) {
        val pushed = File("/data/local/tmp/$pushedName")
        assumeTrue("push a 3+ MB audio file to ${pushed.path}", pushed.canRead() && pushed.length() > 3_000_000)
        val audio = File(instrumentation.targetContext.cacheDir, name.substringAfterLast('/')).also { pushed.copyTo(it, overwrite = true) }
        val title = name.substringAfterLast('/')
        RangeFileServer(audio, "\"${audio.length()}-${UUID.randomUUID()}\"", credential, name = name, contentType = contentType).use { server ->
            open(server, title).use { scenario ->
                val opened = System.currentTimeMillis()
                awaitPlayer(scenario, "playing") { it.isPlaying }
                val startMs = System.currentTimeMillis() - opened
                report("$title: playing after $startMs ms; ${server.served.sumOf { it.sent }} of ${audio.length()} bytes served by then")
                assertTrue("plays in under 2 s (took $startMs ms)", startMs < 2_000)
                scenario.onActivity { activity ->
                    val view = findPlayerView(activity.window.decorView)!!
                    assertTrue("the file's name is shown", findText(activity.window.decorView, title))
                    assertTrue("the audio controls are shown", view.isControllerFullyVisible)
                    assertFalse("no full-screen button", view.findViewById<View>(androidx.media3.ui.R.id.exo_fullscreen).isShown)
                }

                val requestsBefore = server.served.size
                var duration = 0L
                onPlayer(scenario) { duration = it.duration }
                onPlayer(scenario) { it.seekTo(duration / 2) }
                val sought = System.currentTimeMillis()
                awaitPlayer(scenario, "playing at the middle") { it.isPlaying && it.currentPosition >= duration / 2 }
                val seekMs = System.currentTimeMillis() - sought
                report("$title: seek to ${duration / 2} ms of $duration: playing there after $seekMs ms; ranges ${server.served.map { it.range }}")
                assertTrue("a range from the middle", server.served.drop(requestsBefore).any { it.start > audio.length() / 3 })
                Thread.sleep(1_000)
                scenario.onActivity { assertTrue("the controls stay shown while it plays", findPlayerView(it.window.decorView)!!.isControllerFullyVisible) }
            }
            assertTrue("every request carries the credential in the header", server.served.all { it.authorization == "Bearer $credential" })

            val cached = settledCachedRanges(server)
            server.served.clear()
            open(server, title).use { scenario -> awaitPlayer(scenario, "playing again") { it.isPlaying && it.currentPosition > 500 } }
            val reread = overlap(server.served.filter { it.sent > 0 && !(it.start == 0L && it.sent <= 2) }.map { it.start until it.start + it.sent }, cached)
            report("$title reopen: ${cached.sumOf { it.last - it.first + 1 }} bytes cached; served ${server.served.map { "${it.range}:${it.sent}" }}; read again of the cached: $reread")
            assertEquals("bytes read again of what was cached", 0L, reread)
        }
    }

    private fun open(server: RangeFileServer, title: String): ActivityScenario<MediaPlayerActivity> {
        val token = NativeMediaPlayback.put(NativeMediaPlayback.Request(
            nodeId = server.origin, nodeOrigin = server.origin, url = server.url, title = title, credential = credential,
        ))
        return ActivityScenario.launch(MediaPlayerActivity.intent(instrumentation.targetContext, token, MediaKind.AUDIO))
    }

    /** The measured numbers, for the evidence (`adb logcat -s MediaPlayerActivityAudioTest`); no credential or path. */
    private fun report(line: String) {
        android.util.Log.i("MediaPlayerActivityAudioTest", line)
    }

    /** The byte ranges the cache holds for this version, once the released player has written its last span. */
    @androidx.annotation.OptIn(androidx.media3.common.util.UnstableApi::class)
    private fun settledCachedRanges(server: RangeFileServer): List<LongRange> {
        val key = MediaCacheKeys.keyFor(server.origin, server.url, server.version)
        val read = { MediaCache.get(instrumentation.targetContext).getCachedSpans(key).filter { it.isCached }.map { it.position until it.position + it.length } }
        var previous = read()
        repeat(30) {
            Thread.sleep(200)
            val current = read()
            if (current == previous && current.isNotEmpty()) return current
            previous = current
        }
        return previous
    }

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

    private fun onPlayer(scenario: ActivityScenario<MediaPlayerActivity>, action: (Player) -> Unit) {
        scenario.onActivity { activity -> findPlayerView(activity.window.decorView)?.player?.let(action) }
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
}
