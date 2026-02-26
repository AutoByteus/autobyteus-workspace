# Android Bootstrap (Termux + proot)

This flow is designed for low manual effort:

1. Plug Android phone into your computer (USB debugging enabled).
2. Run one host script to push payload + bootstrap script.
3. Run one command in Termux on phone.

## Prerequisites

- Phone has Termux installed (`com.termux`).
- `adb` is installed on your computer.
- USB debugging is enabled and authorized.

## Host command

Run from this repository:

```bash
bash autobyteus-server-ts/scripts/android/host_prepare_android_payload.sh
```

## Phone command (in Termux)

```bash
bash /sdcard/Download/autobyteus_termux_bootstrap.sh
```

## Verify from computer

```bash
adb shell 'run-as com.termux /data/data/com.termux/files/usr/bin/proot-distro login debian --shared-tmp -- /bin/bash -lc "curl -sS http://127.0.0.1:8000/rest/health"'
```

Startup can take ~20-40 seconds before health returns 200.

## Notes

- The bootstrap runs the server inside `proot-distro` Debian in a `tmux` session named `autobyteus-server`.
- It pins `pnpm@9`, runs Prisma generate for `autobyteus-server-ts/prisma/schema.prisma`, and creates a minimal `.env` if missing.
- To re-attach from Termux later:

```bash
~/autobyteus_attach_server.sh
```
