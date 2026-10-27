import re
HEAD=re.compile(r'^\[\d\d:\d\d:\d\d\] (User|Agent|Message from[^:]*|Command|Write file|Edit file|Search web|Tool|Notice|Tool result[^:]*)')
def parts(text):
    """Yield (kind, line) where kind in dialog/action/detail/meta."""
    cur=None
    for line in text.splitlines(keepends=True):
        m=HEAD.match(line)
        if m:
            k=m.group(1); cur='dialog' if k in('User','Agent') or k.startswith('Message from') else 'action'
            yield cur,line
        elif line.startswith('[') or line.startswith('#'): cur=None; yield 'meta',line
        elif cur=='dialog': yield 'dialog',line
        else: yield 'detail',line
