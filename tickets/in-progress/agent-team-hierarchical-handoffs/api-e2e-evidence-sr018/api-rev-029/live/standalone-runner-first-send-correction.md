# Standalone runner first-send correction

The first standalone automation attempt waited for a persisted run immediately after opening the `New` conversation shell. Current approved behavior promotes the immutable launch draft on the first user send, so no run existed yet. The automation was corrected to send first and then discover the fresh run. The initial attempt made no provider call and created no run; it is a harness ordering correction, not product evidence or a product failure.
