from pathlib import Path
import urllib.request,hashlib,tarfile,json
E=Path(__file__).resolve().parent;S=Path((E/'scratch-path.txt').read_text().strip())
url='https://go.dev/dl/go1.27.2.darwin-arm64.tar.gz'
p=S/'go.tar.gz';urllib.request.urlretrieve(url,p)
digest=hashlib.sha256(p.read_bytes()).hexdigest()
assert digest=='76812b213b1b2302c978d28fa52fa92d541704b9e7d9d5db8002c50e4018c4c5'
with tarfile.open(p) as t:t.extractall(S)
(E/'toolchain.json').write_text(json.dumps({'url':url,'sha256':digest,'bytes':p.stat().st_size,'path':str(S/'go/bin/go')},indent=2)+'\n')
print('Pinned toolchain verified')
