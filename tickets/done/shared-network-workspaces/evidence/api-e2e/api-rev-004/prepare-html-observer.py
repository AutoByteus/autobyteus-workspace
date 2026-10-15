from pathlib import Path
import json,hashlib
E=Path(__file__).resolve().parent
exec((E/'run-linux-docker-public.py').read_text().split('try:\n case(')[0].replace('linux-docker-public-result.json','preview-html-observer-fixture.json'))
SRC=json.loads((E/'native-client-v2-result.json').read_text())['source'];p=S/'previews-api004/index.html'
p.write_text(p.read_text()+"<script>addEventListener('load',()=>{const i=document.querySelector('img'),h=document.querySelector('h1');parent.postMessage({api004Preview:{heading:h.textContent,color:getComputedStyle(h).color,image:{complete:i.complete,w:i.naturalWidth,h:i.naturalHeight,src:i.currentSrc},url:location.href}},'*')});</script>")
cmd(['exec','-i',V,'/bin/sh','-c','cat > '+SRC+'/previews-api004/index.html'],data=p.read_bytes());r['fixtureSHA256']=hashlib.sha256(p.read_bytes()).hexdigest();r['fixture']=p.read_text();r['result']='Pass';save()
