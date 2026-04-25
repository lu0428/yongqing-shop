# -*- coding: utf-8 -*-
with open('index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 有兩張圖的茶類商品
two_imgs = [
    'ht001','ht002','ht003','ht004','ht005',
    'ht006','ht007','ht008','ht009','ht010',
    'ht011','ht012','ht013','ht014','ht015',
    'ht016','ht017','ht018','ht019',
    'ht021','ht023','ht024',
    'ht026','ht027','ht028','ht029',
    'ht031','ht032','ht033','ht034',
]

base = 'images/中西藥局/'

new_lines = []
for line in lines:
    for pid in two_imgs:
        marker = "id: '" + pid + "'"
        if marker in line:
            img1 = base + pid + '.jpg'
            img2 = base + pid + '_2.jpg'
            old = "image: '" + img1 + "', images: ['" + img1 + "', '" + img2 + "']"
            new = "image: '" + img2 + "', images: ['" + img2 + "', '" + img1 + "']"
            line = line.replace(old, new)
            break
    new_lines.append(line)

with open('index.html', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("done")
