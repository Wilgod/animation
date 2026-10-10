# 完整背景提示詞 第三組：風格系列（Nano Banana）

第三組背景，共 6 種風格、每種 10 款，共 60 款，跟第一、二組都不重複。生成後存進 `image/backgroud/`，檔名照每一款建議的英文 Title Case。

| 風格 | 說明 |
|---|---|
| 1. 混合場景 | 一張圖同時有陸地＋水域，烏龜在岸上走、魚在旁邊游 |
| 2. 插畫風格 | 水彩、吉卜力、剪紙、黏土、像素等，跟 3D 動物更統一 |
| 3. 季節節日 | 聖誕、萬聖、中秋、新年等主題集數 |
| 4. 奇幻故事 | 糖果樂園、月球、外太空、水晶洞穴 |
| 5. 小動物視角 | 超近距離的花心、樹皮、蘑菇，讓動物顯得很小 |
| 6. 搭配特效 | 專門搭配程式的飄雪、落葉、光斑、水波特效 |

**所有款式共通：**
- **比例 16:9**，盡量高解析度（輸出影片是 3840×2160，程式內部座標 1600×900）。
- **畫面中不要有任何動物、昆蟲、人或手**：動物由程式疊上去。
- **中間留出開闊空間**：主要物件放在邊緣，中間保留乾淨區域讓路徑有地方走。
- **沒有文字、浮水印、Logo**，畫面四邊填滿不留白。
- 陸地、水域、室內都是**俯視角度、沒有地平線**；天空是**往上看、整個畫面都是天空**。
- 每款標示 **區域**：`ground` 陸地、`water` 水域、`air` 天空，決定哪些動物能放上去。

---

## 1. 混合場景（10 款，陸地＋水域）

**混合場景共通原則：**
- 每款都有指定的**分界位置**（用畫面高度百分比描述），請盡量照著畫，程式會照這個位置切區域。
- 分界要**清楚但自然**：岸邊的石頭、草邊、浪花線都可以，不要漸層模糊成一片。
- 水的部分是**清澈淺水、看得到底**，魚放上去才看得清楚。

### 1-1 池塘邊草地 Grassy Pond Edge
**檔名：** `image/backgroud/Grassy Pond Edge.png`
**區域：** 上半 0–50% `ground`（草地）、下半 50–100% `water`（池塘）

適合：烏龜、青蛙、金魚、蝸牛
**中文：**
```
俯視角度的池塘岸邊照片，鏡頭正上方往下拍，
畫面上半部是短而整齊的綠色草地，下半部是清澈的淡綠色池水，
兩者的分界剛好在畫面正中間，是一條自然、大致水平的岸線，岸邊有一排小圓石，
池水看得到底部的卵石和幾片荷葉（荷葉只在下方邊緣），柔和日光，
沒有任何動物或昆蟲，沒有地平線，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度、寫實攝影風格。
```
**English：**
```
top-down photo of a pond edge, camera straight down, short neat green grass filling
the upper half, clear pale-green pond water filling the lower half, the shoreline
running roughly horizontally across the exact middle of the frame, lined with small
round stones, pebbles visible on the pond floor and a few lily pads only along the
bottom edge, soft daylight, no animals, no insects, no horizon, no text, no
watermark, 16:9, full-bleed, high resolution, photorealistic
```

### 1-2 海灘潮間帶 Beach Tide Line
**檔名：** `image/backgroud/Beach Tide Line.png`
**區域：** 上方 0–45% `ground`（乾沙）、下方 45–100% `water`（淺海）

適合：螃蟹、寄居蟹、海龜、海鷗
**中文：**
```
空拍俯視的海灘照片，鏡頭正上方往下拍，
畫面上方約 45% 是淺米色的乾燥細沙，下方約 55% 是清澈的土耳其藍淺海，
分界是一條白色的細浪花線，大致水平地橫過畫面，
沙灘上散落幾個空貝殼，海水裡看得到細沙波紋，明亮陽光，
沒有人、沒有腳印、沒有任何動物，沒有地平線，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度、寫實攝影風格。
```
**English：**
```
aerial top-down photo of a beach, camera straight down, pale beige dry sand across the
top 45% of the frame, clear turquoise shallow sea across the bottom 55%, separated by
a thin white line of surf running roughly horizontally, a few empty shells on the
sand, sand ripples visible under the water, bright sunlight, no people, no
footprints, no animals, no horizon, no text, no watermark, 16:9, full-bleed, high
resolution, photorealistic
```

### 1-3 溪流穿過森林 Forest Stream Crossing
**檔名：** `image/backgroud/Forest Stream Crossing.png`
**區域：** 上 0–35% `ground`、中 35–65% `water`（溪流）、下 65–100% `ground`

適合：青蛙、烏龜、金魚、松鼠、螃蟹
**中文：**
```
俯視角度的森林溪流照片，鏡頭正上方往下拍，
一條清澈的淺溪從畫面左邊水平流到右邊，佔畫面中間約三分之一的高度，
溪底是彩色圓卵石，溪的上下兩岸是鋪著落葉和青苔的森林地面，
岸邊線條清楚、大致水平，柔和的林間光線，
沒有任何動物或昆蟲，沒有地平線，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度、寫實攝影風格。
```
**English：**
```
top-down photo of a forest stream, camera straight down, a clear shallow stream
flowing horizontally from the left edge to the right edge and occupying the middle
third of the frame's height, colorful round pebbles on the streambed, forest floor
with fallen leaves and moss on both the upper and lower banks, clear roughly
horizontal banks, soft woodland light, no animals, no insects, no horizon, no text,
no watermark, 16:9, full-bleed, high resolution, photorealistic
```

### 1-4 水族箱桌面 Aquarium on a Table
**檔名：** `image/backgroud/Aquarium on a Table.png`
**區域：** 整體 `ground`（木桌），中間長方形 `water`（水族箱，約 x 30–70%、y 28–72%）

適合：金魚、小丑魚（水箱內）；蜘蛛、瓢蟲、蝸牛（桌面）
**中文：**
```
俯視角度的室內木桌照片，鏡頭正上方往下拍，
溫暖的木頭桌面，畫面正中間放著一個長方形、無蓋的玻璃水族箱，
水族箱大約佔畫面寬度的 40%、高度的 45%，從上往下看得到清澈的水、白色細砂和幾株小水草（水草貼著水箱邊），
水族箱四周是開闊的木桌面，柔和室內光，
沒有魚、沒有任何動物或昆蟲，沒有人，沒有牆壁、沒有透視，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度、寫實攝影風格。
```
**English：**
```
top-down photo of an indoor wooden table, camera straight down, warm wood surface, an
open rectangular glass aquarium placed in the exact center taking about 40% of the
frame's width and 45% of its height, seen from above with clear water, white fine
sand and a few small water plants against the tank walls, open wooden table around
the tank, soft indoor light, no fish, no animals, no insects, no people, no walls, no
perspective, no text, no watermark, 16:9, full-bleed, high resolution, photorealistic
```

### 1-5 稻田田埂 Rice Paddy Ridge
**檔名：** `image/backgroud/Rice Paddy Ridge.png`
**區域：** 上 0–40% `water`（水田）、中 40–60% `ground`（田埂）、下 60–100% `water`（水田）

適合：青蛙、蝸牛、麻雀、金魚
**中文：**
```
空拍俯視的水稻田照片，鏡頭正上方往下拍，
一條長著短草的泥土田埂從畫面左邊水平延伸到右邊，佔畫面中間約五分之一的高度，
田埂上下兩側是灌滿清水的水田，整齊的嫩綠秧苗一排排插在水裡（秧苗不要太密，要看得到水面），
水面映著淡淡的藍天顏色，柔和晨光，
沒有人、沒有任何動物，沒有地平線，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度、寫實攝影風格。
```
**English：**
```
aerial top-down photo of rice paddies, camera straight down, a grassy dirt ridge path
running horizontally from left to right across the middle fifth of the frame,
flooded paddies above and below it with neat rows of young green rice seedlings
(sparse enough that the water surface shows clearly), the water faintly reflecting
blue sky color, soft morning light, no people, no animals, no horizon, no text, no
watermark, 16:9, full-bleed, high resolution, photorealistic
```

### 1-6 岩岸浪花 Rocky Shore and Sea
**檔名：** `image/backgroud/Rocky Shore and Sea.png`
**區域：** 上 0–45% `ground`（礁岩）、下 45–100% `water`（海）

