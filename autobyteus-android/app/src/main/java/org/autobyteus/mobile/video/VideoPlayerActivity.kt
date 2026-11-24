package org.autobyteus.mobile.video

import android.app.Activity
import android.graphics.Color
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import androidx.annotation.OptIn
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.DataSource
import androidx.media3.datasource.cache.CacheDataSource
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import androidx.media3.ui.PlayerView
import org.autobyteus.mobile.ui.DesktopFullScreenController
import java.util.concurrent.Executors

/**
 * The app's video player (autobyteus-574 D-3, UC-001…UC-003): one protected node video, streamed by range with the
 * credential in the header ([NodeVideoHttp]), its fetched bytes kept by version ([VideoCache]), so a reopen of an
 * unchanged file reads nothing again. Full screen turns the phone to landscape with the system bars hidden (432's
 * controller) and back to portrait; the activity handles the rotation itself, so the position is kept. The credential
 * lives in memory from [NativeVideoPlayback.take] until the screen closes; nothing logs a URL or a header.
 */
@OptIn(UnstableApi::class)
class VideoPlayerActivity : Activity() {
    private var player: ExoPlayer? = null
    private lateinit var playerView: PlayerView
    private lateinit var topBar: LinearLayout
    private lateinit var fullScreen: DesktopFullScreenController
    private val probes = Executors.newSingleThreadExecutor()
    private val mainThread = Handler(Looper.getMainLooper())
    private var closed = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        fullScreen = DesktopFullScreenController.forActivity(this)
        val request = NativeVideoPlayback.take(intent.getStringExtra(EXTRA_PLAYBACK))
        setContentView(buildScreen(request?.title.orEmpty()))
        if (request == null) return showCouldNotPlay()
        val http = NodeVideoHttp(request.nodeOrigin, request.credential)
        probes.execute {
            val version = probeVersion(http, request.url)
            mainThread.post { if (!closed) version.fold({ start(http, request, it) }, { showCouldNotPlay() }) }
        }
    }

    /**
     * The file's version, from a two-byte read (`Range: bytes=0-1`): the cache's key for this playback. `null` when the
     * node sends none (the video then plays without the cache).
     */
    private fun probeVersion(http: NodeVideoHttp, url: String): Result<String?> = runCatching {
        http.open(url, position = 0, length = 2).use { answer ->
            if (answer.status != 200 && answer.status != 206) throw IllegalStateException("probe answered ${answer.status}")
            answer.etag
        }
    }.onFailure { Log.w(TAG, "The video could not be opened (${it.javaClass.simpleName}).") }

    private fun start(http: NodeVideoHttp, request: NativeVideoPlayback.Request, version: String?) {
        val upstream = NodeVideoDataSource.Factory(http, version)
        val dataSource: DataSource.Factory = if (version == null) upstream else CacheDataSource.Factory()
            .setCache(VideoCache.get(this))
            .setUpstreamDataSourceFactory(upstream)
            .setFlags(CacheDataSource.FLAG_IGNORE_CACHE_ON_ERROR)
        val item = MediaItem.Builder()
            .setUri(request.url)
            .apply { if (version != null) setCustomCacheKey(VideoCacheKeys.keyFor(request.nodeId, request.url, version)) }
            .build()
        val created = ExoPlayer.Builder(this).setMediaSourceFactory(DefaultMediaSourceFactory(dataSource)).build()
        created.addListener(object : Player.Listener {
            override fun onPlayerError(error: PlaybackException) {
                Log.w(TAG, "The video stopped: ${error.errorCodeName}")
                showCouldNotPlay()
            }
        })
        player = created
        playerView.player = created
        created.setMediaItem(item)
        created.prepare()
        created.playWhenReady = true
    }

    private fun buildScreen(title: String): View {
        val root = FrameLayout(this).apply { setBackgroundColor(Color.BLACK) }
        playerView = PlayerView(this).apply {
            layoutParams = FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)
            setFullscreenButtonClickListener { on -> setFullScreen(on) }
            setControllerVisibilityListener(PlayerView.ControllerVisibilityListener { visibility -> topBar.visibility = visibility })
        }
        topBar = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setBackgroundColor(0x80000000.toInt())
            layoutParams = FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.TOP)
            addView(backButton())
            addView(TextView(this@VideoPlayerActivity).apply {
                text = title
                setTextColor(Color.WHITE)
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 16f)
                maxLines = 1
                ellipsize = android.text.TextUtils.TruncateAt.MIDDLE
                contentDescription = title
            })
        }
        root.addView(playerView)
        root.addView(topBar)
        // The bars' space while they show (edge to edge on API 35); none in full screen, where they are hidden.
        ViewCompat.setOnApplyWindowInsetsListener(root) { view, insets ->
            val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout())
            view.setPadding(bars.left, bars.top, bars.right, bars.bottom)
            insets
        }
        return root
    }

    private fun backButton(): Button = Button(this).apply {
        text = "Back"
        setTextColor(Color.WHITE)
        setBackgroundColor(Color.TRANSPARENT)
        setOnClickListener { finish() }
    }

    /** "This video could not be played." with Back: a missing or changed file, a refused credential, a network failure. */
    private fun showCouldNotPlay() {
        player?.release()
        player = null
        setFullScreen(false)
        val message = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setBackgroundColor(Color.BLACK)
            addView(TextView(this@VideoPlayerActivity).apply {
                text = COULD_NOT_PLAY
                setTextColor(Color.WHITE)
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 16f)
                gravity = Gravity.CENTER
            })
            addView(backButton())
        }
        setContentView(message)
    }

    private fun setFullScreen(on: Boolean) {
        fullScreen.setOn(on)
        if (this::playerView.isInitialized) playerView.setFullscreenButtonState(on)
    }

    /** Back leaves full screen first, then the player. */
    @Suppress("OVERRIDE_DEPRECATION", "DEPRECATION")
    override fun onBackPressed() {
        if (fullScreen.isOn) setFullScreen(false) else super.onBackPressed()
    }

    override fun onStop() {
        player?.pause()
        super.onStop()
    }

    override fun onDestroy() {
        closed = true
        probes.shutdownNow()
        player?.release()
        player = null
        fullScreen.reset()
        super.onDestroy()
    }

    companion object {
        /** The token of the playback in [NativeVideoPlayback]: the only extra (never the credential or the URL). */
        const val EXTRA_PLAYBACK = "org.autobyteus.mobile.video.PLAYBACK"
        const val COULD_NOT_PLAY = "This video could not be played."
        private const val TAG = "AutoByteusVideo"
    }
}
