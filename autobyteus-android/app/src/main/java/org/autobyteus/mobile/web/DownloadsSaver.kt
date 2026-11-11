package org.autobyteus.mobile.web

import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.ContentValues
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.provider.MediaStore
import android.provider.OpenableColumns
import android.util.Base64
import android.widget.Toast
import androidx.annotation.RequiresApi
import java.io.File
import java.util.UUID
import java.util.concurrent.Executor
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

/**
 * Saves a file the page handed over (autobyteus-472 DS-003, [ShellBridgeAction.SaveFile]) to the phone's Downloads
 * and shows the result: "Saved to Downloads: <name>" or "Couldn't save the file.".
 * - Android 10 and newer: written straight into the Downloads collection (`MediaStore.Downloads`, pending until
 *   complete), with no permission.
 * - Android 8–9: the system's Save dialog (`ACTION_CREATE_DOCUMENT`) with the file's name; the bytes wait in the
 *   app's cache until the dialog returns, so a re-created activity (a rotation, or Android ending the app in the
 *   background) still finishes the save; a save whose bytes were lost says it could not be saved. Cancel shows
 *   nothing.
 * Base64 is decoded and the file written off the main thread. Neither the bytes nor the name are logged.
 */
class DownloadsSaver(
    private val activity: Activity,
    private val mainThread: Executor = Executor { activity.runOnUiThread(it) },
    private val show: (String) -> Unit = { Toast.makeText(activity, it, Toast.LENGTH_LONG).show() },
    /** Whether saves go through the Save dialog: Android 8–9 (a test also drives this path on a newer phone). */
    private val throughSaveDialog: Boolean = Build.VERSION.SDK_INT < Build.VERSION_CODES.Q,
) {
    private val worker: ExecutorService = Executors.newSingleThreadExecutor()
    /** Android 8–9: the save waiting for the Save dialog. */
    private var pending: PendingSave? = null

    private data class PendingSave(val cachePath: String, val fileName: String, val mimeType: String)

    fun save(file: ShellBridgeAction.SaveFile) {
        if (!throughSaveDialog && Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) saveToDownloads(file) else saveThroughDialog(file)
    }

    @RequiresApi(Build.VERSION_CODES.Q)
    private fun saveToDownloads(file: ShellBridgeAction.SaveFile) = worker.execute {
        val saved = runCatching {
            val bytes = decode(file.base64)
            val resolver = activity.contentResolver
            val values = ContentValues().apply {
                put(MediaStore.MediaColumns.DISPLAY_NAME, file.fileName)
                put(MediaStore.MediaColumns.MIME_TYPE, file.mimeType)
                put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS)
                put(MediaStore.MediaColumns.IS_PENDING, 1)
            }
            val uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values) ?: error("no Downloads entry")
            try {
                resolver.openOutputStream(uri)?.use { it.write(bytes) } ?: error("no output")
                resolver.update(uri, ContentValues().apply { put(MediaStore.MediaColumns.IS_PENDING, 0) }, null, null)
            } catch (failure: Exception) {
                resolver.delete(uri, null, null)
                throw failure
            }
            // Downloads may give it another name when the name is taken ("resume (1).pdf").
            displayName(uri) ?: file.fileName
        }
        report(saved)
    }

    private fun saveThroughDialog(file: ShellBridgeAction.SaveFile) = worker.execute {
        val prepared = runCatching {
            val bytes = decode(file.base64)
            val cache = File(cacheDir().apply { mkdirs() }, UUID.randomUUID().toString())
            cache.writeBytes(bytes)
            PendingSave(cache.path, file.fileName, file.mimeType)
        }
        mainThread.execute {
            prepared.fold(onSuccess = ::openSaveDialog, onFailure = { show(FAILED) })
        }
    }

    private fun openSaveDialog(save: PendingSave) {
        discard(pending)
        pending = save
        val intent = Intent(Intent.ACTION_CREATE_DOCUMENT)
            .addCategory(Intent.CATEGORY_OPENABLE)
            .setType(save.mimeType)
            .putExtra(Intent.EXTRA_TITLE, save.fileName)
        try {
            @Suppress("DEPRECATION")
            activity.startActivityForResult(intent, REQUEST_CODE)
        } catch (_: ActivityNotFoundException) {
            discard(pending)
            pending = null
            show(FAILED)
        }
    }

    /** The Save dialog's answer (Android 8–9); `false` for another request. */
    fun handleActivityResult(requestCode: Int, resultCode: Int, data: Intent?): Boolean {
        if (requestCode != REQUEST_CODE) return false
        val save = pending
        pending = null
        val target = data?.data
        if (resultCode != Activity.RESULT_OK || target == null) {
            discard(save)
            return true
        }
        if (save == null) {
            show(FAILED)
            return true
        }
        worker.execute {
            val saved = runCatching {
                val cache = File(save.cachePath)
                try {
                    cache.inputStream().use { input ->
                        activity.contentResolver.openOutputStream(target)?.use { input.copyTo(it) } ?: error("no output")
                    }
                } finally {
                    cache.delete()
                }
                displayName(target) ?: save.fileName
            }
            report(saved)
        }
        return true
    }

    /** Keeps the save waiting for the Save dialog across a re-created activity. */
    fun saveState(outState: Bundle) {
        val save = pending ?: return
        outState.putString(KEY_CACHE_PATH, save.cachePath)
        outState.putString(KEY_FILE_NAME, save.fileName)
        outState.putString(KEY_MIME_TYPE, save.mimeType)
    }

    /** Takes back the save waiting for the Save dialog; bytes left by any other save are removed. */
    fun restoreState(savedInstanceState: Bundle?) {
        val path = savedInstanceState?.getString(KEY_CACHE_PATH)
        val name = savedInstanceState?.getString(KEY_FILE_NAME)
        val mime = savedInstanceState?.getString(KEY_MIME_TYPE)
        pending = if (path != null && name != null && mime != null && File(path).exists()) PendingSave(path, name, mime) else null
        val keep = pending?.cachePath
        worker.execute { cacheDir().listFiles()?.filter { it.path != keep }?.forEach { it.delete() } }
    }

    fun close() {
        worker.shutdown()
    }

    private fun report(saved: Result<String>) = mainThread.execute {
        show(saved.fold(onSuccess = { "$SAVED_PREFIX$it" }, onFailure = { FAILED }))
    }

    private fun discard(save: PendingSave?) {
        save ?: return
        worker.execute { File(save.cachePath).delete() }
    }

    private fun cacheDir() = File(activity.cacheDir, CACHE_FOLDER)

    private fun displayName(uri: Uri): String? = runCatching {
        activity.contentResolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { cursor ->
            if (cursor.moveToFirst()) cursor.getString(0) else null
        }
    }.getOrNull()?.takeIf { it.isNotBlank() }

    companion object {
        const val REQUEST_CODE = 9003
        const val SAVED_PREFIX = "Saved to Downloads: "
        const val FAILED = "Couldn't save the file."
        private const val CACHE_FOLDER = "pending-saves"
        private const val KEY_CACHE_PATH = "downloadsSaver.cachePath"
        private const val KEY_FILE_NAME = "downloadsSaver.fileName"
        private const val KEY_MIME_TYPE = "downloadsSaver.mimeType"

        /** The bytes of a save request; an empty or malformed one is refused. */
        fun decode(base64: String): ByteArray = Base64.decode(base64, Base64.DEFAULT).also { require(it.isNotEmpty()) }
    }
}
