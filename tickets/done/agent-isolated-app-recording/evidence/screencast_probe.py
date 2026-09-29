import asyncio, base64, subprocess, time
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.connect_over_cdp("http://127.0.0.1:39222")
        page = b.contexts[0].pages[0]
        s = await page.context.new_cdp_session(page)
        frames = []
        async def on_frame(ev):
            frames.append((time.monotonic(), base64.b64decode(ev["data"])))
            await s.send("Page.screencastFrameAck", {"sessionId": ev["sessionId"]})
        s.on("Page.screencastFrame", lambda ev: asyncio.ensure_future(on_frame(ev)))
        await s.send("Page.startScreencast", {"format": "jpeg", "quality": 85, "everyNthFrame": 1})
        for label in ["Agents", "Skills", "Agent Teams"]:
            await page.evaluate("""(label) => { const c=document.getElementById('__demo_cursor'); const t=[...document.querySelectorAll('nav button')].find(b=>b.textContent.trim()===label); const r=t.getBoundingClientRect(); c.style.left=(r.left+r.width/3)+'px'; c.style.top=(r.top+r.height/2)+'px'; setTimeout(()=>t.click(), 850); }""", label)
            await asyncio.sleep(1.6)
        await s.send("Page.stopScreencast")
        await asyncio.sleep(0.3)
        # write constant-rate video via concat of timestamped frames
        with open("frames.txt","w") as f:
            for i,(t,data) in enumerate(frames):
                open(f"f{i:05d}.jpg","wb").write(data)
                dur = (frames[i+1][0]-t) if i+1 < len(frames) else 0.1
                f.write(f"file 'f{i:05d}.jpg'\nduration {dur:.4f}\n")
        print("frames", len(frames))
        await b.close()
asyncio.run(main())
