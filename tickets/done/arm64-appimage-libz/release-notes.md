# Release Notes — The Linux ARM64 AppImage Starts On A Stock Desktop

## Fixed
- The Linux ARM64 AppImage starts on a standard desktop installation again. Earlier ARM64 AppImages stopped right away with `error while loading shared libraries: libz.so` unless zlib's development package (`zlib1g-dev`) was installed. The new AppImage needs no extra system package for this.
- The ARM64 AppImage no longer needs `libfuse2`. It mounts with FUSE 3 (`fusermount3`), which current desktop distributions install by default.

## Notes
- The Linux x64 AppImage is unchanged. It was not affected.
- Releases now check every Linux AppImage on a clean system image before publishing, so a build that cannot start on a standard system is not released.
- Without FUSE, you can still start the ARM64 AppImage with `--appimage-extract-and-run`. It then leaves a copy of the extracted app (about 1.2 GB) in your temporary folder (`$TMPDIR/appimage_extracted_*`) after you quit. A later start of the same version reuses it. To avoid that copy, extract once with `--appimage-extract` and start `squashfs-root/AppRun`.
