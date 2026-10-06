import json, os, struct, sys, zlib
state = json.load(open(sys.argv[1]))
brain = state["brainDir"]
colors = {1: (220, 40, 40), 2: (40, 160, 60), 3: (40, 80, 220)}
def png(rgb, size=64):
    raw = b"".join(b"\x00" + bytes(rgb) * size for _ in range(size))
    chunk = lambda t, d: struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xffffffff)
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(raw)) + chunk(b"IEND", b"")
for step, rgb in colors.items():
    image = os.path.join(brain, f"image_{step}_1.png")
    step_dir = os.path.join(brain, ".system_generated", "steps", str(step))
    os.makedirs(step_dir, exist_ok=True)
    open(os.path.join(step_dir, "output.txt"), "w").write(f"Using prompt: image {step}\n\nGenerated image is saved at {image}.\n\n Do not output the path of this image.\n")
    open(image, "wb").write(png(rgb))
    print(image, os.path.getsize(image))
