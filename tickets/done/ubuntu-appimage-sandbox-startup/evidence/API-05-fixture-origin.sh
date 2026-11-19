#!/bin/bash
# Repackage the first signed higher version with the existing test-only loopback native
# origin so its client can verify the NEXT signed release. App/server code is unchanged.
set -euo pipefail
RUN=/home/ryan-ai/hdd_drive/autobyteus_org/api-e2e-autobyteus-5
R=$(cat "$RUN/active-continuation"); V=1.5.14
A="AutoByteus_personal_linux-x64-$V.AppImage"; O="$R/feed14"; mkdir -p "$O/stage"
APP="$R/extracted/squashfs-root" # extracted through --appimage-extract from candidate
export PATH=/tmp/autobyteus-5-toolchain/go/bin:$PATH
cd "$RUN/fresh"
node --input-type=module - "$O" "$RUN" "$V" "$A" <<'JS'
import {buildNative} from './scripts/desktop-package/build-native.mjs';
const [output,run,version,asset]=process.argv.slice(2);
buildNative({version,arch:'x64',publicKeyFile:run+'/trust/desktop-public.pem',output:output+'/native',asset,testOrigin:'http://127.0.0.1:18889'});
JS
for n in AppRun autobyteus-provision autobyteus-install-client; do cp "$O/native/$n" "$APP/$n";done
cp "$O/native/identity.json" "$APP/resources/linux-install-identity.json"
rm "$APP/.DirIcon" "$APP/autobyteus.png" "$APP/autobyteus.desktop"
# The packaging tool contributes its own desktop/icons/runtime stub.
BUILDER=$(find node_modules/.pnpm -path '*/app-builder-bin/linux/x64/app-builder' -print -quit)
"$BUILDER" appimage --stage "$O/stage" --arch x64 --output "$O/$A" --app "$APP" --configuration "$(cat /tmp/autobyteus-5-native/fixture-config.json)" >"$O/info.json"
node scripts/desktop-package/sign-release.mjs "$O/$A" "$V" x64 "$RUN/trust/desktop-test-private.pem" "$RUN/trust/desktop-public.pem"
node scripts/desktop-package/verify-layout.mjs "$O/$A" "$RUN/trust/desktop-public.pem"
python3 - "$O" "$A" "$R/$V/latest-linux.yml" <<'PY'
import yaml,json,sys,pathlib,hashlib,base64
o=pathlib.Path(sys.argv[1]); a=sys.argv[2]; m=yaml.safe_load(open(sys.argv[3])); info=json.loads((o/'info.json').read_text())
s=base64.b64encode(hashlib.file_digest((o/a).open('rb'),'sha512').digest()).decode()
assert s==info['sha512'] and (o/a).stat().st_size==info['size']
m['sha512']=s; m['files']=[{'url':a,'size':info['size'],'sha512':s,'blockMapSize':info['blockMapSize']}]
original=pathlib.Path(sys.argv[3]).read_text()
import re
for field,value in [('sha512',s),('size',info['size']),('blockMapSize',info['blockMapSize'])]:
 original=re.sub(r'(?m)^(\s*'+field+r': ).*$',lambda x:x[1]+str(value),original)
(o/'latest-linux.yml').write_text(original)
PY
python3 scripts/validate_linux_updater_metadata.py --metadata "$O/latest-linux.yml" --arch-token linux-x64 --image "$O/$A"
sha256sum "$O/$A"
