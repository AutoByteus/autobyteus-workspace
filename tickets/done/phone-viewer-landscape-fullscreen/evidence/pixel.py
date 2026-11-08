"""Print the RGB of a PNG at the given points: python3 -I pixel.py <png> x,y [x,y ...] (no third-party modules)."""
import struct
import sys
import zlib

data = open(sys.argv[1], "rb").read()
assert data[:8] == b"\x89PNG\r\n\x1a\n"
pos, idat = 8, b""
while pos < len(data):
    length = struct.unpack(">I", data[pos:pos + 4])[0]
    kind, body = data[pos + 4:pos + 8], data[pos + 8:pos + 8 + length]
    if kind == b"IHDR":
        width, height, _, colour = struct.unpack(">IIBB", body[:10])
    if kind == b"IDAT":
        idat += body
    pos += 12 + length
raw = zlib.decompress(idat)
bpp = 4 if colour == 6 else 3
stride = width * bpp
rows, prev, i = [], bytearray(stride), 0
for _ in range(height):
    kind, line = raw[i], bytearray(raw[i + 1:i + 1 + stride])
    i += 1 + stride
    for x in range(stride):
        a = line[x - bpp] if x >= bpp else 0
        b = prev[x]
        c = prev[x - bpp] if x >= bpp else 0
        if kind == 1:
            line[x] = (line[x] + a) & 255
        elif kind == 2:
            line[x] = (line[x] + b) & 255
        elif kind == 3:
            line[x] = (line[x] + ((a + b) >> 1)) & 255
        elif kind == 4:
            p = a + b - c
            pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
            line[x] = (line[x] + (a if pa <= pb and pa <= pc else (b if pb <= pc else c))) & 255
    rows.append(line)
    prev = line
for point in sys.argv[2:]:
    x, y = map(int, point.split(","))
    print(f"({x},{y}) rgb{tuple(rows[y][x * bpp:x * bpp + 3])}")
