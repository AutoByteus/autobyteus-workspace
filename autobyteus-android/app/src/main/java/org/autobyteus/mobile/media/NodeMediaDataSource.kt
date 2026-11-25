package org.autobyteus.mobile.media

import android.net.Uri
import androidx.annotation.OptIn
import androidx.media3.common.C
import androidx.media3.common.PlaybackException
import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.BaseDataSource
import androidx.media3.datasource.DataSource
import androidx.media3.datasource.DataSourceException
import androidx.media3.datasource.DataSpec
import androidx.media3.datasource.HttpDataSource
import java.io.EOFException
import java.io.IOException
import java.io.InputStream

/**
 * Media3's reader of one node video or audio file (autobyteus-574 D-3): each read is a byte range through
 * [NodeMediaHttp] (the credential in the header, to the node's origin only, no redirect). [version] is the file's ETag at the start of the
 * playback: a range is asked with `If-Range`, so a file changed meanwhile answers 200 and the read fails loudly instead
 * of mixing two versions' bytes.
 */
@OptIn(UnstableApi::class)
class NodeMediaDataSource(
    private val http: NodeMediaHttp,
    private val version: String?,
) : BaseDataSource(/* isNetwork= */ true) {
    class Factory(private val http: NodeMediaHttp, private val version: String?) : DataSource.Factory {
        override fun createDataSource(): DataSource = NodeMediaDataSource(http, version)
    }

    private var uri: Uri? = null
    private var response: NodeMediaHttp.Response? = null
    private var body: InputStream? = null
    private var bytesRemaining: Long = C.LENGTH_UNSET.toLong()
    private var opened = false

    override fun open(dataSpec: DataSpec): Long {
        uri = dataSpec.uri
        transferInitializing(dataSpec)
        val length = dataSpec.length.takeIf { it != C.LENGTH_UNSET.toLong() }
        val answer = try {
            http.open(dataSpec.uri.toString(), dataSpec.position, length, ifRange = version?.takeIf { dataSpec.position > 0 })
        } catch (error: IOException) {
            throw HttpDataSource.HttpDataSourceException.createForIOException(error, dataSpec, HttpDataSource.HttpDataSourceException.TYPE_OPEN)
        }
        response = answer
        when (answer.status) {
            206 -> bytesRemaining = answer.contentLength ?: rangeLength(answer.contentRange)
            200 -> {
                if (dataSpec.position > 0) {
                    // The file is no longer the version this playback started with (If-Range did not match).
                    throw invalidResponse(answer, dataSpec)
                }
                bytesRemaining = listOfNotNull(answer.contentLength, length).minOrNull() ?: C.LENGTH_UNSET.toLong()
            }
            416 -> {
                if (answer.contentRange?.size == dataSpec.position) {
                    bytesRemaining = 0
                } else {
                    closeQuietly()
                    throw DataSourceException(PlaybackException.ERROR_CODE_IO_READ_POSITION_OUT_OF_RANGE)
                }
            }
            else -> throw invalidResponse(answer, dataSpec)
        }
        body = answer.body
        opened = true
        transferStarted(dataSpec)
        return bytesRemaining
    }

    override fun read(buffer: ByteArray, offset: Int, length: Int): Int {
        if (length == 0) return 0
        if (bytesRemaining == 0L) return C.RESULT_END_OF_INPUT
        val toRead = if (bytesRemaining == C.LENGTH_UNSET.toLong()) length else minOf(length.toLong(), bytesRemaining).toInt()
        val read = body?.read(buffer, offset, toRead) ?: -1
        if (read == -1) {
            if (bytesRemaining != C.LENGTH_UNSET.toLong()) throw EOFException()
            return C.RESULT_END_OF_INPUT
        }
        if (bytesRemaining != C.LENGTH_UNSET.toLong()) bytesRemaining -= read
        bytesTransferred(read)
        return read
    }

    override fun getUri(): Uri? = uri

    override fun getResponseHeaders(): Map<String, List<String>> = response?.headers.orEmpty()

    override fun close() {
        closeQuietly()
        uri = null
        if (opened) {
            opened = false
            transferEnded()
        }
    }

    private fun closeQuietly() {
        runCatching { response?.close() }
        response = null
        body = null
    }

    private fun rangeLength(range: NodeMediaHttp.ContentRange?): Long {
        val first = range?.first ?: return C.LENGTH_UNSET.toLong()
        val last = range.last ?: return C.LENGTH_UNSET.toLong()
        return last - first + 1
    }

    private fun invalidResponse(answer: NodeMediaHttp.Response, dataSpec: DataSpec): HttpDataSource.InvalidResponseCodeException {
        val headers = answer.headers
        closeQuietly()
        return HttpDataSource.InvalidResponseCodeException(answer.status, null, null, headers, dataSpec, ByteArray(0))
    }
}