適合：螃蟹、海膽、章魚、海鷗
**中文：**
```
空拍俯視的岩岸照片，鏡頭正上方往下拍，
畫面上方約 45% 是深灰色、平坦有紋理的礁岩，岩縫裡有少量綠色海藻，
下方約 55% 是清澈的藍綠色海水，看得到水下的岩石和沙，
分界是一條白色浪花線，大致水平，柔和日光，
沒有人、沒有任何動物，沒有地平線，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度、寫實攝影風格。
```
**English：**
```
aerial top-down photo of a rocky shore, camera straight down, flat textured dark-grey
rock across the top 45% with a little green seaweed in the cracks, clear blue-green
sea across the bottom 55% showing rocks and sand underwater, separated by a roughly
horizontal line of white foam, soft daylight, no people, no animals, no horizon, no
text, no watermark, 16:9, full-bleed, high resolution, photorealistic
```

### 1-7 花園石砌水池 Garden Stone Pool
**檔名：** `image/backgroud/Garden Stone Pool.png`
**區域：** 整體 `ground`（花園），中間長方形 `water`（水池，約 x 28–72%、y 30–70%）

適合：金魚、青蛙（水池）；烏龜、蝸牛、瓢蟲（花園）
**中文：**
```
俯視角度的花園照片，鏡頭正上方往下拍，
畫面正中間是一個長方形、灰色石塊砌邊的淺水池，大約佔畫面寬度的 45%、高度的 40%，
池水清澈，看得到藍灰色池底和幾片漂浮的睡蓮葉（貼著池邊），
水池四周是修剪整齊的草地和小石板路，畫面角落有花叢，柔和日光，
沒有魚、沒有任何動物或昆蟲，沒有地平線，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度、寫實攝影風格。
```
**English：**
```
top-down photo of a garden, camera straight down, a rectangular shallow pool with grey
stone edging in the exact center taking about 45% of the frame's width and 40% of its
height, clear water showing a blue-grey pool floor and a few floating water-lily
leaves against the edges, neatly trimmed lawn and small stepping stones around the
pool, flower clumps in the corners, soft daylight, no fish, no animals, no insects,
no horizon, no text, no watermark, 16:9, full-bleed, high resolution, photorealistic
```

### 1-8 河岸卵石灘 Pebble Riverbank
**檔名：** `image/backgroud/Pebble Riverbank.png`
**區域：** 上 0–50% `ground`（卵石灘）、下 50–100% `water`（河水）

適合：烏龜、螃蟹、青蛙、金魚
**中文：**
```
俯視角度的河岸照片，鏡頭正上方往下拍，
畫面上半部是乾燥的灰白色圓卵石灘，下半部是清澈流動的淺河水，
分界在畫面中間、大致水平，水邊的石頭濕潤發亮，
水裡看得到彩色卵石，水面有細細的流水紋理，柔和日光，
沒有任何動物或昆蟲，沒有人，沒有地平線，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度、寫實攝影風格。
```
**English：**
```
top-down photo of a riverbank, camera straight down, dry grey-white round pebbles
across the upper half, clear flowing shallow river water across the lower half,
divided roughly horizontally at the middle, wet shiny stones at the waterline,
colorful pebbles visible underwater, fine current texture on the surface, soft
daylight, no animals, no insects, no people, no horizon, no text, no watermark, 16:9,
full-bleed, high resolution, photorealistic
```

### 1-9 海上木棧道 Boardwalk over the Sea
**檔名：** `image/backgroud/Boardwalk over the Sea.png`
**區域：** 上 0–35% `water`、中 35–65% `ground`（木棧道）、下 65–100% `water`

適合：螃蟹、海鷗、鴿子（棧道）；魚群、海龜、魟魚（海裡）
**中文：**
```
空拍俯視的海上木棧道照片，鏡頭正上方往下拍，
一條寬寬的淺色木棧道從畫面左邊水平延伸到右邊，佔畫面中間約三分之一的高度，
木板紋理清楚、排列整齊，棧道上下兩側是清澈的土耳其藍海水，看得到水下白沙，
明亮陽光，
沒有人、沒有船、沒有任何動物，沒有地平線，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度、寫實攝影風格。
```
**English：**
```
aerial top-down photo of a boardwalk over the sea, camera straight down, a wide
light-wood boardwalk running horizontally from left to right across the middle third
of the frame, clear neat plank grain, clear turquoise sea above and below it with
white sand visible underwater, bright sunlight, no people, no boats, no animals, no
horizon, no text, no watermark, 16:9, full-bleed, high resolution, photorealistic
```

### 1-10 浴室浴缸邊 Bathroom Tub Edge
**檔名：** `image/backgroud/Bathroom Tub Edge.png`
**區域：** 上 0–40% `ground`（磁磚地）、下 40–100% `water`（浴缸水）

適合：金魚、海龜（水裡）；蜘蛛、蝸牛（地上）
**中文：**
```
俯視角度的浴室照片，鏡頭正上方往下拍，
畫面上方約 40% 是白色小方磚的浴室地板，下方約 60% 是放滿清水的白色浴缸，
分界是浴缸寬寬的白色邊緣，大致水平，浴缸邊角有幾團白色泡泡，
水面清澈、看得到白色浴缸底，柔和明亮的白光，
沒有任何動物或昆蟲，沒有人、沒有手，沒有橡皮鴨，沒有牆壁、沒有透視，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度、寫實攝影風格。
```
**English：**
```
top-down photo of a bathroom, camera straight down, small white square floor tiles
across the top 40%, a white bathtub full of clear water across the bottom 60%,
separated by the tub's wide white rim running roughly horizontally, a few clumps of
white foam bubbles in the tub corners, clear water showing the white tub floor, soft
bright white light, no animals, no insects, no people, no hands, no rubber ducks, no
walls, no perspective, no text, no watermark, 16:9, full-bleed, high resolution,
photorealistic
```

---

## 2. 插畫風格（10 款）

**插畫共通原則：**
- 是**插畫／手作質感**，不是照片，但仍然是俯視（天空款除外）、沒有地平線。
- 顏色柔和、細節不要太碎，3D 動物放上去才會跳出來。
- 插畫裡同樣**不要畫任何動物、昆蟲或人**。

### 2-1 水彩繪本草地 Watercolor Meadow
**檔名：** `image/backgroud/Watercolor Meadow.png`
**區域：** `ground`

適合：烏龜、蝸牛、瓢蟲、松鼠
**中文：**
```
兒童繪本風格的水彩插畫，俯視角度往下看的草地，
柔和的黃綠與嫩綠水彩暈染，水彩紙紋理清楚，畫面邊緣點綴幾朵簡單的小白花和小黃花，
中間是大片乾淨柔和的綠色，筆觸輕鬆溫暖，
沒有任何動物、昆蟲或人，沒有天空、沒有地平線，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度。
```
**English：**
```
children's picture-book watercolor illustration, top-down view of a meadow, soft
yellow-green and fresh-green watercolor washes with visible watercolor paper texture,
a few simple little white and yellow flowers around the edges, large clean soft green
area in the center, loose warm brushwork, no animals, no insects, no people, no sky,
no horizon, no text, no watermark, 16:9, full-bleed, high resolution
```

### 2-2 吉卜力風森林地面 Hand-Painted Anime Forest Floor
**檔名：** `image/backgroud/Hand-Painted Anime Forest Floor.png`
**區域：** `ground`

適合：松鼠、蝸牛、青蛙、螳螂
**中文：**
```
日式手繪動畫背景風格（溫暖、細膩的水粉手繪感），俯視角度往下看的森林地面，
豐富的苔蘚綠、落葉、小蕨類，畫面邊緣有圓潤的石頭和樹根，
樹葉間灑下柔和的斑駁陽光，中間是平坦乾淨的苔蘚地，色彩飽和溫柔，
沒有任何動物、昆蟲、人或角色，沒有天空、沒有地平線，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度。
```
**English：**
```
Japanese hand-painted anime background style (warm, detailed gouache look), top-down
view of a forest floor, rich moss greens, fallen leaves and small ferns, rounded
stones and tree roots around the edges, soft dappled sunlight through leaves, flat
clean mossy ground in the center, saturated gentle colors, no animals, no insects, no
people or characters, no sky, no horizon, no text, no watermark, 16:9, full-bleed,
high resolution
```

### 2-3 剪紙海底 Paper-Cut Seabed
**檔名：** `image/backgroud/Paper-Cut Seabed.png`
**區域：** `water`

