from pathlib import Path
import json
E=Path(__file__).resolve().parent
exec((E/'run-linux-docker-public.py').read_text().split('try:\n case(')[0].replace('linux-docker-public-result.json','preview-freshness-observation.json'))
SRC=json.loads((E/'native-client-v2-result.json').read_text())['source']
q=g('wc -c '+SRC+'/previews-api004/index.html /Volumes/autobyteus-shared/previews-api004/index.html; sudo -n docker exec autobyteus-server-0 sh -c "wc -c /Volumes/autobyteus-shared/previews-api004/index.html; cat /Volumes/autobyteus-shared/previews-api004/index.html"; stat -c "%Y %s %i" '+SRC+'/previews-api004/index.html');print(q['stdout']);r['result']='Observation';save()
