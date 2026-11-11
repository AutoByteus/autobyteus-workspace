# autobyteus-472 Android journeys (emulator-5640, AVD apie2e472_api35: Android 15, 1080x2400, density 420, WebView 124.0.6367.219; debug APK of this branch)

Each step: the exact command (scripts/run-step.sh → scripts/step.mjs) and its output, copied as it ran. Page state over the WebView DevTools socket; input as real Android touch events (`adb root` for `sendevent`; the first attempt without root was refused "Permission denied" and is not recorded further).

## API-01 · step run-screen-pinch · 2026-11-11T17:29:50Z · exit 0
```json
{
 "before": {
  "vvScale": 1,
  "vvOffset": [
   0,
   0
  ],
  "docScroll": [
   0,
   0
  ],
  "innerWidth": 412,
  "viewer": false,
  "runScreen": "open",
  "title": null,
  "back": {
   "x": 4,
   "y": 4,
   "w": 48
  },
  "download": false,
  "touches": {
   "starts": 0,
   "maxTouches": 0,
   "moves": 0
  }
 },
 "after": {
  "vvScale": 1,
  "vvOffset": [
   0,
   0
  ],
  "docScroll": [
   0,
   0
  ],
  "innerWidth": 412,
  "viewer": false,
  "runScreen": "open",
  "title": null,
  "back": {
   "x": 4,
   "y": 4,
   "w": 48
  },
  "download": false,
  "touches": {
   "starts": 2,
   "maxTouches": 2,
   "moves": 16
  }
 }
}
```

## API-01 · step open resume-472.pdf pdf · 2026-11-11T17:29:57Z · exit 0
```json
{
 "tapped": {
  "x": 339,
  "y": 1603
 },
 "ms": 1829,
 "page": {
  "vvScale": 1,
  "vvOffset": [
   0,
   0
  ],
  "docScroll": [
   0,
   0
  ],
  "innerWidth": 412,
  "viewer": true,
  "runScreen": null,
  "title": "resume-472.pdf",
  "back": {
   "x": 4,
   "y": 0,
   "w": 48
  },
  "download": true,
  "touches": {
   "starts": 3,
   "maxTouches": 2,
   "moves": 16
  }
 },
 "view": {
  "pagesCssWidth": 380,
  "transform": "",
  "canvases": 12,
  "canvasCss": [
   380,
   380
  ],
  "canvasBitmap": [
   [
    997,
    1290
   ],
   [
    997,
    1290
   ]
  ],
  "allBitmapsMatch": true,
  "bitmapPixelsMillions": 15.4,
  "scroll": {
   "top": 0,
   "left": 0,
   "height": 5924,
   "width": 412,
   "clientW": 412,
   "clientH": 794
  },
  "firstVisiblePage": 1,
  "scrollerRect": [
   0,
   48,
   412,
   794
  ]
 }
}
```

## API-04 · step meminfo pdf-1x · 2026-11-11T17:30:08Z · exit 0
```json
{
 "label": "pdf-1x",
 "app": {
  "pid": "4003",
  "totalPssKb": 105908,
  "graphicsKb": 0,
  "nativeHeapKb": 9932
 },
 "renderer": {
  "pid": "4086",
  "name": "com.google.android.webview:sandboxed_process0:org.chromium.c",
  "totalPssKb": 112206,
  "graphicsKb": 0,
  "nativeHeapKb": 1276
 }
}
```

## API-01 · step pinch 206 400 80 160 pdf-pinch-out-2x pdf · 2026-11-11T17:30:20Z · exit 0
```json
{
 "gesture": {
  "screenFrom": [
   {
    "x": 436,
    "y": 1178
   },
   {
    "x": 646,
    "y": 1178
   }
  ],
  "screenTo": [
   {
    "x": 331,
    "y": 1178
   },
   {
    "x": 751,
    "y": 1178
   }
  ]
 },
 "before": {
  "pagesCssWidth": 380,
  "transform": "",
  "canvases": 12,
  "canvasCss": [
   380,
   380
  ],
  "canvasBitmap": [
   [
    997,
    1290
   ],
   [
    997,
    1290
   ]
  ],
  "allBitmapsMatch": true,
  "bitmapPixelsMillions": 15.4,
  "scroll": {
   "top": 0,
   "left": 0,
   "height": 5924,
   "width": 412,
   "clientW": 412,
   "clientH": 794
  },
  "firstVisiblePage": 1,
  "scrollerRect": [
   0,
   48,
   412,
   794
  ]
 },
 "atLift": {
  "pagesCssWidth": 759,
  "transform": "",
  "canvases": 12,
  "canvasCss": [
   759,
   759
  ],
  "canvasBitmap": [
   [
    1992,
    2578
   ],
   [
    1992,
    2578
   ]
  ],
  "allBitmapsMatch": true,
  "bitmapPixelsMillions": 61.6,
  "scroll": {
   "top": 336,
   "left": 190,
   "height": 11816,
   "width": 791,
   "clientW": 412,
   "clientH": 794
  },
  "firstVisiblePage": 1,
  "scrollerRect": [
   0,
   48,
   412,
   794
  ]
 },
 "settled": {
  "pagesCssWidth": 759,
  "transform": "",
  "canvases": 12,
  "canvasCss": [
   759,
   759
  ],
  "canvasBitmap": [
   [
    1992,
    2578
   ],
   [
    1992,
    2578
   ]
  ],
  "allBitmapsMatch": true,
  "bitmapPixelsMillions": 61.6,
  "scroll": {
   "top": 336,
   "left": 190,
   "height": 11816,
   "width": 791,
   "clientW": 412,
   "clientH": 794
  },
  "firstVisiblePage": 1,
  "scrollerRect": [
   0,
   48,
   412,
   794
  ]
 },
 "page": {
  "vvScale": 1,
  "vvOffset": [
   0,
   0
  ],
  "docScroll": [
   0,
   0
  ],
  "innerWidth": 412,
  "viewer": true,
  "runScreen": null,
  "title": "resume-472.pdf",
  "back": {
   "x": 4,
   "y": 0,
   "w": 48
  },
  "download": true,
  "touches": {
   "starts": 2,
   "maxTouches": 2,
   "moves": 20
  }
 }
}
```

## API-01 · step pan2 206 400 150 200 pdf-pan2 pdf · 2026-11-11T17:30:43Z · exit 0
```json
{
 "before": {
  "pagesCssWidth": 759,
  "transform": "",
  "canvases": 12,
  "canvasCss": [
   759,
   759
  ],
  "canvasBitmap": [
   [
    1992,
    2578
   ],
   [
    1992,
    2578
   ]
  ],
  "allBitmapsMatch": true,
  "bitmapPixelsMillions": 61.6,
  "scroll": {
   "top": 336,
   "left": 190,
   "height": 11816,
   "width": 791,
   "clientW": 412,
   "clientH": 794
  },
  "firstVisiblePage": 1,
  "scrollerRect": [
   0,
   48,
   412,
   794
  ]
 },
 "after": {
  "pagesCssWidth": 759,
  "transform": "",
  "canvases": 12,
  "canvasCss": [
   759,
   759
  ],
  "canvasBitmap": [
   [
    1992,
    2578
   ],
   [
    1992,
    2578
   ]
  ],
  "allBitmapsMatch": true,
  "bitmapPixelsMillions": 61.6,
  "scroll": {
   "top": 336,
   "left": 190,
   "height": 11816,
   "width": 791,
   "clientW": 412,
   "clientH": 794
  },
  "firstVisiblePage": 1,
  "scrollerRect": [
   0,
   48,
   412,
   794
  ]
 },
 "page": {
  "vvScale": 1,
  "vvOffset": [
   0,
   0
  ],
  "docScroll": [
   0,
   0
  ],
  "innerWidth": 412,
  "viewer": true,
  "runScreen": null,
  "title": "resume-472.pdf",
  "back": {
   "x": 4,
   "y": 0,
   "w": 48
  },
  "download": true,
  "touches": {
   "starts": 2,
   "maxTouches": 2,
   "moves": 16
  }
 }
}
```

