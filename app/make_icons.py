# Generates launcher icons (legacy + adaptive foreground) for Emberwake.
import math, os
from PIL import Image, ImageDraw, ImageFilter
HERE = os.path.dirname(os.path.abspath(__file__))

def flame(size, scale=1.0, cx=0.5, cy=0.54):
    """Draw the glowing ember flame on a transparent canvas."""
    S = size * 4
    img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    glow = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    r = S * 0.36 * scale
    gd.ellipse([S*cx - r, S*cy - r, S*cx + r, S*cy + r], fill=(255, 130, 40, 150))
    glow = glow.filter(ImageFilter.GaussianBlur(S * 0.08 * scale))
    img = Image.alpha_composite(img, glow)
    d = ImageDraw.Draw(img)
    def drop(h, w, col, yoff=0.0):
        pts = []
        tipy = S*cy - S*h*scale
        for i in range(181):
            t = i / 180 * 2 * math.pi
            # teardrop: round bottom, pointed top
            x = math.sin(t) * (1 - math.cos(t) * 0.0)
            y = -math.cos(t)
            k = (1 - y) / 2  # 0 at top, 1 at bottom
            px = S*cx + x * S * w * scale * (k ** 0.9)
            py = tipy + (S*cy + S*w*scale*0.9 - tipy) * k + S*yoff*scale
            pts.append((px, py))
        d.polygon(pts, fill=col)
    drop(0.34, 0.20, (255, 150, 50, 255))
    drop(0.24, 0.15, (255, 205, 120, 255), 0.03)
    rr = S * 0.065 * scale
    d.ellipse([S*cx - rr, S*(cy+0.1*scale) - rr, S*cx + rr, S*(cy+0.1*scale) + rr], fill=(255, 255, 255, 255))
    return img.resize((size, size), Image.LANCZOS)

def background(size, round_corners=True):
    S = size * 4
    img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    base = Image.new('RGBA', (S, S), (10, 14, 34, 255))
    # radial gradient
    grad = Image.new('L', (S, S), 0)
    gd = ImageDraw.Draw(grad)
    for i in range(60, 0, -1):
        r = S * 0.75 * i / 60
        gd.ellipse([S/2 - r, S*0.56 - r, S/2 + r, S*0.56 + r], fill=int(255 * (1 - i / 60) ** 1.5))
    glowc = Image.new('RGBA', (S, S), (60, 30, 70, 255))
    base = Image.composite(glowc, base, grad)
    # a few motes
    d = ImageDraw.Draw(base)
    import random
    random.seed(7)
    for _ in range(18):
        x, y, r = random.random()*S, random.random()*S, random.random()*S*0.008 + S*0.003
        d.ellipse([x-r, y-r, x+r, y+r], fill=(170, 200, 255, random.randint(40, 120)))
    if round_corners:
        mask = Image.new('L', (S, S), 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, S-1, S-1], radius=S*0.22, fill=255)
        img.paste(base, (0, 0), mask)
    else:
        img = base
    return img.resize((size, size), Image.LANCZOS)

dens = {'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}
for name, m in dens.items():
    d = os.path.join(HERE, 'res', 'mipmap-' + name); os.makedirs(d, exist_ok=True)
    s = int(48 * m)
    ic = Image.alpha_composite(background(s), flame(s, 0.95))
    ic.save(os.path.join(d, 'ic_launcher.png'))
    fs = int(108 * m)  # adaptive: 108dp canvas, 66dp safe zone
    flame(fs, 0.62).save(os.path.join(d, 'ic_launcher_fg.png'))
    background(fs, False).save(os.path.join(d, 'ic_launcher_bg.png'))
big = Image.alpha_composite(background(512), flame(512, 0.95)); big.save(os.path.join(HERE, 'icon-512.png'))
