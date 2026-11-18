package org.autobyteus.mobile.shell

import android.Manifest
import android.app.Activity
import android.content.pm.PackageManager

/**
 * The camera permission in front of the Scan screen: the scanner opens once the app holds `CAMERA` (already declared;
 * no new permission), and a refusal is reported so the user can paste or type instead.
 */
class QrScanCoordinator(
    activity: Activity,
    private val onOpenScanner: () -> Unit,
    private val onPermissionDenied: () -> Unit,
    private val permissionController: PermissionController = AndroidCameraPermissionController(activity),
) {
    fun startQrScan() {
        if (permissionController.hasCameraPermission()) {
            onOpenScanner()
        } else {
            permissionController.requestCameraPermission(CAMERA_PERMISSION_REQUEST)
        }
    }

    fun handleRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray,
    ): Boolean {
        if (requestCode != CAMERA_PERMISSION_REQUEST) {
            return false
        }
        val cameraPermissionGranted = permissions.indices.any { index ->
            permissions[index] == Manifest.permission.CAMERA &&
                grantResults.getOrNull(index) == PackageManager.PERMISSION_GRANTED
        }
        if (cameraPermissionGranted) onOpenScanner() else onPermissionDenied()
        return true
    }

    interface PermissionController {
        fun hasCameraPermission(): Boolean
        fun requestCameraPermission(requestCode: Int)
    }

    private class AndroidCameraPermissionController(
        private val activity: Activity,
    ) : PermissionController {
        override fun hasCameraPermission(): Boolean =
            activity.checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED

        override fun requestCameraPermission(requestCode: Int) {
            activity.requestPermissions(arrayOf(Manifest.permission.CAMERA), requestCode)
        }
    }

    companion object {
        const val CAMERA_PERMISSION_REQUEST = 9003
    }
}