## API-01 · step swipe 200 700 200 200 pdf-swipe-2x pdf · 2026-11-11T17:30:46Z · exit 0
```json
{
 "before": {
  "pagesCssWidth": 759,
  "transform": "",
  "canvases": 12,
  "canvasCss": [
   759,
   759
  ],
  "canvasBitmap": [
   [
    1992,
    2578
   ],
   [
    1992,
    2578
   ]
  ],
  "allBitmapsMatch": true,
  "bitmapPixelsMillions": 61.6,
  "scroll": {
   "top": 336,
   "left": 190,
   "height": 11816,
   "width": 791,
   "clientW": 412,
   "clientH": 794
  },
  "firstVisiblePage": 1,
  "scrollerRect": [
   0,
   48,
   412,
   794
  ]
 },
 "after": {
  "pagesCssWidth": 759,
  "transform": "",
  "canvases": 12,
  "canvasCss": [
   759,
   759
  ],
  "canvasBitmap": [
   [
    1992,
    2578
   ],
   [
    1992,
    2578
   ]
  ],
  "allBitmapsMatch": true,
  "bitmapPixelsMillions": 61.6,
  "scroll": {
   "top": 810,
   "left": 190,
   "height": 11816,
   "width": 791,
   "clientW": 412,
   "clientH": 794
  },
  "firstVisiblePage": 1,
  "scrollerRect": [
   0,
   48,
   412,
   794
  ]
 },
 "page": {
  "vvScale": 1,
  "vvOffset": [
   0,
   0
  ],
  "docScroll": [
   0,
   0
  ],
  "innerWidth": 412,
  "viewer": true,
  "runScreen": null,
  "title": "resume-472.pdf",
  "back": {
   "x": 4,
   "y": 0,
   "w": 48
  },
  "download": true,
  "touches": {
   "starts": 1,
   "maxTouches": 1,
   "moves": 5
  }
 }
}
```

## API-04 · step pinch 206 400 80 200 pdf-pinch-3x pdf · 2026-11-11T17:30:52Z · exit 0
```json
{
 "gesture": {
  "screenFrom": [
   {
    "x": 436,
    "y": 1178
   },
   {
    "x": 646,
    "y": 1178
   }
  ],
  "screenTo": [
   {
    "x": 278,
    "y": 1178
   },
   {
    "x": 803,
    "y": 1178
   }
  ]
 },
 "before": {
  "pagesCssWidth": 759,
  "transform": "",
  "canvases": 12,
  "canvasCss": [
   759,
   759
  ],
  "canvasBitmap": [
   [
    1992,
    2578
   ],
   [
    1992,
    2578
   ]
  ],
  "allBitmapsMatch": true,
  "bitmapPixelsMillions": 61.6,
  "scroll": {
   "top": 810,
   "left": 190,
   "height": 11816,
   "width": 791,
   "clientW": 412,
   "clientH": 794
  },
  "firstVisiblePage": 1,
  "scrollerRect": [
   0,
   48,
   412,
   794
  ]
 },
 "atLift": {
  "pagesCssWidth": 1140,
  "transform": "",
  "canvases": 12,
  "canvasCss": [
   1140,
   1140
  ],
  "canvasBitmap": [
   [
    2992,
    3872
   ],
   [
    2992,
    3872
   ]
  ],
  "allBitmapsMatch": true,
  "bitmapPixelsMillions": 139,
  "scroll": {
   "top": 1384,
   "left": 380,
   "height": 17732,
   "width": 1172,
   "clientW": 412,
   "clientH": 794
  },
  "firstVisiblePage": 1,
  "scrollerRect": [
   0,
   48,
   412,
   794
  ]
 },
 "settled": {
  "pagesCssWidth": 1140,
  "transform": "",
  "canvases": 12,
  "canvasCss": [
   1140,
   1140
  ],
  "canvasBitmap": [
   [
    2992,
    3872
   ],
   [
    2992,
    3872
   ]
  ],
  "allBitmapsMatch": true,
  "bitmapPixelsMillions": 139,
  "scroll": {
   "top": 1384,
   "left": 380,
   "height": 17732,
   "width": 1172,
   "clientW": 412,
   "clientH": 794
  },
  "firstVisiblePage": 1,
  "scrollerRect": [
   0,
   48,
   412,
   794
  ]
 },
 "page": {
  "vvScale": 1,
  "vvOffset": [
   0,
   0
  ],
  "docScroll": [
   0,
   0
  ],
  "innerWidth": 412,
  "viewer": true,
  "runScreen": null,
  "title": "resume-472.pdf",
  "back": {
   "x": 4,
   "y": 0,
   "w": 48
  },
  "download": true,
  "touches": {
   "starts": 2,
   "maxTouches": 2,
   "moves": 20
  }
 }
}
```

## API-01 · step pan2-hold 206 400 -120 -150 · 2026-11-11T17:31:32Z · exit 0
```json
{
 "before": {
  "pagesCssWidth": 1140,
  "transform": "",
  "canvases": 12,
  "canvasCss": [
   1140,
   1140
  ],
  "canvasBitmap": [
   [
    2992,
    3872
   ],
   [
    2992,
    3872
   ]
  ],
  "allBitmapsMatch": true,
  "bitmapPixelsMillions": 139,
  "scroll": {
   "top": 1384,
   "left": 380,
   "height": 17732,
   "width": 1172,
   "clientW": 412,
   "clientH": 794
  },
  "firstVisiblePage": 1,
  "scrollerRect": [
   0,
   48,
   412,
   794
  ]
 },
 "fingersDown": {
  "pagesCssWidth": 1140,
  "transform": "translate(-120.109px, -150.167px) scale(1)",
  "canvases": 12,
  "canvasCss": [
   1140,
   1140
  ],
  "canvasBitmap": [
   [
    2992,
    3872
   ],
   [
    2992,
    3872
   ]
  ],
  "allBitmapsMatch": true,
  "bitmapPixelsMillions": 139,
  "scroll": {
   "top": 1384,
   "left": 380,
   "height": 17732,
   "width": 1172,
   "clientW": 412,
   "clientH": 794
  },
  "firstVisiblePage": 2,
  "scrollerRect": [
   0,
   48,
   412,
   794
  ]
 },
 "lifted": {
  "pagesCssWidth": 1140,
  "transform": "",
  "canvases": 12,
  "canvasCss": [
   1140,
   1140
  ],
  "canvasBitmap": [
   [
    2992,
    3872
   ],
   [
    2992,
    3872
   ]
  ],
  "allBitmapsMatch": true,
  "bitmapPixelsMillions": 139,
  "scroll": {
   "top": 1384,
   "left": 380,
   "height": 17732,
   "width": 1172,
   "clientW": 412,
   "clientH": 794
  },
  "firstVisiblePage": 1,
  "scrollerRect": [
   0,
   48,
   412,
   794
  ]
 }
}
```

