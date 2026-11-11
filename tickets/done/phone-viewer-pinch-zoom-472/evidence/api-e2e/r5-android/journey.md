# autobyteus-472 Android journeys, round 5 (merged state with IR-004, code 1d2d2d9de3; emulator-5640, AVD recreated, Android 15; APK unchanged; phone bundle rebuilt)

F-3 recheck: traced live refreshes (the restore must land on the whole layout, height 11816), a pinch and a double-tap anchor on a lower page, the image refresh.

## API-06 · step open live-472.pdf pdf · 2026-11-11T21:53:57Z · exit 0
```json
{
 "tapped": {
  "x": 800,
  "y": 1764
 },
 "ms": 1990,
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
  "title": "live-472.pdf",
  "back": {
   "x": 4,
   "y": 0,
   "w": 48
  },
  "download": true,
  "touches": null
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

## API-06 · step pinch 206 400 80 160 r5-pdf-2x pdf · 2026-11-11T21:54:03Z · exit 0
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
  "title": "live-472.pdf",
  "back": {
   "x": 4,
   "y": 0,
   "w": 48
  },
  "download": true,
  "touches": {
   "starts": 2,
   "maxTouches": 2,
   "moves": 20,
   "ends": [
    48153,
    48186
   ]
  }
 }
}
```

## Note · traced refreshes (raw JSON in r5-android/late-trials.json, restore-trace.json): 10 of 10 restored at height 11816 with all 12 canvases sized, positions exact; partial frames 1832, 2664 and 9320 occurred and were waited out.

## API-01 · step pinch 206 500 80 160 r5-anchor-pinch pdf · 2026-11-11T21:56:09Z · exit 0
```json
{
 "gesture": {
  "screenFrom": [
   {
    "x": 436,
    "y": 1441
   },
   {
    "x": 646,
    "y": 1441
   }
  ],
  "screenTo": [
   {
    "x": 331,
    "y": 1441
   },
   {
    "x": 751,
    "y": 1441
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
   "top": 3500,
   "left": 0,
   "height": 5924,
   "width": 412,
   "clientW": 412,
   "clientH": 794
  },
  "firstVisiblePage": 8,
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
   "top": 7435,
   "left": 190,
   "height": 11816,
   "width": 791,
   "clientW": 412,
   "clientH": 794
  },
  "firstVisiblePage": 8,
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
   "top": 7435,
   "left": 190,
   "height": 11816,
   "width": 791,
   "clientW": 412,
   "clientH": 794
  },
  "firstVisiblePage": 8,
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
  "title": "live-472.pdf",
  "back": {
   "x": 4,
   "y": 0,
   "w": 48
  },
  "download": true,
  "touches": {
   "starts": 2,
   "maxTouches": 2,
   "moves": 20,
   "ends": [
    174081,
    174156
   ]
  }
 }
}
```

