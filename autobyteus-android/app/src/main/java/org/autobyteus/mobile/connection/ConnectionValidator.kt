package org.autobyteus.mobile.connection

import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

class ConnectionValidator(
    private val connectTimeoutMs: Int = 5_000,
    private val readTimeoutMs: Int = 5_000,
) {
    fun validate(profile: SavedNodeProfile): ConnectionValidationResult = validate(profile.baseUrl, profile)

    fun validate(baseUrl: String, existingProfile: SavedNodeProfile? = null): ConnectionValidationResult {
        val normalized = try {
            NodeUrlNormalizer.normalize(baseUrl)
        } catch (error: NodeUrlNormalizationException) {
            return ConnectionValidationResult.Failed(ConnectionDiagnosticMapper.invalidUrl(error.message ?: "Invalid URL."))
        }

        val profile = existingProfile ?: SavedNodeProfile.fromNormalized(normalized)
        return try {
            val connection = (URL(normalized.statusUrl).openConnection() as HttpURLConnection).apply {
                requestMethod = "GET"
                connectTimeout = connectTimeoutMs
                readTimeout = readTimeoutMs
                setRequestProperty("Accept", "application/json")
            }
            val statusCode = connection.responseCode
            if (statusCode !in 200..299) {
                ConnectionValidationResult.Failed(ConnectionDiagnosticMapper.fromHttpStatus(statusCode))
            } else {
                val body = connection.inputStream.bufferedReader().use { it.readText() }
                val status = RemoteAccessStatus.fromJson(body)
                if (!status.phoneAccessEnabled) {
                    ConnectionValidationResult.Failed(ConnectionDiagnosticMapper.phoneAccessDisabled(status.serverName))
                } else {
                    ConnectionValidationResult.Reachable(profile, status)
                }
            }
        } catch (error: Throwable) {
            ConnectionValidationResult.Failed(ConnectionDiagnosticMapper.fromException(error))
        }
    }
}

data class RemoteAccessStatus(
    val phoneAccessEnabled: Boolean,
    val pairingAvailable: Boolean,
    val compatibilityVersion: Int,
    val serverName: String,
) {
    companion object {
        fun fromJson(jsonText: String): RemoteAccessStatus {
            val json = JSONObject(jsonText)
            return RemoteAccessStatus(
                phoneAccessEnabled = json.optBoolean("phoneAccessEnabled", false),
                pairingAvailable = json.optBoolean("pairingAvailable", false),
                compatibilityVersion = json.optInt("compatibilityVersion", 0),
                serverName = json.optString("serverName", "AutoByteus Desktop"),
            )
        }
    }
}

sealed class ConnectionValidationResult {
    data class Reachable(val profile: SavedNodeProfile, val status: RemoteAccessStatus) : ConnectionValidationResult()
    data class Failed(val diagnostic: ConnectionDiagnostic) : ConnectionValidationResult()
}