適合：金魚、小丑魚、水母、海馬
**中文：**
```
多層剪紙藝術風格的海底場景，俯視角度往下看，
用藍色、青綠色的紙張一層層疊出海底，邊緣有剪紙做的珊瑚、海草和石頭，
紙張之間有柔和的立體陰影，中間是大片平整的淺藍色紙面，
沒有魚、沒有任何動物或人，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度、手作質感。
```
**English：**
```
layered paper-cut art style seabed, top-down view, stacked sheets of blue and teal
paper forming the sea floor, paper-cut coral, seaweed and rocks around the edges,
soft dimensional shadows between paper layers, large flat pale-blue paper area in the
center, no fish, no animals, no people, no text, no watermark, 16:9, full-bleed, high
resolution, handcrafted texture
```

### 2-4 黏土花園 Clay Garden
**檔名：** `image/backgroud/Clay Garden.png`
**區域：** `ground`

適合：蝸牛、瓢蟲、烏龜、田鼠
**中文：**
```
黏土動畫（定格動畫）風格的花園地面，俯視角度往下看，
用捏塑黏土做出的咖啡色泥土和綠色小草，邊緣有黏土做的圓圓小花、蘑菇和小石頭，
看得到手指捏過的柔和痕跡，中間是平整的黏土地面，柔和攝影棚燈光，
沒有任何動物、昆蟲或人，沒有天空、沒有地平線，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度、手作質感。
```
**English：**
```
claymation stop-motion style garden ground, top-down view, sculpted modeling clay
forming brown soil and green grass, clay round flowers, mushrooms and pebbles around
the edges, soft fingerprint marks visible, flat clay ground in the center, soft
studio lighting, no animals, no insects, no people, no sky, no horizon, no text, no
watermark, 16:9, full-bleed, high resolution, handcrafted texture
```

### 2-5 羊毛氈天空 Felt Sky
**檔名：** `image/backgroud/Felt Sky.png`
**區域：** `air`

適合：蝴蝶、蜜蜂、麻雀、蜻蜓
**中文：**
```
羊毛氈手作風格的天空，16:9 橫向構圖，整個畫面都是天空，
柔軟毛茸茸的淺藍色羊毛氈底，邊緣有幾朵蓬鬆的白色羊毛氈雲朵，角落有一個圓圓的黃色羊毛氈太陽，
中間是開闊的淺藍色，看得到羊毛纖維質感，柔和溫暖的光線，
沒有地面、沒有鳥或任何動物，沒有文字、浮水印，
畫面填滿不留白，高解析度、手作質感。
```
**English：**
```
needle-felted wool craft style sky, 16:9 landscape, the whole frame is sky, soft fuzzy
pale-blue felt background, a few puffy white felt clouds near the edges and a round
yellow felt sun in a corner, open pale-blue center with visible wool fibers, soft
warm lighting, no ground, no birds or animals, no text, no watermark, full-bleed,
high resolution, handcrafted texture
```

### 2-6 像素風草地 Pixel Art Grassland
**檔名：** `image/backgroud/Pixel Art Grassland.png`
**區域：** `ground`

適合：烏龜、蝸牛、蜥蜴、瓢蟲
**中文：**
```
復古 16-bit 像素風格的遊戲地圖背景，正上方俯視角度，
綠色草地格子，邊緣有像素風的小樹叢、花朵和石頭，一條淺褐色泥土小路橫過畫面，
中間是大片乾淨的草地，色彩明亮、像素邊緣清楚，
沒有任何角色、動物或人，沒有介面、沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度。
```
**English：**
```
retro 16-bit pixel art game map background, straight top-down view, green grass
tiles, pixel bushes, flowers and rocks around the edges, a light-brown dirt path
crossing the frame, large clean grass area in the center, bright colors, crisp pixel
edges, no characters, no animals, no people, no UI, no text, no watermark, 16:9,
full-bleed, high resolution
```

### 2-7 蠟筆童畫天空 Crayon Drawing Sky
**檔名：** `image/backgroud/Crayon Drawing Sky.png`
**區域：** `air`

適合：蝴蝶、蜜蜂、麻雀、蜂鳥
**中文：**
```
小朋友蠟筆畫風格的天空，16:9 橫向構圖，整個畫面都是天空，
用藍色蠟筆塗滿的天空、看得到蠟筆筆觸和白紙紋理，
角落畫著一個有光芒的笑臉太陽（簡單可愛），邊緣有幾朵白色蠟筆雲和一道小彩虹，
中間是開闊的藍色，
沒有地面、沒有鳥或任何動物，沒有文字、字母、浮水印，
畫面填滿不留白，高解析度。
```
**English：**
```
child's crayon drawing style sky, 16:9 landscape, the whole frame is sky, filled in
with blue crayon showing crayon strokes and white paper texture, a simple cute sun
with rays in one corner, a few white crayon clouds and a small rainbow near the
edges, open blue center, no ground, no birds or animals, no text, no letters, no
watermark, full-bleed, high resolution
```

### 2-8 水粉畫荷塘 Gouache Lily Pond
**檔名：** `image/backgroud/Gouache Lily Pond.png`
**區域：** `water`

適合：金魚、青蛙、蜻蜓
**中文：**
```
水粉畫（不透明水彩）風格的池塘，俯視角度往下看，
平塗的深青綠色池水，邊緣有圓形的大睡蓮葉和粉紅色睡蓮花，
筆觸平整、色塊清楚、帶一點紙張質感，中間是開闊的池水，
沒有魚、沒有青蛙或任何動物，沒有人，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度。
```
**English：**
```
gouache painting style pond, top-down view, flat deep teal-green pond water, large
round lily pads and pink water lilies around the edges, smooth opaque brushwork with
clear color shapes and slight paper texture, open water in the center, no fish, no
frogs, no animals, no people, no text, no watermark, 16:9, full-bleed, high
resolution
```

### 2-9 低多邊形沙漠 Low-Poly Desert
**檔名：** `image/backgroud/Low-Poly Desert.png`
**區域：** `ground`

適合：蜥蜴、蜘蛛、螃蟹、烏龜
**中文：**
```
低多邊形（low-poly）3D 插畫風格的沙漠地面，正上方俯視角度，
由許多三角面組成的橘黃色沙地，邊緣有低多邊形的仙人掌、岩石，
柔和的平面光影，中間是平坦開闊的沙地，色彩溫暖明亮，
沒有任何動物、昆蟲或人，沒有天空、沒有地平線，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度。
```
**English：**
```
low-poly 3D illustration style desert ground, straight top-down view, orange-yellow
sand made of many triangular facets, low-poly cacti and rocks around the edges, soft
flat shading, flat open sand in the center, warm bright colors, no animals, no
insects, no people, no sky, no horizon, no text, no watermark, 16:9, full-bleed, high
resolution
```

### 2-10 水墨荷塘 Ink Wash Lotus Pond
**檔名：** `image/backgroud/Ink Wash Lotus Pond.png`
**區域：** `water`

適合：金魚、青蛙
**中文：**
```
中國水墨畫風格的荷塘，俯視角度往下看，
宣紙質感的淡米色底，用淡墨暈染出水面，畫面邊緣有濃淡墨色的荷葉和幾朵淡粉色荷花，
大量留白、意境清雅，中間是開闊淡雅的水面，
沒有魚、沒有任何動物或人，沒有題字、印章、文字、浮水印，
16:9 橫向構圖，畫面填滿，高解析度。
```
**English：**
```
Chinese ink wash painting style lotus pond, top-down view, pale cream rice-paper
texture, water suggested with light ink washes, lotus leaves in varying ink tones and
a few pale pink lotus flowers around the edges, generous empty space, elegant mood,
open calm water in the center, no fish, no animals, no people, no calligraphy, no
seals, no text, no watermark, 16:9, full-bleed, high resolution
```

---

## 3. 季節節日（10 款）

**節日共通原則：**
- 節日裝飾放在**畫面邊緣**，中間保持乾淨。
- 裝飾上**不要有字**（春聯、卡片、包裝都留白或用圖案）。

### 3-1 聖誕雪地 Christmas Snowy Ground
**檔名：** `image/backgroud/Christmas Snowy Ground.png`
**區域：** `ground`

