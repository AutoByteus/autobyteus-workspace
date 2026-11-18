# Test files for the API-02 Docker probe (autobyteus-436): Markdown, PNG, a large PDF (~18 MB, one page with a raw RGB image).
import sys, os, zlib, struct
d = sys.argv[1]; os.makedirs(d, exist_ok=True); os.makedirs(os.path.join(d, 'a-folder'), exist_ok=True)
open(os.path.join(d, 'ac005-notes.md'), 'w').write('# AC-005 shared note\n\nSHARED-MARKER-436: this file lives in the node\'s shared folder.\n')
def png(w, h):
    raw = b''.join(b'\x00' + bytes(v for x in range(w) for v in ((x * 7) % 256, (y * 5) % 256, 128)) for y in range(h))
    chunk = lambda t, b: struct.pack('>I', len(b)) + t + b + struct.pack('>I', zlib.crc32(t + b) & 0xffffffff)
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw)) + chunk(b'IEND', b'')
open(os.path.join(d, 'ac005-picture.png'), 'wb').write(png(120, 80))
W, H = 3000, 2000
img = bytes([(i // 3) % 251 for i in range(W * 3)]) * H
objs = []
objs.append(b'<< /Type /Catalog /Pages 2 0 R >>')
objs.append(b'<< /Type /Pages /Kids [3 0 R] /Count 1 >>')
objs.append(b'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /XObject << /Im1 4 0 R >> /Font << /F1 6 0 R >> >> /Contents 5 0 R >>')
objs.append(b'<< /Type /XObject /Subtype /Image /Width %d /Height %d /ColorSpace /DeviceRGB /BitsPerComponent 8 /Length %d >>\nstream\n' % (W, H, len(img)) + img + b'\nendstream')
content = b'q 500 0 0 333 56 300 cm /Im1 Do Q BT /F1 24 Tf 56 700 Td (LARGE-PDF-436) Tj ET'
objs.append(b'<< /Length %d >>\nstream\n' % len(content) + content + b'\nendstream')
objs.append(b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')
out = b'%PDF-1.4\n'; offs = []
for i, o in enumerate(objs, 1):
    offs.append(len(out)); out += b'%d 0 obj\n' % i + o + b'\nendobj\n'
x = len(out); out += b'xref\n0 %d\n0000000000 65535 f \n' % (len(objs) + 1) + b''.join(b'%010d 00000 n \n' % o for o in offs)
out += b'trailer\n<< /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF\n' % (len(objs) + 1, x)
open(os.path.join(d, 'ac005-large.pdf'), 'wb').write(out)
print({f: os.path.getsize(os.path.join(d, f)) for f in os.listdir(d) if not f.endswith('folder')})
