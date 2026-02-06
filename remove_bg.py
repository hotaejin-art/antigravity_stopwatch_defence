from PIL import Image
import os
import glob

def remove_black_background(image_path):
    print(f"Processing {image_path}...")
    img = Image.open(image_path).convert("RGBA")
    datas = img.getdata()

    newData = []
    for item in datas:
        # Check if pixel is close to black
        # item[0] = R, item[1] = G, item[2] = B
        # Threshold can be adjusted. 
        # If it's very dark gray, we treat it as background.
        threshold = 60 
        if item[0] < threshold and item[1] < threshold and item[2] < threshold:
            # Make it transparent
            newData.append((item[0], item[1], item[2], 0))
        else:
            newData.append(item)

    img.putdata(newData)
    img.save(image_path, "PNG")
    print(f"Saved {image_path}")

# Process all icon_*.png files in img/ directory
img_dir = '/Users/namtaejin/.gemini/antigravity/scratch/stopwatch-defense/img'
icons = glob.glob(os.path.join(img_dir, 'icon_*.png'))

if not icons:
    print("No icons found!")
else:
    for icon in icons:
        try:
            remove_black_background(icon)
        except Exception as e:
            print(f"Failed to process {icon}: {e}")
