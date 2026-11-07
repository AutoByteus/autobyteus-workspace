package org.autobyteus.mobile.ui.sheets

import android.view.Gravity
import android.widget.FrameLayout
import android.widget.LinearLayout
import org.autobyteus.mobile.connection.SavedNodeEntry
import org.autobyteus.mobile.ui.ShellColors
import org.autobyteus.mobile.ui.ShellUi
import org.autobyteus.mobile.ui.match
import org.autobyteus.mobile.ui.withEndMargin
import org.autobyteus.mobile.ui.withStartMargin
import org.autobyteus.mobile.ui.withTopMargin

/** A node's ⋮ sheet (VIS-023): "Remove from this phone", then the confirmation. Removing touches only this phone. */
object RemoveNodeSheet {
    fun build(ui: ShellUi, entry: SavedNodeEntry, onRemove: () -> Unit, onClose: () -> Unit): FrameLayout {
        val content = ui.vertical()
        val removeRow = ui.horizontal().apply {
            minimumHeight = ui.dp(56)
            ui.pressable(this, ui.rounded(ShellColors.white, 12f), ShellColors.red50)
            addView(ui.text("Remove from this phone", 15f, ShellColors.red700, bold = true))
            contentDescription = "Remove from this phone"
        }
        content.addView(removeRow, LinearLayout.LayoutParams(match(), ui.dp(56)))
        removeRow.setOnClickListener {
            content.removeAllViews()
            content.addView(ui.text("Remove ${entry.displayName} from this phone? Scan its QR code again to add it back.", 15f, ShellColors.slate600).apply {
                setLineSpacing(0f, 1.2f)
            })
            val buttons = ui.horizontal().apply { gravity = Gravity.CENTER_VERTICAL }
            buttons.addView(ui.outlineButton("Cancel", heightDp = 48, onClick = onClose),
                LinearLayout.LayoutParams(0, ui.dp(48), 1f).withEndMargin(ui.dp(6)))
            val remove = ui.primaryButton("Remove", heightDp = 48, onClick = onRemove).apply {
                ui.pressable(this, ui.rounded(ShellColors.red600, 12f), ShellColors.red700)
            }
            buttons.addView(remove, LinearLayout.LayoutParams(0, ui.dp(48), 1f).withStartMargin(ui.dp(6)))
            content.addView(buttons, LinearLayout.LayoutParams(match(), ui.dp(48)).withTopMargin(ui.dp(16)))
        }
        return SheetFrame.build(ui, entry.displayName, content, onClose)
    }
}
