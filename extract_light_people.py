from collections import deque
from pathlib import Path

from PIL import Image, ImageFilter


SOURCE = Path(r"C:\Users\Admin\AppData\Local\Temp\codex-clipboard-4984c520-de10-4085-a6b7-0cfe86557b77.png")
OUTPUT = Path("site/assets/light-people")
CROPS = {
    "light-person-2021.png": (244, 0, 330, 154),
    "light-person-2016.png": (292, 280, 385, 490),
    "light-person-2007.png": (42, 565, 172, 738),
}


def largest_component(mask):
    width, height = mask.size
    pixels = mask.load()
    visited = set()
    largest = []
    for y in range(height):
        for x in range(width):
            if not pixels[x, y] or (x, y) in visited:
                continue
            queue = deque([(x, y)])
            visited.add((x, y))
            component = []
            while queue:
                px, py = queue.popleft()
                component.append((px, py))
                for nx, ny in ((px - 1, py), (px + 1, py), (px, py - 1), (px, py + 1)):
                    if 0 <= nx < width and 0 <= ny < height and pixels[nx, ny] and (nx, ny) not in visited:
                        visited.add((nx, ny))
                        queue.append((nx, ny))
            if len(component) > len(largest):
                largest = component
    result = Image.new("L", mask.size)
    result_pixels = result.load()
    for x, y in largest:
        result_pixels[x, y] = 255
    return result


def extract(source, box, destination):
    crop = source.crop(box).convert("RGB")
    raw_mask = Image.new("L", crop.size)
    raw_pixels = raw_mask.load()
    for y in range(crop.height):
        for x in range(crop.width):
            red, green, blue = crop.getpixel((x, y))
            brightness = min(red, green, blue)
            neutrality = max(red, green, blue) - min(red, green, blue)
            raw_pixels[x, y] = 255 if brightness > 184 and neutrality < 92 else 0

    solid = largest_component(raw_mask)
    glow = solid.filter(ImageFilter.GaussianBlur(5))
    alpha = Image.new("L", crop.size)
    alpha_pixels = alpha.load()
    solid_pixels = solid.load()
    glow_pixels = glow.load()
    for y in range(crop.height):
        for x in range(crop.width):
            alpha_pixels[x, y] = max(solid_pixels[x, y], int(glow_pixels[x, y] * 0.72))

    bounds = alpha.getbbox()
    if bounds:
        padding = 8
        bounds = (
            max(0, bounds[0] - padding), max(0, bounds[1] - padding),
            min(crop.width, bounds[2] + padding), min(crop.height, bounds[3] + padding),
        )
        alpha = alpha.crop(bounds)
    figure = Image.new("RGBA", alpha.size, (255, 255, 244, 0))
    figure.putalpha(alpha)
    figure.save(destination)


OUTPUT.mkdir(parents=True, exist_ok=True)
image = Image.open(SOURCE)
for filename, crop_box in CROPS.items():
    extract(image, crop_box, OUTPUT / filename)
