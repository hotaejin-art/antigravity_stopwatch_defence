from PIL import Image
import os

def process_image(image_path):
    if not os.path.exists(image_path):
        print(f"Error: {image_path} does not exist.")
        return
    
    if os.path.getsize(image_path) == 0:
        print(f"Error: {image_path} is empty (0 bytes). Please save the image file.")
        return

    try:
        img = Image.open(image_path).convert("RGBA")
        datas = img.getdata()
        width, height = img.size
        
        # Detect background color from top-left pixel
        bg_color = datas[0]
        # Check if it's black or white-ish
        is_dark_bg = bg_color[0] < 50 and bg_color[1] < 50 and bg_color[2] < 50
        is_light_bg = bg_color[0] > 200 and bg_color[1] > 200 and bg_color[2] > 200

        print(f"Processing {image_path} (Size: {width}x{height})")
        print(f"Detected BG Color: {bg_color}, Dark: {is_dark_bg}, Light: {is_light_bg}")

        newData = []
        for item in datas:
            # item is (R, G, B, A)
            if is_dark_bg:
                # Remove dark pixels
                if item[0] < 60 and item[1] < 60 and item[2] < 60:
                    newData.append((0, 0, 0, 0))
                else:
                    newData.append(item)
            elif is_light_bg:
                # Remove light pixels
                if item[0] > 200 and item[1] > 200 and item[2] > 200:
                    newData.append((255, 255, 255, 0))
                else:
                    newData.append(item)
            else:
                # Assume no background removal needed or complex
                newData.append(item)

        if is_dark_bg or is_light_bg:
            img.putdata(newData)
            img.save(image_path, "PNG")
            print(f"Successfully processed and saved {image_path}")
        else:
            print("Background color not definitive (neither very dark nor very light). Skipping removal.")

    except Exception as e:
        print(f"Failed to process image: {e}")

# Process boss_a.png
process_image('/Users/namtaejin/.gemini/antigravity/scratch/stopwatch-defense/img/boss_a.png')
