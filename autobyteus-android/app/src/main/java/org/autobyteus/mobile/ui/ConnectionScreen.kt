package org.autobyteus.mobile.ui

import android.content.ClipboardManager
import android.content.Context
import android.graphics.Color
import android.text.InputType
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.CheckBox
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import org.autobyteus.mobile.connection.ConnectionDiagnostic
import org.autobyteus.mobile.connection.SavedNodeProfile

class ConnectionScreen(private val context: Context) {
    data class Callbacks(
        val onOpenSaved: (SavedNodeProfile) -> Unit,
        val onRemoveSaved: (SavedNodeProfile) -> Unit,
        val onSubmitInput: (String, Boolean) -> Unit,
        val onScanQr: () -> Unit,
        val onOpenTailscale: () -> Unit,
    )

    fun render(
        savedProfiles: List<SavedNodeProfile>,
        diagnostic: ConnectionDiagnostic? = null,
        isBusy: Boolean = false,
        initialInput: String = "",
        callbacks: Callbacks,
    ): View {
        val scroll = ScrollView(context).apply {
            setBackgroundColor(Color.rgb(248, 250, 252))
        }
        val root = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(20), dp(28), dp(20), dp(28))
        }
        scroll.addView(root)

        root.addView(title("AutoByteus mobile"))
        root.addView(body("Open the existing /mobile shell from a saved desktop node. Pair with the same stable Tailscale URL you expect to use while traveling."))

        if (isBusy) {
            root.addView(card("Checking saved node…", "Contacting /rest/remote-access/status before opening the WebView."))
        }
        if (diagnostic != null) {
            root.addView(diagnosticCard(diagnostic))
        }

        if (savedProfiles.isNotEmpty()) {
            root.addView(sectionLabel("Saved nodes"))
            savedProfiles.forEach { profile ->
                root.addView(savedProfileRow(profile, callbacks))
            }
        }

        root.addView(sectionLabel("Pair or enter node URL"))
        val input = EditText(context).apply {
            setText(initialInput)
            hint = "https://desktop.tailnet-name.ts.net/mobile"
            minLines = 2
            maxLines = 5
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_URI or InputType.TYPE_TEXT_FLAG_MULTI_LINE
            setTextColor(Color.rgb(15, 23, 42))
            setHintTextColor(Color.rgb(100, 116, 139))
            setBackgroundColor(Color.WHITE)
            setPadding(dp(12), dp(10), dp(12), dp(10))
        }
        root.addView(input, LinearLayout.LayoutParams(match(), wrap()).withTopMargin(8))

        val httpAcknowledgement = CheckBox(context).apply {
            text = "I understand HTTP should only be used on a trusted private LAN/tailnet. Prefer Tailscale Serve HTTPS for travel."
            setTextColor(Color.rgb(71, 85, 105))
            textSize = 13f
        }
        root.addView(httpAcknowledgement)

        val actionRow = LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
        }
        actionRow.addView(primaryButton("Save and open") {
            callbacks.onSubmitInput(input.text.toString(), httpAcknowledgement.isChecked)
        }, LinearLayout.LayoutParams(0, wrap(), 1f).withEndMargin(8))
        actionRow.addView(secondaryButton("Paste") {
            val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
            val pasted = clipboard.primaryClip?.getItemAt(0)?.coerceToText(context)?.toString().orEmpty()
            if (pasted.isNotBlank()) {
                input.setText(pasted)
            }
        }, LinearLayout.LayoutParams(0, wrap(), 1f).withStartMargin(8))
        root.addView(actionRow, LinearLayout.LayoutParams(match(), wrap()).withTopMargin(12))

        val qrRow = LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
        }
        qrRow.addView(secondaryButton("Scan QR") { callbacks.onScanQr() }, LinearLayout.LayoutParams(0, wrap(), 1f).withEndMargin(8))
        qrRow.addView(secondaryButton("Open Tailscale") { callbacks.onOpenTailscale() }, LinearLayout.LayoutParams(0, wrap(), 1f).withStartMargin(8))
        root.addView(qrRow, LinearLayout.LayoutParams(match(), wrap()).withTopMargin(8))

        root.addView(card(
            "Recommended setup",
            "Use Tailscale Serve HTTPS, for example https://desktop.tailnet-name.ts.net/mobile. If you pair with a LAN IP and later switch to a Tailscale hostname, WebView localStorage is a different origin and you may need to pair again.",
        ))

        return scroll
    }

    private fun savedProfileRow(profile: SavedNodeProfile, callbacks: Callbacks): View {
        val root = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(14), dp(12), dp(14), dp(12))
            setBackgroundColor(Color.WHITE)
        }
        root.addView(TextView(context).apply {
            text = profile.displayName
            textSize = 16f
            setTextColor(Color.rgb(15, 23, 42))
        })
        root.addView(TextView(context).apply {
            text = profile.mobileUrl
            textSize = 12f
            setTextColor(Color.rgb(71, 85, 105))
        })
        val row = LinearLayout(context).apply { orientation = LinearLayout.HORIZONTAL }
        row.addView(primaryButton("Open") { callbacks.onOpenSaved(profile) }, LinearLayout.LayoutParams(0, wrap(), 1f).withEndMargin(8))
        row.addView(secondaryButton("Remove") { callbacks.onRemoveSaved(profile) }, LinearLayout.LayoutParams(0, wrap(), 1f).withStartMargin(8))
        root.addView(row, LinearLayout.LayoutParams(match(), wrap()).withTopMargin(10))
        return root.withBottomMargin(10)
    }

    private fun diagnosticCard(diagnostic: ConnectionDiagnostic): View = card(
        diagnostic.title,
        "${diagnostic.message}\n\n${diagnostic.recoveryAction}",
        backgroundColor = Color.rgb(255, 251, 235),
        titleColor = Color.rgb(146, 64, 14),
    )

    private fun card(
        title: String,
        body: String,
        backgroundColor: Int = Color.WHITE,
        titleColor: Int = Color.rgb(15, 23, 42),
    ): View {
        val root = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(14), dp(12), dp(14), dp(12))
            setBackgroundColor(backgroundColor)
        }
        root.addView(TextView(context).apply {
            text = title
            textSize = 15f
            setTextColor(titleColor)
        })
        root.addView(TextView(context).apply {
            text = body
            textSize = 13f
            setTextColor(Color.rgb(71, 85, 105))
        }, LinearLayout.LayoutParams(match(), wrap()).withTopMargin(4))
        return root.withTopMargin(14)
    }

    private fun title(textValue: String): TextView = TextView(context).apply {
        text = textValue
        textSize = 26f
        setTextColor(Color.rgb(15, 23, 42))
    }

    private fun body(textValue: String): TextView = TextView(context).apply {
        text = textValue
        textSize = 15f
        setTextColor(Color.rgb(71, 85, 105))
    }

    private fun sectionLabel(textValue: String): TextView = TextView(context).apply {
        text = textValue.uppercase()
        textSize = 12f
        setTextColor(Color.rgb(71, 85, 105))
    }.withTopMargin(22) as TextView

    private fun primaryButton(textValue: String, onClick: () -> Unit): Button = Button(context).apply {
        text = textValue
        setTextColor(Color.WHITE)
        setBackgroundColor(Color.rgb(37, 99, 235))
        setOnClickListener { onClick() }
    }

    private fun secondaryButton(textValue: String, onClick: () -> Unit): Button = Button(context).apply {
        text = textValue
        setTextColor(Color.rgb(30, 58, 138))
        setOnClickListener { onClick() }
    }

    private fun View.withTopMargin(value: Int): View {
        layoutParams = LinearLayout.LayoutParams(match(), wrap()).withTopMargin(value)
        return this
    }

    private fun View.withBottomMargin(value: Int): View {
        layoutParams = LinearLayout.LayoutParams(match(), wrap()).withBottomMargin(value)
        return this
    }

    private fun dp(value: Int): Int = (value * context.resources.displayMetrics.density).toInt()
}

fun LinearLayout.LayoutParams.withTopMargin(value: Int): LinearLayout.LayoutParams {
    topMargin = value
    return this
}

fun LinearLayout.LayoutParams.withBottomMargin(value: Int): LinearLayout.LayoutParams {
    bottomMargin = value
    return this
}

fun LinearLayout.LayoutParams.withStartMargin(value: Int): LinearLayout.LayoutParams {
    marginStart = value
    return this
}

fun LinearLayout.LayoutParams.withEndMargin(value: Int): LinearLayout.LayoutParams {
    marginEnd = value
    return this
}

fun match(): Int = ViewGroup.LayoutParams.MATCH_PARENT
fun wrap(): Int = ViewGroup.LayoutParams.WRAP_CONTENT
