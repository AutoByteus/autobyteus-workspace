package org.autobyteus.mobile.ui.start

import android.view.Gravity
import android.view.View
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import org.autobyteus.mobile.R
import org.autobyteus.mobile.connection.SavedNodeEntry
import org.autobyteus.mobile.shell.NodeReachabilityState
import org.autobyteus.mobile.ui.ShellColors
import org.autobyteus.mobile.ui.ShellUi
import org.autobyteus.mobile.ui.withEndMargin
import org.autobyteus.mobile.ui.wrap

/** One saved node: avatar with a state dot, name, Online / Not reachable / Checking…, a check when current, and ⋮. */
class NodeRow(
    private val ui: ShellUi,
    private val entry: SavedNodeEntry,
    private val isCurrent: Boolean,
    onOpen: () -> Unit,
    onMore: () -> Unit,
) {
    private val dot = View(ui.context)
    private val stateText: TextView = ui.singleLine(ui.text("", 13f, ShellColors.slate500))
    private val openArea = ui.horizontal()
    private val ringColor = if (isCurrent) ShellColors.blue50 else ShellColors.white

    val view: LinearLayout = ui.horizontal().apply {
        minimumHeight = ui.dp(64)
        setPadding(ui.dp(16), 0, ui.dp(4), 0)
        setBackgroundColor(if (isCurrent) ShellColors.blue50 else ShellColors.white)
        tag = entry.id
    }

    init {
        val avatar = FrameLayout(ui.context).apply {
            background = ui.circle(if (isCurrent) ShellColors.white else ShellColors.slate100)
        }
        avatar.addView(ui.icon(R.drawable.ic_computer_desktop, 20, ShellColors.slate600),
            FrameLayout.LayoutParams(ui.dp(20), ui.dp(20), Gravity.CENTER))
        avatar.addView(dot, FrameLayout.LayoutParams(ui.dp(14), ui.dp(14), Gravity.BOTTOM or Gravity.END).apply {
            setMargins(0, 0, -ui.dp(2), -ui.dp(2))
        })
        avatar.clipChildren = false

        val texts = ui.vertical()
        texts.addView(ui.singleLine(ui.text(entry.displayName, 16f, ShellColors.slate900, bold = true)))
        texts.addView(stateText)

        openArea.apply {
            minimumHeight = ui.dp(64)
            ui.pressable(this, null, ShellColors.slate50)
            addView(avatar, LinearLayout.LayoutParams(ui.dp(40), ui.dp(40)).withEndMargin(ui.dp(12)))
            addView(texts, LinearLayout.LayoutParams(0, wrap(), 1f))
            if (isCurrent) addView(ui.icon(R.drawable.ic_check, 24, ShellColors.blue600))
            setOnClickListener { onOpen() }
        }
        view.clipChildren = false
        view.addView(openArea, LinearLayout.LayoutParams(0, wrap(), 1f))
        view.addView(ui.iconButton(R.drawable.ic_ellipsis_vertical, "More for ${entry.displayName}", ShellColors.slate400, onMore))
        setState(NodeReachabilityState.Checking)
    }

    fun setState(state: NodeReachabilityState) {
        val (label, dotColor, textColor) = when (state) {
            NodeReachabilityState.Checking -> Triple("Checking…", ShellColors.slate300, ShellColors.slate500)
            NodeReachabilityState.Online -> Triple("Online", ShellColors.green500, ShellColors.slate500)
            NodeReachabilityState.NotReachable -> Triple("Not reachable", ShellColors.amber500, ShellColors.amber700)
        }
        stateText.text = label
        stateText.setTextColor(textColor)
        dot.background = ui.circle(dotColor, ringColor, 2)
        openArea.contentDescription = listOfNotNull(entry.displayName, label, if (isCurrent) "current node" else null).joinToString(", ")
    }
}
