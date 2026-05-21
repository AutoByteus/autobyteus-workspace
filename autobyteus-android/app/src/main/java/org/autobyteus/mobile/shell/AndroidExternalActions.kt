package org.autobyteus.mobile.shell

import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import android.widget.Toast
import org.autobyteus.mobile.connection.ConnectionDiagnostic
import org.autobyteus.mobile.connection.ConnectionDiagnosticMapper

class AndroidExternalActions(
    private val activity: Activity,
    private val onDiagnostic: (ConnectionDiagnostic) -> Unit,
) {
    fun startQrScan() {
        val intent = Intent("com.google.zxing.client.android.SCAN").apply {
            putExtra("SCAN_MODE", "QR_CODE_MODE")
            putExtra("PROMPT_MESSAGE", "Scan the AutoByteus Phone Access QR")
        }
        try {
            activity.startActivityForResult(intent, QR_SCAN_REQUEST)
        } catch (_: ActivityNotFoundException) {
            onDiagnostic(
                ConnectionDiagnosticMapper.invalidUrl(
                    "No compatible QR scanner app is installed. Paste the Phone Access QR/link text instead.",
                ),
            )
        }
    }

    fun openTailscale() {
        val launchIntent = activity.packageManager.getLaunchIntentForPackage(TAILSCALE_PACKAGE)
        if (launchIntent != null) {
            activity.startActivity(launchIntent)
        } else {
            openExternal("https://tailscale.com/download/android")
        }
    }

    fun openExternal(url: String) {
        try {
            activity.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
        } catch (_: ActivityNotFoundException) {
            Toast.makeText(activity, "No app can open $url", Toast.LENGTH_LONG).show()
        }
    }

    companion object {
        const val QR_SCAN_REQUEST = 9001
        private const val TAILSCALE_PACKAGE = "com.tailscale.ipn"
    }
}
