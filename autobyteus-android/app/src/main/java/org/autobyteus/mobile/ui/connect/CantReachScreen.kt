package org.autobyteus.mobile.ui.connect

import android.view.Gravity
import android.view.View
import android.widget.FrameLayout
import android.widget.LinearLayout
import org.autobyteus.mobile.R
import org.autobyteus.mobile.ui.ShellColors
import org.autobyteus.mobile.ui.ShellUi
import org.autobyteus.mobile.ui.SystemBarInsets
import org.autobyteus.mobile.ui.match
import org.autobyteus.mobile.ui.withEndMargin
import org.autobyteus.mobile.ui.withTopMargin
import org.autobyteus.mobile.ui.wrap

/**
 * "Can't reach <node>" (VIS-027): the plain reason, "Open Tailscale" when the reason names it, Retry when retrying
 * can help, Scan again, and the back arrow to the node list. The same layout says when the phone's WebView is too
 * old for the bridge.
 */
class CantReachScreen(private val ui: ShellUi) {
    data class Content(
        val title: String,
        val body: String,
        val link: Pair<String, () -> Unit>? = null,
        val primary: Pair<String, () -> Unit>? = null,
        val secondary: Pair<String, () -> Unit>? = null,
    )

    fun render(content: Content, onBack: () -> Unit): View {
        val root = FrameLayout(ui.context).apply { setBackgroundColor(ShellColors.white) }
        val column = ui.vertical()
        val header = ui.horizontal().apply { setPadding(ui.dp(8), 0, ui.dp(16), 0) }
        header.addView(ui.iconButton(R.drawable.ic_arrow_left, "Back to nodes", ShellColors.slate700, onBack))
        column.addView(header, LinearLayout.LayoutParams(match(), ui.dp(56)))

        val middle = ui.vertical().apply {
            gravity = Gravity.CENTER
            setPadding(ui.dp(32), 0, ui.dp(32), ui.dp(40))
            accessibilityLiveRegion = View.ACCESSIBILITY_LIVE_REGION_POLITE
        }
        val badge = FrameLayout(ui.context).apply { background = ui.rounded(ShellColors.amber50, 16f) }
        badge.addView(ui.icon(R.drawable.ic_exclamation_triangle, 28, ShellColors.amber600), FrameLayout.LayoutParams(ui.dp(28), ui.dp(28), Gravity.CENTER))
        middle.addView(badge, LinearLayout.LayoutParams(ui.dp(56), ui.dp(56)))
        middle.addView(ui.text(content.title, 20f, ShellColors.slate900, bold = true).apply { gravity = Gravity.CENTER },
            LinearLayout.LayoutParams(wrap(), wrap()).withTopMargin(ui.dp(20)))
        middle.addView(ui.text(content.body, 15f, ShellColors.slate600).apply {
            gravity = Gravity.CENTER
            setLineSpacing(0f, 1.25f)
        }, LinearLayout.LayoutParams(wrap(), wrap()).withTopMargin(ui.dp(8)))
        content.link?.let { (label, onClick) ->
            val link = ui.horizontal().apply {
                gravity = Gravity.CENTER
                setPadding(ui.dp(16), 0, ui.dp(16), 0)
                ui.pressable(this, ui.rounded(ShellColors.white, 12f), ShellColors.blue50)
                addView(ui.text(label, 15f, ShellColors.blue700, bold = true), LinearLayout.LayoutParams(wrap(), wrap()).withEndMargin(ui.dp(6)))
                addView(ui.icon(R.drawable.ic_arrow_top_right_on_square, 16, ShellColors.blue700))
                contentDescription = label
                setOnClickListener { onClick() }
            }
            middle.addView(link, LinearLayout.LayoutParams(wrap(), ui.dp(48)).withTopMargin(ui.dp(16)))
        }
        column.addView(middle, LinearLayout.LayoutParams(match(), 0, 1f))

        val footer = ui.vertical().apply { setPadding(ui.dp(16), ui.dp(12), ui.dp(16), ui.dp(16)) }
        content.primary?.let { (label, onClick) ->
            footer.addView(ui.primaryButton(label, onClick = onClick), LinearLayout.LayoutParams(match(), ui.dp(56)))
        }
        content.secondary?.let { (label, onClick) ->
            footer.addView(ui.outlineButton(label, onClick = onClick),
                LinearLayout.LayoutParams(match(), ui.dp(56)).withTopMargin(if (content.primary != null) ui.dp(8) else 0))
        }
        column.addView(footer)
        root.addView(column, FrameLayout.LayoutParams(match(), match()))
        SystemBarInsets.pad(root)
        return root
    }
}