適合：松鼠、田鼠、麻雀、烏龜
**中文：**
```
俯視角度的聖誕節雪地照片，鏡頭正上方往下拍，
潔白鬆軟的雪地，畫面邊緣有掉落的松樹枝、紅色和金色的聖誕球、幾顆松果和紅色緞帶，
中間是平整乾淨的雪面，柔和的冬日光線，溫馨節慶氣氛，
沒有任何動物或人，沒有腳印，沒有天空、沒有地平線，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度、寫實攝影風格。
```
**English：**
```
top-down photo of Christmas snowy ground, camera straight down, clean soft white snow,
fallen pine branches, red and gold baubles, a few pine cones and red ribbon around
the edges, smooth clean snow in the center, soft winter light, cozy festive mood, no
animals, no people, no footprints, no sky, no horizon, no text, no watermark, 16:9,
full-bleed, high resolution, photorealistic
```

### 3-2 萬聖節南瓜田 Halloween Pumpkin Patch
**檔名：** `image/backgroud/Halloween Pumpkin Patch.png`
**區域：** `ground`

適合：蜘蛛、蝙蝠（飛過）、田鼠、蝸牛
**中文：**
```
俯視角度的萬聖節南瓜田照片，鏡頭正上方往下拍，
深褐色泥土和枯黃的藤蔓葉，畫面邊緣有大小不一的橘色南瓜和一兩個雕刻的南瓜燈（可愛不恐怖），
中間是開闊的泥土地，傍晚溫暖的橘色光線，
沒有任何動物或人，沒有蜘蛛網、沒有骷髏，沒有天空、沒有地平線，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度、寫實攝影風格。
```
**English：**
```
top-down photo of a Halloween pumpkin patch, camera straight down, dark-brown soil and
dry yellowed vine leaves, orange pumpkins of various sizes and one or two carved
jack-o'-lanterns (cute, not scary) around the edges, open soil in the center, warm
orange early-evening light, no animals, no people, no cobwebs, no skulls, no sky, no
horizon, no text, no watermark, 16:9, full-bleed, high resolution, photorealistic
```

### 3-3 中秋賞月桌 Mid-Autumn Festival Table
**檔名：** `image/backgroud/Mid-Autumn Festival Table.png`
**區域：** `ground`

適合：田鼠、瓢蟲、蝸牛、烏龜
**中文：**
```
俯視角度的中秋節桌面照片，鏡頭正上方往下拍，
深色木頭桌面，畫面邊緣擺著月餅（切開一個看得到蛋黃）、一壺茶和茶杯、柚子和一盞紅色紙燈籠，
中間是開闊乾淨的木桌面，溫暖的燈籠光，
沒有任何動物或人，沒有手，月餅表面不要有字，沒有牆壁、沒有透視，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度、寫實攝影風格。
```
**English：**
```
top-down photo of a Mid-Autumn Festival table, camera straight down, dark wooden
tabletop, mooncakes (one cut open showing the yolk), a teapot and cups, pomelos and a
red paper lantern around the edges, open clean wooden surface in the center, warm
lantern light, no animals, no people, no hands, no characters stamped on the
mooncakes, no walls, no perspective, no text, no watermark, 16:9, full-bleed, high
resolution, photorealistic
```

### 3-4 農曆新年紅桌布 Lunar New Year Table
**檔名：** `image/backgroud/Lunar New Year Table.png`
**區域：** `ground`

適合：田鼠、瓢蟲、烏龜、蝸牛
**中文：**
```
俯視角度的農曆新年桌面照片，鏡頭正上方往下拍，
大紅色絲綢桌布，畫面邊緣擺著帶葉子的砂糖橘、全盒糖果、金色元寶擺飾和紅包（紅包上不要有字），
中間是開闊平整的紅色桌布，溫暖喜氣的光線，
沒有任何動物或人，沒有手，沒有春聯、沒有任何文字、浮水印，沒有牆壁、沒有透視，
16:9 橫向構圖，畫面填滿不留白，高解析度、寫實攝影風格。
```
**English：**
```
top-down photo of a Lunar New Year table, camera straight down, bright red silk
tablecloth, mandarin oranges with leaves, a candy tray, gold ingot ornaments and red
envelopes (blank, no characters) around the edges, open flat red cloth in the center,
warm festive light, no animals, no people, no hands, no couplets, no text or
characters anywhere, no watermark, no walls, no perspective, 16:9, full-bleed, high
resolution, photorealistic
```

### 3-5 端午龍舟河面 Dragon Boat Festival River
**檔名：** `image/backgroud/Dragon Boat Festival River.png`
**區域：** `water`

適合：金魚、魚群、烏龜
**中文：**
```
空拍俯視的河面照片，鏡頭正上方往下拍，
清澈的青綠色河水，畫面邊緣漂著幾片寬大的粽葉、幾顆綁著繩子的粽子漂在岸邊淺水處，
角落露出一點龍舟彩繪船頭的邊緣，中間是開闊平靜的河面，明亮的初夏陽光，
沒有人、沒有槳手、沒有任何動物，沒有地平線，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度、寫實攝影風格。
```
**English：**
```
aerial top-down photo of a river, camera straight down, clear jade-green water, a few
broad bamboo leaves and string-tied zongzi floating in the shallows near the edges,
the painted edge of a dragon-boat bow just visible in a corner, open calm water in
the center, bright early-summer sunlight, no people, no rowers, no animals, no
horizon, no text, no watermark, 16:9, full-bleed, high resolution, photorealistic
```

### 3-6 復活節彩蛋草地 Easter Egg Lawn
**檔名：** `image/backgroud/Easter Egg Lawn.png`
**區域：** `ground`

適合：瓢蟲、蝸牛、烏龜、麻雀
**中文：**
```
俯視角度的春天草地照片，鏡頭正上方往下拍，
嫩綠色的短草地，畫面邊緣藏著幾顆粉彩色的彩繪蛋、小雛菊和一個編織小籃子，
中間是開闊平整的草地，明亮柔和的春日陽光，
沒有兔子、沒有小雞或任何動物，沒有人，沒有天空、沒有地平線，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度、寫實攝影風格。
```
**English：**
```
top-down photo of a spring lawn, camera straight down, fresh green short grass,
pastel painted eggs, little daisies and a small woven basket tucked around the
edges, open flat grass in the center, bright soft spring sunlight, no bunnies, no
chicks, no animals, no people, no sky, no horizon, no text, no watermark, 16:9,
full-bleed, high resolution, photorealistic
```

### 3-7 情人節玫瑰花瓣桌 Valentine Rose Petal Table
**檔名：** `image/backgroud/Valentine Rose Petal Table.png`
**區域：** `ground`

適合：瓢蟲、蝸牛、蝴蝶（飛過）
**中文：**
```
俯視角度的情人節桌面照片，鏡頭正上方往下拍，
白色亞麻桌布，畫面邊緣散落紅色與粉紅色玫瑰花瓣、一束玫瑰的花頭、心形巧克力和小蠟燭，
中間是開闊乾淨的白色桌布，只有零星幾片花瓣，溫暖浪漫的燭光，
沒有任何動物或人，沒有手，沒有卡片文字、浮水印，沒有牆壁、沒有透視，
16:9 橫向構圖，畫面填滿不留白，高解析度、寫實攝影風格。
```
**English：**
```
top-down photo of a Valentine's table, camera straight down, white linen tablecloth,
red and pink rose petals, a few rose heads, heart-shaped chocolates and small
candles around the edges, open clean white cloth in the center with only a few
stray petals, warm romantic candlelight, no animals, no people, no hands, no card
text, no watermark, no walls, no perspective, 16:9, full-bleed, high resolution,
photorealistic
```

### 3-8 夏日野餐墊 Summer Picnic Blanket
**檔名：** `image/backgroud/Summer Picnic Blanket.png`
**區域：** `ground`

適合：瓢蟲、家蠅、蜜蜂、田鼠
**中文：**
```
俯視角度的夏日野餐照片，鏡頭正上方往下拍，
一大張藍白條紋的野餐墊鋪在草地上，佔畫面大部分，草地只露在四周邊緣，
墊子邊緣擺著藤編野餐籃、切片西瓜、三明治和一瓶檸檬水，
中間是開闊平整的野餐墊，明亮的夏日陽光，
沒有任何動物、昆蟲或人，沒有手，沒有天空、沒有地平線，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度、寫實攝影風格。
```
**English：**
```
top-down photo of a summer picnic, camera straight down, a large blue-and-white striped
picnic blanket on grass filling most of the frame with grass only around the
borders, a wicker basket, watermelon slices, sandwiches and a bottle of lemonade
along the blanket's edges, open flat blanket in the center, bright summer sunlight,
no animals, no insects, no people, no hands, no sky, no horizon, no text, no
watermark, 16:9, full-bleed, high resolution, photorealistic
```

