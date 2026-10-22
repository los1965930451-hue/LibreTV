# -*- coding: utf-8 -*-
"""从 AI 生成的图标源图裁切深色圆角方块，输出全套 PWA 图标与 favicon。"""
from PIL import Image, ImageDraw, ImageFilter
import os

BASE = os.path.dirname(os.path.abspath(__file__))
src = Image.open(os.path.join(BASE, "icon-source.png")).convert("RGB")
W, H = src.size
px = src.load()

# 找到非白色区域（深色圆角方块）的包围盒
def is_white(p):
    return p[0] > 240 and p[1] > 240 and p[2] > 240

minx, miny, maxx, maxy = W, H, 0, 0
step = 4
for y in range(0, H, step):
    for x in range(0, W, step):
        if not is_white(px[x, y]):
            minx = min(minx, x); miny = min(miny, y)
            maxx = max(maxx, x); maxy = max(maxy, y)
print("bbox", minx, miny, maxx, maxy)

# 扩一点边并裁成正方形
cx = (minx + maxx) // 2
cy = (miny + maxy) // 2
half = max(maxx - minx, maxy - miny) // 2 + 8
l, t = cx - half, cy - half
r, b = l + half * 2, t + half * 2
icon = src.crop((l, t, r, b))
S = half * 2
icon = icon.resize((1024, 1024), Image.LANCZOS)

# 用圆角蒙版把方块外做成透明（半径约 22%）
mask = Image.new("L", (1024, 1024), 0)
d = ImageDraw.Draw(mask)
radius = 230
d.rounded_rectangle((0, 0, 1023, 1023), radius=radius, fill=255)

out = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
out.paste(icon, (0, 0), mask)

pub = os.path.join(BASE, "..", "public")
sizes = {
    "icons/icon-512.png": 512,
    "icons/icon-192.png": 192,
    "icons/icon-144.png": 144,
    "icons/icon-96.png": 96,
    "icons/icon-48.png": 48,
    "icons/apple-touch-icon.png": 180,
}
for name, size in sizes.items():
    im = out.resize((size, size), Image.LANCZOS)
    if name.startswith("icons/apple"):
        # iOS 图标不支持透明，铺深底
        bg = Image.new("RGBA", (size, size), (13, 10, 20, 255))
        bg.alpha_composite(im)
        bg.convert("RGB").save(os.path.join(pub, name))
    else:
        im.save(os.path.join(pub, name))

# favicon.ico（深底，多尺寸）
ico = Image.new("RGBA", (256, 256), (13, 10, 20, 255))
ico.alpha_composite(out.resize((256, 256), Image.LANCZOS))
ico.convert("RGB").save(os.path.join(pub, "favicon.ico"),
                        sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
print("done")
