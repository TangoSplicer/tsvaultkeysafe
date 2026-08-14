from PIL import Image, ImageDraw

SIZE = 96
image = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
draw = ImageDraw.Draw(image)
white = (255, 255, 255, 255)

# A compact shield with a transparent keyhole cutout: Android notification icons
# require a simple white alpha silhouette with no colour or shading.
shield = [(48, 10), (76, 22), (72, 60), (48, 86), (24, 60), (20, 22)]
draw.polygon(shield, fill=white)
# Cut out a keyhole using transparent pixels.
draw.ellipse((39, 33, 57, 51), fill=(0, 0, 0, 0))
draw.polygon([(43, 48), (53, 48), (57, 65), (39, 65)], fill=(0, 0, 0, 0))

image.save("/home/ubuntu/tsvaultkeysafe/assets/images/notification-icon.png", "PNG", optimize=True)