### 3-9 秋天柿子與楓葉 Autumn Persimmons and Maple
**檔名：** `image/backgroud/Autumn Persimmons and Maple.png`
**區域：** `ground`

適合：松鼠、田鼠、蝸牛、烏龜
**中文：**
```
俯視角度的秋天庭院地面照片，鏡頭正上方往下拍，
灰色石板地上散落著火紅與橘黃色的楓葉，邊緣有一個竹籃裝著橘紅色的柿子，還有幾顆滾出來的柿子，
中間是開闊、只有零星落葉的石板地，溫暖的秋日斜陽（陰影柔和），
沒有任何動物或人，沒有天空、沒有地平線，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度、寫實攝影風格。
```
**English：**
```
top-down photo of an autumn courtyard, camera straight down, grey flagstones scattered
with fiery red and orange maple leaves, a bamboo basket of orange persimmons with a
few rolled out near the edges, open flagstones with only a few leaves in the center,
warm autumn afternoon light with soft shadows, no animals, no people, no sky, no
horizon, no text, no watermark, 16:9, full-bleed, high resolution, photorealistic
```

### 3-10 新年煙火夜空 New Year Fireworks Sky
**檔名：** `image/backgroud/New Year Fireworks Sky.png`
**區域：** `air`

適合：蝙蝠、螢火蟲、飛蛾、貓頭鷹
**中文：**
```
新年煙火夜空的攝影照片，16:9 橫向構圖，整個畫面都是天空，
深藍黑色夜空，畫面四個角落和邊緣有金色、紅色、粉紫色綻放的煙火，
煙火之間有淡淡的煙霧，中間是較乾淨的深色夜空，
沒有地面、沒有建築、沒有人群、沒有鳥或任何動物，沒有文字、數字、浮水印，
畫面填滿不留白，高解析度。
```
**English：**
```
photo of a New Year fireworks night sky, 16:9 landscape, the whole frame is sky, deep
navy-black night, gold, red and pink-violet fireworks bursting in the corners and
along the edges, faint smoke between bursts, cleaner dark sky in the center, no
ground, no buildings, no crowds, no birds or animals, no text, no numbers, no
watermark, full-bleed, high resolution
```

---

## 4. 奇幻故事（10 款）

**奇幻共通原則：**
- 可以夢幻、誇張，但仍要**清楚好讀**，中間不要放發光的大物件搶戲。
- 寫實渲染或高品質插畫都可以，同一系列影片建議用同一種。

### 4-1 糖果樂園 Candy Land
**檔名：** `image/backgroud/Candy Land.png`
**區域：** `ground`

適合：瓢蟲、蝸牛、烏龜、田鼠
**中文：**
```
俯視角度的奇幻糖果樂園地面，正上方往下看，
粉紅色的棉花糖草地和淡黃色餅乾小路，邊緣有棒棒糖樹、彩色軟糖石頭、甜甜圈和馬卡龍，
中間是開闊平坦的粉色地面，明亮柔和的夢幻光線，高品質 3D 渲染質感，
沒有任何角色、動物或人，沒有天空、沒有地平線，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度。
```
**English：**
```
top-down view of a fantasy candy land ground, looking straight down, pink cotton-candy
grass and a pale-yellow biscuit path, lollipop trees, colorful gummy rocks, donuts and
macarons around the edges, open flat pink ground in the center, bright soft dreamy
lighting, high-quality 3D render look, no characters, no animals, no people, no sky,
no horizon, no text, no watermark, 16:9, full-bleed, high resolution
```

### 4-2 童話蘑菇森林 Fairy Mushroom Forest
**檔名：** `image/backgroud/Fairy Mushroom Forest.png`
**區域：** `ground`

適合：蝸牛、青蛙、螢火蟲、田鼠
**中文：**
```
俯視角度的童話蘑菇森林地面，正上方往下看，
柔軟的綠苔蘚地，邊緣有紅底白點的大蘑菇、會微微發光的小藍蘑菇和蕨類，
空中飄著幾顆柔和的金色光點，中間是開闊的苔蘚地，魔幻溫暖的光線，
沒有精靈、角色、任何動物或人，沒有天空、沒有地平線，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度。
```
**English：**
```
top-down view of a fairy-tale mushroom forest floor, looking straight down, soft green
moss, big red-and-white spotted toadstools, small softly glowing blue mushrooms and
ferns around the edges, a few gentle golden sparkles in the air, open moss in the
center, magical warm lighting, no fairies, no characters, no animals, no people, no
sky, no horizon, no text, no watermark, 16:9, full-bleed, high resolution
```

### 4-3 月球表面 Moon Surface
**檔名：** `image/backgroud/Moon Surface.png`
**區域：** `ground`

適合：烏龜、蜘蛛、螃蟹、蜥蜴
**中文：**
```
俯視角度的月球表面，正上方往下看，
淺灰色細粉狀的月壤，邊緣有大大小小的隕石坑和灰色岩石，
中間是平坦開闊的月面，強烈但柔和的側光讓坑洞有立體感（陰影不要太黑），
沒有太空人、腳印、旗子、任何動物或人，沒有天空、沒有地平線、沒有地球，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度、寫實風格。
```
**English：**
```
top-down view of the lunar surface, looking straight down, light-grey powdery regolith,
craters of many sizes and grey rocks around the edges, flat open ground in the
center, crisp but soft side light giving the craters depth (shadows not pitch
black), no astronauts, no footprints, no flags, no animals, no people, no sky, no
horizon, no Earth, no text, no watermark, 16:9, full-bleed, high resolution,
photorealistic
```

### 4-4 外太空星雲 Outer Space Nebula
**檔名：** `image/backgroud/Outer Space Nebula.png`
**區域：** `air`

適合：蝴蝶、蜂鳥、螢火蟲、飛蛾
**中文：**
```
外太空的景色，16:9 橫向構圖，整個畫面都是太空，
深藍黑色宇宙，邊緣有粉紫、青藍色的彩色星雲，角落有一顆帶光環的小行星，
滿天細小的星星，中間是較乾淨的深色太空，
沒有太空船、太空人、任何動物或人，沒有地面，沒有文字、浮水印，
畫面填滿不留白，高解析度。
```
**English：**
```
outer space scene, 16:9 landscape, the whole frame is space, deep navy-black cosmos,
pink-violet and cyan nebulae along the edges, a small ringed planet in one corner,
fine scattered stars, cleaner dark space in the center, no spaceships, no
astronauts, no animals, no people, no ground, no text, no watermark, full-bleed, high
resolution
```

### 4-5 水晶洞穴 Crystal Cave Floor
**檔名：** `image/backgroud/Crystal Cave Floor.png`
**區域：** `ground`

適合：蜘蛛、蜥蜴、蝸牛、螃蟹
**中文：**
```
俯視角度的奇幻水晶洞穴地面，正上方往下看，
深灰紫色的平坦岩石地面，邊緣長出一叢叢紫水晶、透明白水晶和淡藍色水晶，
水晶發出柔和的光，照亮地面，中間是開闊平坦的岩石地，神秘但明亮清楚，
沒有任何動物或人，沒有天空、沒有地平線，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度。
```
**English：**
```
top-down view of a fantasy crystal cave floor, looking straight down, flat dark
grey-violet rock, clusters of amethyst, clear quartz and pale-blue crystals growing
around the edges, the crystals softly glowing and lighting the floor, open flat rock
in the center, mysterious yet bright and clear, no animals, no people, no sky, no
horizon, no text, no watermark, 16:9, full-bleed, high resolution
```

### 4-6 雲端城堡天空 Sky Castle Clouds
**檔名：** `image/backgroud/Sky Castle Clouds.png`
**區域：** `air`

適合：蝴蝶、燕子、海鷗、蜂鳥
**中文：**
```
奇幻雲海天空，16:9 橫向構圖，整個畫面都是天空和雲，
柔和的粉藍色天空，畫面下方邊緣和角落是蓬鬆的白色雲海，
右上角遠遠有一座小小的白色尖塔城堡浮在雲上（很小、不搶戲），
中間是開闊的天空，金色的夢幻陽光，
沒有地面、沒有鳥或任何動物、沒有人，沒有文字、浮水印，
畫面填滿不留白，高解析度。
```
**English：**
```
fantasy sky above a sea of clouds, 16:9 landscape, the whole frame is sky and cloud,
soft pastel-blue sky, puffy white cloud sea along the bottom edge and corners, a tiny
distant white spired castle floating on clouds in the upper-right corner (very small,
not dominant), open sky in the center, golden dreamy sunlight, no ground, no birds
or animals, no people, no text, no watermark, full-bleed, high resolution
```

