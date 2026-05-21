package org.autobyteus.mobile.web

data class FileChooserRequestSpec(
    val primaryMimeType: String,
    val extraMimeTypes: Array<String>,
    val allowMultiple: Boolean,
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (other !is FileChooserRequestSpec) return false
        return primaryMimeType == other.primaryMimeType &&
            extraMimeTypes.contentEquals(other.extraMimeTypes) &&
            allowMultiple == other.allowMultiple
    }

    override fun hashCode(): Int {
        var result = primaryMimeType.hashCode()
        result = 31 * result + extraMimeTypes.contentHashCode()
        result = 31 * result + allowMultiple.hashCode()
        return result
    }
}

object FileChooserRequestPolicy {
    fun fromAcceptTypes(acceptTypes: Array<String>?, allowMultiple: Boolean): FileChooserRequestSpec {
        val normalized = acceptTypes.orEmpty()
            .flatMap { it.split(',') }
            .map { it.trim().lowercase() }
            .filter { it.isNotBlank() && isMimeTypeLike(it) }
            .distinct()
        val primary = normalized.firstOrNull() ?: ANY_MIME_TYPE
        return FileChooserRequestSpec(
            primaryMimeType = if (normalized.size == 1) primary else ANY_MIME_TYPE,
            extraMimeTypes = if (normalized.size > 1) normalized.toTypedArray() else emptyArray(),
            allowMultiple = allowMultiple,
        )
    }

    private fun isMimeTypeLike(value: String): Boolean = value == ANY_MIME_TYPE ||
        value.endsWith("/*") ||
        MIME_TYPE_REGEX.matches(value)

    private const val ANY_MIME_TYPE = "*/*"
    private val MIME_TYPE_REGEX = Regex("^[a-z0-9.+-]+/[a-z0-9.+*-]+$")
}
