package proto.media
// autobyteus-574 feasibility prototype (temporary): the WebView's media request gets the key header natively.
import android.app.Activity
import android.content.pm.ActivityInfo
import android.os.Bundle
import android.util.Log
import android.view.View
import android.view.ViewGroup
import android.webkit.*
import android.widget.FrameLayout
import java.net.HttpURLConnection
import java.net.URL

class MainActivity : Activity() {
    private lateinit var web: WebView
    private var fullscreenView: View? = null
    private var fullscreenCallback: WebChromeClient.CustomViewCallback? = null
    override fun onCreate(b: Bundle?) {
        super.onCreate(b)
        val root = FrameLayout(this)
        web = WebView(this)
        web.settings.javaScriptEnabled = true
        web.settings.mediaPlaybackRequiresUserGesture = false
        web.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(view: WebView, req: WebResourceRequest): WebResourceResponse? {
                val url = req.url
                if (url.path?.startsWith("/media/") != true) return null
                val conn = URL(url.toString()).openConnection() as HttpURLConnection
                conn.setRequestProperty("Authorization", "Bearer test-key")
                val cap = intent.getIntExtra("cap", 0)
                val asked = req.requestHeaders["Range"]
                val sent = if (cap > 0 && asked != null) {
                    val m = Regex("bytes=(\\d+)-(\\d*)").find(asked)!!
                    val s0 = m.groupValues[1].toLong()
                    val e0 = m.groupValues[2].toLongOrNull()
                    val e1 = s0 + cap - 1
                    "bytes=$s0-${if (e0 != null && e0 < e1) e0 else e1}"
                } else asked
                sent?.let { conn.setRequestProperty("Range", it) }
                val code = conn.responseCode
                Log.i("PROTO", "intercept ${url.path} range=${req.requestHeaders["Range"]} -> $code")
                val headers = mutableMapOf<String, String>()
                listOf("Content-Range", "Accept-Ranges", "ETag").forEach { h -> conn.getHeaderField(h)?.let { headers[h] = it } }
                val stream = if (code >= 400) conn.errorStream else conn.inputStream
                return WebResourceResponse(conn.contentType ?: "video/mp4", null, code, if (code == 206) "Partial Content" else "OK", headers, stream)
            }
            override fun onPageFinished(view: WebView, u: String) { view.evaluateJavascript("runProto()", null) }
        }
        web.webChromeClient = object : WebChromeClient() {
            override fun onConsoleMessage(m: ConsoleMessage): Boolean { Log.i("PROTO", m.message()); return true }
            override fun onShowCustomView(view: View, callback: CustomViewCallback) {
                fullscreenView = view; fullscreenCallback = callback
                root.addView(view, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
                web.visibility = View.GONE
                requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
                Log.i("PROTO", "fullscreen-enter")
            }
            override fun onHideCustomView() {
                fullscreenView?.let { root.removeView(it) }; fullscreenView = null
                web.visibility = View.VISIBLE
                requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
                fullscreenCallback?.onCustomViewHidden(); Log.i("PROTO", "fullscreen-exit")
            }
        }
        root.addView(web); setContentView(root)
        web.loadUrl(intent.getStringExtra("url") ?: "http://10.0.2.2:8574/page-android.html")
    }
}
