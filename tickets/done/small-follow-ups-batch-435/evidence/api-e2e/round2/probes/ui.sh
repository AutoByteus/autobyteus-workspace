# autobyteus-435 API/E2E: native screen reading in PORTRAIT only (TESTING.md: no uiautomator dump in landscape).
uidump() { $A shell uiautomator dump /sdcard/abx435-ui.xml >/dev/null 2>&1; $A exec-out cat /sdcard/abx435-ui.xml; }
uitexts() { uidump | python3 -c "import sys,re;x=sys.stdin.read();print(' | '.join(t for t in re.findall(r'text=\"([^\"]+)\"',x)))"; }
uitap() { XY=$(uidump | python3 -c "import sys,re;x=sys.stdin.read();m=[n for n in re.findall(r'<node [^>]*>',x) if re.search(r'text=\"'+re.escape(sys.argv[1])+r'\"',n,re.I)];b=re.search(r'bounds=\"\[(\d+),(\d+)\]\[(\d+),(\d+)\]\"',m[0]) if m else None;print(f'{(int(b[1])+int(b[3]))//2} {(int(b[2])+int(b[4]))//2}' if b else 'none')" "$1"); [ "$XY" = none ] && { echo "no '$1' on screen"; return 1; }; $A shell input tap $XY; echo "tapped '$1' at $XY"; }
pmode() { curl -s -X POST http://127.0.0.1:$(cut -d' ' -f2 $B/proxy-ports)/mode/$1; echo " (proxy mode)"; }
