"""Temporary probe: time the phases of one list_tabs operation; dump asyncio task stacks if it stalls."""
import asyncio, io, json, sys, time
from browser_automation.runtime import session as S
try:
    from browser_automation.runtime import dialogs as D
except ImportError:
    D = None
from browser_automation.application import BrowserApplication

t0 = time.monotonic(); marks = []
def mark(label): marks.append((round(time.monotonic() - t0, 2), label))

if D is not None:
  orig_settle = D.DialogHandling.settle
  async def settle(self):
    mark(f"settle-start answers={len(self._answers)} pending={len(self._pending)} reports={len(self.reports)}")
    await orig_settle(self); mark("settle-end")
  D.DialogHandling.settle = settle
orig_disc = S.BrowserRuntime._disconnect
async def disc(self, p):
    mark("disconnect-start"); await orig_disc(self, p); mark("disconnect-end")
S.BrowserRuntime._disconnect = disc
orig_list = S.BrowserSession.list_tabs
async def lt(self):
    mark("connected/list-start"); r = await orig_list(self); mark(f"list-end tabs={len(r)}"); return r
S.BrowserSession.list_tabs = lt
if D is not None:
  orig_on = D.DialogHandling._on_dialog
  def on_dialog(self, dialog):
    mark(f"DIALOG EVENT type={dialog.type}"); return orig_on(self, dialog)
  D.DialogHandling._on_dialog = on_dialog
slow = []
orig_sum = S.BrowserSession.summarize_page
async def summ(self, page):
    b = time.monotonic(); r = await orig_sum(self, page); d = time.monotonic() - b
    if d > 1.0: slow.append((round(d, 2), (page.url or '')[-30:]))
    return r
S.BrowserSession.summarize_page = summ

async def watchdog():
    await asyncio.sleep(40)
    buf = io.StringIO()
    for task in asyncio.all_tasks():
        buf.write(f"--- {task!r}\n"); task.print_stack(file=buf)
    mark("WATCHDOG 40s; task stacks follow"); print(buf.getvalue(), file=sys.stderr, flush=True)

async def main():
    wd = asyncio.create_task(watchdog())
    try:
        await BrowserApplication().list_tabs()
    finally:
        wd.cancel()
    mark("done")

asyncio.run(main())
print(json.dumps({"total": marks[-1][0], "marks": marks, "slow_pages": slow[:10], "slow_count": len(slow)}))
