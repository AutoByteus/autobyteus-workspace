package org.autobyteus.mobile.ui

import android.content.Context
import android.graphics.Color
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.webkit.WebView
import android.widget.Button
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import org.autobyteus.mobile.connection.ConnectionDiagnostic
import org.autobyteus.mobile.connection.SavedNodeProfile

class WebShellScreen(private val context: Context) {
    data class Callbacks(
        val onEditNode: () -> Unit,
        val onRetry: () -> Unit,
        val onOpenInBrowser: () -> Unit,
    )

    @Suppress("UNUSED_PARAMETER")
    fun render(
        webView: WebView,
        profile: SavedNodeProfile,
        diagnostic: ConnectionDiagnostic? = null,
        callbacks: Callbacks,
    ): View {
        (webView.parent as? ViewGroup)?.removeView(webView)
        val root = FrameLayout(context).apply {
            setBackgroundColor(Color.rgb(248, 250, 252))
        }
        root.addView(webView, FrameLayout.LayoutParams(match(), match()))
        if (diagnostic != null) {
            root.addView(overlay(diagnostic, callbacks), FrameLayout.LayoutParams(match(), match()))
        }
        return root
    }

    private fun overlay(diagnostic: ConnectionDiagnostic, callbacks: Callbacks): View {
        val frame = FrameLayout(context).apply {
            setBackgroundColor(Color.argb(235, 248, 250, 252))
        }
        val card = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(18), dp(18), dp(18), dp(18))
            setBackgroundColor(Color.WHITE)
        }
        card.addView(TextView(context).apply {
            text = diagnostic.title
            textSize = 20f
            setTextColor(Color.rgb(146, 64, 14))
        })
        card.addView(TextView(context).apply {
            text = "${diagnostic.message}\n\n${diagnostic.recoveryAction}"
            textSize = 14f
            setTextColor(Color.rgb(51, 65, 85))
        }, LinearLayout.LayoutParams(match(), wrap()).withTopMargin(8))
        val row = LinearLayout(context).apply { orientation = LinearLayout.HORIZONTAL }
        row.addView(button("Retry") { callbacks.onRetry() }, LinearLayout.LayoutParams(0, wrap(), 1f).withEndMargin(6))
        row.addView(button("Edit") { callbacks.onEditNode() }, LinearLayout.LayoutParams(0, wrap(), 1f).withStartMargin(6).withEndMargin(6))
        row.addView(button("Browser") { callbacks.onOpenInBrowser() }, LinearLayout.LayoutParams(0, wrap(), 1f).withStartMargin(6))
        card.addView(row, LinearLayout.LayoutParams(match(), wrap()).withTopMargin(14))
        frame.addView(card, FrameLayout.LayoutParams(match(), wrap(), Gravity.CENTER).apply {
            leftMargin = dp(20)
            rightMargin = dp(20)
        })
        return frame
    }

    private fun button(textValue: String, onClick: () -> Unit): Button = Button(context).apply {
        text = textValue
        setTextColor(Color.rgb(30, 58, 138))
        setOnClickListener { onClick() }
    }

    private fun dp(value: Int): Int = (value * context.resources.displayMetrics.density).toInt()
}