## API-04 · step meminfo pdf-3x · 2026-11-11T17:31:51Z · exit 0
```json
{
 "label": "pdf-3x",
 "app": {
  "pid": "4003",
  "totalPssKb": 107864,
  "graphicsKb": 0,
  "nativeHeapKb": 10044
 },
 "renderer": {
  "pid": "4086",
  "name": "com.google.android.webview:sandboxed_process0:org.chromium.c",
  "totalPssKb": 119285,
  "graphicsKb": 0,
  "nativeHeapKb": 1284
 }
}
```

## API-04 · step pdf · 2026-11-11T17:31:52Z · exit 0
```json
{
 "page": {
  "vvScale": 1,
  "vvOffset": [
   0,
   0
  ],
  "docScroll": [
   0,
   0
  ],
  "innerWidth": 412,
  "viewer": true,
  "runScreen": null,
  "title": "resume-472.pdf",
  "back": {
   "x": 4,
   "y": 0,
   "w": 48
  },
  "download": true,
  "touches": {
   "starts": 4,
   "maxTouches": 2,
   "moves": 36
  }
 },
 "pdf": {
  "pagesCssWidth": 1140,
  "transform": "",
  "canvases": 12,
  "canvasCss": [
   1140,
   1140
  ],
  "canvasBitmap": [
   [
    2992,
    3872
   ],
   [
    2992,
    3872
   ]
  ],
  "allBitmapsMatch": true,
  "bitmapPixelsMillions": 139,
  "scroll": {
   "top": 1384,
   "left": 380,
   "height": 17732,
   "width": 1172,
   "clientW": 412,
   "clientH": 794
  },
  "firstVisiblePage": 1,
  "scrollerRect": [
   0,
   48,
   412,
   794
  ]
 }
}
```

## API-04 · step pdf · 2026-11-11T17:31:59Z · exit 0
```json
{
 "page": {
  "vvScale": 1,
  "vvOffset": [
   0,
   0
  ],
  "docScroll": [
   0,
   0
  ],
  "innerWidth": 412,
  "viewer": true,
  "runScreen": null,
  "title": "resume-472.pdf",
  "back": {
   "x": 4,
   "y": 0,
   "w": 48
  },
  "download": true,
  "touches": {
   "starts": 16,
   "maxTouches": 2,
   "moves": 72
  }
 },
 "pdf": {
  "pagesCssWidth": 1140,
  "transform": "",
  "canvases": 12,
  "canvasCss": [
   1140,
   1140
  ],
  "canvasBitmap": [
   [
    2992,
    3872
   ],
   [
    2992,
    3872
   ]
  ],
  "allBitmapsMatch": true,
  "bitmapPixelsMillions": 139,
  "scroll": {
   "top": 16938,
   "left": 380,
   "height": 17732,
   "width": 1172,
   "clientW": 412,
   "clientH": 794
  },
  "firstVisiblePage": 12,
  "scrollerRect": [
   0,
   48,
   412,
   794
  ]
 }
}
```

## API-04 · step meminfo pdf-3x-scrolled · 2026-11-11T17:31:59Z · exit 0
```json
{
 "label": "pdf-3x-scrolled",
 "app": {
  "pid": "4003",
  "totalPssKb": 108069,
  "graphicsKb": 0,
  "nativeHeapKb": 10044
 },
 "renderer": {
  "pid": "4086",
  "name": "com.google.android.webview:sandboxed_process0:org.chromium.c",
  "totalPssKb": 119826,
  "graphicsKb": 0,
  "nativeHeapKb": 1284
 }
}
```

## API-01 · step pinch 206 400 300 100 pdf-pinch-in-1x pdf · 2026-11-11T17:32:24Z · exit 0
```json
{
 "gesture": {
  "screenFrom": [
   {
    "x": 147,
    "y": 1178
   },
   {
    "x": 935,
    "y": 1178
   }
  ],
  "screenTo": [
   {
    "x": 410,
    "y": 1178
   },
   {
    "x": 672,
    "y": 1178
   }
  ]
 },
 "before": {
  "pagesCssWidth": 1140,
  "transform": "",
  "canvases": 12,
  "canvasCss": [
   1140,
   1140
  ],
  "canvasBitmap": [
   [
    2992,
    3872
   ],
   [
    2992,
    3872
   ]
  ],
  "allBitmapsMatch": true,
  "bitmapPixelsMillions": 139,
  "scroll": {
   "top": 16938,
   "left": 380,
   "height": 17732,
   "width": 1172,
   "clientW": 412,
   "clientH": 794
  },
  "firstVisiblePage": 12,
  "scrollerRect": [
   0,
   48,
   412,
   794
  ]
 },
 "atLift": {
  "pagesCssWidth": 380,
  "transform": "",
  "canvases": 12,
  "canvasCss": [
   380,
   380
  ],
  "canvasBitmap": [
   [
    997,
    1290
   ],
   [
    997,
    1290
   ]
  ],
  "allBitmapsMatch": true,
  "bitmapPixelsMillions": 15.4,
  "scroll": {
   "top": 5130,
   "left": 0,
   "height": 5924,
   "width": 412,
   "clientW": 412,
   "clientH": 794
  },
  "firstVisiblePage": 11,
  "scrollerRect": [
   0,
   48,
   412,
   794
  ]
 },
 "settled": {
  "pagesCssWidth": 380,
  "transform": "",
  "canvases": 12,
  "canvasCss": [
   380,
   380
  ],
  "canvasBitmap": [
   [
    997,
    1290
   ],
   [
    997,
    1290
   ]
  ],
  "allBitmapsMatch": true,
  "bitmapPixelsMillions": 15.4,
  "scroll": {
   "top": 5130,
   "left": 0,
   "height": 5924,
   "width": 412,
   "clientW": 412,
   "clientH": 794
  },
  "firstVisiblePage": 11,
  "scrollerRect": [
   0,
   48,
   412,
   794
  ]
 },
 "page": {
  "vvScale": 1,
  "vvOffset": [
   0,
   0
  ],
  "docScroll": [
   0,
   0
  ],
  "innerWidth": 412,
  "viewer": true,
  "runScreen": null,
  "title": "resume-472.pdf",
  "back": {
   "x": 4,
   "y": 0,
   "w": 48
  },
  "download": true,
  "touches": {
   "starts": 2,
   "maxTouches": 2,
   "moves": 20
  }
 }
}
```

## Note · the two `dtap` steps above this point were removed from this transcript: the injection sent each event with its own `sendevent` process (11 per tap), so the two taps' ends were more than 300 ms apart and the page saw two single taps (`touches.starts: 2`, no zoom). `droid.mjs` now writes each tap in one write to the device; the steps are rerun below.

