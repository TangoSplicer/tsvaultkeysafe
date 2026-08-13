from pathlib import Path
from PIL import Image

assets = Path('/home/ubuntu/tsvaultkeysafe/assets/images')
source = Image.open(assets / 'tsvaultkeysafe-icon.png').convert('RGBA')
outputs = {
    'icon.png': (1024, 1024),
    'android-icon-foreground.png': (1024, 1024),
    'android-icon-background.png': (1024, 1024),
    'splash-icon.png': (1024, 1024),
    'favicon.png': (48, 48),
}
for name, size in outputs.items():
    image = source.resize(size, Image.Resampling.LANCZOS)
    image.save(assets / name, format='PNG', optimize=True)
