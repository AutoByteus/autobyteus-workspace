#!/bin/bash
# Runs as the non-root user inside the clean root (after pivot_root). Owns the Xvfb display for the whole session.
mkdir -p "$HOME/.run"; chmod 700 "$HOME/.run"
echo "id: $(id)"; echo "root fs: $(cat /etc/os-release | grep PRETTY)"; echo "libz.so present: $(ls /usr/lib/aarch64-linux-gnu/libz.so 2>/dev/null || echo no)"
echo "userns probe (unshare --user --map-root-user true): $(unshare --user --map-root-user true 2>&1 && echo ok)"
echo "/dev/fuse: $(ls /dev/fuse 2>&1)"
xvfb-run -n 187 -e /out/xvfb.log -s "-screen 0 1600x1000x24 -nolisten tcp" /bin/bash ${SESSION:-/probe/session.sh}
echo "xvfb-run exit=$?"