## API-01 · step dtap 150 300 pdf-dtap-2x pdf · 2026-11-11T17:33:14Z · exit 0
```json
/tmp/abtest472/tap.bin: 1 file pushed, 0 skipped. 0.2 MB/s (240 bytes in 0.001s)
{
 "before": {
  "pagesCssWidth": 380,
  "transform": "",
  "canvases": 12,
  "canvasCss": [
   380,
   380
  ],
  "canvasBitmap": [
   [
    997,
    1290
   ],
   [
    997,
    1290
   ]
  ],
  "allBitmapsMatch": true,
  "bitmapPixelsMillions": 15.4,
  "scroll": {
   "top": 5130,
   "left": 0,
   "height": 5924,
   "width": 412,
   "clientW": 412,
   "clientH": 794
  },
  "firstVisiblePage": 11,
  "scrollerRect": [
   0,
   48,
   412,
   794
  ]
 },
 "after": {
  "pagesCssWidth": 760,
  "transform": "",
  "canvases": 12,
  "canvasCss": [
   760,
   760
  ],
  "canvasBitmap": [
   [
    1995,
    2581
   ],
   [
    1995,
    2581
   ]
  ],
  "allBitmapsMatch": true,
  "bitmapPixelsMillions": 61.8,
  "scroll": {
   "top": 10496,
   "left": 134,
   "height": 11828,
   "width": 792,
   "clientW": 412,
   "clientH": 794
  },
  "firstVisiblePage": 11,
  "scrollerRect": [
   0,
   48,
   412,
   794
  ]
 },
 "page": {
  "vvScale": 1,
  "vvOffset": [
   0,
   0
  ],
  "docScroll": [
   0,
   0
  ],
  "innerWidth": 412,
  "viewer": true,
  "runScreen": null,
  "title": "resume-472.pdf",
  "back": {
   "x": 4,
   "y": 0,
   "w": 48
  },
  "download": true,
  "touches": {
   "starts": 2,
   "maxTouches": 1,
   "moves": 0
  }
 }
}
```

## API-01 · step dtap 150 300 pdf-dtap-1x pdf · 2026-11-11T17:33:35Z · exit 0
```json
{
 "before": {
  "pagesCssWidth": 760,
  "transform": "",
  "canvases": 12,
  "canvasCss": [
   760,
   760
  ],
  "canvasBitmap": [
   [
    1995,
    2581
   ],
   [
    1995,
    2581
   ]
  ],
  "allBitmapsMatch": true,
  "bitmapPixelsMillions": 61.8,
  "scroll": {
   "top": 10496,
   "left": 134,
   "height": 11828,
   "width": 792,
   "clientW": 412,
   "clientH": 794
  },
  "firstVisiblePage": 11,
  "scrollerRect": [
   0,
   48,
   412,
   794
  ]
 },
 "after": {
  "pagesCssWidth": 380,
  "transform": "",
  "canvases": 12,
  "canvasCss": [
   380,
   380
  ],
  "canvasBitmap": [
   [
    997,
    1290
   ],
   [
    997,
    1290
   ]
  ],
  "allBitmapsMatch": true,
  "bitmapPixelsMillions": 15.4,
  "scroll": {
   "top": 5130,
   "left": 0,
   "height": 5924,
   "width": 412,
   "clientW": 412,
   "clientH": 794
  },
  "firstVisiblePage": 11,
  "scrollerRect": [
   0,
   48,
   412,
   794
  ]
 },
 "page": {
  "vvScale": 1,
  "vvOffset": [
   0,
   0
  ],
  "docScroll": [
   0,
   0
  ],
  "innerWidth": 412,
  "viewer": true,
  "runScreen": null,
  "title": "resume-472.pdf",
  "back": {
   "x": 4,
   "y": 0,
   "w": 48
  },
  "download": true,
  "touches": {
   "starts": 2,
   "maxTouches": 1,
   "moves": 0
  }
 }
}
```

## API-06 · step pinch 206 400 80 160 reload-zoomed pdf · 2026-11-11T17:33:51Z · exit 0
```json
{
 "gesture": {
  "screenFrom": [
   {
    "x": 436,
    "y": 1178
   },
   {
    "x": 646,
    "y": 1178
   }
  ],
  "screenTo": [
   {
    "x": 331,
    "y": 1178
   },
   {
    "x": 751,
    "y": 1178
   }
  ]
 },
 "before": {
  "pagesCssWidth": 380,
  "transform": "",
  "canvases": 12,
  "canvasCss": [
   380,
   380
  ],
  "canvasBitmap": [
   [
    997,
    1290
   ],
   [
    997,
    1290
   ]
  ],
  "allBitmapsMatch": true,
  "bitmapPixelsMillions": 15.4,
  "scroll": {
   "top": 5130,
   "left": 0,
   "height": 5924,
   "width": 412,
   "clientW": 412,
   "clientH": 794
  },
  "firstVisiblePage": 11,
  "scrollerRect": [
   0,
   48,
   412,
   794
  ]
 },
 "atLift": {
  "pagesCssWidth": 759,
  "transform": "",
  "canvases": 12,
  "canvasCss": [
   759,
   759
  ],
  "canvasBitmap": [
   [
    1992,
    2578
   ],
   [
    1992,
    2578
   ]
  ],
  "allBitmapsMatch": true,
  "bitmapPixelsMillions": 61.6,
  "scroll": {
   "top": 10593,
   "left": 190,
   "height": 11816,
   "width": 791,
   "clientW": 412,
   "clientH": 794
  },
  "firstVisiblePage": 11,
  "scrollerRect": [
   0,
   48,
   412,
   794
  ]
 },
 "settled": {
  "pagesCssWidth": 759,
  "transform": "",
  "canvases": 12,
  "canvasCss": [
   759,
   759
  ],
  "canvasBitmap": [
   [
    1992,
    2578
   ],
   [
    1992,
    2578
   ]
  ],
  "allBitmapsMatch": true,
  "bitmapPixelsMillions": 61.6,
  "scroll": {
   "top": 10593,
   "left": 190,
   "height": 11816,
   "width": 791,
   "clientW": 412,
   "clientH": 794
  },
  "firstVisiblePage": 11,
  "scrollerRect": [
   0,
   48,
   412,
   794
  ]
 },
 "page": {
  "vvScale": 1,
  "vvOffset": [
   0,
   0
  ],
  "docScroll": [
   0,
   0
  ],
  "innerWidth": 412,
  "viewer": true,
  "runScreen": null,
  "title": "resume-472.pdf",
  "back": {
   "x": 4,
   "y": 0,
   "w": 48
  },
  "download": true,
  "touches": {
   "starts": 2,
   "maxTouches": 2,
   "moves": 20
  }
 }
}
```

## API-01 · step back · 2026-11-11T17:33:53Z · exit 0
```json
{
 "tapped": {
  "x": 74,
  "y": 190
 },
 "page": {
  "vvScale": 1,
  "vvOffset": [
   0,
   0
  ],
  "docScroll": [
   0,
   0
  ],
  "innerWidth": 412,
  "viewer": false,
  "runScreen": "open",
  "title": null,
  "back": {
   "x": 4,
   "y": 4,
   "w": 48
  },
  "download": false,
  "touches": {
   "starts": 3,
   "maxTouches": 2,
   "moves": 20
  }
 }
}
```

## API-06 · step open resume-472.pdf pdf · 2026-11-11T17:33:55Z · exit 0
```json
{
 "tapped": {
  "x": 339,
  "y": 1603
 },
 "ms": 1968,
 "page": {
  "vvScale": 1,
  "vvOffset": [
   0,
   0
  ],
  "docScroll": [
   0,
   0
  ],
  "innerWidth": 412,
  "viewer": true,
  "runScreen": null,
  "title": "resume-472.pdf",
  "back": {
   "x": 4,
   "y": 0,
   "w": 48
  },
  "download": true,
  "touches": {
   "starts": 4,
   "maxTouches": 2,
   "moves": 20
  }
 },
 "view": {
  "pagesCssWidth": 380,
  "transform": "",
  "canvases": 12,
  "canvasCss": [
   380,
   380
  ],
  "canvasBitmap": [
   [
    997,
    1290
   ],
   [
    997,
    1290
   ]
  ],
  "allBitmapsMatch": true,
  "bitmapPixelsMillions": 15.4,
  "scroll": {
   "top": 0,
   "left": 0,
   "height": 5924,
   "width": 412,
   "clientW": 412,
   "clientH": 794
  },
  "firstVisiblePage": 1,
  "scrollerRect": [
   0,
   48,
   412,
   794
  ]
 }
}
```

