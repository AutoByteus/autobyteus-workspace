from pathlib import Path
E=Path(__file__).resolve().parent
exec((E/'common.py').read_text())
build=json.loads((E/'build-docker-result.json').read_text());B='/home/admin/'+V+'-docker-binary'
r.update(binary=build['binary'],metadata=build['metadata'],engineImage=build['engineImage'])
