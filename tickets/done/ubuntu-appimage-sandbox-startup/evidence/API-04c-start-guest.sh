#!/bin/bash
set -euo pipefail
R=$(cat /home/ryan-ai/hdd_drive/autobyteus_org/api-e2e-autobyteus-5/active-continuation)
V=/tmp/autobyteus-5-vm; Q="$V/tools/root"; ver=$1; port=$2; d="$R/os-$ver"
cd "$d"; IMG=$(find . -name "ubuntu-*-server-cloudimg-amd64.img" -print -quit)
test -f "$IMG"; grep 'server-cloudimg-amd64\.img$' SHA256SUMS |sha256sum -c -
export LD_LIBRARY_PATH="$Q/usr/lib/x86_64-linux-gnu"
"$Q/usr/bin/qemu-img" create -q -f qcow2 -F qcow2 -b "$(realpath "$IMG")" "$d/os.qcow2" 12G
mkdir -m 700 "$d/seed"; cp "$V/seed/user-data" "$d/seed/user-data"; printf 'instance-id: ab5-validation-%s\nlocal-hostname: ab5-guest\n' "$ver" >"$d/seed/meta-data"
"$Q/usr/bin/qemu-system-x86_64" -machine accel=kvm -cpu host -smp 2 -m 4096 -L "$Q/usr/share/qemu" -bios "$Q/usr/share/seabios/bios-256k.bin" -vga none -drive file="$d/os.qcow2",if=none,id=system,format=qcow2 -device virtio-blk-pci,drive=system,bootindex=1 -blockdev "driver=vvfat,dir=$d/seed,label=cidata,read-only=on,node-name=cidata" -device virtio-blk-pci,drive=cidata -netdev "user,id=n,hostfwd=tcp:127.0.0.1:$port-:22" -device virtio-net-pci,netdev=n,romfile= -display none -serial file:"$d/serial.log" -qmp unix:"$d/qmp.sock",server=on,wait=off -pidfile "$d/guest.pid" -daemonize
cat >"$d/ss" <<END
#!/bin/bash
exec ssh -i "$V/guest-key" -o ConnectTimeout=6 -o BatchMode=yes -o StrictHostKeyChecking=accept-new -o LogLevel=ERROR -o UserKnownHostsFile="$d/known_hosts" -p$port witness@127.0.0.1 "\$@"
END
chmod +x "$d/ss"; timeout 220 bash -c 'until "$0/ss" true </dev/null 2>/dev/null; do sleep 2;done' "$d"
"$d/ss" 'cloud-init status --wait || test "$?" = 2; cat /etc/os-release | head -4; uname -m' </dev/null
pkg=libasound2
if [[ $ver == 26.04 ]];then pkg=libasound2t64;fi
{ cat "$V/guest-password";echo; } |"$d/ss" "sudo -S -p '' bash -c 'DEBIAN_FRONTEND=noninteractive apt-get update -qq && DEBIAN_FRONTEND=noninteractive apt-get install -qy xvfb openbox policykit-1-gnome zenity xdotool imagemagick dbus-x11 libnss3 $pkg libgbm1 libxss1 libxtst6 libfuse2'" >"$d/packages.log" 2>&1
echo "$ver guest ready"