## API-06 · step pdf · 2026-11-11T17:33:58Z · exit 0
```json
{
 "page": {
  "vvScale": 1,
  "vvOffset": [
   0,
   0
  ],
  "docScroll": [
   0,
   0
  ],
  "innerWidth": 412,
  "viewer": true,
  "runScreen": null,
  "title": "resume-472.pdf",
  "back": {
   "x": 4,
   "y": 0,
   "w": 48
  },
  "download": true,
  "touches": {
   "starts": 4,
   "maxTouches": 2,
   "moves": 20
  }
 },
 "pdf": {
  "pagesCssWidth": 380,
  "transform": "",
  "canvases": 12,
  "canvasCss": [
   380,
   380
  ],
  "canvasBitmap": [
   [
    997,
    1290
   ],
   [
    997,
    1290
   ]
  ],
  "allBitmapsMatch": true,
  "bitmapPixelsMillions": 15.4,
  "scroll": {
   "top": 0,
   "left": 0,
   "height": 5924,
   "width": 412,
   "clientW": 412,
   "clientH": 794
  },
  "firstVisiblePage": 1,
  "scrollerRect": [
   0,
   48,
   412,
   794
  ]
 }
}
```

## API-06 · step open inside-472.pdf pdf · 2026-11-11T17:34:43Z · exit 1
```json
file:///Users/normy/autobyteus_org/autobyteus-worktrees/phone-viewer-pinch-zoom-472/tickets/in-progress/phone-viewer-pinch-zoom-472/evidence/api-e2e/scripts/droid.mjs:74
export const tap = async sel => { const r = await rect(sel); if (!r) throw new Error(`no ${sel}`); tapxy(r.screenCentre.x, r.screenCentre.y); return r; };
                                                                           ^

Error: no [data-event-monitor-file-action-control="true"][title$="/inside-472.pdf"]
    at tap (file:///Users/normy/autobyteus_org/autobyteus-worktrees/phone-viewer-pinch-zoom-472/tickets/in-progress/phone-viewer-pinch-zoom-472/evidence/api-e2e/scripts/droid.mjs:74:76)
    at async Object.open (file:///Users/normy/autobyteus_org/autobyteus-worktrees/phone-viewer-pinch-zoom-472/tickets/in-progress/phone-viewer-pinch-zoom-472/evidence/api-e2e/scripts/step.mjs:21:15)
    at async file:///Users/normy/autobyteus_org/autobyteus-worktrees/phone-viewer-pinch-zoom-472/tickets/in-progress/phone-viewer-pinch-zoom-472/evidence/api-e2e/scripts/step.mjs:66:28

Node.js v22.23.1
```

## API-06 · step back · 2026-11-11T17:34:55Z · exit 0
```json
{
 "tapped": {
  "x": 74,
  "y": 190
 },
 "page": {
  "vvScale": 1,
  "vvOffset": [
   0,
   0
  ],
  "docScroll": [
   0,
   0
  ],
  "innerWidth": 412,
  "viewer": false,
  "runScreen": "open",
  "title": null,
  "back": {
   "x": 4,
   "y": 4,
   "w": 48
  },
  "download": false,
  "touches": {
   "starts": 5,
   "maxTouches": 2,
   "moves": 20
  }
 }
}
```

## API-06 · step open inside-472.pdf pdf · 2026-11-11T17:35:26Z · exit 0
```json
{
 "tapped": {
  "x": 560,
  "y": 1831
 },
 "ms": 31168,
 "page": {
  "vvScale": 1,
  "vvOffset": [
   0,
   0
  ],
  "docScroll": [
   0,
   0
  ],
  "innerWidth": 412,
  "viewer": false,
  "runScreen": "open",
  "title": null,
  "back": {
   "x": 4,
   "y": 4,
   "w": 48
  },
  "download": false,
  "touches": {
   "starts": 6,
   "maxTouches": 2,
   "moves": 20
  }
 },
 "view": null
}
```

## API-06 · step open inside-472.pdf pdf · 2026-11-11T17:36:10Z · exit 0
```json
{
 "tapped": {
  "x": 560,
  "y": 1800
 },
 "ms": 31057,
 "page": {
  "vvScale": 1,
  "vvOffset": [
   0,
   0
  ],
  "docScroll": [
   0,
   0
  ],
  "innerWidth": 412,
  "viewer": false,
  "runScreen": "open",
  "title": null,
  "back": {
   "x": 4,
   "y": 4,
   "w": 48
  },
  "download": false,
  "touches": {
   "starts": 7,
   "maxTouches": 2,
   "moves": 20
  }
 },
 "view": null
}
```

## API-06 · step open inside-472.pdf pdf · 2026-11-11T17:36:27Z · exit 0
```json
{
 "tapped": {
  "x": 868,
  "y": 1764
 },
 "ms": 2017,
 "page": {
  "vvScale": 1,
  "vvOffset": [
   0,
   0
  ],
  "docScroll": [
   0,
   0
  ],
  "innerWidth": 412,
  "viewer": true,
  "runScreen": null,
  "title": "inside-472.pdf",
  "back": {
   "x": 4,
   "y": 0,
   "w": 48
  },
  "download": true,
  "touches": {
   "starts": 8,
   "maxTouches": 2,
   "moves": 20
  }
 },
 "view": {
  "pagesCssWidth": 380,
  "transform": "",
  "canvases": 12,
  "canvasCss": [
   380,
   380
  ],
  "canvasBitmap": [
   [
    997,
    1290
   ],
   [
    997,
    1290
   ]
  ],
  "allBitmapsMatch": true,
  "bitmapPixelsMillions": 15.4,
  "scroll": {
   "top": 0,
   "left": 0,
   "height": 5924,
   "width": 412,
   "clientW": 412,
   "clientH": 794
  },
  "firstVisiblePage": 1,
  "scrollerRect": [
   0,
   48,
   412,
   794
  ]
 }
}
```

