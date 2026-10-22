# -*- coding: utf-8 -*-
"""黑白风：把图标与播放海报转成银白单色。"""
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance
import os

BASE = os.path.dirname(os.path.abspath(__file__))
PUB = os.path.join(BASE, "..", "public")

# ---------- 图标 ----------
def mono_icon(size):
    src = Image.open(os.path.join(PUB, "icons", "icon-512.png")).convert("RGBA")
    g = src.convert("L")
    # 提高亮度与对比，让霓虹粉变成银白，暗底保持黑
    g = ImageEnhance.Contrast(g).enhance(1.15)
    g = ImageEnhance.Brightness(g).enhance(1.45)
    rgba = Image.merge("RGBA", (g, g, g, src.split()[3]))
    return rgba.resize((size, size), Image.LANCZOS)

for name, size in [("icon-512.png", 512), ("icon-192.png", 192), ("icon-144.png", 144),
                   ("icon-96.png", 96), ("icon-48.png", 48)]:
    mono_icon(size).save(os.path.join(PUB, "icons", name))

a = mono_icon(180).convert("RGB")
a.save(os.path.join(PUB, "icons", "apple-touch-icon.png"))

ico = Image.new("RGBA", (256, 256), (0, 0, 0, 255))
ico.alpha_composite(mono_icon(256))
ico.convert("RGB").save(os.path.join(PUB, "favicon.ico"),
                        sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])

# ---------- 播放海报（银白 tkytv） ----------
W, H = 1024, 768
img = Image.new("RGBA", (W, H), (0, 0, 0, 255))
f_logo = ImageFont.truetype(r"C:\Windows\Fonts\segoeuib.ttf", 150)
f_tag = ImageFont.truetype(r"C:\Windows\Fonts\msyh.ttc", 40)
text = "tkytv"
mask = Image.new("L", (W, H), 0)
dm = ImageDraw.Draw(mask)
bbox = dm.textbbox((0, 0), text, font=f_logo)
tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
lx, ly = (W - tw) // 2 - bbox[0], 280 - bbox[1]
dm.text((lx, ly), text, font=f_logo, fill=255)

grad = Image.new("RGBA", (W, H), (0, 0, 0, 0))
gp = grad.load()
for y in range(H):
    t = y / H
    v = int(255 - (255 - 150) * t)
    for x in range(W):
        gp[x, y] = (v, v, v, 255)
logo = Image.new("RGBA", (W, H), (0, 0, 0, 0))
logo.paste(grad, (0, 0), mask)
glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
glow_mask = mask.filter(ImageFilter.GaussianBlur(18))
glow.paste(Image.new("RGBA", (W, H), (255, 255, 255, 0)), (0, 0), glow_mask)
img = Image.alpha_composite(img, glow)
img = Image.alpha_composite(img, logo)
d = ImageDraw.Draw(img)
tag = "自由观影，畅想精彩"
tb = d.textbbox((0, 0), tag, font=f_tag)
d.text(((W - (tb[2] - tb[0])) // 2, 470), tag, font=f_tag, fill=(170, 170, 170, 255))
img.convert("RGB").save(os.path.join(PUB, "player-poster.png"))
print("mono assets done")
