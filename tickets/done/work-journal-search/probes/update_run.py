# Re-index one run: FTS rows and cards (cards written to cards-update.jsonl for embedding).
import glob,json,os,re,sqlite3,sys,types
RUN=sys.argv[1]; ROOT='/tmp/wjs-copy/memory'
src=open('/tmp/wjs-probe/build_chunks.py').read().split("if os.path.exists(DB)")[0]
ns={}; exec(src,ns)
db=sqlite3.connect('/tmp/wjs-probe/fts.sqlite')
db.execute('delete from c where run=?',(RUN,))
n=0
for f in sorted(glob.glob(f'{ROOT}/{RUN}/work_journal/work_journal_*.md')):
    text=open(f,errors='replace').read()
    rows=[(ns['cjk'](b),RUN,os.path.basename(f),s) for s,b in ns['chunk'](text,ns['MAXC'])]
    db.executemany('insert into c values (?,?,?,?)',rows); n+=len(rows)
db.commit(); print('fts chunks for run',n)
# cards: rerun build_cards logic for this run only
csrc=open('/tmp/wjs-probe/build_cards.py').read()
csrc=csrc.replace("out=open('/tmp/wjs-probe/cards.jsonl','w')","out=open('/tmp/wjs-probe/cards-update.jsonl','w')").replace("glob.glob(ROOT+'/**/work_journal/work_journal_*.md',recursive=True)",f"glob.glob(ROOT+'/{RUN}/work_journal/work_journal_*.md')")
exec(csrc,{'__name__':'x'})