## API-06 · step pinch 206 400 80 160 inside-2x pdf · 2026-11-11T17:36:33Z · exit 0
```json
{
 "gesture": {
  "screenFrom": [
   {
    "x": 436,
    "y": 1178
   },
   {
    "x": 646,
    "y": 1178
   }
  ],
  "screenTo": [
   {
    "x": 331,
    "y": 1178
   },
   {
    "x": 751,
    "y": 1178
   }
  ]
 },
 "before": {
  "pagesCssWidth": 380,
  "transform": "",
  "canvases": 12,
  "canvasCss": [
   380,
   380
  ],
  "canvasBitmap": [
   [
    997,
    1290
   ],
   [
    997,
    1290
   ]
  ],
  "allBitmapsMatch": true,
  "bitmapPixelsMillions": 15.4,
  "scroll": {
   "top": 0,
   "left": 0,
   "height": 5924,
   "width": 412,
   "clientW": 412,
   "clientH": 794
  },
  "firstVisiblePage": 1,
  "scrollerRect": [
   0,
   48,
   412,
   794
  ]
 },
 "atLift": {
  "pagesCssWidth": 759,
  "transform": "",
  "canvases": 12,
  "canvasCss": [
   759,
   759
  ],
  "canvasBitmap": [
   [
    1992,
    2578
   ],
   [
    1992,
    2578
   ]
  ],
  "allBitmapsMatch": true,
  "bitmapPixelsMillions": 61.6,
  "scroll": {
   "top": 336,
   "left": 190,
   "height": 11816,
   "width": 791,
   "clientW": 412,
   "clientH": 794
  },
  "firstVisiblePage": 1,
  "scrollerRect": [
   0,
   48,
   412,
   794
  ]
 },
 "settled": {
  "pagesCssWidth": 759,
  "transform": "",
  "canvases": 12,
  "canvasCss": [
   759,
   759
  ],
  "canvasBitmap": [
   [
    1992,
    2578
   ],
   [
    1992,
    2578
   ]
  ],
  "allBitmapsMatch": true,
  "bitmapPixelsMillions": 61.6,
  "scroll": {
   "top": 336,
   "left": 190,
   "height": 11816,
   "width": 791,
   "clientW": 412,
   "clientH": 794
  },
  "firstVisiblePage": 1,
  "scrollerRect": [
   0,
   48,
   412,
   794
  ]
 },
 "page": {
  "vvScale": 1,
  "vvOffset": [
   0,
   0
  ],
  "docScroll": [
   0,
   0
  ],
  "innerWidth": 412,
  "viewer": true,
  "runScreen": null,
  "title": "inside-472.pdf",
  "back": {
   "x": 4,
   "y": 0,
   "w": 48
  },
  "download": true,
  "touches": {
   "starts": 2,
   "maxTouches": 2,
   "moves": 20
  }
 }
}
```

## API-06 · step swipe 200 700 200 300 inside-2x-scrolled pdf · 2026-11-11T17:36:36Z · exit 0
```json
{
 "before": {
  "pagesCssWidth": 759,
  "transform": "",
  "canvases": 12,
  "canvasCss": [
   759,
   759
  ],
  "canvasBitmap": [
   [
    1992,
    2578
   ],
   [
    1992,
    2578
   ]
  ],
  "allBitmapsMatch": true,
  "bitmapPixelsMillions": 61.6,
  "scroll": {
   "top": 336,
   "left": 190,
   "height": 11816,
   "width": 791,
   "clientW": 412,
   "clientH": 794
  },
  "firstVisiblePage": 1,
  "scrollerRect": [
   0,
   48,
   412,
   794
  ]
 },
 "after": {
  "pagesCssWidth": 759,
  "transform": "",
  "canvases": 12,
  "canvasCss": [
   759,
   759
  ],
  "canvasBitmap": [
   [
    1992,
    2578
   ],
   [
    1992,
    2578
   ]
  ],
  "allBitmapsMatch": true,
  "bitmapPixelsMillions": 61.6,
  "scroll": {
   "top": 834,
   "left": 190,
   "height": 11816,
   "width": 791,
   "clientW": 412,
   "clientH": 794
  },
  "firstVisiblePage": 1,
  "scrollerRect": [
   0,
   48,
   412,
   794
  ]
 },
 "page": {
  "vvScale": 1,
  "vvOffset": [
   0,
   0
  ],
  "docScroll": [
   0,
   0
  ],
  "innerWidth": 412,
  "viewer": true,
  "runScreen": null,
  "title": "inside-472.pdf",
  "back": {
   "x": 4,
   "y": 0,
   "w": 48
  },
  "download": true,
  "touches": {
   "starts": 1,
   "maxTouches": 1,
   "moves": 5
  }
 }
}
```

## API-06 · step live-refresh · 2026-11-11T17:37:02Z · exit 0
```json
{
 "before": {
  "w": 759,
  "scroll": {
   "top": 834,
   "left": 190,
   "height": 11816,
   "width": 791,
   "clientW": 412,
   "clientH": 794
  }
 },
 "sawLoading": false,
 "changes": [
  {
   "ms": 53,
   "loading": false,
   "w": 759,
   "top": 834,
   "left": 190
  }
 ],
 "after": {
  "w": 759,
  "scroll": {
   "top": 834,
   "left": 190,
   "height": 11816,
   "width": 791,
   "clientW": 412,
   "clientH": 794
  },
  "firstVisiblePage": 1,
  "allBitmapsMatch": true
 }
}
```

## API-02 · step back · 2026-11-11T17:37:21Z · exit 0
```json
{
 "tapped": {
  "x": 74,
  "y": 190
 },
 "page": {
  "vvScale": 1,
  "vvOffset": [
   0,
   0
  ],
  "docScroll": [
   0,
   0
  ],
  "innerWidth": 412,
  "viewer": false,
  "runScreen": "open",
  "title": null,
  "back": {
   "x": 4,
   "y": 4,
   "w": 48
  },
  "download": false,
  "touches": {
   "starts": 2,
   "maxTouches": 1,
   "moves": 5
  }
 }
}
```

## API-02 · step open photo-472.png image · 2026-11-11T17:37:23Z · exit 0
```json
{
 "tapped": {
  "x": 638,
  "y": 1132
 },
 "ms": 1317,
 "page": {
  "vvScale": 1,
  "vvOffset": [
   0,
   0
  ],
  "docScroll": [
   0,
   0
  ],
  "innerWidth": 412,
  "viewer": true,
  "runScreen": null,
  "title": "photo-472.png",
  "back": {
   "x": 4,
   "y": 0,
   "w": 48
  },
  "download": true,
  "touches": {
   "starts": 3,
   "maxTouches": 1,
   "moves": 5
  }
 },
 "view": {
  "transform": "translate(0px, 0px) scale(1)",
  "layer": [
   0,
   48,
   412,
   794
  ],
  "picture": [
   0,
   48,
   412,
   794
  ],
  "natural": [
   1200,
   800
  ],
  "imgRect": [
   0,
   48,
   412,
   794
  ]
 }
}
```

## API-02 · step pinch 206 400 80 240 image-pinch-out image · 2026-11-11T17:37:29Z · exit 0
```json
{
 "gesture": {
  "screenFrom": [
   {
    "x": 436,
    "y": 1178
   },
   {
    "x": 646,
    "y": 1178
   }
  ],
  "screenTo": [
   {
    "x": 226,
    "y": 1178
   },
   {
    "x": 856,
    "y": 1178
   }
  ]
 },
 "before": {
  "transform": "translate(0px, 0px) scale(1)",
  "layer": [
   0,
   48,
   412,
   794
  ],
  "picture": [
   0,
   48,
   412,
   794
  ],
  "natural": [
   1200,
   800
  ],
  "imgRect": [
   0,
   48,
   412,
   794
  ]
 },
 "atLift": {
  "transform": "translate(-412.493px, -778.917px) scale(2.99968)",
  "layer": [
   0,
   48,
   412,
   794
  ],
  "picture": [
   -412,
   -731,
   1236,
   2383
  ],
  "natural": [
   1200,
   800
  ],
  "imgRect": [
   -412,
   -731,
   1236,
   2383
  ]
 },
 "settled": {
  "transform": "translate(-412.493px, -778.917px) scale(2.99968)",
  "layer": [
   0,
   48,
   412,
   794
  ],
  "picture": [
   -412,
   -731,
   1236,
   2383
  ],
  "natural": [
   1200,
   800
  ],
  "imgRect": [
   -412,
   -731,
   1236,
   2383
  ]
 },
 "page": {
  "vvScale": 1,
  "vvOffset": [
   0,
   0
  ],
  "docScroll": [
   0,
   0
  ],
  "innerWidth": 412,
  "viewer": true,
  "runScreen": null,
  "title": "photo-472.png",
  "back": {
   "x": 4,
   "y": 0,
   "w": 48
  },
  "download": true,
  "touches": {
   "starts": 2,
   "maxTouches": 2,
   "moves": 20
  }
 }
}
```

