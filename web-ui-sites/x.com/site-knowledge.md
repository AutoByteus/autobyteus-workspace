# x.com Site Knowledge

## Access and operating rules

- Base URL(s): https://x.com
- Account and login: session persists in the automation Chromium profile, logged in as @ryan_zheng_work. UI language is German ("Antworten" = Reply, "Posten" = Post).
- Account is Premium: replies longer than 280 characters are accepted (a 748-character reply posted fine).
- Operating rules stricter than web-ui-automation defaults: none observed.
- Anti-automation sensitivity: none observed with native click + clipboard paste.

## Page map

| Page / view | URL pattern | How to recognize it | Last verified |
| --- | --- | --- | --- |
| Post detail (thread) | `/<handle>/status/<id>` | `article` elements; first is the post, inline reply composer below it | 2026-10-06 |
| User replies | `/<handle>/with_replies` | user's posts and replies as `article`s | 2026-10-06 |

## Elements

| Control | Page / view | Locator | Notes | Last verified |
| --- | --- | --- | --- | --- |
| Logged-in account | any | `[data-testid="SideNav_AccountSwitcher_Button"]` innerText | shows name + @handle | 2026-10-06 |
| Inline reply box | post detail | `[data-testid="tweetTextarea_0"]` | Draft.js editor; scroll to top first | 2026-10-06 |
| Inline Reply button | post detail | `[data-testid="tweetButtonInline"]` | `aria-disabled="true"` when empty/over limit | 2026-10-06 |

### Locate scripts

```js
// Reply box + button rects and window metrics (read-only)
window.scrollTo(0,0);
const e=document.querySelector('[data-testid="tweetTextarea_0"]');
const b=document.querySelector('[data-testid="tweetButtonInline"]');
return JSON.stringify({box:e?.getBoundingClientRect(), btn:b?.getBoundingClientRect(),
  dis:b?.getAttribute('aria-disabled'), sx:screenX, sy:screenY, chrome:outerHeight-innerHeight});
```

```js
// Find own reply in a thread after posting (read-only)
const a=[...document.querySelectorAll('article')].filter(x=>x.innerText.includes('@ryan_zheng_work')&&x.innerText.includes('<unique text>'));
return JSON.stringify(a.map(x=>x.querySelector('a[href*="/status/"]')?.getAttribute('href')));
```

## Operations (SOPs)

### Reply to a post

- Last verified: 2026-10-06
- Preconditions: logged in; reply text saved to a file.
- Steps:
  1. Check for duplicates: open `/<own-handle>/with_replies` and scan recent `article`s for the text.
  2. Open the post URL; run the locate script for the reply box.
  3. `native_click.py --rect=X,Y,W,H --window=SX,SY,CHROME` on the box (use `=` form: negative values break argparse otherwise).
  4. `paste_file.py reply.txt`; verify box innerText and that the button is not `aria-disabled`.
  5. Point of no return: click `tweetButtonInline`.
  6. Find the new reply's `/status/<id>` link with the locate script; open it to verify.
- Success signal: reply article with own handle appears under the post and the composer clears.

## Pitfalls

- `native_click.py --window -5,51,87` fails with "expected one argument" → argparse reads the leading `-` as an option → use `--window=-5,51,87` (Last verified: 2026-10-06)
- Draft.js box innerText shows `\n\n\n` for one blank line → editor rendering only; the posted text has single blank lines (Last verified: 2026-10-06)
