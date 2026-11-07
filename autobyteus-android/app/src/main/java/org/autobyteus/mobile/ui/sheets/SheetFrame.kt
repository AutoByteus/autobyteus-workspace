package org.autobyteus.mobile.ui.sheets

import android.view.Gravity
import android.view.View
import android.widget.FrameLayout
import android.widget.LinearLayout
import org.autobyteus.mobile.R
import org.autobyteus.mobile.ui.ShellColors
import org.autobyteus.mobile.ui.ShellUi
import org.autobyteus.mobile.ui.match
import org.autobyteus.mobile.ui.withTopMargin
import org.autobyteus.mobile.ui.wrap

/** A bottom sheet over the screen: scrim, 40×4 handle, a 56dp header with title and close, then the content. */
object SheetFrame {
    fun build(ui: ShellUi, title: String, content: View, onClose: () -> Unit): FrameLayout {
        val frame = FrameLayout(ui.context)
        val scrim = View(ui.context).apply {
            setBackgroundColor(ShellColors.scrim)
            contentDescription = "Close"
            setOnClickListener { onClose() }
        }
        frame.addView(scrim, FrameLayout.LayoutParams(match(), match()))

        val sheet = ui.vertical().apply {
            background = ui.topRounded(ShellColors.white, 16f)
            isClickable = true
            setPadding(0, 0, 0, ui.dp(16))
        }
        sheet.addView(View(ui.context).apply { background = ui.rounded(ShellColors.slate300, 2f) },
            LinearLayout.LayoutParams(ui.dp(40), ui.dp(4)).withTopMargin(ui.dp(8)).also { it.gravity = Gravity.CENTER_HORIZONTAL })
        val header = ui.horizontal().apply { setPadding(ui.dp(16), 0, ui.dp(8), 0) }
        header.addView(ui.singleLine(ui.text(title, 18f, ShellColors.slate900, bold = true)), LinearLayout.LayoutParams(0, wrap(), 1f))
        header.addView(ui.iconButton(R.drawable.ic_x_mark, "Close", ShellColors.slate500, onClose))
        sheet.addView(header, LinearLayout.LayoutParams(match(), ui.dp(56)))
        sheet.addView(content, LinearLayout.LayoutParams(match(), wrap()).apply {
            marginStart = ui.dp(16)
            marginEnd = ui.dp(16)
        })
        frame.addView(sheet, FrameLayout.LayoutParams(match(), wrap(), Gravity.BOTTOM))
        return frame
    }
}