### 4-7 發光蘑菇池 Glowing Mushroom Pool
**檔名：** `image/backgroud/Glowing Mushroom Pool.png`
**區域：** `water`

適合：金魚、水母、青蛙、螢火蟲
**中文：**
```
俯視角度的奇幻夜晚池塘，正上方往下看，
深藍綠色清澈的池水，池底有發出柔光的藍綠色水草，
畫面邊緣的岸上長著發光的小蘑菇，光倒映在水面上，中間是開闊的深色水面，
夢幻但清楚，
沒有魚、沒有任何動物或人，沒有天空、沒有地平線，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度。
```
**English：**
```
top-down view of a fantasy pond at night, looking straight down, clear deep teal
water, softly glowing blue-green water plants on the pond floor, small glowing
mushrooms on the banks around the edges with their light reflected on the water,
open dark water in the center, dreamy but clear, no fish, no animals, no people, no
sky, no horizon, no text, no watermark, 16:9, full-bleed, high resolution
```

### 4-8 海底古城遺跡 Sunken City Ruins
**檔名：** `image/backgroud/Sunken City Ruins.png`
**區域：** `water`

適合：章魚、鯊魚、海鰻、海龜
**中文：**
```
俯視角度的海底古城遺跡，正上方往下看，
清澈的藍色海水下是白沙海床，邊緣有傾倒的大理石柱、破碎的石雕和長了珊瑚的石階，
陽光穿過水面形成光斑，中間是開闊的白沙地，神秘寧靜，
沒有魚、沒有美人魚、任何動物或人，沒有文字、刻字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度、寫實風格。
```
**English：**
```
top-down view of sunken ancient city ruins, looking straight down, clear blue water
over a white-sand seabed, fallen marble columns, broken stone carvings and
coral-covered steps around the edges, sunlight caustics, open white sand in the
center, mysterious and calm, no fish, no mermaids, no animals, no people, no text or
inscriptions, no watermark, 16:9, full-bleed, high resolution, photorealistic
```

### 4-9 巨人的餐桌 Giant's Dinner Table
**檔名：** `image/backgroud/Giant's Dinner Table.png`
**區域：** `ground`

適合：田鼠、瓢蟲、蝸牛、蜘蛛
**中文：**
```
俯視角度的「巨人餐桌」奇幻場景，正上方往下看，
巨大的木頭桌面，木紋粗大，邊緣是比例誇張的巨大餐具：一把巨大叉子的叉尖、一個巨大盤子的邊緣、幾顆像大石頭一樣的麵包屑和一顆巨大豌豆，
讓桌面看起來像一片廣場，中間是開闊的木桌面，溫暖燭光，
沒有任何角色、動物或人，沒有手，沒有牆壁、沒有透視，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度。
```
**English：**
```
top-down view of a "giant's dinner table" fantasy scene, looking straight down, a huge
wooden tabletop with oversized grain, enormous tableware around the edges: the tines
of a gigantic fork, the rim of a giant plate, bread crumbs as big as boulders and a
giant pea, making the table feel like a plaza, open wooden surface in the center,
warm candlelight, no characters, no animals, no people, no hands, no walls, no
perspective, no text, no watermark, 16:9, full-bleed, high resolution
```

### 4-10 恐龍時代火山地 Prehistoric Volcanic Land
**檔名：** `image/backgroud/Prehistoric Volcanic Land.png`
**區域：** `ground`

適合：蜥蜴、烏龜、螃蟹、蜘蛛
**中文：**
```
俯視角度的史前恐龍時代地面，正上方往下看，
深褐色的火山土，邊緣有巨大的古代蕨類葉子、蘇鐵和冒著淡淡熱氣的黑色岩石，
一條細細的橘紅色熔岩裂縫在角落發光（不在中間），中間是開闊平坦的土地，溫暖的光線，
沒有恐龍、任何動物或人，沒有骨頭，沒有天空、沒有地平線，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度。
```
**English：**
```
top-down view of prehistoric dinosaur-era ground, looking straight down, dark-brown
volcanic soil, giant ancient fern fronds, cycads and faintly steaming black rocks
around the edges, a thin glowing orange lava crack in one corner (not in the
center), open flat ground in the center, warm lighting, no dinosaurs, no animals, no
people, no bones, no sky, no horizon, no text, no watermark, 16:9, full-bleed, high
resolution
```

---

## 5. 小動物視角／超近距離（10 款）

**近距離共通原則：**
- 微距攝影感，表面**放大到像一整片場地**，動物看起來很小。
- 景深可以有一點，但**整個畫面要大致清楚**，中間一定要清晰。
- 全部都是 `ground` 區域。

### 5-1 向日葵花心 Sunflower Center
**檔名：** `image/backgroud/Sunflower Center.png`

適合：蜜蜂、瓢蟲、蝴蝶、家蠅
**中文：**
```
正上方俯視的向日葵花心微距照片，
深褐色與金褐色的螺旋狀花心種子佔滿畫面大部分，只有四個角落露出黃色花瓣，
螺旋紋理清楚、表面相對平整，自然陽光，色彩飽和溫暖，
沒有蜜蜂、昆蟲或任何動物，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度、微距攝影。
```
**English：**
```
straight top-down macro photo of a sunflower center, the dark-brown and golden-brown
spiral seed head filling most of the frame with yellow petals only in the four
corners, clear spiral texture and a relatively flat surface, natural sunlight, warm
saturated color, no bees, no insects, no animals, no text, no watermark, 16:9,
full-bleed, high resolution, macro photography
```

### 5-2 老樹樹皮 Old Tree Bark
**檔名：** `image/backgroud/Old Tree Bark.png`

適合：壁虎、蜥蜴、蜘蛛、螳螂
**中文：**
```
正面平拍的老樹樹皮微距照片，樹皮佔滿整個畫面，
灰褐色、有深溝紋的粗糙樹皮，溝紋大致垂直，邊緣有一點點綠色地衣和青苔，
中間區域的樹皮紋理均勻，柔和的森林光線，
沒有昆蟲、螞蟻或任何動物，沒有刻字，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度、微距攝影。
```
**English：**
```
flat front-on macro photo of old tree bark filling the entire frame, rough grey-brown
bark with deep roughly vertical furrows, a little green lichen and moss near the
edges, even bark texture in the center, soft forest light, no insects, no ants, no
animals, no carvings, no text, no watermark, 16:9, full-bleed, high resolution,
macro photography
```

### 5-3 蘑菇傘面 Mushroom Cap Top
**檔名：** `image/backgroud/Mushroom Cap Top.png`

適合：蝸牛、瓢蟲、蜘蛛
**中文：**
```
正上方俯視的大蘑菇傘面微距照片，傘面佔滿畫面大部分，
溫暖的淺褐色光滑傘面，帶細緻的紋理和幾顆小水珠，四個角落露出一點苔蘚和落葉，
傘面中間平整開闊，柔和的森林散射光，
沒有任何昆蟲或動物，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度、微距攝影。
```
**English：**
```
straight top-down macro photo of a large mushroom cap filling most of the frame,
smooth warm light-brown cap with fine texture and a few tiny water droplets, a little
moss and fallen leaves in the four corners, flat open cap surface in the center,
soft diffused forest light, no insects, no animals, no text, no watermark, 16:9,
full-bleed, high resolution, macro photography
```

### 5-4 露珠綠葉 Dewdrop Leaf
**檔名：** `image/backgroud/Dewdrop Leaf.png`

適合：瓢蟲、蝸牛、螳螂、蜘蛛
**中文：**
```
正上方俯視的綠葉微距照片，一片大葉子佔滿整個畫面，
鮮綠色葉面，主葉脈從左到右橫過畫面，細葉脈清楚，
邊緣散落晶瑩的露珠，中間葉面乾淨只有零星小露珠，柔和的晨光，
沒有任何昆蟲或動物，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度、微距攝影。
```
**English：**
```
straight top-down macro photo of a green leaf filling the entire frame, vivid green
surface with the main vein running left to right and clear fine veins, sparkling
dewdrops scattered near the edges, clean leaf surface with only a few tiny droplets
in the center, soft morning light, no insects, no animals, no text, no watermark,
16:9, full-bleed, high resolution, macro photography
```

### 5-5 苔蘚微森林 Moss Micro Forest
**檔名：** `image/backgroud/Moss Micro Forest.png`

