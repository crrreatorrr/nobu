#!/usr/bin/env python3
"""Paint out the stray third pupil that Meshy baked into the Nobu GLB texture.
Usage: python3 tools/fix_nobu_eyes.py SEED_X SEED_Y [SEED_X SEED_Y ...]  -> public/assets/models/nobu_tex_fixed.jpg
       python3 tools/fix_nobu_eyes.py --cleanup   (second pass on the fixed texture: the grey wedge beside the right
                                                 pupil, the dark drip under it and a stray line by the left pupil)"""
import sys
from PIL import Image, ImageDraw, ImageFilter
import numpy as np

# (x0, y0, x1, y1, max_luminance, min_luminance): dark leftovers to fill from the surrounding colours
CLEANUP = [
    (452, 1704, 486, 1740, 140, 40),   # grey wedge at the right edge of the right eye
    (424, 1758, 440, 1776, 150, 0),    # dark drip below the right pupil
    (348, 1684, 362, 1706, 200, 60),   # thin stroke left of the left pupil (third-pupil remnant)
    (458, 1704, 472, 1736, 160, 0),    # ragged spikes on the right pupil's outer edge
    (1058, 484, 1108, 548, 170, 0),    # crescent of an extra pupil on the second eye-white island (shows as a 'ɔ'
                                       #   beside the right eye's pupil on the model)
    (1066, 512, 1100, 548, 228, 0),    # its faint grey leftovers
]
# The right pupil was baked with a white highlight hole that splits it into a dot plus a stray sliver on the model.
# Clear it and redraw it as a solid ellipse matching the left pupil (measured: semi-axes 16.6 x 28 px, tilt 120.8 deg).
REDRAW = [((412, 1696, 476, 1780), (438.2, 1729.6), (16.6, 28.0), 120.8)]


def draw_ellipse(img, center, axes, angle, color=(8, 8, 12), ss=4):
    a = np.asarray(img).astype(float)
    cx, cy = center
    minor, major = axes
    t = np.radians(angle)
    r = int(major + 3)
    x0, y0 = int(cx - r), int(cy - r)
    yy, xx = np.mgrid[0:2 * r * ss, 0:2 * r * ss] / ss
    xx = xx + x0 - cx + 0.5 / ss
    yy = yy + y0 - cy + 0.5 / ss
    u = xx * np.cos(t) + yy * np.sin(t)      # along the major axis
    v = -xx * np.sin(t) + yy * np.cos(t)
    inside = (u / major) ** 2 + (v / minor) ** 2 <= 1
    cov = inside.reshape(2 * r, ss, 2 * r, ss).mean(axis=(1, 3))[..., None]
    patch = a[y0:y0 + 2 * r, x0:x0 + 2 * r]
    a[y0:y0 + 2 * r, x0:x0 + 2 * r] = patch * (1 - cov) + np.array(color) * cov
    return Image.fromarray(a.clip(0, 255).astype(np.uint8))


def inpaint(img, mask, src=None):
    """Fill masked pixels from the outside in with the average of their already-known neighbours.
    `src` limits which unmasked pixels may be copied from (so a dark pupil next door doesn't bleed in)."""
    a = np.asarray(img).astype(float)
    known = ~mask if src is None else (src & ~mask)
    a[mask] = 0
    h, w = mask.shape
    while not (known | ~mask).all():
        acc = np.zeros_like(a)
        cnt = np.zeros((h, w))
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                if dx == 0 and dy == 0:
                    continue
                sk = np.roll(np.roll(known, dy, 0), dx, 1)
                sa = np.roll(np.roll(a, dy, 0), dx, 1)
                acc += sa * sk[..., None]
                cnt += sk
        front = mask & (~known) & (cnt > 0)
        if not front.any():
            break
        a[front] = acc[front] / cnt[front][:, None]
        known |= front
    return Image.fromarray(a.clip(0, 255).astype(np.uint8))


if '--cleanup' in sys.argv:
    path = 'public/assets/models/nobu_tex_fixed.jpg'
    img = Image.open(path).convert('RGB')
    lum = np.asarray(img.convert('L')).astype(int)
    mask = np.zeros(lum.shape, bool)
    for x0, y0, x1, y1, hi, lo in CLEANUP:
        box = np.zeros(lum.shape, bool)
        box[y0:y1, x0:x1] = True
        mask |= box & (lum <= hi) & (lum >= lo)
    # grow by a pixel so the anti-aliased rims go too
    mask = np.asarray(Image.fromarray((mask * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(3))) > 0
    img = inpaint(img, mask, src=lum > 170)
    for (x0, y0, x1, y1), center, axes, angle in REDRAW:
        lum = np.asarray(img.convert('L')).astype(int)
        box = np.zeros(lum.shape, bool)
        box[y0:y1, x0:x1] = True
        dark = np.asarray(Image.fromarray(((box & (lum < 170)) * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(3))) > 0
        img = inpaint(img, dark, src=lum > 170)
        img = draw_ellipse(img, center, axes, angle)
    img.save(path, quality=94)
    print('cleaned', int(mask.sum()), 'px')
    sys.exit(0)

src = Image.open('tools/_raw/nobu_tex.jpg').convert('RGB')
work = src.copy()
seeds = list(zip(map(int, sys.argv[1::2]), map(int, sys.argv[2::2])))
mask = np.zeros((src.height, src.width), bool)
for sx, sy in seeds:
    tmp = src.copy()
    ImageDraw.floodfill(tmp, (sx, sy), (255, 0, 255), thresh=150)
    a = np.asarray(tmp)
    mask |= (a[:, :, 0] == 255) & (a[:, :, 1] == 0) & (a[:, :, 2] == 255)
m = Image.fromarray((mask * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(7)).filter(ImageFilter.GaussianBlur(1.5))
white = Image.new('RGB', src.size, (250, 250, 248))
out = Image.composite(white, work, m)
out.save('public/assets/models/nobu_tex_fixed.jpg', quality=92)
print('painted', int(mask.sum()), 'px')
