"""Owned diagnostic: log request handle resolution; never a production patch."""
from pathlib import Path
import sys
p=Path(sys.argv[1]);s=p.read_text()
a='p = fh_decomp(f);'
b='p = fh_decomp(f); fprintf(stderr, "ABTRACE proc=%u uid=%u dev=%u ino=%llu path=%s\\n", (unsigned)rqstp->rq_proc,(unsigned)geteuid(),(unsigned)fh.dev,(unsigned long long)fh.ino,p?p:"NULL");'
assert s.count(a)==1;s=s.replace(a,b)
a='if (fh.pwhash != export_password_hash) {'
b='if (fh.pwhash != export_password_hash) { fprintf(stderr, "ABTRACE PASSWORD_MISMATCH\\n");'
assert s.count(a)==1;s=s.replace(a,b)
p.write_text(s)