## API-01 · step dtap 150 600 r5-anchor-dtap-out pdf · 2026-11-11T21:56:24Z · exit 0
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
   "top": 7435,
   "left": 190,
   "height": 11816,
   "width": 791,
   "clientW": 412,
   "clientH": 794
  },
  "firstVisiblePage": 8,
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
   "top": 3450,
   "left": 0,
   "height": 5924,
   "width": 412,
   "clientW": 412,
   "clientH": 794
  },
  "firstVisiblePage": 8,
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
  "title": "live-472.pdf",
  "back": {
   "x": 4,
   "y": 0,
   "w": 48
  },
  "download": true,
  "touches": {
   "starts": 2,
   "maxTouches": 1,
   "moves": 0,
   "ends": [
    188439,
    188572
   ]
  }
 }
}
```

## API-01 · step dtap 150 600 r5-anchor-dtap-in pdf · 2026-11-11T21:56:27Z · exit 0
```json
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
   "top": 3450,
   "left": 0,
   "height": 5924,
   "width": 412,
   "clientW": 412,
   "clientH": 794
  },
  "firstVisiblePage": 8,
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
   "top": 7435,
   "left": 134,
   "height": 11828,
   "width": 792,
   "clientW": 412,
   "clientH": 794
  },
  "firstVisiblePage": 8,
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
  "title": "live-472.pdf",
  "back": {
   "x": 4,
   "y": 0,
   "w": 48
  },
  "download": true,
  "touches": {
   "starts": 2,
   "maxTouches": 1,
   "moves": 0,
   "ends": [
    191643,
    191790
   ]
  }
 }
}
```

## API-01 · step pinch 206 450 80 120 r5-anchor-pinch-3x pdf · 2026-11-11T21:56:33Z · exit 0
```json
{
 "gesture": {
  "screenFrom": [
   {
    "x": 436,
    "y": 1309
   },
   {
    "x": 646,
    "y": 1309
   }
  ],
  "screenTo": [
   {
    "x": 383,
    "y": 1309
   },
   {
    "x": 698,
    "y": 1309
   }
  ]
 },
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
   "top": 7435,
   "left": 134,
   "height": 11828,
   "width": 792,
   "clientW": 412,
   "clientH": 794
  },
  "firstVisiblePage": 8,
  "scrollerRect": [
   0,
   48,
   412,
   794
  ]
 },
 "atLift": {
  "pagesCssWidth": 1139,
  "transform": "",
  "canvases": 12,
  "canvasCss": [
   1139,
   1139
  ],
  "canvasBitmap": [
   [
    2989,
    3869
   ],
   [
    2989,
    3869
   ]
  ],
  "allBitmapsMatch": true,
  "bitmapPixelsMillions": 138.8,
  "scroll": {
   "top": 11344,
   "left": 296,
   "height": 17720,
   "width": 1171,
   "clientW": 412,
   "clientH": 794
  },
  "firstVisiblePage": 8,
  "scrollerRect": [
   0,
   48,
   412,
   794
  ]
 },
 "settled": {
  "pagesCssWidth": 1139,
  "transform": "",
  "canvases": 12,
  "canvasCss": [
   1139,
   1139
  ],
  "canvasBitmap": [
   [
    2989,
    3869
   ],
   [
    2989,
    3869
   ]
  ],
  "allBitmapsMatch": true,
  "bitmapPixelsMillions": 138.8,
  "scroll": {
   "top": 11344,
   "left": 296,
   "height": 17720,
   "width": 1171,
   "clientW": 412,
   "clientH": 794
  },
  "firstVisiblePage": 8,
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
  "title": "live-472.pdf",
  "back": {
   "x": 4,
   "y": 0,
   "w": 48
  },
  "download": true,
  "touches": {
   "starts": 2,
   "maxTouches": 2,
   "moves": 20,
   "ends": [
    198160,
    198354
   ]
  }
 }
}
```

## API-06 · step back · 2026-11-11T21:56:44Z · exit 0
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
   "moves": 20,
   "ends": [
    198160,
    198354,
    207750
   ]
  }
 }
}
```

## API-06 · step open live-472.png image · 2026-11-11T21:56:46Z · exit 0
```json
{
 "tapped": {
  "x": 461,
  "y": 1837
 },
 "ms": 1372,
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
  "title": "live-472.png",
  "back": {
   "x": 4,
   "y": 0,
   "w": 48
  },
  "download": true,
  "touches": {
   "starts": 4,
   "maxTouches": 2,
   "moves": 20,
   "ends": [
    198160,
    198354,
    207750,
    210239
   ]
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

## API-06 · step pinch 206 400 80 200 r5-img-zoom image · 2026-11-11T21:56:52Z · exit 0
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
  "transform": "translate(-309.548px, -595.373px) scale(2.49968)",
  "layer": [
   0,
   48,
   412,
   794
  ],
  "picture": [
   -310,
   -547,
   1030,
   1985
  ],
  "natural": [
   1200,
   800
  ],
  "imgRect": [
   -310,
   -547,
   1030,
   1985
  ]
 },
 "settled": {
  "transform": "translate(-309.548px, -595.373px) scale(2.49968)",
  "layer": [
   0,
   48,
   412,
   794
  ],
  "picture": [
   -310,
   -547,
   1030,
   1985
  ],
  "natural": [
   1200,
   800
  ],
  "imgRect": [
   -310,
   -547,
   1030,
   1985
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
  "title": "live-472.png",
  "back": {
   "x": 4,
   "y": 0,
   "w": 48
  },
  "download": true,
  "touches": {
   "starts": 2,
   "maxTouches": 2,
   "moves": 20,
   "ends": [
    217104,
    217104
   ]
  }
 }
}
```

