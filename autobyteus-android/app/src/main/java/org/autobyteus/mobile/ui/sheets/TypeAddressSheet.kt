package org.autobyteus.mobile.ui.sheets

import android.text.Editable
import android.text.InputType
import android.text.TextWatcher
import android.view.View
import android.widget.CheckBox
import android.widget.EditText
import android.widget.FrameLayout
import android.widget.LinearLayout
import org.autobyteus.mobile.ui.ShellColors
import org.autobyteus.mobile.ui.ShellUi
import org.autobyteus.mobile.ui.match
import org.autobyteus.mobile.ui.withTopMargin
import org.autobyteus.mobile.ui.wrap

/**
 * "Type an address" (VIS-022): a plain `http://` address needs the tick before Connect (DEC-017 wording); a pairing
 * link never comes this way.
 */
object TypeAddressSheet {
    /** DEC-017: the same calm tone as the desktop. */
    const val HTTP_ACKNOWLEDGEMENT = "This address has no extra protection. Fine at home or in your office; on public Wi-Fi, use Tailscale."

    fun build(ui: ShellUi, prefill: String, onConnect: (address: String, httpAcknowledged: Boolean) -> Unit, onClose: () -> Unit): FrameLayout {
        val content = ui.vertical()
        val input = EditText(ui.context).apply {
            setText(prefill)
            hint = "https://node.example.com"
            contentDescription = "Node address"
            isSingleLine = true
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_URI or InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS
            textSize = 16f
            setTextColor(ShellColors.slate900)
            setHintTextColor(ShellColors.slate400)
            background = ui.rounded(ShellColors.white, 12f, ShellColors.slate300)
            setPadding(ui.dp(12), 0, ui.dp(12), 0)
        }
        content.addView(input, LinearLayout.LayoutParams(match(), ui.dp(48)))
        val acknowledgement = CheckBox(ui.context).apply {
            text = HTTP_ACKNOWLEDGEMENT
            textSize = 15f
            setTextColor(ShellColors.slate700)
            minHeight = ui.dp(48)
        }
        content.addView(acknowledgement, LinearLayout.LayoutParams(match(), wrap()).withTopMargin(ui.dp(12)))
        lateinit var connect: LinearLayout
        connect = ui.primaryButton("Connect", heightDp = 48) {
            onConnect(input.text.toString().trim(), acknowledgement.isChecked)
        }
        content.addView(connect, LinearLayout.LayoutParams(match(), ui.dp(48)).withTopMargin(ui.dp(16)))

        fun refresh() {
            val address = input.text.toString().trim()
            val isHttp = address.startsWith("http://", ignoreCase = true)
            acknowledgement.visibility = if (isHttp) View.VISIBLE else View.GONE
            ui.setEnabled(connect, address.isNotEmpty() && (!isHttp || acknowledgement.isChecked))
        }
        input.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) = Unit
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) = Unit
            override fun afterTextChanged(s: Editable?) = refresh()
        })
        acknowledgement.setOnCheckedChangeListener { _, _ -> refresh() }
        refresh()
        return SheetFrame.build(ui, "Type an address", content, onClose)
    }
}
