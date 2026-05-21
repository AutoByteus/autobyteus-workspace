package org.autobyteus.mobile.web

import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class FileChooserRequestPolicyTest {
    @Test
    fun defaultsToAnyMimeTypeForEmptyAcceptList() {
        val spec = FileChooserRequestPolicy.fromAcceptTypes(emptyArray(), allowMultiple = false)

        assertEquals("*/*", spec.primaryMimeType)
        assertArrayEquals(emptyArray<String>(), spec.extraMimeTypes)
        assertFalse(spec.allowMultiple)
    }

    @Test
    fun preservesSingleMimeAcceptType() {
        val spec = FileChooserRequestPolicy.fromAcceptTypes(arrayOf(" image/* "), allowMultiple = false)

        assertEquals("image/*", spec.primaryMimeType)
        assertArrayEquals(emptyArray<String>(), spec.extraMimeTypes)
    }

    @Test
    fun splitsAndDeduplicatesMultipleMimeTypes() {
        val spec = FileChooserRequestPolicy.fromAcceptTypes(
            arrayOf("image/*, application/pdf", "IMAGE/*", ".ignored-extension"),
            allowMultiple = true,
        )

        assertEquals("*/*", spec.primaryMimeType)
        assertArrayEquals(arrayOf("image/*", "application/pdf"), spec.extraMimeTypes)
        assertTrue(spec.allowMultiple)
    }
}
