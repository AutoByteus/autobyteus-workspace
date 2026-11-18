# One-off edit helper (autobyteus-437 API/E2E round 2): gives a probe node credentials. Each edit is printed for review.
import re, sys
FILES = sys.argv[1:]

def skip_string(s, i):
    q = s[i]; i += 1
    while i < len(s):
        c = s[i]
        if c == '\\': i += 2; continue
        if q == '`' and c == '$' and s[i+1:i+2] == '{':
            i = match_close(s, i + 1) + 1; continue
        if c == q: return i + 1
        i += 1
    raise ValueError('unterminated string')

def match_close(s, i):
    # s[i] is an opening bracket; return index of its closing bracket
    pairs = {'(': ')', '[': ']', '{': '}'}
    stack = [pairs[s[i]]]; i += 1
    while i < len(s):
        c = s[i]
        if c in '\'"`': i = skip_string(s, i); continue
        if c == '/' and s[i+1:i+2] == '/': i = s.index('\n', i); continue
        if c in pairs: stack.append(pairs[c])
        elif c in ')]}':
            if c != stack[-1]: raise ValueError(f'mismatch at {i}')
            stack.pop()
            if not stack: return i
        i += 1
    raise ValueError('unclosed')

def split_args(s, start, end):
    # top-level comma-separated args within s[start:end]
    args, depth, i, a = [], 0, start, start
    while i < end:
        c = s[i]
        if c in '\'"`': i = skip_string(s, i); continue
        if c in '([{': i = match_close(s, i) + 1; continue
        if c == ',': args.append((a, i)); a = i + 1
        i += 1
    args.append((a, end))
    return [(x, y) for x, y in args if s[x:y].strip()]

def wrap(expr): return f'withNodeCredential({expr.strip()})'

for path in FILES:
    s = open(path).read(); orig = s; notes = []
    # 1. server spawns: every call whose args array holds dist/app.js
    pos = 0
    while True:
        m = re.search(r"\[[^\[\]]*?(?:path\.join\([^()]*'dist/app\.js'\)|'dist/app\.js')", s[pos:])
        if not m: break
        arr = pos + m.start()
        # find the call's opening paren: last unmatched '(' before arr
        depth = 0; j = arr - 1
        while j >= 0:
            if s[j] == ')': depth += 1
            elif s[j] == '(':
                if depth == 0: break
                depth -= 1
            j -= 1
        call_close = match_close(s, j)
        arr_close = match_close(s, arr)
        args = split_args(s, arr_close + 1, call_close)
        if 'withNodeCredential' in s[arr_close:call_close] or 'existsSync' in s[max(0,j-20):j]:
            pos = arr_close; continue
        if args and s[args[0][0]:args[0][1]].strip().startswith('{'):
            a0, a1 = args[0]; obj = s[a0:a1]; ob = a0 + obj.index('{'); oc = match_close(s, ob)
            props = split_args(s, ob + 1, oc)
            done = False
            for p0, p1 in props:
                text = s[p0:p1]; mm = re.match(r'\s*env\s*:', text)
                if mm:
                    v0 = p0 + mm.end(); expr = s[v0:p1]
                    lead = expr[:len(expr) - len(expr.lstrip())]
                    s = s[:v0] + lead + wrap(expr) + s[p1:]; done = True; notes.append(f'options env: {expr.strip()[:60]}'); break
                if re.match(r'\s*env\s*$', text) or text.strip() == 'env':
                    s = s[:p0] + text.replace('env', 'env: ' + wrap('env'), 1) + s[p1:]; done = True; notes.append('options env shorthand'); break
            if not done: notes.append('!! options object without env')
        elif len(args) >= 2:
            e0, e1 = args[1]; expr = s[e0:e1]; lead = expr[:len(expr) - len(expr.lstrip())]
            s = s[:e0] + lead + wrap(expr) + s[e1:]; notes.append(f'env arg: {expr.strip()[:60]}')
        else:
            notes.append('!! no env argument')
        pos = arr_close + 1
    # 2. browser contexts (not phones)
    def attach_ctx(m):
        return m.group(0)
    out = []; i = 0
    for m in re.finditer(r"(?m)^(?P<ind>[ \t]*)(?:(?:const|let|var)\s+)?(?P<name>[\w.]+)\s*=\s*await\s+[\w.()]*?newContext\(", s):
        pass
    lines = s.split('\n'); res = []; k = 0
    while k < len(lines):
        line = lines[k]; res.append(line)
        m = re.match(r"^(?P<ind>[ \t]*)(?:(?:const|let|var)\s+)?(?P<name>[\w.]+)\s*=\s*await\s+[\w.()]*?newContext\(", line)
        if m:
            # gather the full statement
            stmt = line; kk = k
            while stmt.count('(') > stmt.count(')'):
                kk += 1; stmt += '\n' + lines[kk]; res.append(lines[kk])
            k = kk
            if re.search(r'isMobile:\s*true|hasTouch:\s*true', stmt):
                notes.append(f'phone context left: {m.group("name")}')
            else:
                semi = ';' if stmt.rstrip().endswith(';') else ''
                rest = stmt[stmt.index(')', stmt.rfind('newContext(')) :] if False else ''
                res.append(f"{m.group('ind')}await attachToBrowserContext({m.group('name')}){semi}")
                notes.append(f'context attached: {m.group("name")}')
        elif 'newContext(' in line and 'attachToBrowserContext' not in line:
            notes.append(f'!! unhandled newContext at line {k+1}: {line.strip()[:90]}')
        k += 1
    s = '\n'.join(res)
    # 3. node built-in WebSocket (no ws package)
    if not re.search(r"require\('ws'\)|from 'ws'", s):
        n = len(re.findall(r'new WebSocket\(', s))
        if n: notes.append(f'!! built-in WebSocket uses: {n}')
    # 4. addPeerNode
    if 'addPeerNode' in s: notes.append('!! addPeerNode')
    # 5. import + process attachment
    imports = list(re.finditer(r"(?m)^import [^\n]*?from '[^']+';?\n", s))
    if not imports: notes.append('!! no import found')
    else:
        last = imports[-1]; semi = ';' if last.group(0).rstrip().endswith(';') else ''
        add = (f"import {{ attachToBrowserContext, attachToProbeProcess, withNodeCredential }} from './fixtures/probe-node-access.mjs'{semi}\n"
               f"// Every node needs a credential (autobyteus-437): the probe's nodes start with its launch credential, and the probe's\n"
               f"// own calls and its desktop browser contexts carry it (fixtures/probe-node-access.mjs).\n"
               f"attachToProbeProcess(){semi}\n")
        s = s[:last.end()] + add + s[last.end():]
    if 'attachToBrowserContext(' not in s.split("probe-node-access.mjs'")[1]:
        s = s.replace("import { attachToBrowserContext, attachToProbeProcess, withNodeCredential }", "import { attachToProbeProcess, withNodeCredential }")
    open(path, 'w').write(s)
    print(f'== {path}'); [print('   ', n) for n in notes]
