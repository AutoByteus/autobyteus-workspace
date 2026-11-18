#!/bin/bash
# Probe V2: SSH through a broker-held ssh-agent. Two throwaway sshd servers on 127.0.0.1 (run as the current user),
# one throwaway key loaded into an agent and then deleted from disk, restricted to server A with `ssh-add -h`.
# The "agent shell" gets only SSH_AUTH_SOCK. Expected: A connects, B is refused; the key is never readable.
set -u; D=$(mktemp -d)
for n in a b; do ssh-keygen -t ed25519 -N "" -f $D/host_$n -q; done
ssh-keygen -t ed25519 -N "" -C probe -f $D/k -q && cp $D/k.pub $D/ak && chmod 600 $D/ak
PA=$((20000 + RANDOM % 9000)); PB=$((30000 + RANDOM % 9000))
for n in a b; do P=$([ $n = a ] && echo $PA || echo $PB)
  printf "Port $P\nListenAddress 127.0.0.1\nHostKey $D/host_$n\nAuthorizedKeysFile $D/ak\nPasswordAuthentication no\nKbdInteractiveAuthentication no\nUsePAM no\nStrictModes no\nPidFile $D/$n.pid\n" > $D/c_$n
  /usr/sbin/sshd -f $D/c_$n -E $D/log_$n; done; sleep 1
printf "[127.0.0.1]:$PA $(cut -d' ' -f1,2 $D/host_a.pub)\n[127.0.0.1]:$PB $(cut -d' ' -f1,2 $D/host_b.pub)\n" > $D/kh
eval "$(ssh-agent -a $D/s)" >/dev/null
SSH_AUTH_SOCK=$D/s ssh-add -q -H $D/kh -h "[127.0.0.1]:$PA" $D/k; rm -f $D/k
echo "key on disk after load: $(ls $D | grep -cx k)"
echo "agent lists (public only): $(SSH_AUTH_SOCK=$D/s ssh-add -L | cut -c1-30)..."
for P in $PA $PB; do printf "port %s: " $P
  env -i PATH="$PATH" HOME="$(mktemp -d)" SSH_AUTH_SOCK=$D/s ssh -o BatchMode=yes -o UserKnownHostsFile=$D/kh -o StrictHostKeyChecking=yes -p $P 127.0.0.1 'echo connected' 2>&1 | tail -1; done
kill $(cat $D/a.pid) $(cat $D/b.pid) 2>/dev/null; SSH_AUTH_SOCK=$D/s ssh-agent -k >/dev/null 2>&1