## API-02 · step swipe 250 500 100 300 image-pan image · 2026-11-11T17:37:41Z · exit 0
```json
{
 "before": {
  "transform": "translate(-412.493px, -778.917px) scale(2.99968)",
  "layer": [
   0,
   48,
   412,
   794
  ],
  "picture": [
   -412,
   -731,
   1236,
   2383
  ],
  "natural": [
   1200,
   800
  ],
  "imgRect": [
   -412,
   -731,
   1236,
   2383
  ]
 },
 "after": {
  "transform": "translate(-554.422px, -808.829px) scale(2.99968)",
  "layer": [
   0,
   48,
   412,
   794
  ],
  "picture": [
   -554,
   -761,
   1236,
   2383
  ],
  "natural": [
   1200,
   800
  ],
  "imgRect": [
   -554,
   -761,
   1236,
   2383
  ]
 },
 "page": {
  "vvScale": 1,
  "vvOffset": [
   0,
   0
  ],
  "docScroll": [
   0,
   0
  ],
  "innerWidth": 412,
  "viewer": true,
  "runScreen": null,
  "title": "photo-472.png",
  "back": {
   "x": 4,
   "y": 0,
   "w": 48
  },
  "download": true,
  "touches": {
   "starts": 1,
   "maxTouches": 1,
   "moves": 11
  }
 }
}
```

## API-02 · step dtap 206 400 image-dtap-fit image · 2026-11-11T17:37:49Z · exit 0
```json
{
 "before": {
  "transform": "translate(-624.584px, -808.829px) scale(2.99968)",
  "layer": [
   0,
   48,
   412,
   794
  ],
  "picture": [
   -625,
   -761,
   1236,
   2383
  ],
  "natural": [
   1200,
   800
  ],
  "imgRect": [
   -625,
   -761,
   1236,
   2383
  ]
 },
 "after": {
  "transform": "translate(0px, 0px) scale(1)",
  "layer": [
   0,
   48,
   412,
   794
  ],
  "picture": [
   0,
   48,
   412,
   794
  ],
  "natural": [
   1200,
   800
  ],
  "imgRect": [
   0,
   48,
   412,
   794
  ]
 },
 "page": {
  "vvScale": 1,
  "vvOffset": [
   0,
   0
  ],
  "docScroll": [
   0,
   0
  ],
  "innerWidth": 412,
  "viewer": true,
  "runScreen": null,
  "title": "photo-472.png",
  "back": {
   "x": 4,
   "y": 0,
   "w": 48
  },
  "download": true,
  "touches": {
   "starts": 2,
   "maxTouches": 1,
   "moves": 0
  }
 }
}
```

## API-02 · step dtap 206 400 image-dtap-fill image · 2026-11-11T17:37:51Z · exit 0
```json
{
 "before": {
  "transform": "translate(0px, 0px) scale(1)",
  "layer": [
   0,
   48,
   412,
   794
  ],
  "picture": [
   0,
   48,
   412,
   794
  ],
  "natural": [
   1200,
   800
  ],
  "imgRect": [
   0,
   48,
   412,
   794
  ]
 },
 "after": {
  "transform": "translate(-389.5px, -750.638px) scale(2.89078)",
  "layer": [
   0,
   48,
   412,
   794
  ],
  "picture": [
   -389,
   -703,
   1192,
   2296
  ],
  "natural": [
   1200,
   800
  ],
  "imgRect": [
   -389,
   -703,
   1192,
   2296
  ]
 },
 "page": {
  "vvScale": 1,
  "vvOffset": [
   0,
   0
  ],
  "docScroll": [
   0,
   0
  ],
  "innerWidth": 412,
  "viewer": true,
  "runScreen": null,
  "title": "photo-472.png",
  "back": {
   "x": 4,
   "y": 0,
   "w": 48
  },
  "download": true,
  "touches": {
   "starts": 2,
   "maxTouches": 1,
   "moves": 0
  }
 }
}
```

## Note · the first Download step of photo-472.png (removed here) saved the file correctly (`Download/photo-472.png`, 149581 bytes, sha256 e151a304…1831 = the node's file) but read the toast with `uiautomator dump`, which does not list a toast on Android 15; the file was removed from Downloads and the step rerun with `uiautomator events` below.

## API-03 · step download photo-472.png dl-photo · 2026-11-11T17:39:35Z · exit 0
```json
{
 "file": "photo-472.png",
 "toast": {
  "text": "Saved to Downloads: photo-472.png, AutoByteus",
  "seenWithin": 1490
 },
 "downloadsBefore": "No result found.",
 "downloadsRow": "Row: 0 _display_name=photo-472.png, _size=149581, relative_path=Download/, is_pending=0",
 "saved": {
  "bytes": 149581,
  "sha256": "e151a304cb0a6a1641e77ed4f52128728866dea77c0167d786f1f64c0b0d1831"
 },
 "expected": {
  "bytes": 149581,
  "sha256": "e151a304cb0a6a1641e77ed4f52128728866dea77c0167d786f1f64c0b0d1831"
 },
 "sameBytes": true,
 "toastMsAfterTap": 1490,
 "page": {
  "viewer": true,
  "title": "photo-472.png"
 }
}
```

## API-02 · step back · 2026-11-11T17:39:46Z · exit 0
```json
{
 "tapped": {
  "x": 74,
  "y": 190
 },
 "page": {
  "vvScale": 1,
  "vvOffset": [
   0,
   0
  ],
  "docScroll": [
   0,
   0
  ],
  "innerWidth": 412,
  "viewer": false,
  "runScreen": "open",
  "title": null,
  "back": {
   "x": 4,
   "y": 4,
   "w": 48
  },
  "download": false,
  "touches": {
   "starts": 5,
   "maxTouches": 1,
   "moves": 0
  }
 }
}
```

## API-03 · step open resume-472.pdf pdf · 2026-11-11T17:39:49Z · exit 0
```json
{
 "tapped": {
  "x": 339,
  "y": 1132
 },
 "ms": 2050,
 "page": {
  "vvScale": 1,
  "vvOffset": [
   0,
   0
  ],
  "docScroll": [
   0,
   0
  ],
  "innerWidth": 412,
  "viewer": true,
  "runScreen": null,
  "title": "resume-472.pdf",
  "back": {
   "x": 4,
   "y": 0,
   "w": 48
  },
  "download": true,
  "touches": {
   "starts": 6,
   "maxTouches": 1,
   "moves": 0
  }
 },
 "view": {
  "pagesCssWidth": 380,
  "transform": "",
  "canvases": 12,
  "canvasCss": [
   380,
   380
  ],
  "canvasBitmap": [
   [
    997,
    1290
   ],
   [
    997,
    1290
   ]
  ],
  "allBitmapsMatch": true,
  "bitmapPixelsMillions": 15.4,
  "scroll": {
   "top": 0,
   "left": 0,
   "height": 5924,
   "width": 412,
   "clientW": 412,
   "clientH": 794
  },
  "firstVisiblePage": 1,
  "scrollerRect": [
   0,
   48,
   412,
   794
  ]
 }
}
```

