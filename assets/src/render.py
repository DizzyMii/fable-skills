#!/usr/bin/env python3
"""Render the repo's marketing assets from their HTML sources.

Headless Chrome screenshots at 2x device scale for crisp text, then Pillow
finalizes: the social card is downscaled to exactly 1280x640; the demo is
auto-trimmed to its content and halved. Re-runnable; outputs land in assets/.
"""
import subprocess, sys, pathlib
from PIL import Image

SRC = pathlib.Path(__file__).resolve().parent
ASSETS = SRC.parent
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
BG = (13, 17, 23)  # #0d1117

def shoot(html, out_png, w, h):
    subprocess.run([
        CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars",
        "--force-device-scale-factor=2", f"--window-size={w},{h}",
        f"--screenshot={out_png}", (SRC / html).as_uri(),
    ], check=True)

def trim(img, bg, pad):
    px = img.load()
    W, H = img.size
    def row_blank(y): return all(px[x, y][:3] == bg for x in range(0, W, 7))
    def col_blank(x): return all(px[x, y][:3] == bg for y in range(0, H, 7))
    top = next((y for y in range(H) if not row_blank(y)), 0)
    bot = next((y for y in range(H - 1, -1, -1) if not row_blank(y)), H - 1)
    left = next((x for x in range(W) if not col_blank(x)), 0)
    right = next((x for x in range(W - 1, -1, -1) if not col_blank(x)), W - 1)
    box = (max(0, left - pad), max(0, top - pad), min(W, right + pad), min(H, bot + pad))
    return img.crop(box)

def main():
    raw_social = ASSETS / "_raw_social.png"
    raw_demo = ASSETS / "_raw_demo.png"

    shoot("social.html", raw_social, 1280, 640)
    Image.open(raw_social).convert("RGB").resize((1280, 640), Image.LANCZOS).save(
        ASSETS / "social-preview.png")

    shoot("demo.html", raw_demo, 1056, 760)
    demo = trim(Image.open(raw_demo).convert("RGB"), BG, pad=24)
    demo = demo.resize((demo.width // 2, demo.height // 2), Image.LANCZOS)
    demo.save(ASSETS / "demo.png")

    raw_social.unlink(missing_ok=True)
    raw_demo.unlink(missing_ok=True)
    for name in ("social-preview.png", "demo.png"):
        im = Image.open(ASSETS / name)
        print(f"{name}: {im.width}x{im.height}")

if __name__ == "__main__":
    sys.exit(main())
