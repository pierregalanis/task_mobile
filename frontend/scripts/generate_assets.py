#!/usr/bin/env python3
"""
Generate Soutrali App Icons and Splash Screen
Brand color: #22c55e (green)
"""

from PIL import Image, ImageDraw, ImageFont
import os

# Brand colors
PRIMARY_GREEN = "#22c55e"
DARK_BG = "#0a0a0a"
WHITE = "#ffffff"

def hex_to_rgb(hex_color):
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

def create_app_icon(size=1024, output_path="icon.png"):
    """Create the main app icon - a stylized 'S' for Soutrali"""
    img = Image.new('RGBA', (size, size), hex_to_rgb(PRIMARY_GREEN))
    draw = ImageDraw.Draw(img)
    
    # Add a subtle gradient effect by drawing circles
    center = size // 2
    for i in range(20):
        radius = size // 2 - (i * 5)
        alpha = 255 - (i * 10)
        if alpha > 0 and radius > 0:
            # Slight darker shade for depth
            shade = max(0, 34 - i * 2)  # 22 in hex is 34 in decimal
            color = (shade, 197 - i * 5, 94 - i * 2, alpha)
    
    # Draw the "S" letter in white
    # Using a large bold font-like shape
    s_width = int(size * 0.5)
    s_height = int(size * 0.6)
    s_x = (size - s_width) // 2
    s_y = (size - s_height) // 2
    
    # Draw S shape using arcs and lines
    line_width = int(size * 0.12)
    
    # Top curve of S
    top_box = [s_x, s_y, s_x + s_width, s_y + s_height // 2 + line_width]
    draw.arc(top_box, start=180, end=0, fill=hex_to_rgb(WHITE), width=line_width)
    
    # Bottom curve of S
    bottom_box = [s_x, s_y + s_height // 2 - line_width, s_x + s_width, s_y + s_height]
    draw.arc(bottom_box, start=0, end=180, fill=hex_to_rgb(WHITE), width=line_width)
    
    # Connect the curves
    mid_y = s_y + s_height // 2
    draw.line([(s_x + s_width - line_width//2, s_y + s_height//4), 
               (s_x + line_width//2, mid_y)], 
              fill=hex_to_rgb(WHITE), width=line_width)
    draw.line([(s_x + line_width//2, mid_y), 
               (s_x + s_width - line_width//2, s_y + s_height * 3//4)], 
              fill=hex_to_rgb(WHITE), width=line_width)
    
    # Add a subtle shadow/glow effect
    # Draw small circles at ends for rounded effect
    circle_radius = line_width // 2
    
    # Top left end
    draw.ellipse([s_x + s_width - circle_radius - line_width//2, s_y + line_width//2 - circle_radius,
                  s_x + s_width - circle_radius + line_width//2, s_y + line_width//2 + circle_radius],
                 fill=hex_to_rgb(WHITE))
    
    # Bottom right end
    draw.ellipse([s_x + circle_radius - line_width//2, s_y + s_height - line_width//2 - circle_radius,
                  s_x + circle_radius + line_width//2, s_y + s_height - line_width//2 + circle_radius],
                 fill=hex_to_rgb(WHITE))
    
    img.save(output_path)
    print(f"✅ Created app icon: {output_path}")
    return img

def create_simple_icon(size=1024, output_path="icon.png"):
    """Create a simpler, cleaner app icon"""
    img = Image.new('RGBA', (size, size), hex_to_rgb(PRIMARY_GREEN))
    draw = ImageDraw.Draw(img)
    
    # Draw a stylized "S" using thick curved lines
    center_x = size // 2
    center_y = size // 2
    
    # S dimensions
    s_width = int(size * 0.45)
    s_height = int(size * 0.55)
    line_width = int(size * 0.14)
    
    left_x = center_x - s_width // 2
    right_x = center_x + s_width // 2
    top_y = center_y - s_height // 2
    bottom_y = center_y + s_height // 2
    
    # Draw top arc (curves right to left at top)
    top_arc_box = [left_x, top_y, right_x, center_y + line_width]
    draw.arc(top_arc_box, start=180, end=360, fill=hex_to_rgb(WHITE), width=line_width)
    
    # Draw bottom arc (curves left to right at bottom)
    bottom_arc_box = [left_x, center_y - line_width, right_x, bottom_y]
    draw.arc(bottom_arc_box, start=0, end=180, fill=hex_to_rgb(WHITE), width=line_width)
    
    # Add rounded ends
    end_radius = line_width // 2
    
    # Top right end cap
    draw.ellipse([left_x + s_width//2 + end_radius, top_y,
                  left_x + s_width//2 + end_radius + line_width, top_y + line_width],
                 fill=hex_to_rgb(WHITE))
    
    # Bottom left end cap  
    draw.ellipse([right_x - s_width//2 - end_radius - line_width, bottom_y - line_width,
                  right_x - s_width//2 - end_radius, bottom_y],
                 fill=hex_to_rgb(WHITE))
    
    img.save(output_path)
    print(f"✅ Created simple icon: {output_path}")
    return img

def create_modern_icon(size=1024, output_path="icon.png"):
    """Create a modern, minimalist app icon with stylized S"""
    # Create image with rounded corners effect using green background
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Draw rounded rectangle background
    corner_radius = size // 5
    draw.rounded_rectangle([0, 0, size-1, size-1], radius=corner_radius, fill=hex_to_rgb(PRIMARY_GREEN))
    
    # Draw the "S" as two connected semicircles
    padding = int(size * 0.2)
    s_width = size - 2 * padding
    s_height = int(size * 0.6)
    
    center_x = size // 2
    center_y = size // 2
    
    line_width = int(size * 0.12)
    
    # Upper half of S - arc opening to the right
    upper_left = padding
    upper_top = center_y - s_height // 2
    upper_right = center_x + s_width // 4
    upper_bottom = center_y + line_width // 2
    draw.arc([upper_left, upper_top, upper_right + s_width//4, upper_bottom + s_height//4], 
             start=90, end=270, fill=hex_to_rgb(WHITE), width=line_width)
    
    # Lower half of S - arc opening to the left
    lower_left = center_x - s_width // 4
    lower_top = center_y - line_width // 2
    lower_right = size - padding
    lower_bottom = center_y + s_height // 2
    draw.arc([lower_left - s_width//4, lower_top - s_height//4, lower_right, lower_bottom], 
             start=270, end=90, fill=hex_to_rgb(WHITE), width=line_width)
    
    img.save(output_path)
    print(f"✅ Created modern icon: {output_path}")
    return img

def create_text_based_icon(size=1024, output_path="icon.png"):
    """Create icon with large S letter"""
    img = Image.new('RGBA', (size, size), hex_to_rgb(PRIMARY_GREEN))
    draw = ImageDraw.Draw(img)
    
    # Try to use a system font, fallback to default
    font_size = int(size * 0.7)
    try:
        # Try different font paths
        font_paths = [
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
            "/System/Library/Fonts/Helvetica.ttc",
        ]
        font = None
        for fp in font_paths:
            if os.path.exists(fp):
                font = ImageFont.truetype(fp, font_size)
                break
        if font is None:
            font = ImageFont.load_default()
    except:
        font = ImageFont.load_default()
    
    # Draw the S
    text = "S"
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    
    x = (size - text_width) // 2
    y = (size - text_height) // 2 - bbox[1]
    
    draw.text((x, y), text, fill=hex_to_rgb(WHITE), font=font)
    
    img.save(output_path)
    print(f"✅ Created text-based icon: {output_path}")
    return img

def create_splash_screen(width=1284, height=2778, output_path="splash.png"):
    """Create splash screen for Soutrali"""
    img = Image.new('RGBA', (width, height), hex_to_rgb(DARK_BG))
    draw = ImageDraw.Draw(img)
    
    # Draw the S logo in the center
    logo_size = min(width, height) // 4
    logo_x = (width - logo_size) // 2
    logo_y = (height - logo_size) // 2 - height // 10
    
    # Draw green circle background for logo
    circle_padding = logo_size // 8
    draw.ellipse([logo_x - circle_padding, logo_y - circle_padding, 
                  logo_x + logo_size + circle_padding, logo_y + logo_size + circle_padding],
                 fill=hex_to_rgb(PRIMARY_GREEN))
    
    # Draw S on the logo
    font_size = int(logo_size * 0.8)
    try:
        font_paths = [
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        ]
        font = None
        for fp in font_paths:
            if os.path.exists(fp):
                font = ImageFont.truetype(fp, font_size)
                break
        if font is None:
            font = ImageFont.load_default()
    except:
        font = ImageFont.load_default()
    
    text = "S"
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    
    text_x = logo_x + (logo_size - text_width) // 2
    text_y = logo_y + (logo_size - text_height) // 2 - bbox[1]
    
    draw.text((text_x, text_y), text, fill=hex_to_rgb(WHITE), font=font)
    
    # Draw "Soutrali" text below logo
    try:
        name_font_size = int(width * 0.12)
        name_font = None
        for fp in font_paths:
            if os.path.exists(fp):
                name_font = ImageFont.truetype(fp, name_font_size)
                break
        if name_font is None:
            name_font = ImageFont.load_default()
    except:
        name_font = ImageFont.load_default()
    
    name_text = "Soutrali"
    name_bbox = draw.textbbox((0, 0), name_text, font=name_font)
    name_width = name_bbox[2] - name_bbox[0]
    name_x = (width - name_width) // 2
    name_y = logo_y + logo_size + circle_padding + height // 20
    
    draw.text((name_x, name_y), name_text, fill=hex_to_rgb(WHITE), font=name_font)
    
    # Draw tagline
    try:
        tagline_font_size = int(width * 0.04)
        tagline_font = None
        for fp in font_paths:
            if os.path.exists(fp):
                tagline_font = ImageFont.truetype(fp, tagline_font_size)
                break
        if tagline_font is None:
            tagline_font = ImageFont.load_default()
    except:
        tagline_font = ImageFont.load_default()
    
    tagline = "Trouvez des experts de confiance"
    tagline_bbox = draw.textbbox((0, 0), tagline, font=tagline_font)
    tagline_width = tagline_bbox[2] - tagline_bbox[0]
    tagline_x = (width - tagline_width) // 2
    tagline_y = name_y + name_font_size + height // 40
    
    # Draw tagline in lighter color
    draw.text((tagline_x, tagline_y), tagline, fill=(150, 150, 150), font=tagline_font)
    
    img.save(output_path)
    print(f"✅ Created splash screen: {output_path}")
    return img

def create_adaptive_icon(size=1024, output_path="adaptive-icon.png"):
    """Create Android adaptive icon (foreground layer)"""
    # Adaptive icons need padding for the safe zone
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Draw the S in the center with proper padding
    padding = int(size * 0.2)
    inner_size = size - 2 * padding
    
    # Draw green circle
    draw.ellipse([padding, padding, size - padding, size - padding], 
                 fill=hex_to_rgb(PRIMARY_GREEN))
    
    # Draw S
    font_size = int(inner_size * 0.65)
    try:
        font_paths = [
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        ]
        font = None
        for fp in font_paths:
            if os.path.exists(fp):
                font = ImageFont.truetype(fp, font_size)
                break
        if font is None:
            font = ImageFont.load_default()
    except:
        font = ImageFont.load_default()
    
    text = "S"
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    
    x = (size - text_width) // 2
    y = (size - text_height) // 2 - bbox[1]
    
    draw.text((x, y), text, fill=hex_to_rgb(WHITE), font=font)
    
    img.save(output_path)
    print(f"✅ Created adaptive icon: {output_path}")
    return img

if __name__ == "__main__":
    output_dir = "/app/frontend/assets/images"
    
    print("🎨 Generating Soutrali App Assets...")
    print("=" * 50)
    
    # Create main app icon (1024x1024 for App Store)
    create_text_based_icon(1024, f"{output_dir}/icon.png")
    
    # Create adaptive icon for Android
    create_adaptive_icon(1024, f"{output_dir}/adaptive-icon.png")
    
    # Create favicon (smaller)
    create_text_based_icon(512, f"{output_dir}/favicon.png")
    
    # Create splash screen image
    create_splash_screen(800, 800, f"{output_dir}/splash-image.png")
    
    print("\n✅ All assets generated successfully!")
