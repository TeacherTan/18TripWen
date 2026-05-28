"""
Split a PNG containing multiple separated elements into individual PNG files.
Uses alpha-channel mask + MaxFilter dilation + BFS connected components.
"""
import sys
import numpy as np
from PIL import Image, ImageFilter
from collections import deque
from pathlib import Path


def find_components(mask: np.ndarray, dilation: int = 40) -> list[list[tuple[int, int]]]:
    """Dilate mask then BFS to find connected components."""
    mask_img = Image.fromarray((mask * 255).astype(np.uint8), "L")
    dilated = np.array(mask_img.filter(ImageFilter.MaxFilter(size=dilation * 2 + 1))) > 0

    ys, xs = np.where(dilated)
    foreground = set(zip(ys.tolist(), xs.tolist()))
    visited: set[tuple[int, int]] = set()
    components: list[list[tuple[int, int]]] = []

    for start in zip(ys.tolist(), xs.tolist()):
        if start in visited:
            continue
        queue: deque[tuple[int, int]] = deque([start])
        visited.add(start)
        group: list[tuple[int, int]] = [start]
        while queue:
            y, x = queue.popleft()
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    nb = (y + dy, x + dx)
                    if nb not in visited and nb in foreground:
                        visited.add(nb)
                        queue.append(nb)
                        group.append(nb)
        components.append(group)

    # largest components first
    components.sort(key=len, reverse=True)
    return components


def tight_bbox(component: list[tuple[int, int]], mask: np.ndarray) -> tuple[int, int, int, int]:
    """Find the tight bounding box of actual content pixels within a component region."""
    comp_ys = [p[0] for p in component]
    comp_xs = [p[1] for p in component]
    min_y, max_y = min(comp_ys), max(comp_ys)
    min_x, max_x = min(comp_xs), max(comp_xs)

    region = mask[min_y : max_y + 1, min_x : max_x + 1]
    rows = np.any(region, axis=1)
    cols = np.any(region, axis=0)

    y1 = min_y + int(np.argmax(rows))
    y2 = min_y + int(len(rows) - np.argmax(rows[::-1]) - 1)
    x1 = min_x + int(np.argmax(cols))
    x2 = min_x + int(len(cols) - np.argmax(cols[::-1]) - 1)
    return x1, y1, x2, y2


def split_png(input_path: str, output_prefix: str, n: int = 2, padding: int = 24) -> None:
    img = Image.open(input_path).convert("RGBA")
    arr = np.array(img)
    h, w = arr.shape[:2]

    mask = arr[:, :, 3] > 10  # alpha-based content mask

    components = find_components(mask)[:n]
    print(f"{Path(input_path).name}: found {len(components)} component(s)")

    for i, comp in enumerate(components):
        x1, y1, x2, y2 = tight_bbox(comp, mask)
        cx1 = max(0, x1 - padding)
        cy1 = max(0, y1 - padding)
        cx2 = min(w, x2 + padding + 1)
        cy2 = min(h, y2 + padding + 1)
        cropped = img.crop((cx1, cy1, cx2, cy2))
        out = f"{output_prefix}_{i + 1}.png"
        cropped.save(out)
        print(f"  -> {out}  ({cx2 - cx1} x {cy2 - cy1} px)")


if __name__ == "__main__":
    base = "src/assets/Chibi_character_splitting/kfk"
    split_png(f"{base}/f.png", f"{base}/f")
    split_png(f"{base}/h.png", f"{base}/h")
