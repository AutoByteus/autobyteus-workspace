package org.autobyteus.mobile.ui

import android.content.Context
import android.content.res.ColorStateList
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.graphics.drawable.RippleDrawable
import android.text.TextUtils
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView

/** The approved design's colors (the `/mobile` shell's Tailwind palette), so the screens around the page match it. */
object ShellColors {
    val slate900 = Color.parseColor("#0F172A")
    val slate700 = Color.parseColor("#334155")
    val slate600 = Color.parseColor("#475569")
    val slate500 = Color.parseColor("#64748B")
    val slate400 = Color.parseColor("#94A3B8")
    val slate300 = Color.parseColor("#CBD5E1")
    val slate200 = Color.parseColor("#E2E8F0")
    val slate100 = Color.parseColor("#F1F5F9")
    val slate50 = Color.parseColor("#F8FAFC")
    val blue700 = Color.parseColor("#1D4ED8")
    val blue600 = Color.parseColor("#2563EB")
    val blue300 = Color.parseColor("#93C5FD")
    val blue50 = Color.parseColor("#EFF6FF")
    val green600 = Color.parseColor("#16A34A")
    val green500 = Color.parseColor("#22C55E")
    val green400 = Color.parseColor("#4ADE80")
    val green100 = Color.parseColor("#DCFCE7")
    val amber700 = Color.parseColor("#B45309")
    val amber600 = Color.parseColor("#D97706")
    val amber500 = Color.parseColor("#F59E0B")
    val amber50 = Color.parseColor("#FFFBEB")
    val red700 = Color.parseColor("#B91C1C")
    val red50 = Color.parseColor("#FEF2F2")
    val red600 = Color.parseColor("#DC2626")
    val scrim = Color.parseColor("#660F172A")
    const val white = Color.WHITE
}

/** Small view builders shared by the native screens. */
class ShellUi(val context: Context) {
    fun dp(value: Int): Int = (value * context.resources.displayMetrics.density).toInt()
    private fun dpF(value: Float): Float = value * context.resources.displayMetrics.density

    fun text(value: String, sizeSp: Float, color: Int, bold: Boolean = false): TextView = TextView(context).apply {
        text = value
        setTextSize(TypedValue.COMPLEX_UNIT_SP, sizeSp)
        setTextColor(color)
        if (bold) typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
    }

    fun singleLine(view: TextView): TextView = view.apply {
        maxLines = 1
        ellipsize = TextUtils.TruncateAt.END
    }

    fun rounded(color: Int, radiusDp: Float, strokeColor: Int? = null): GradientDrawable = GradientDrawable().apply {
        setColor(color)
        cornerRadius = dpF(radiusDp)
        if (strokeColor != null) setStroke(dp(1), strokeColor)
    }

    fun topRounded(color: Int, radiusDp: Float): GradientDrawable = GradientDrawable().apply {
        setColor(color)
        val r = dpF(radiusDp)
        cornerRadii = floatArrayOf(r, r, r, r, 0f, 0f, 0f, 0f)
    }

    fun circle(color: Int, strokeColor: Int? = null, strokeDp: Int = 0): GradientDrawable = GradientDrawable().apply {
        shape = GradientDrawable.OVAL
        setColor(color)
        if (strokeColor != null) setStroke(dp(strokeDp), strokeColor)
    }

    /** A pressed state like the design's `active:bg-*`. */
    fun pressable(view: View, background: android.graphics.drawable.Drawable?, pressedColor: Int) {
        view.background = RippleDrawable(ColorStateList.valueOf(pressedColor), background, background ?: rounded(Color.WHITE, 0f))
        view.isClickable = true
        view.isFocusable = true
    }

    fun icon(resId: Int, sizeDp: Int, tint: Int?): ImageView = ImageView(context).apply {
        setImageResource(resId)
        if (tint != null) imageTintList = ColorStateList.valueOf(tint)
        layoutParams = LinearLayout.LayoutParams(dp(sizeDp), dp(sizeDp))
        importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO
    }

    /** The full-width blue button (Scan, Retry, Connect). */
    fun primaryButton(label: String, heightDp: Int = 56, iconRes: Int? = null, onClick: () -> Unit): LinearLayout =
        buttonRow(label, heightDp, ShellColors.blue600, null, ShellColors.white, ShellColors.blue700, iconRes, if (heightDp >= 56) 17f else 15f, onClick)

    /** The outlined button (Scan again, Cancel in a sheet). */
    fun outlineButton(label: String, heightDp: Int = 56, onClick: () -> Unit): LinearLayout =
        buttonRow(label, heightDp, ShellColors.white, ShellColors.slate300, ShellColors.slate700, ShellColors.slate100, null, if (heightDp >= 56) 17f else 15f, onClick)

    fun setEnabled(button: LinearLayout, enabled: Boolean) {
        button.isEnabled = enabled
        button.alpha = if (enabled) 1f else 0.5f
    }

    private fun buttonRow(
        label: String,
        heightDp: Int,
        fill: Int,
        stroke: Int?,
        textColor: Int,
        pressedColor: Int,
        iconRes: Int?,
        textSizeSp: Float,
        onClick: () -> Unit,
    ): LinearLayout = LinearLayout(context).apply {
        orientation = LinearLayout.HORIZONTAL
        gravity = Gravity.CENTER
        minimumHeight = dp(heightDp)
        pressable(this, rounded(fill, if (heightDp >= 56) 16f else 12f, stroke), pressedColor)
        if (iconRes != null) {
            addView(icon(iconRes, 24, textColor), LinearLayout.LayoutParams(dp(24), dp(24)).withEndMargin(dp(8)))
        }
        addView(text(label, textSizeSp, textColor, bold = true))
        contentDescription = label
        setOnClickListener { if (isEnabled) onClick() }
    }

    /** A 48dp round icon button (back arrow, close, ⋮). */
    fun iconButton(resId: Int, description: String, tint: Int, onClick: () -> Unit): FrameLayout = FrameLayout(context).apply {
        pressable(this, circle(Color.TRANSPARENT), ShellColors.slate100)
        contentDescription = description
        addView(icon(resId, 24, tint), FrameLayout.LayoutParams(dp(24), dp(24), Gravity.CENTER))
        setOnClickListener { onClick() }
        layoutParams = LinearLayout.LayoutParams(dp(48), dp(48))
    }

    /** The spinner of the connecting states. */
    fun spinner(sizeDp: Int): android.widget.ProgressBar = android.widget.ProgressBar(context).apply {
        isIndeterminate = true
        indeterminateTintList = ColorStateList.valueOf(ShellColors.blue600)
        layoutParams = LinearLayout.LayoutParams(dp(sizeDp), dp(sizeDp))
    }

    fun vertical(): LinearLayout = LinearLayout(context).apply { orientation = LinearLayout.VERTICAL }
    fun horizontal(): LinearLayout = LinearLayout(context).apply {
        orientation = LinearLayout.HORIZONTAL
        gravity = Gravity.CENTER_VERTICAL
    }

    fun divider(): View = View(context).apply {
        setBackgroundColor(ShellColors.slate100)
        layoutParams = LinearLayout.LayoutParams(match(), dp(1))
    }
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
