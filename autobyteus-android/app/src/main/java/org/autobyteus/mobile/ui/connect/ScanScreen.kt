package org.autobyteus.mobile.ui.connect

import android.content.Context
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.Path
import android.os.Handler
import android.os.Looper
import android.view.Gravity
import android.view.View
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import com.google.zxing.BarcodeFormat
import com.journeyapps.barcodescanner.BarcodeView
import com.journeyapps.barcodescanner.DefaultDecoderFactory
import org.autobyteus.mobile.R
import org.autobyteus.mobile.ui.ShellColors
import org.autobyteus.mobile.ui.ShellUi
import org.autobyteus.mobile.ui.SystemBarInsets
import org.autobyteus.mobile.ui.match
import org.autobyteus.mobile.ui.withStartMargin
import org.autobyteus.mobile.ui.wrap

/**
 * The Scan screen (VIS-024): the camera with white corner brackets around a 240dp square; when a QR code is found the
 * brackets turn green ("Code found") and the text goes on. The journeyapps scanner is the dependency the app already
 * had; the camera permission is the one it already held.
 */
class ScanScreen(private val ui: ShellUi) {
    private var barcodeView: BarcodeView? = null
    private val mainThread = Handler(Looper.getMainLooper())

    fun render(onCode: (String) -> Unit, onClose: () -> Unit): View {
        // Header and hint sit in their own dark bars, so they stay readable over any camera image.
        val root = FrameLayout(ui.context).apply { setBackgroundColor(ShellColors.slate900) }
        val column = ui.vertical()
        val header = ui.horizontal().apply { setPadding(ui.dp(8), 0, ui.dp(16), 0) }
        header.addView(ui.iconButton(R.drawable.ic_arrow_left, "Close scanner", ShellColors.white, onClose))
        header.addView(ui.text("Scan", 18f, ShellColors.white, bold = true), LinearLayout.LayoutParams(wrap(), wrap()).withStartMargin(ui.dp(4)))
        column.addView(header, LinearLayout.LayoutParams(match(), ui.dp(56)))

        val viewfinder = FrameLayout(ui.context)
        val camera = BarcodeView(ui.context).apply {
            decoderFactory = DefaultDecoderFactory(listOf(BarcodeFormat.QR_CODE))
        }
        barcodeView = camera
        viewfinder.addView(camera, FrameLayout.LayoutParams(match(), match()))
        val brackets = Brackets(ui.context, ui.dp(40).toFloat(), ui.dp(4).toFloat(), ui.dp(12).toFloat())
        viewfinder.addView(brackets, FrameLayout.LayoutParams(ui.dp(240), ui.dp(240), Gravity.CENTER))
        column.addView(viewfinder, LinearLayout.LayoutParams(match(), 0, 1f))

        val hint: TextView = ui.text("Point the camera at the QR code on your computer.", 15f, ShellColors.slate200).apply {
            gravity = Gravity.CENTER
            setPadding(ui.dp(32), ui.dp(24), ui.dp(32), ui.dp(32))
            accessibilityLiveRegion = View.ACCESSIBILITY_LIVE_REGION_POLITE
        }
        column.addView(hint, LinearLayout.LayoutParams(match(), wrap()))
        root.addView(column, FrameLayout.LayoutParams(match(), match()))
        SystemBarInsets.pad(root)

        camera.decodeSingle { result ->
            val text = result.text?.trim().orEmpty()
            if (text.isEmpty()) return@decodeSingle
            brackets.found = true
            hint.text = "Code found"
            mainThread.postDelayed({ onCode(text) }, FOUND_PAUSE_MS)
        }
        return root
    }

    fun resume() {
        barcodeView?.resume()
    }

    fun pause() {
        barcodeView?.pause()
    }

    fun close() {
        mainThread.removeCallbacksAndMessages(null)
        barcodeView?.pause()
        barcodeView = null
    }

    private class Brackets(context: Context, private val length: Float, stroke: Float, private val radius: Float) : View(context) {
        var found = false
            set(value) {
                field = value
                invalidate()
            }
        private val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            style = Paint.Style.STROKE
            strokeWidth = stroke
            strokeCap = Paint.Cap.ROUND
        }

        init {
            importantForAccessibility = IMPORTANT_FOR_ACCESSIBILITY_NO
        }

        override fun onDraw(canvas: Canvas) {
            paint.color = if (found) ShellColors.green400 else ShellColors.white
            val inset = paint.strokeWidth / 2
            val w = width - inset
            val h = height - inset
            val corners = listOf(
                Triple(inset, inset, floatArrayOf(1f, 1f)),
                Triple(w, inset, floatArrayOf(-1f, 1f)),
                Triple(inset, h, floatArrayOf(1f, -1f)),
                Triple(w, h, floatArrayOf(-1f, -1f)),
            )
            for ((x, y, dir) in corners) {
                val path = Path().apply {
                    moveTo(x, y + dir[1] * length)
                    lineTo(x, y + dir[1] * radius)
                    quadTo(x, y, x + dir[0] * radius, y)
                    lineTo(x + dir[0] * length, y)
                }
                canvas.drawPath(path, paint)
            }
        }
    }

    private companion object {
        const val FOUND_PAUSE_MS = 400L
    }
}
