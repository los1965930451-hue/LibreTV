# -*- coding: utf-8 -*-
"""生成播放器加载海报 player-poster.png：黑底 + 粉色 tkytv 字样。"""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os

BASE = os.path.dirname(os.path.abspath(__file__))
W, H = 1024, 768
img = Image.new("RGBA", (W, H), (0, 0, 0, 255))

def font(path, size):
    return ImageFont.truetype(path, size)

bold = r"C:\Windows\Fonts\segoeuib.ttf"
msyh = r"C:\Windows\Fonts\msyh.ttc"

f_logo = font(bold, 150)
f_tag = font(msyh, 40)

text = "tkytv"

# 文本蒙版
mask = Image.new("L", (W, H), 0)
dm = ImageDraw.Draw(mask)
bbox = dm.textbbox((0, 0), text, font=f_logo)
tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
lx = (W - tw) // 2 - bbox[0]
ly = 280 - bbox[1]
dm.text((lx, ly), text, font=f_logo, fill=255)

# 粉色渐变（左亮粉 → 右玫红）
grad = Image.new("RGBA", (W, H), (0, 0, 0, 0))
gp = grad.load()
for x in range(W):
    t = x / W
    r = int(255)
    g = int(126 + (45 - 126) * t)
    b = int(183 + (120 - 183) * t)
    for y in range(H):
        gp[x, y] = (r, g, b, 255)
logo = Image.new("RGBA", (W, H), (0, 0, 0, 0))
logo.paste(grad, (0, 0), mask)

# 辉光
glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
glow_mask = mask.filter(ImageFilter.GaussianBlur(18))
glow_color = Image.new("RGBA", (W, H), (255, 45, 120, 0))
glow.paste(glow_color, (0, 0), glow_mask)
img = Image.alpha_composite(img, glow)
img = Image.alpha_composite(img, logo)

# 标语
d = ImageDraw.Draw(img)
tag = "自由观影，畅想精彩"
tb = d.textbbox((0, 0), tag, font=f_tag)
d.text(((W - (tb[2] - tb[0])) // 2, 470), tag, font=f_tag, fill=(180, 180, 180, 255))

out = os.path.join(BASE, "..", "public", "player-poster.png")
img.convert("RGB").save(out)
print("saved", out)
