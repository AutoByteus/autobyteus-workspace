"""Prototype-only narrow vendor patch; no AutoByteus implementation changes.
Treat the eight-byte NFS CREATE verifier as binary, not a NUL-terminated string.
"""
from pathlib import Path
import sys
p=Path(sys.argv[1]);s=p.read_text()
before='''/* seconds between 1970-01-01 and 1980-01-01 */'''
helper='''/* Probe-only binary-safe hash for the NFS3 CREATE verifier. */
static uint32 create_verifier_hash(createverf3 verf)
{
    uint32 hash = 0x811c9dc5;
    unsigned int i;
    for (i = 0; i < NFS3_CREATEVERFSIZE; i++) {
        hash ^= (unsigned char)verf[i];
        hash *= 0x01000193;
    }
    return hash;
}

'''
assert s.count(before)==1
s=s.replace(before,helper+before)
assert s.count('    char hashbuf[9];')==2
s=s.replace('    char hashbuf[9];\n','')
assert s.count("    memcpy(hashbuf, verf, 8);\n    hashbuf[8] = '\\0';\n")==2
s=s.replace("    memcpy(hashbuf, verf, 8);\n    hashbuf[8] = '\\0';\n",'')
s=s.replace('hash = fnv1a_32(hashbuf);','hash = create_verifier_hash(verf);')
s=s.replace('expected = fnv1a_32(hashbuf);','expected = create_verifier_hash(verf);')
assert 'hashbuf' not in s
p.write_text(s)
