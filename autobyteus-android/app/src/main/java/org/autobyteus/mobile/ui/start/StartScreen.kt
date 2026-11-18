package org.autobyteus.mobile.ui.start

import android.view.Gravity
import android.view.View
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ScrollView
import org.autobyteus.mobile.R
import org.autobyteus.mobile.connection.SavedNodeEntry
import org.autobyteus.mobile.shell.NodeReachabilityState
import org.autobyteus.mobile.ui.ShellColors
import org.autobyteus.mobile.ui.ShellUi
import org.autobyteus.mobile.ui.SystemBarInsets
import org.autobyteus.mobile.ui.match
import org.autobyteus.mobile.ui.withEndMargin
import org.autobyteus.mobile.ui.withStartMargin
import org.autobyteus.mobile.ui.withTopMargin
import org.autobyteus.mobile.ui.wrap

/**
 * The app's start screen (VIS-018…021, 034) and, with a back arrow and the current node marked, the Switch node list
 * (VIS-028): the saved nodes with their state, "Other ways to connect", and the bottom Scan button.
 */
class StartScreen(private val ui: ShellUi) {
    data class Callbacks(
        val onOpenNode: (SavedNodeEntry) -> Unit,
        val onMore: (SavedNodeEntry) -> Unit,
        val onScan: () -> Unit,
        val onTypeAddress: () -> Unit,
        val onPasteLink: () -> Unit,
        /** Switch node mode only: back to the open page. */
        val onBack: () -> Unit,
    )

    private val rows = mutableMapOf<String, NodeRow>()
    private var otherWaysOpen = false
    private var root: FrameLayout? = null

    fun render(entries: List<SavedNodeEntry>, currentEntryId: String?, switchMode: Boolean, callbacks: Callbacks): FrameLayout {
        rows.clear()
        val frame = FrameLayout(ui.context).apply { setBackgroundColor(ShellColors.white) }
        val column = ui.vertical()
        column.addView(header(switchMode, callbacks), LinearLayout.LayoutParams(match(), ui.dp(56)))
        column.addView(ui.divider())

        val list = ui.vertical()
        if (entries.isEmpty()) {
            list.addView(firstLaunch())
        } else {
            if (!switchMode) {
                list.addView(ui.text("YOUR NODES", 12f, ShellColors.slate500, bold = true).apply {
                    letterSpacing = 0.05f
                    setPadding(ui.dp(16), ui.dp(20), ui.dp(16), ui.dp(4))
                })
            }
            entries.forEach { entry ->
                val row = NodeRow(ui, entry, entry.id == currentEntryId && switchMode, { callbacks.onOpenNode(entry) }, { callbacks.onMore(entry) })
                rows[entry.id] = row
                list.addView(row.view, LinearLayout.LayoutParams(match(), wrap()))
                list.addView(ui.divider())
            }
        }
        list.addView(otherWays(callbacks, topMarginDp = if (entries.isEmpty()) 40 else 0))
        column.addView(ScrollView(ui.context).apply { addView(list) }, LinearLayout.LayoutParams(match(), 0, 1f))

        column.addView(ui.divider())
        val footer = ui.vertical().apply { setPadding(ui.dp(16), ui.dp(12), ui.dp(16), ui.dp(16)) }
        footer.addView(ui.primaryButton("Scan", iconRes = R.drawable.ic_qr_code) { callbacks.onScan() }, LinearLayout.LayoutParams(match(), ui.dp(56)))
        column.addView(footer)

        frame.addView(column, FrameLayout.LayoutParams(match(), match()))
        SystemBarInsets.pad(frame)
        root = frame
        return frame
    }

    fun setReachability(entryId: String, state: NodeReachabilityState) {
        rows[entryId]?.setState(state)
    }

    /** Puts a sheet over the screen; `null` closes the open one. */
    fun showSheet(sheet: View?) {
        val frame = root ?: return
        while (frame.childCount > 1) frame.removeViewAt(frame.childCount - 1)
        if (sheet != null) frame.addView(sheet, FrameLayout.LayoutParams(match(), match()))
    }

    fun hasSheet(): Boolean = (root?.childCount ?: 0) > 1

