package proto.media
// autobyteus-574 feasibility prototype (temporary): Media3 with the key in a header, Range seeking and a disk cache.
import android.app.Activity
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Log
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.database.StandaloneDatabaseProvider
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.datasource.cache.CacheDataSource
import androidx.media3.datasource.cache.LeastRecentlyUsedCacheEvictor
import androidx.media3.datasource.cache.SimpleCache
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import androidx.media3.ui.PlayerView
import java.io.File

@androidx.annotation.OptIn(androidx.media3.common.util.UnstableApi::class)
class PlayerActivity : Activity() {
    companion object { var cache: SimpleCache? = null }
    private lateinit var player: ExoPlayer
    override fun onCreate(b: Bundle?) {
        super.onCreate(b)
        val c = cache ?: SimpleCache(File(cacheDir, "media"), LeastRecentlyUsedCacheEvictor(200L * 1024 * 1024), StandaloneDatabaseProvider(this)).also { cache = it }
        val http = DefaultHttpDataSource.Factory().setDefaultRequestProperties(mapOf("Authorization" to "Bearer test-key"))
        val source = CacheDataSource.Factory().setCache(c).setUpstreamDataSourceFactory(http)
        player = ExoPlayer.Builder(this).setMediaSourceFactory(DefaultMediaSourceFactory(source)).build()
        val view = PlayerView(this); view.player = player; setContentView(view)
        player.addListener(object : Player.Listener {
            override fun onPlaybackStateChanged(s: Int) { Log.i("PROTO", "state=$s pos=${player.currentPosition}") }
            override fun onIsPlayingChanged(p: Boolean) { Log.i("PROTO", "playing=$p pos=${player.currentPosition}") }
            override fun onPlayerError(e: PlaybackException) { Log.i("PROTO", "error=${e.errorCodeName}") }
        })
        player.setMediaItem(MediaItem.fromUri(intent.getStringExtra("url") ?: "http://10.0.2.2:8574/media/video.mp4"))
        player.prepare(); player.playWhenReady = true
        Handler(Looper.getMainLooper()).postDelayed({ player.seekTo(45_000); Log.i("PROTO", "seek-to-45") }, 4000)
        Handler(Looper.getMainLooper()).postDelayed({ Log.i("PROTO", "at8s pos=${player.currentPosition} playing=${player.isPlaying}"); player.release(); finish() }, 8000)
    }
}
