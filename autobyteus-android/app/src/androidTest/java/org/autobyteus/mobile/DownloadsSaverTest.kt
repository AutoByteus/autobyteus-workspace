package org.autobyteus.mobile

import android.app.Activity
import android.content.ContentUris
import android.content.ContentValues
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.provider.MediaStore
import android.util.Base64
import androidx.test.core.app.ActivityScenario
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.autobyteus.mobile.connection.SavedNodeStore
import org.autobyteus.mobile.web.DownloadsSaver
import org.autobyteus.mobile.web.ShellBridgeAction
import org.junit.After
import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assume.assumeTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import java.util.UUID
import java.util.concurrent.LinkedBlockingQueue
import java.util.concurrent.TimeUnit

/**
 * autobyteus-472 REQ-004 on a real phone: the page's PDF or image is saved to Downloads under its name, and the app says
 * so; bytes that are not base64 are refused with "Couldn't save the file." The Save-dialog path (Android 8–9) is driven
 * on this phone too: its answer is given as the dialog would give it, after the activity was re-created, and a save
 * whose bytes were lost is refused. Every file this test saves is deleted afterwards.
 * Runs on a device or emulator: `./gradlew :app:connectedDebugAndroidTest`.
 */
@RunWith(AndroidJUnit4::class)
class DownloadsSaverTest {
    private val instrumentation = InstrumentationRegistry.getInstrumentation()
    private val resolver get() = instrumentation.targetContext.contentResolver
    private val shown = LinkedBlockingQueue<String>()
    private val created = mutableListOf<Uri>()
    private val tag = UUID.randomUUID().toString().take(8)
    private val pdfBytes = "%PDF-1.4 autobyteus-472 $tag".toByteArray()

    @Before
    fun startOnTheStartScreen() {
        SavedNodeStore(instrumentation.targetContext).clear()
    }

    @After
    fun deleteWhatThisTestSaved() {
        created.forEach { resolver.delete(it, null, null) }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) downloadsNamed("%$tag%").forEach { resolver.delete(it, null, null) }
    }

    private fun request(name: String, base64: String = Base64.encodeToString(pdfBytes, Base64.NO_WRAP)) =
        ShellBridgeAction.SaveFile(name, "application/pdf", base64)

    private fun next(): String = shown.poll(15, TimeUnit.SECONDS) ?: error("no message shown")

    private fun downloadsNamed(pattern: String): List<Uri> {
        val uris = mutableListOf<Uri>()
        resolver.query(
            MediaStore.Downloads.EXTERNAL_CONTENT_URI, arrayOf(MediaStore.MediaColumns._ID),
            "${MediaStore.MediaColumns.DISPLAY_NAME} LIKE ?", arrayOf(pattern), null,
        )?.use { cursor -> while (cursor.moveToNext()) uris += ContentUris.withAppendedId(MediaStore.Downloads.EXTERNAL_CONTENT_URI, cursor.getLong(0)) }
        return uris
    }

    private fun bytesOf(uri: Uri): ByteArray = resolver.openInputStream(uri)!!.use { it.readBytes() }

    @Test
    fun savesAPdfToDownloadsUnderItsNameAndSaysSo() {
        assumeTrue(Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q)
        ActivityScenario.launch(MainActivity::class.java).use { scenario ->
            lateinit var saver: DownloadsSaver
            scenario.onActivity { saver = DownloadsSaver(it, show = { message -> shown.add(message) }, throughSaveDialog = false) }
            saver.save(request("resume-$tag.pdf"))
            assertEquals("Saved to Downloads: resume-$tag.pdf", next())
            val saved = downloadsNamed("resume-$tag.pdf")
            assertEquals(1, saved.size)
            assertArrayEquals(pdfBytes, bytesOf(saved.single()))
            resolver.query(saved.single(), arrayOf(MediaStore.MediaColumns.MIME_TYPE, MediaStore.MediaColumns.RELATIVE_PATH, MediaStore.MediaColumns.IS_PENDING), null, null, null)!!.use {
                it.moveToFirst()
                assertEquals("application/pdf", it.getString(0))
                assertEquals("${Environment.DIRECTORY_DOWNLOADS}/", it.getString(1))
                assertEquals(0, it.getInt(2))
            }
            // The same name again: Downloads gives the copy its own name, and the message says which.
            saver.save(request("resume-$tag.pdf"))
            val second = next()
            assertEquals(true, second.startsWith("Saved to Downloads: resume-$tag"))
            assertEquals(2, downloadsNamed("resume-$tag%.pdf").size)
            saver.close()
        }
    }

    @Test
    fun refusesBytesThatAreNotBase64AndSavesNothing() {
        assumeTrue(Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q)
        ActivityScenario.launch(MainActivity::class.java).use { scenario ->
            lateinit var saver: DownloadsSaver
            scenario.onActivity { saver = DownloadsSaver(it, show = { message -> shown.add(message) }, throughSaveDialog = false) }
            saver.save(request("broken-$tag.pdf", base64 = "%%% not base64 %%%"))
            assertEquals("Couldn't save the file.", next())
            assertEquals(0, downloadsNamed("broken-$tag%").size)
            saver.close()
        }
    }

    @Test
    fun theSaveDialogPathFinishesAfterTheActivityIsRecreatedAndRefusesALostSave() {
        assumeTrue(Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q)
        // Where the Save dialog would put the file: an entry in Downloads made here, as the dialog's answer.
        val target = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, ContentValues().apply {
            put(MediaStore.MediaColumns.DISPLAY_NAME, "dialog-$tag.pdf")
            put(MediaStore.MediaColumns.MIME_TYPE, "application/pdf")
        })!!.also { created += it }
        ActivityScenario.launch(MainActivity::class.java).use { scenario ->
            val state = Bundle()
            lateinit var first: DownloadsSaver
            scenario.onActivity { first = DownloadsSaver(it, show = { message -> shown.add(message) }, throughSaveDialog = true) }
            first.save(request("dialog-$tag.pdf"))
            // The dialog opens with the file's name; the activity is re-created before it answers.
            Thread.sleep(1500)
            scenario.onActivity {
                it.finishActivity(DownloadsSaver.REQUEST_CODE)
                first.saveState(state)
            }
            first.close()
            lateinit var second: DownloadsSaver
            scenario.onActivity {
                second = DownloadsSaver(it, show = { message -> shown.add(message) }, throughSaveDialog = true)
                second.restoreState(state)
                assertEquals(true, second.handleActivityResult(DownloadsSaver.REQUEST_CODE, Activity.RESULT_OK, Intent().setData(target)))
            }
            assertEquals("Saved to Downloads: dialog-$tag.pdf", next())
            assertArrayEquals(pdfBytes, bytesOf(target))

            // A dialog answer whose save was lost (no state kept): nothing is written, the app says so.
            lateinit var third: DownloadsSaver
            scenario.onActivity {
                third = DownloadsSaver(it, show = { message -> shown.add(message) }, throughSaveDialog = true)
                third.restoreState(null)
                third.handleActivityResult(DownloadsSaver.REQUEST_CODE, Activity.RESULT_OK, Intent().setData(target))
            }
            assertEquals("Couldn't save the file.", next())
            // Cancel shows nothing.
            scenario.onActivity { third.handleActivityResult(DownloadsSaver.REQUEST_CODE, Activity.RESULT_CANCELED, null) }
            assertNull(shown.poll(1, TimeUnit.SECONDS))
            second.close()
            third.close()
        }
    }
}
