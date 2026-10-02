import sys,subprocess,json
from pathlib import Path
p=Path(__file__).resolve().parent
marker=sys.argv[1]; repeats=int(sys.argv[2]) if len(sys.argv)>2 else 0
script='''async (arg) => {const r=await __abDemo.type({selector:"main textarea"},arg.text,{clear:true,delayMs:0});if(!r.ok)throw Error(JSON.stringify(r));const s=await __abDemo.click({text:"Send message"});if(!s.ok)throw Error(JSON.stringify(s));return {sent:arg.marker,length:arg.text.length};}'''
subprocess.run([sys.executable,str(p/'drive.py'),marker.lower()+'-send','run-script','--tab-id','FA898739ADA2BE83540C972F0389B5E8','--script',script,'--arg-json',json.dumps({'marker':marker,'text':marker+'\n'+'Synthetic inventory record; owner Mira Chen; customer Northwind Helios. '.repeat(repeats) if False else marker+'\n'+'Synthetic inventory record; owner Mira Chen; customer Northwind Helios. '*repeats})],check=True)
