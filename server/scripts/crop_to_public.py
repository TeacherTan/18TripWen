import os
import numpy as np
from PIL import Image

img_path = '/Users/anmumute/Documents/AgentLib/18TripWen/src/assets/Icon-Summary-Chart.png'
img = Image.open(img_path)
width, height = img.size
data = np.array(img)

# Bounding box ranges for the 10 cells
row_ranges = [(431, 1374), (2041, 2958), (3898, 4786), (5272, 6191)]
col_ranges = [(465, 1342), (2200, 3125), (4144, 5058)]

# Ordered asset keys matching the grid order
asset_keys = [
    # Row 0
    'npc_kafka',
    'npc_renga',
    'npc_lu',
    # Row 1
    'npc_kiroku',
    'npc_nanaki',
    'npc_ushio',
    # Row 2
    'npc_chihiro',
    'npc_tao',
    # Row 3
    'npc_toi',
    'npc_ryui'
]

output_dir = '/Users/anmumute/Documents/AgentLib/18TripWen/public/npc'
os.makedirs(output_dir, exist_ok=True)

def get_tight_square_crop(image, box_coords):
    c_start, r_start, c_end, r_end = box_coords
    cell_img = image.crop((c_start, r_start, c_end, r_end))
    
    # Find bounding box of non-transparent pixels
    arr = np.array(cell_img)
    alpha = arr[:, :, 3]
    non_zero = np.where(alpha > 10)
    
    if len(non_zero[0]) == 0 or len(non_zero[1]) == 0:
        return cell_img
        
    min_y, max_y = np.min(non_zero[0]), np.max(non_zero[0])
    min_x, max_x = np.min(non_zero[1]), np.max(non_zero[1])
    
    # Crop tightly
    tight_crop = cell_img.crop((min_x, min_y, max_x + 1, max_y + 1))
    tw, th = tight_crop.size
    
    # Make it square by adding transparent padding
    max_dim = max(tw, th)
    square_img = Image.new('RGBA', (max_dim, max_dim), (0, 0, 0, 0))
    
    # Paste centered
    paste_x = (max_dim - tw) // 2
    paste_y = (max_dim - th) // 2
    square_img.paste(tight_crop, (paste_x, paste_y))
    
    return square_img

count = 0
key_idx = 0

for r_idx, (r_start, r_end) in enumerate(row_ranges):
    for c_idx, (c_start, c_end) in enumerate(col_ranges):
        # check if it's one of the non-empty cells
        if r_idx == 2 and c_idx == 2:
            continue
        if r_idx == 3 and c_idx == 2:
            continue
            
        asset_key = asset_keys[key_idx]
        key_idx += 1
        
        # Get tightly cropped square image
        squared_img = get_tight_square_crop(img, (c_start, r_start, c_end, r_end))
        
        # Save as 512x512 or keep original squared size?
        # Let's resize it to 512x512 so they are clean, standardized, and performant
        final_img = squared_img.resize((512, 512), Image.Resampling.LANCZOS)
        
        save_path = os.path.join(output_dir, f"{asset_key}.png")
        final_img.save(save_path)
        print(f"Saved {asset_key}.png to {save_path} (resized to 512x512)")
        count += 1

print(f"Successfully processed and saved {count} NPC icons.")
