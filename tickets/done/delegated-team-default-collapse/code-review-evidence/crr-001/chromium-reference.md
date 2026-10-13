# Supplemental primary-source corroboration

Fetched 2026-10-13 from Chromium’s version-pinned source:
https://chromium.googlesource.com/chromium/src/+/refs/tags/148.0.7778.265/services/network/url_loader.cc

`URLLoader::OnResponseStarted` calls `mojo::CreateDataPipe` for the response body and reports `ERR_INSUFFICIENT_RESOURCES` if allocation fails (lines 1227–1237). This is consistent with the observed shared-memory-capacity A/B result; the actual failing syscall/stack was not instrumented. Attribution rests on the independent native capacity intervention and measurements, not solely this code or error name.

No assertion that every ERR_INSUFFICIENT_RESOURCES has this cause, or that the user’s environment is the same.