## API-03 · step download resume-472.pdf dl-resume · 2026-11-11T17:39:54Z · exit 0
```json
{
 "file": "resume-472.pdf",
 "toast": {
  "text": "Saved to Downloads: resume-472.pdf, AutoByteus",
  "seenWithin": 1735
 },
 "downloadsBefore": "Row: 0 _display_name=photo-472.png, _size=149581, relative_path=Download/, is_pending=0",
 "downloadsRow": "Row: 1 _display_name=resume-472.pdf, _size=105463, relative_path=Download/, is_pending=0",
 "saved": {
  "bytes": 105463,
  "sha256": "53d553eb1e85a47501f40a4ff82c197b3144cb0da255b0b9ba9fc06036195b09"
 },
 "expected": {
  "bytes": 105463,
  "sha256": "53d553eb1e85a47501f40a4ff82c197b3144cb0da255b0b9ba9fc06036195b09"
 },
 "sameBytes": true,
 "toastMsAfterTap": 1735,
 "page": {
  "viewer": true,
  "title": "resume-472.pdf"
 }
}
```

## API-03 · step back · 2026-11-11T17:39:57Z · exit 0
```json
{
 "tapped": {
  "x": 74,
  "y": 190
 },
 "page": {
  "vvScale": 1,
  "vvOffset": [
   0,
   0
  ],
  "docScroll": [
   0,
   0
  ],
  "innerWidth": 412,
  "viewer": false,
  "runScreen": "open",
  "title": null,
  "back": {
   "x": 4,
   "y": 4,
   "w": 48
  },
  "download": false,
  "touches": {
   "starts": 8,
   "maxTouches": 1,
   "moves": 0
  }
 }
}
```

## API-05 · step open big-472.pdf pdf · 2026-11-11T17:40:04Z · exit 0
```json
{
 "tapped": {
  "x": 823,
  "y": 1095
 },
 "ms": 6672,
 "page": {
  "vvScale": 1,
  "vvOffset": [
   0,
   0
  ],
  "docScroll": [
   0,
   0
  ],
  "innerWidth": 412,
  "viewer": true,
  "runScreen": null,
  "title": "big-472.pdf",
  "back": {
   "x": 4,
   "y": 0,
   "w": 48
  },
  "download": true,
  "touches": {
   "starts": 9,
   "maxTouches": 1,
   "moves": 0
  }
 },
 "view": {
  "pagesCssWidth": 380,
  "transform": "",
  "canvases": 2,
  "canvasCss": [
   380,
   380
  ],
  "canvasBitmap": [
   [
    997,
    1290
   ],
   [
    997,
    1290
   ]
  ],
  "allBitmapsMatch": true,
  "bitmapPixelsMillions": 2.6,
  "scroll": {
   "top": 0,
   "left": 0,
   "height": 1014,
   "width": 412,
   "clientW": 412,
   "clientH": 794
  },
  "firstVisiblePage": 1,
  "scrollerRect": [
   0,
   48,
   412,
   794
  ]
 }
}
```

## API-05 · step meminfo big-open · 2026-11-11T17:40:05Z · exit 0
```json
{
 "label": "big-open",
 "app": {
  "pid": "4003",
  "totalPssKb": 119717,
  "graphicsKb": 0,
  "nativeHeapKb": 5900
 },
 "renderer": {
  "pid": "4086",
  "name": "com.google.android.webview:sandboxed_process0:org.chromium.c",
  "totalPssKb": 219702,
  "graphicsKb": 0,
  "nativeHeapKb": 284
 }
}
```

## API-05 · step download big-472.pdf dl-big · 2026-11-11T17:40:18Z · exit 0
```json
{
 "file": "big-472.pdf",
 "toast": {
  "text": "Saved to Downloads: big-472.pdf, AutoByteus",
  "seenWithin": 3339
 },
 "downloadsBefore": "Row: 0 _display_name=photo-472.png, _size=149581, relative_path=Download/, is_pending=0\nRow: 1 _display_name=resume-472.pdf, _size=105463, relative_path=Download/, is_pending=0",
 "downloadsRow": "Row: 2 _display_name=big-472.pdf, _size=25239558, relative_path=Download/, is_pending=0",
 "saved": {
  "bytes": 25239558,
  "sha256": "c68752c4d3dbbf0f0286c97c589d6ae6806d679c3477c6d0ef3596f7196c9039"
 },
 "expected": {
  "bytes": 25239558,
  "sha256": "c68752c4d3dbbf0f0286c97c589d6ae6806d679c3477c6d0ef3596f7196c9039"
 },
 "sameBytes": true,
 "toastMsAfterTap": 3339,
 "page": {
  "viewer": true,
  "title": "big-472.pdf"
 }
}
```

## API-05 · step meminfo big-after-download · 2026-11-11T17:40:18Z · exit 0
```json
{
 "label": "big-after-download",
 "app": {
  "pid": "4003",
  "totalPssKb": 206395,
  "graphicsKb": 0,
  "nativeHeapKb": 5264
 },
 "renderer": {
  "pid": "4086",
  "name": "com.google.android.webview:sandboxed_process0:org.chromium.c",
  "totalPssKb": 291047,
  "graphicsKb": 0,
  "nativeHeapKb": 724
 }
}
```

## API-03 · step refused-saves · 2026-11-11T17:41:20Z · exit 0
```json
[
 {
  "label": "text/plain",
  "fileName": "notes-472.txt",
  "mimeType": "text/plain",
  "sent": "sent",
  "toasts": [],
  "addedToDownloads": []
 },
 {
  "label": "path in name",
  "fileName": "../../evil-472.pdf",
  "mimeType": "application/pdf",
  "sent": "sent",
  "toasts": [],
  "addedToDownloads": []
 },
 {
  "label": "folder in name",
  "fileName": "sub/evil-472.pdf",
  "mimeType": "application/pdf",
  "sent": "sent",
  "toasts": [],
  "addedToDownloads": []
 },
 {
  "label": "pdf type, png name",
  "fileName": "evil-472.png",
  "mimeType": "application/pdf",
  "sent": "sent",
  "toasts": [],
  "addedToDownloads": []
 },
 {
  "label": "html",
  "fileName": "evil-472.html",
  "mimeType": "text/html",
  "sent": "sent",
  "toasts": [],
  "addedToDownloads": []
 },
 {
  "label": "valid (control)",
  "fileName": "control-472.pdf",
  "mimeType": "application/pdf",
  "sent": "sent",
  "toasts": [
   "Saved to Downloads: control-472.pdf, AutoByteus"
  ],
  "addedToDownloads": [
   "Row: 3 _display_name=control-472.pdf"
  ]
 }
]
```

## API-03 · step back · 2026-11-11T17:41:30Z · exit 0
```json
{
 "tapped": {
  "x": 74,
  "y": 190
 },
 "page": {
  "vvScale": 1,
  "vvOffset": [
   0,
   0
  ],
  "docScroll": [
   0,
   0
  ],
  "innerWidth": 412,
  "viewer": false,
  "runScreen": "open",
  "title": null,
  "back": {
   "x": 4,
   "y": 4,
   "w": 48
  },
  "download": false,
  "touches": {
   "starts": 11,
   "maxTouches": 1,
   "moves": 0
  }
 }
}
```