適合：蝸牛、瓢蟲、螳螂、蜘蛛
**中文：**
```
正上方俯視的苔蘚微距照片，苔蘚佔滿整個畫面，
像一片迷你森林的綠色苔蘚，邊緣有長著小孢子柄的苔蘚和一兩顆小小的紅色地衣果，
中間是平整、柔軟的短苔蘚，柔和的散射光，
沒有任何昆蟲或動物，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度、微距攝影。
```
**English：**
```
straight top-down macro photo of moss filling the entire frame, green moss like a
miniature forest, moss with tiny spore stalks and one or two tiny red lichen fruits
near the edges, flat soft short moss in the center, soft diffused light, no insects,
no animals, no text, no watermark, 16:9, full-bleed, high resolution, macro
photography
```

### 5-6 蜂巢蜂蠟 Honeycomb Close-Up
**檔名：** `image/backgroud/Honeycomb Close-Up.png`

適合：蜜蜂、瓢蟲、家蠅
**中文：**
```
正面平拍的蜂巢微距照片，蜂巢佔滿整個畫面，
金黃色的六角形蜂蠟格子，部分格子裝著晶亮的蜂蜜、部分已封蠟，
格子排列整齊、表面平整，溫暖的光線讓蜂蜜發光，
沒有蜜蜂、昆蟲或任何動物，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度、微距攝影。
```
**English：**
```
flat front-on macro photo of honeycomb filling the entire frame, golden hexagonal wax
cells, some filled with glistening honey and some capped, neat regular cells and a
flat surface, warm light making the honey glow, no bees, no insects, no animals, no
text, no watermark, 16:9, full-bleed, high resolution, macro photography
```

### 5-7 西瓜切面 Watermelon Slice Surface
**檔名：** `image/backgroud/Watermelon Slice Surface.png`

適合：家蠅、瓢蟲、蝸牛、蜜蜂
**中文：**
```
正上方俯視的西瓜切面微距照片，紅色果肉佔滿畫面大部分，
多汁的鮮紅色果肉，散落幾顆黑色西瓜籽，下方邊緣露出一條白色和綠色的瓜皮，
中間是開闊、水潤的紅色果肉，明亮自然光，
沒有任何昆蟲或動物，沒有刀、沒有手，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度、微距攝影。
```
**English：**
```
straight top-down macro photo of a cut watermelon surface, juicy bright-red flesh
filling most of the frame with a few black seeds, a strip of white and green rind
along the bottom edge, open moist red flesh in the center, bright natural light, no
insects, no animals, no knife, no hands, no text, no watermark, 16:9, full-bleed,
high resolution, macro photography
```

### 5-8 玫瑰花瓣層 Rose Petal Layers
**檔名：** `image/backgroud/Rose Petal Layers.png`

適合：瓢蟲、蝴蝶、蜜蜂、蝸牛
**中文：**
```
正上方俯視的玫瑰花微距照片，盛開的粉紅色玫瑰佔滿畫面，
一層層柔軟的花瓣向外展開，花心在畫面中央但花瓣表面平緩開闊，
花瓣上有幾顆小水珠，柔和的光線、色彩柔美，
沒有任何昆蟲或動物，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度、微距攝影。
```
**English：**
```
straight top-down macro photo of a rose filling the frame, a fully open pink rose
with soft layered petals spreading outward, the center in the middle but with gentle
open petal surfaces, a few tiny water droplets on the petals, soft light, delicate
color, no insects, no animals, no text, no watermark, 16:9, full-bleed, high
resolution, macro photography
```

### 5-9 高麗菜葉脈 Cabbage Leaf Veins
**檔名：** `image/backgroud/Cabbage Leaf Veins.png`

適合：蝸牛、瓢蟲、家蠅
**中文：**
```
正上方俯視的高麗菜葉微距照片，一片菜葉佔滿整個畫面，
淡綠到嫩白的菜葉，粗白色的主葉脈從畫面一邊延伸出去、分出許多細葉脈，
葉面微微起伏但大致平整，邊緣有幾顆小水珠，明亮柔和的廚房光，
沒有菜蟲、昆蟲或任何動物，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度、微距攝影。
```
**English：**
```
straight top-down macro photo of a cabbage leaf filling the entire frame, pale green
to tender white leaf, a thick white main vein extending from one side and branching
into many fine veins, gently undulating but mostly flat surface, a few small water
droplets near the edges, bright soft kitchen light, no caterpillars, no insects, no
animals, no text, no watermark, 16:9, full-bleed, high resolution, macro photography
```

### 5-10 地衣岩石 Lichen Covered Rock
**檔名：** `image/backgroud/Lichen Covered Rock.png`

適合：蜥蜴、蜘蛛、螳螂、蝸牛
**中文：**
```
正上方俯視的岩石表面微距照片，岩石佔滿整個畫面，
灰色花崗岩表面，邊緣長著一圈圈橘黃色、淡綠色和白色的地衣斑塊，
中間是較乾淨、帶細小礦物顆粒的灰色岩面，柔和日光，
沒有任何昆蟲或動物，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度、微距攝影。
```
**English：**
```
straight top-down macro photo of a rock surface filling the entire frame, grey granite
with rings of orange-yellow, pale-green and white lichen patches near the edges,
cleaner grey rock with fine mineral grains in the center, soft daylight, no insects,
no animals, no text, no watermark, 16:9, full-bleed, high resolution, macro
photography
```

---

## 6. 搭配程式特效（10 款）

程式在 Generate Video 時會隨機加特效：戶外場景有**落葉／花瓣**、檔名或 id 有 `snow` 的場景有**飄雪**、室內場景有**飄浮灰塵**、所有地面場景可能有**光斑（dappled light）**、水域有**水波**、草地類可以設定**搖曳（sway）**。下面每款都標了適合搭配的特效。

**特效共通原則：**
- 背景本身**不要畫出**雪花、落葉飄在空中、光束，程式會加上去，重複會很亂。
- 光線比其他款更**柔和平均**，讓程式加的光斑看得出來。

### 6-1 雪後森林小徑 Snowy Forest Path
**檔名：** `image/backgroud/Snowy Forest Path.png`
**區域：** `ground`　**特效：** 飄雪（檔名含 Snow）

適合：松鼠、田鼠、麻雀、貓頭鷹（飛過）
**中文：**
```
俯視角度的雪後森林地面照片，鏡頭正上方往下拍，
平整潔白的積雪，邊緣露出幾根深色樹根、松樹枝和小灌木，
中間是開闊乾淨的雪面，陰天柔和均勻的光線，
空中沒有飄雪，沒有任何動物或人，沒有腳印，沒有天空、沒有地平線，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度、寫實攝影風格。
```
**English：**
```
top-down photo of a snowy forest floor, camera straight down, smooth clean white snow,
a few dark tree roots, pine branches and small shrubs poking through near the edges,
open clean snow in the center, soft even overcast light, no falling snow in the air,
no animals, no people, no footprints, no sky, no horizon, no text, no watermark,
16:9, full-bleed, high resolution, photorealistic
```

### 6-2 楓葉小路 Maple Leaf Path
**檔名：** `image/backgroud/Maple Leaf Path.png`
**區域：** `ground`　**特效：** 落葉

適合：松鼠、蝸牛、烏龜、田鼠
**中文：**
```
俯視角度的公園小路照片，鏡頭正上方往下拍，
一條淺灰色的石板小路從左到右橫過畫面，兩側邊緣鋪滿紅色與橘色的楓葉，
小路上只有零星幾片楓葉，柔和均勻的秋日光線，
空中沒有飄落的葉子，沒有任何動物或人，沒有天空、沒有地平線，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度、寫實攝影風格。
```
**English：**
```
top-down photo of a park path, camera straight down, a light-grey flagstone path
running left to right across the frame, red and orange maple leaves piled along both
edges, only a few scattered leaves on the path itself, soft even autumn light, no
leaves falling in the air, no animals, no people, no sky, no horizon, no text, no
watermark, 16:9, full-bleed, high resolution, photorealistic
```

### 6-3 林蔭光斑草地 Shaded Forest Clearing
**檔名：** `image/backgroud/Shaded Forest Clearing.png`
**區域：** `ground`　**特效：** 光斑（程式會加會動的樹影光斑）

