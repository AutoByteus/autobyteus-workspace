#!/bin/bash
# autobyteus-407 API/E2E: tap Gboard's on-screen keys (real touches through the system, so Gboard composes,
# suggests and auto-corrects as for a user). Key centres measured on a screenshot of this emulator
# (1080x2400, Gboard default QWERTY, portrait). Usage: gboard.sh <keys>  where a key is a letter,
# '_' = space, '<' = Backspace, '>' = Enter.
A=~/Library/Android/sdk/platform-tools/adb
pos() {
  case "$1" in
    q) echo 58 1716;; w) echo 164 1716;; e) echo 271 1716;; r) echo 378 1716;; t) echo 486 1716;;
    y) echo 593 1716;; u) echo 700 1716;; i) echo 808 1716;; o) echo 914 1716;; p) echo 1021 1716;;
    a) echo 110 1868;; s) echo 217 1868;; d) echo 325 1868;; f) echo 432 1868;; g) echo 539 1868;;
    h) echo 646 1868;; j) echo 754 1868;; k) echo 859 1868;; l) echo 967 1868;;
    z) echo 218 2026;; x) echo 325 2026;; c) echo 432 2026;; v) echo 539 2026;; b) echo 646 2026;;
    n) echo 754 2026;; m) echo 860 2026;; '<') echo 994 2026;;
    _) echo 593 2180;; '>') echo 994 2180;;
  esac
}
keys="$1"
for (( i=0; i<${#keys}; i++ )); do
  k="${keys:$i:1}"
  $A shell input tap $(pos "$k")
  sleep 0.35
done
echo "tapped keys: $keys"
