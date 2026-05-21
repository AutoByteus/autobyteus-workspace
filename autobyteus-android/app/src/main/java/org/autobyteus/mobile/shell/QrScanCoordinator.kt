package org.autobyteus.mobile.shell

import android.Manifest
import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.Intent
import android.content.pm.PackageManager
import com.google.zxing.client.android.Intents
import com.journeyapps.barcodescanner.CaptureActivity
import org.autobyteus.mobile.connection.ConnectionDiagnostic
import org.autobyteus.mobile.connection.ConnectionDiagnosticMapper

class QrScanCoordinator(
    activity: Activity,
    private val onQrText: (String) -> Unit,
    private val onDiagnostic: (ConnectionDiagnostic) -> Unit,
    private val permissionController: PermissionController = AndroidCameraPermissionController(activity),
    private val scannerLauncher: ScannerLauncher = JourneyAppsScannerLauncher(activity),
) {
    fun startQrScan() {
        if (permissionController.hasCameraPermission()) {
            launchScanner()
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
        if (cameraPermissionGranted) {
            launchScanner()
        } else {
            onDiagnostic(ConnectionDiagnosticMapper.cameraPermissionDenied())
        }
        return true
    }

    fun handleActivityResult(requestCode: Int, resultCode: Int, data: Intent?): Boolean {
        if (requestCode != QR_SCAN_REQUEST) {
            return false
        }
        if (resultCode != Activity.RESULT_OK) {
            onDiagnostic(ConnectionDiagnosticMapper.qrScanCanceled())
            return true
        }
        val decodedText = data?.getStringExtra(SCAN_RESULT_EXTRA)?.trim().orEmpty()
        if (decodedText.isBlank()) {
            onDiagnostic(ConnectionDiagnosticMapper.qrScanCanceled())
        } else {
            onQrText(decodedText)
        }
        return true
    }

    private fun launchScanner() {
        try {
            scannerLauncher.launch(QR_SCAN_REQUEST)
        } catch (_: ActivityNotFoundException) {
            onDiagnostic(ConnectionDiagnosticMapper.qrScanUnavailable())
        } catch (_: SecurityException) {
            onDiagnostic(ConnectionDiagnosticMapper.cameraPermissionDenied())
        }
    }

    interface PermissionController {
        fun hasCameraPermission(): Boolean
        fun requestCameraPermission(requestCode: Int)
    }

    interface ScannerLauncher {
        fun launch(requestCode: Int)
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

    private class JourneyAppsScannerLauncher(
        private val activity: Activity,
    ) : ScannerLauncher {
        @Suppress("DEPRECATION")
        override fun launch(requestCode: Int) {
            val intent = Intent(activity, CaptureActivity::class.java).apply {
                action = Intents.Scan.ACTION
                putExtra(Intents.Scan.MODE, Intents.Scan.QR_CODE_MODE)
                putExtra(Intents.Scan.PROMPT_MESSAGE, "Scan the AutoByteus Phone Access QR")
                putExtra(Intents.Scan.BEEP_ENABLED, false)
                putExtra(Intents.Scan.ORIENTATION_LOCKED, false)
                putExtra(Intents.Scan.SHOW_MISSING_CAMERA_PERMISSION_DIALOG, false)
            }
            activity.startActivityForResult(intent, requestCode)
        }
    }

    companion object {
        const val QR_SCAN_REQUEST = 9001
        const val CAMERA_PERMISSION_REQUEST = 9003
        const val SCAN_RESULT_EXTRA = "SCAN_RESULT"
    }
}
