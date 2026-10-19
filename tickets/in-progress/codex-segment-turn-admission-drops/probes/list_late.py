"""Read-only: list rejection records after a cutoff date, with grouping into same-run clusters."""
import re, sys, collections
exec(open(sys.argv[2]).read().split("print('total'")[0].replace("path = sys.argv[1]", "path = sys.argv[1]"))
late = [r for r in recs if (r[4] or '') >= sys.argv[3]]
for r in late: print(r)