    private fun header(switchMode: Boolean, callbacks: Callbacks): LinearLayout = ui.horizontal().apply {
        setPadding(ui.dp(8), 0, ui.dp(16), 0)
        if (switchMode) {
            addView(ui.iconButton(R.drawable.ic_arrow_left, "Back", ShellColors.slate700) { callbacks.onBack() })
            addView(ui.text("Switch node", 18f, ShellColors.slate900, bold = true), LinearLayout.LayoutParams(wrap(), wrap()).withStartMargin(ui.dp(4)))
        } else {
            addView(ImageView(ui.context).apply {
                setImageResource(R.drawable.ic_autobyteus_mark)
                importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO
            }, LinearLayout.LayoutParams(ui.dp(28), ui.dp(28)).withStartMargin(ui.dp(8)))
            addView(ui.text("AutoByteus", 18f, ShellColors.slate900, bold = true), LinearLayout.LayoutParams(wrap(), wrap()).withStartMargin(ui.dp(10)))
        }
    }

    private fun firstLaunch(): LinearLayout = ui.vertical().apply {
        gravity = Gravity.CENTER_HORIZONTAL
        setPadding(ui.dp(32), ui.dp(80), ui.dp(32), 0)
        val badge = FrameLayout(ui.context).apply { background = ui.rounded(ShellColors.blue50, 16f) }
        badge.addView(ui.icon(R.drawable.ic_qr_code, 36, ShellColors.blue600), FrameLayout.LayoutParams(ui.dp(36), ui.dp(36), Gravity.CENTER))
        addView(badge, LinearLayout.LayoutParams(ui.dp(72), ui.dp(72)))
        addView(ui.text("Scan the QR code on your computer", 22f, ShellColors.slate900, bold = true).apply { gravity = Gravity.CENTER },
            LinearLayout.LayoutParams(wrap(), wrap()).withTopMargin(ui.dp(24)))
        // DEC-024: the desktop button is "Show QR code" on the Phone Setup page.
        addView(ui.text("On your computer, open Nodes › Phone Setup and press Show QR code.", 15f, ShellColors.slate500).apply {
            gravity = Gravity.CENTER
            setLineSpacing(0f, 1.2f)
        }, LinearLayout.LayoutParams(wrap(), wrap()).withTopMargin(ui.dp(8)))
    }

    private fun otherWays(callbacks: Callbacks, topMarginDp: Int): LinearLayout = ui.vertical().apply {
        val chevron = ui.icon(R.drawable.ic_chevron_down, 20, ShellColors.slate400)
        val options = ui.vertical()
        val toggle = ui.horizontal().apply {
            setPadding(ui.dp(16), 0, ui.dp(16), 0)
            ui.pressable(this, null, ShellColors.slate50)
            addView(ui.text("Other ways to connect", 15f, ShellColors.slate600), LinearLayout.LayoutParams(0, wrap(), 1f))
            addView(chevron)
        }
        fun apply() {
            options.visibility = if (otherWaysOpen) View.VISIBLE else View.GONE
            chevron.rotation = if (otherWaysOpen) 180f else 0f
            toggle.contentDescription = "Other ways to connect, ${if (otherWaysOpen) "expanded" else "collapsed"}"
        }
        toggle.setOnClickListener {
            otherWaysOpen = !otherWaysOpen
            apply()
        }
        options.addView(ui.divider())
        options.addView(option(R.drawable.ic_link, "Type an address", callbacks.onTypeAddress))
        options.addView(ui.divider())
        options.addView(option(R.drawable.ic_clipboard_document, "Paste a link", callbacks.onPasteLink))
        addView(toggle, LinearLayout.LayoutParams(match(), ui.dp(56)).withTopMargin(ui.dp(topMarginDp)))
        addView(options)
        apply()
    }

    private fun option(iconRes: Int, label: String, onClick: () -> Unit): LinearLayout = ui.horizontal().apply {
        minimumHeight = ui.dp(56)
        setPadding(ui.dp(16), 0, ui.dp(16), 0)
        ui.pressable(this, null, ShellColors.slate50)
        addView(ui.icon(iconRes, 20, ShellColors.slate500), LinearLayout.LayoutParams(ui.dp(20), ui.dp(20)).withEndMargin(ui.dp(12)))
        addView(ui.text(label, 15f, ShellColors.slate900))
        contentDescription = label
        setOnClickListener { onClick() }
    }
}