適合：蝸牛、青蛙、松鼠、螳螂
**中文：**
```
俯視角度的林間空地照片，鏡頭正上方往下拍，
短短的綠草和少量落葉，邊緣有幾叢蕨類和小樹根，
整個畫面是均勻的柔和陰影光（像在樹蔭下），沒有明顯的光斑，中間是開闊的草地，
沒有任何動物或人，沒有天空、沒有地平線，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度、寫實攝影風格。
```
**English：**
```
top-down photo of a forest clearing, camera straight down, short green grass with a
few fallen leaves, clumps of ferns and small roots near the edges, the whole frame in
even soft shade (as if under trees) with no distinct light spots, open grass in the
center, no animals, no people, no sky, no horizon, no text, no watermark, 16:9,
full-bleed, high resolution, photorealistic
```

### 6-4 清淺溪水 Clear Shallow Brook
**檔名：** `image/backgroud/Clear Shallow Brook.png`
**區域：** `water`　**特效：** 水波

適合：金魚、魚群、青蛙、螃蟹
**中文：**
```
俯視角度的清淺溪水照片，鏡頭正上方往下拍，
非常清澈、平靜的淺水，水底是金褐色細沙和散落的小圓卵石，
邊緣有幾塊長青苔的石頭和水草，水面平滑、沒有明顯波紋或反光，柔和光線，
沒有魚、沒有任何動物或人，沒有地平線，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度、寫實攝影風格。
```
**English：**
```
top-down photo of a clear shallow brook, camera straight down, very clear calm shallow
water over golden-brown fine sand and scattered small round pebbles, a few mossy
stones and water plants near the edges, smooth surface with no strong ripples or
reflections, soft light, no fish, no animals, no people, no horizon, no text, no
watermark, 16:9, full-bleed, high resolution, photorealistic
```

### 6-5 微風長草 Breezy Tall Grass
**檔名：** `image/backgroud/Breezy Tall Grass.png`
**區域：** `ground`　**特效：** 搖曳（sway）、落葉

適合：螳螂、瓢蟲、蝸牛、田鼠
**中文：**
```
俯視角度的草地照片，鏡頭正上方往下拍，
畫面上下兩側邊緣是比較長、柔軟的綠色長草葉，草尖朝畫面中間伸，
中間是剪短的平整草地，柔和均勻的陽光，
沒有任何動物、昆蟲或人，沒有天空、沒有地平線，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度、寫實攝影風格。
```
**English：**
```
top-down photo of grass, camera straight down, longer soft green grass blades along
the top and bottom edges with their tips reaching toward the center, short neatly
mown grass in the middle, soft even sunlight, no animals, no insects, no people, no
sky, no horizon, no text, no watermark, 16:9, full-bleed, high resolution,
photorealistic
```

### 6-6 春天花瓣步道 Spring Blossom Walkway
**檔名：** `image/backgroud/Spring Blossom Walkway.png`
**區域：** `ground`　**特效：** 花瓣

適合：蝴蝶（飛過）、瓢蟲、蝸牛、烏龜
**中文：**
```
俯視角度的春天步道照片，鏡頭正上方往下拍，
米白色的細碎石步道，兩側邊緣是開滿小花的花壇（粉紅、白、淡紫色），
步道上只有零星幾片花瓣，中間開闊乾淨，柔和明亮的春光，
空中沒有飄落的花瓣，沒有任何動物、昆蟲或人，沒有天空、沒有地平線，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度、寫實攝影風格。
```
**English：**
```
top-down photo of a spring walkway, camera straight down, a cream fine-gravel path,
flower beds full of small pink, white and lilac blossoms along both edges, only a few
stray petals on the path, open clean center, soft bright spring light, no petals
falling in the air, no animals, no insects, no people, no sky, no horizon, no text,
no watermark, 16:9, full-bleed, high resolution, photorealistic
```

### 6-7 陽光閣樓木地板 Sunny Attic Floor
**檔名：** `image/backgroud/Sunny Attic Floor.png`
**區域：** `ground`（室內）　**特效：** 飄浮灰塵、光斑

適合：蜘蛛、田鼠、蝸牛、飛蛾（飛過）
**中文：**
```
俯視角度的閣樓木地板照片，鏡頭正上方往下拍，
老舊的寬木板地板，帶有溫暖的蜂蜜色和磨損痕跡，
邊緣有一個舊皮箱的角、一捆舊毛線和一個木箱，中間是開闊的木地板，柔和溫暖的光線，
空中沒有灰塵光束，沒有任何動物或人，沒有蜘蛛網，沒有牆壁、沒有透視，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度、寫實攝影風格。
```
**English：**
```
top-down photo of an attic floor, camera straight down, old wide wooden floorboards
with warm honey tones and wear marks, the corner of an old suitcase, a bundle of old
yarn and a wooden crate near the edges, open wooden floor in the center, soft warm
light, no dust beams in the air, no animals, no people, no cobwebs, no walls, no
perspective, no text, no watermark, 16:9, full-bleed, high resolution,
photorealistic
```

### 6-8 雪地庭院石燈籠 Snow Garden Lantern
**檔名：** `image/backgroud/Snow Garden Lantern.png`
**區域：** `ground`　**特效：** 飄雪（檔名含 Snow）

適合：麻雀、鴿子、松鼠、田鼠
**中文：**
```
俯視角度的日式庭院雪景照片，鏡頭正上方往下拍，
平整的白色積雪，角落有一座石燈籠的頂部、幾塊被雪蓋住的踏腳石和紅色南天竹果實，
中間是開闊乾淨的雪面，柔和均勻的冬日光線，
空中沒有飄雪，沒有任何動物或人，沒有腳印，沒有天空、沒有地平線，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度、寫實攝影風格。
```
**English：**
```
top-down photo of a Japanese garden in snow, camera straight down, smooth white snow,
the top of a stone lantern, a few snow-covered stepping stones and red nandina
berries in the corners, open clean snow in the center, soft even winter light, no
falling snow in the air, no animals, no people, no footprints, no sky, no horizon,
no text, no watermark, 16:9, full-bleed, high resolution, photorealistic
```

### 6-9 淺水泳池磁磚 Shallow Pool Tiles
**檔名：** `image/backgroud/Shallow Pool Tiles.png`
**區域：** `water`　**特效：** 水波

適合：金魚、小丑魚、海龜、魚群
**中文：**
```
俯視角度的淺水泳池照片，鏡頭正上方往下拍，
非常清澈平靜的水，池底是淡藍色的小方塊磁磚，磁磚縫清楚，
邊緣有一角白色池邊和一條深藍色的磁磚線，水面平滑，沒有強烈的光紋，柔和光線，
沒有人、沒有泳圈、沒有任何動物，沒有文字、數字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度、寫實攝影風格。
```
**English：**
```
top-down photo of a shallow swimming pool, camera straight down, very clear calm
water over pale-blue small square tiles with clear grout lines, a bit of white pool
edge and a dark-blue tile stripe near the borders, smooth surface without strong
caustic patterns, soft light, no people, no floats, no animals, no text, no numbers,
no watermark, 16:9, full-bleed, high resolution, photorealistic
```

### 6-10 螢火蟲夜晚草地 Firefly Night Meadow
**檔名：** `image/backgroud/Firefly Night Meadow.png`
**區域：** `ground`　**特效：** 光斑（夜晚月光）

適合：螢火蟲、飛蛾、青蛙、蝸牛
**中文：**
```
俯視角度的夜晚草地照片，鏡頭正上方往下拍，
深藍綠色調的夜間草地，被柔和的月光照亮，看得清楚草葉，
邊緣有幾叢野花和蕨類，中間是開闊的短草地，寧靜的夜晚氣氛但不要太暗，
沒有螢火蟲、沒有任何動物、昆蟲或人，沒有天空、沒有地平線，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度、寫實攝影風格。
```
**English：**
```
top-down photo of a meadow at night, camera straight down, deep blue-green night-toned
grass lit by soft moonlight with blades clearly visible, a few clumps of wildflowers
and ferns near the edges, open short grass in the center, calm night mood but not too
dark, no fireflies, no animals, no insects, no people, no sky, no horizon, no text,
no watermark, 16:9, full-bleed, high resolution, photorealistic
```

---

**生成之後：** 存進 `image/backgroud/`，檔名照上面每一款的建議。放好後跟我說，我會幫你加進 `config/scenes.json`：
- 一般款照標示的區域設定（`ground` / `water` / `air`）。
- **混合場景**會照每款標示的分界位置切成陸地和水域。生成的圖分界如果跟標示差很多，我會照實際圖片調整。
- **搭配特效**款會開對應的特效（例如草地的 sway）。

最後再跑 `npm run prepare-assets`。
