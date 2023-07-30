from PIL import Image

img = Image.open('ShipBlueprint.png') 
pix = img.load()

colorToTypeDictionary = {
    (255, 255, 255): 0,
    (195, 195, 195): 1,
    (88, 88, 88): 2,
    (0, 0, 0): 3,
    (136, 0, 27): 4,
    (236, 28, 36): 5,
    (255, 127, 39): 6,
    (255, 202, 24): 7,
    (253, 236, 166): 8,
    (255, 242, 0): 9,
    (196, 255, 14): 10,
    (14, 209, 69): 11,
    (140, 255, 251): 12,
    (0, 168, 243): 13,
    (63, 72, 204): 14,
    (184, 61, 186): 15,
    (255, 174, 200): 16,
    (185, 122, 86): 17,
}

shipAsList = []

for i in range(img.size[1]):
    for j in range(img.size[0]):
        shipAsList.append(colorToTypeDictionary.get(pix[j,i], 0))

print(shipAsList)