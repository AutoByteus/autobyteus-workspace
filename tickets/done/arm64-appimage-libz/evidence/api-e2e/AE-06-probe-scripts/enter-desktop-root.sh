#!/bin/bash
# As root on the host: private mount + PID namespace, pivot_root into the clean desktop root (so the kernel allows
# unprivileged user namespaces for Chromium's sandbox, as on a desktop; a plain chroot would refuse CLONE_NEWUSER),
# then drop to uid 1000 and run /probe/run.sh. Everything started inside dies with the PID namespace.
set -euo pipefail
R=/tmp/ae28/desktop-root
export SESSION=${SESSION:-}
exec unshare --mount --pid --fork --propagation private /bin/bash -c '
set -e; R='"$R"'
mount --bind $R $R
mount -t proc proc $R/proc
mount --rbind /dev $R/dev
mount --rbind /sys $R/sys
mount -t tmpfs -o mode=1777 tmpfs $R/tmp; mkdir -m 1777 $R/tmp/.X11-unix
mount --bind /tmp/ae28/out $R/out
cd $R; mkdir -p .oldroot; pivot_root . .oldroot; umount -l /.oldroot; rmdir /.oldroot; cd /
exec setpriv --reuid 1000 --regid 1000 --init-groups env -i SESSION=${SESSION:-} HOME=/home/tester USER=tester LOGNAME=tester PATH=/usr/local/bin:/usr/bin:/bin LANG=C.UTF-8 XDG_RUNTIME_DIR=/home/tester/.run /bin/bash /probe/run.sh
'