## API-06 · step swipe 250 500 120 380 r5-img-pan image · 2026-11-11T21:56:55Z · exit 0
```json
{
 "before": {
  "transform": "translate(-309.548px, -595.373px) scale(2.49968)",
  "layer": [
   0,
   48,
   412,
   794
  ],
  "picture": [
   -310,
   -547,
   1030,
   1985
  ],
  "natural": [
   1200,
   800
  ],
  "imgRect": [
   -310,
   -547,
   1030,
   1985
  ]
 },
 "after": {
  "transform": "translate(-430.359px, -595.373px) scale(2.49968)",
  "layer": [
   0,
   48,
   412,
   794
  ],
  "picture": [
   -430,
   -547,
   1030,
   1985
  ],
  "natural": [
   1200,
   800
  ],
  "imgRect": [
   -430,
   -547,
   1030,
   1985
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
  "title": "live-472.png",
  "back": {
   "x": 4,
   "y": 0,
   "w": 48
  },
  "download": true,
  "touches": {
   "starts": 1,
   "maxTouches": 1,
   "moves": 13,
   "ends": [
    218885
   ]
  }
 }
}
```

## API-06 · step image-content · 2026-11-11T21:57:17Z · exit 0
```json
{
 "rewrote": "rewrote live-472.png in place",
 "before": {
  "view": {
   "transform": "translate(-430.359px, -595.373px) scale(2.49968)",
   "layer": [
    0,
    48,
    412,
    794
   ],
   "picture": [
    -430,
    -547,
    1030,
    1985
   ],
   "natural": [
    1200,
    800
   ],
   "imgRect": [
    -430,
    -547,
    1030,
    1985
   ]
  },
  "shown": {
   "src": "blob:http://10.0.2.2:59498/652cc4ee-965…",
   "srcFull": 63,
   "red": 230,
   "loading": false
  }
 },
 "samples": [
  {
   "ms": 100,
   "src": "blob:http://10.0.2.2:59498/652cc4ee-965…",
   "srcFull": 63,
   "red": 230,
   "loading": false,
   "transform": "translate(-430.359px, -595.373px) scale(2.49968)"
  },
  {
   "ms": 670,
   "transform": "translate(-430.359px, -595.373px) scale(2.49968)"
  },
  {
   "ms": 958,
   "src": "blob:http://10.0.2.2:59498/2d2b034e-ebc…",
   "srcFull": 63,
   "red": 120,
   "loading": false,
   "transform": "translate(-430.359px, -595.373px) scale(2.49968)"
  }
 ],
 "after": {
  "view": {
   "transform": "translate(-430.359px, -595.373px) scale(2.49968)",
   "layer": [
    0,
    48,
    412,
    794
   ],
   "picture": [
    -430,
    -547,
    1030,
    1985
   ],
   "natural": [
    1200,
    800
   ],
   "imgRect": [
    -430,
    -547,
    1030,
    1985
   ]
  },
  "shown": {
   "src": "blob:http://10.0.2.2:59498/2d2b034e-ebc…",
   "srcFull": 63,
   "red": 120,
   "loading": false
  }
 }
}
```

## API-06 · step image-content · 2026-11-11T21:57:37Z · exit 0
```json
{
 "rewrote": "rewrote live-472.png in place",
 "before": {
  "view": {
   "transform": "translate(-430.359px, -595.373px) scale(2.49968)",
   "layer": [
    0,
    48,
    412,
    794
   ],
   "picture": [
    -430,
    -547,
    1030,
    1985
   ],
   "natural": [
    1200,
    800
   ],
   "imgRect": [
    -430,
    -547,
    1030,
    1985
   ]
  },
  "shown": {
   "src": "blob:http://10.0.2.2:59498/2d2b034e-ebc…",
   "srcFull": 63,
   "red": 120,
   "loading": false
  }
 },
 "samples": [
  {
   "ms": 104,
   "src": "blob:http://10.0.2.2:59498/2d2b034e-ebc…",
   "srcFull": 63,
   "red": 120,
   "loading": false,
   "transform": "translate(-430.359px, -595.373px) scale(2.49968)"
  },
  {
   "ms": 690,
   "transform": "translate(-430.359px, -595.373px) scale(2.49968)"
  },
  {
   "ms": 991,
   "src": "blob:http://10.0.2.2:59498/d4b99747-530…",
   "srcFull": 63,
   "red": 120,
   "loading": false,
   "transform": "translate(-430.359px, -595.373px) scale(2.49968)"
  }
 ],
 "after": {
  "view": {
   "transform": "translate(-430.359px, -595.373px) scale(2.49968)",
   "layer": [
    0,
    48,
    412,
    794
   ],
   "picture": [
    -430,
    -547,
    1030,
    1985
   ],
   "natural": [
    1200,
    800
   ],
   "imgRect": [
    -430,
    -547,
    1030,
    1985
   ]
  },
  "shown": {
   "src": "blob:http://10.0.2.2:59498/d4b99747-530…",
   "srcFull": 63,
   "red": 120,
   "loading": false
  }
 }
}
```

