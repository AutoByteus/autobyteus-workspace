package org.autobyteus.mobile.shell

import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import android.widget.Toast

class AndroidExternalActions(
    private val activity: Activity,
) {
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
        private const val TAILSCALE_PACKAGE = "com.tailscale.ipn"
    }
}
