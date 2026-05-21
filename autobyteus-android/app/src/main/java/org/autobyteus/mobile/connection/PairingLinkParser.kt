package org.autobyteus.mobile.connection

import java.net.URI
import java.net.URLDecoder
import java.nio.charset.StandardCharsets
import java.util.Base64

data class PairingPayload(
    val serverBaseUrl: String,
    val pairingCode: String,
    val serverName: String?,
)

data class ParsedPairingInput(
    val profile: SavedNodeProfile,
    val webViewUrl: String,
    val hasPairingPayload: Boolean,
)

object PairingLinkParser {
    fun parse(rawText: String): ParsedPairingInput {
        val text = rawText.trim()
        if (text.isEmpty()) {
            throw NodeUrlNormalizationException("Paste a Phone Access link, pairing payload, or node URL.")
        }

        val urlCandidate = if (text.startsWith("{")) null else extractUrl(text)
        if (urlCandidate != null) {
            return parseUrl(urlCandidate)
        }

        val payload = try {
            parsePairingPayload(text)
        } catch (_: NodeUrlNormalizationException) {
            val normalized = NodeUrlNormalizer.normalize(text)
            return ParsedPairingInput(
                profile = SavedNodeProfile.fromNormalized(normalized),
                webViewUrl = normalized.mobileUrl,
                hasPairingPayload = false,
            )
        }
        val encoded = encodePairingPayload(text, payload)
        val normalized = NodeUrlNormalizer.normalize(payload.serverBaseUrl)
        val profile = SavedNodeProfile.fromNormalized(
            normalized,
            displayName = payload.serverName,
            httpAcknowledged = normalized.scheme == "https",
        )
        return ParsedPairingInput(
            profile = profile,
            webViewUrl = "${normalized.mobileUrl}?pairing=$encoded",
            hasPairingPayload = true,
        )
    }

    private fun parseUrl(url: String): ParsedPairingInput {
        val uri = URI(url)
        val query = parseQuery(uri.rawQuery)
        val pairingParam = query["pairing"]
        if (!pairingParam.isNullOrBlank()) {
            val payload = parsePairingPayload(pairingParam)
            val normalized = NodeUrlNormalizer.normalize(payload.serverBaseUrl)
            val profile = SavedNodeProfile.fromNormalized(
                normalized,
                displayName = payload.serverName,
                httpAcknowledged = normalized.scheme == "https",
            )
            return ParsedPairingInput(
                profile = profile,
                webViewUrl = "${normalized.mobileUrl}?pairing=$pairingParam",
                hasPairingPayload = true,
            )
        }

        val normalized = NodeUrlNormalizer.normalize(url)
        return ParsedPairingInput(
            profile = SavedNodeProfile.fromNormalized(normalized),
            webViewUrl = normalized.mobileUrl,
            hasPairingPayload = false,
        )
    }

    fun parsePairingPayload(rawPayload: String): PairingPayload {
        val trimmed = rawPayload.trim()
        val json = when {
            trimmed.startsWith("{") -> trimmed
            else -> decodeBase64Url(trimmed)
        }
        val serverBaseUrl = extractJsonString(json, "serverBaseUrl")
            ?: throw NodeUrlNormalizationException("Pairing payload is missing serverBaseUrl.")
        val pairingCode = extractJsonString(json, "pairingCode")
            ?: throw NodeUrlNormalizationException("Pairing payload is missing pairingCode.")
        val serverName = extractJsonString(json, "serverName")
        return PairingPayload(serverBaseUrl, pairingCode, serverName)
    }

    private fun encodePairingPayload(raw: String, payload: PairingPayload): String {
        val trimmed = raw.trim()
        if (!trimmed.startsWith("{")) {
            return trimmed
        }
        return Base64.getUrlEncoder()
            .withoutPadding()
            .encodeToString(trimmed.toByteArray(StandardCharsets.UTF_8))
    }

    private fun decodeBase64Url(value: String): String {
        return try {
            String(Base64.getUrlDecoder().decode(value), StandardCharsets.UTF_8)
        } catch (error: IllegalArgumentException) {
            throw NodeUrlNormalizationException("Pairing payload must be a Phone Access URL, base64url payload, or JSON payload.")
        }
    }

    private fun parseQuery(rawQuery: String?): Map<String, String> {
        if (rawQuery.isNullOrBlank()) {
            return emptyMap()
        }
        return rawQuery.split('&')
            .mapNotNull { part ->
                val idx = part.indexOf('=')
                if (idx < 0) return@mapNotNull null
                val key = URLDecoder.decode(part.substring(0, idx), StandardCharsets.UTF_8.name())
                val value = URLDecoder.decode(part.substring(idx + 1), StandardCharsets.UTF_8.name())
                key to value
            }
            .toMap()
    }

    private fun extractUrl(text: String): String? {
        val direct = text.takeIf { URL_PREFIX.containsMatchIn(it) }
        if (direct != null) {
            return direct
        }
        return URL_IN_TEXT.find(text)?.value
    }

    private fun extractJsonString(json: String, key: String): String? {
        val regex = Regex("\\\"${Regex.escape(key)}\\\"\\s*:\\s*\\\"((?:\\\\.|[^\\\"])*)\\\"")
        val match = regex.find(json) ?: return null
        return unescapeJsonString(match.groupValues[1])
    }

    private fun unescapeJsonString(value: String): String = buildString {
        var index = 0
        while (index < value.length) {
            val char = value[index]
            if (char != '\\' || index == value.lastIndex) {
                append(char)
                index += 1
                continue
            }
            val escaped = value[index + 1]
            when (escaped) {
                '"', '\\', '/' -> append(escaped)
                'b' -> append('\b')
                'f' -> append('\u000C')
                'n' -> append('\n')
                'r' -> append('\r')
                't' -> append('\t')
                'u' -> {
                    val hex = value.substring(index + 2, index + 6)
                    append(hex.toInt(16).toChar())
                    index += 4
                }
                else -> append(escaped)
            }
            index += 2
        }
    }

    private val URL_PREFIX = Regex("^https?://", RegexOption.IGNORE_CASE)
    private val URL_IN_TEXT = Regex("https?://[^\\s<>\"']+", RegexOption.IGNORE_CASE)
}
