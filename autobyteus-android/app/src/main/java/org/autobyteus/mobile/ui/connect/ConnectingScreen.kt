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
import org.autobyteus.mobile.ui.withTopMargin
import org.autobyteus.mobile.ui.wrap

/** "Connecting to <node>" with Cancel (VIS-025), and "Connected to <node> / Opening your runs…" (VIS-026). */
class ConnectingScreen(private val ui: ShellUi) {
    fun connecting(nodeName: String, onCancel: () -> Unit): View = centered { column ->
        column.addView(ui.spinner(48))
        column.addView(title("Connecting to $nodeName"), LinearLayout.LayoutParams(wrap(), wrap()).withTopMargin(ui.dp(24)))
        val cancel = ui.horizontal().apply {
            gravity = Gravity.CENTER
            setPadding(ui.dp(24), 0, ui.dp(24), 0)
            ui.pressable(this, ui.rounded(ShellColors.white, 12f), ShellColors.blue50)
            addView(ui.text("Cancel", 15f, ShellColors.blue700, bold = true))
            contentDescription = "Cancel"
            setOnClickListener { onCancel() }
        }
        column.addView(cancel, LinearLayout.LayoutParams(wrap(), ui.dp(48)).withTopMargin(ui.dp(24)))
    }

    fun connected(nodeName: String): View = centered { column ->
        val badge = FrameLayout(ui.context).apply { background = ui.circle(ShellColors.green100) }
        badge.addView(ui.icon(R.drawable.ic_check, 36, ShellColors.green600), FrameLayout.LayoutParams(ui.dp(36), ui.dp(36), Gravity.CENTER))
        column.addView(badge, LinearLayout.LayoutParams(ui.dp(64), ui.dp(64)))
        column.addView(title("Connected to $nodeName"), LinearLayout.LayoutParams(wrap(), wrap()).withTopMargin(ui.dp(24)))
        column.addView(ui.text("Opening your runs…", 14f, ShellColors.slate500), LinearLayout.LayoutParams(wrap(), wrap()).withTopMargin(ui.dp(4)))
    }

    private fun title(value: String) = ui.text(value, 18f, ShellColors.slate900, bold = true).apply { gravity = Gravity.CENTER }

    private fun centered(build: (LinearLayout) -> Unit): View {
        val root = FrameLayout(ui.context).apply { setBackgroundColor(ShellColors.white) }
        val column = ui.vertical().apply {
            gravity = Gravity.CENTER_HORIZONTAL
            setPadding(ui.dp(32), 0, ui.dp(32), 0)
            accessibilityLiveRegion = View.ACCESSIBILITY_LIVE_REGION_POLITE
        }
        build(column)
        root.addView(column, FrameLayout.LayoutParams(match(), wrap(), Gravity.CENTER))
        SystemBarInsets.pad(root)
        return root
    }
}
