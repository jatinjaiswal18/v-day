from PIL import Image, ImageDraw
import os

base = r'c:\Users\jjaiswal\OneDrive - Azenta, Inc\Desktop\v-day\photos'

# --- Male head crop ---
m = Image.open(os.path.join(base, 'male.png'))
mw, mh = m.size
print(f'Male source: {mw}x{mh}')
# Normalized coords: top-left (0.20, 0.23), bottom-right (0.79, 0.65)
mx1, my1 = int(0.20 * mw), int(0.23 * mh)
mx2, my2 = int(0.79 * mw), int(0.65 * mh)
male_crop = m.crop((mx1, my1, mx2, my2))

# Make it square (1:1)
mcw, mch = male_crop.size
if mcw > mch:
    diff = mcw - mch
    male_crop = male_crop.crop((diff//2, 0, mcw - diff//2, mch))
elif mch > mcw:
    diff = mch - mcw
    male_crop = male_crop.crop((0, diff//2, mcw, mch - diff//2))

# Make circular (transparent outside circle)
male_sq = male_crop.resize((256, 256), Image.LANCZOS).convert('RGBA')
mask = Image.new('L', (256, 256), 0)
draw = ImageDraw.Draw(mask)
draw.ellipse((0, 0, 255, 255), fill=255)
male_sq.putalpha(mask)
male_sq.save(os.path.join(base, 'male-head.png'))
print(f'Male head saved: {male_sq.size}')

# --- Female head crop ---
f = Image.open(os.path.join(base, 'female.png'))
fw, fh = f.size
print(f'Female source: {fw}x{fh}')
# Normalized coords: top-left (0.23, 0.20), bottom-right (0.77, 0.74) — shifted up 15%
fx1, fy1 = int(0.23 * fw), int(0.20 * fh)
fx2, fy2 = int(0.77 * fw), int(0.74 * fh)
fem_crop = f.crop((fx1, fy1, fx2, fy2))

# Make it square (1:1)
fcw, fch = fem_crop.size
if fcw > fch:
    diff = fcw - fch
    fem_crop = fem_crop.crop((diff//2, 0, fcw - diff//2, fch))
elif fch > fcw:
    diff = fch - fcw
    fem_crop = fem_crop.crop((0, diff//2, fcw, fch - diff//2))

# Make circular (transparent outside circle)
fem_sq = fem_crop.resize((256, 256), Image.LANCZOS).convert('RGBA')
mask2 = Image.new('L', (256, 256), 0)
draw2 = ImageDraw.Draw(mask2)
draw2.ellipse((0, 0, 255, 255), fill=255)
fem_sq.putalpha(mask2)
fem_sq.save(os.path.join(base, 'female-head.png'))
print(f'Female head saved: {fem_sq.size}')

print('Done! Created male-head.png and female-head.png')
