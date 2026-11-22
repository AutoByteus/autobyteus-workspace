import struct, sys
# Byte length of the ELF prefix of an AppImage (end of section header table = squashfs offset), ELF64 LE.
with open(sys.argv[1], 'rb') as f:
    h = f.read(64)
assert h[:4] == b'\x7fELF' and h[4] == 2 and h[5] == 1, 'not ELF64 LE'
shoff, = struct.unpack_from('<Q', h, 0x28); shentsize, shnum = struct.unpack_from('<HH', h, 0x3A)
print(shoff + shentsize * shnum)
