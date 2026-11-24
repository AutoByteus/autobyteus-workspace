#!/bin/bash
# Temporary (574 r4): readable timecode crops of a landscape recording. Usage: tc-strip.sh <label> <epoch ms anchor> <seconds before> <duration> <out>
cd /tmp/api574/ios-results; S=$(cat $1.since.txt)
O=$(node -e "console.log(Math.max(0,(($2-$S+1000)/1000-$3)).toFixed(2))")
ffmpeg -v fatal -ss $O -i $1.mp4 -t $4 -vf "fps=2,transpose=2,crop=1250:130:280:30,scale=500:-1,drawtext=text='+%{pts\:flt}':x=380:y=5:fontsize=22:fontcolor=white:box=1:boxcolor=black,tile=2x$(node -e "console.log(Math.ceil($4))")" -frames:v 1 cw/$5.png -y
