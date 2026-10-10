# 完整背景提示詞 第二組（Nano Banana）

這是 `background-elements-prompts.md` 之後的第二組完整背景提示詞：天空、陸地、海洋、室內各 10 款，共 40 款，都跟第一組不重複。生成後存進 `image/backgroud/`，檔名照每一款建議的英文 Title Case。

**所有款式共通：**
- **比例 16:9**，盡量高解析度（輸出影片是 3840×2160，程式內部座標 1600×900）。
- **畫面中不要有任何動物、昆蟲、人或手**：動物由程式疊上去，背景裡已經有的動物會跟真的角色搶戲。
- **中間留出開闊空間**：主要物件放在畫面邊緣，中間保留乾淨的區域讓路徑有地方走。
- **沒有文字、浮水印、Logo**，畫面四邊填滿不留白。
- 陸地、海洋、室內都是**俯視角度、沒有地平線**（場景是 top-down，動物陰影才自然）；天空則是**往上看、整個畫面都是天空**。

---

## 1. 天空（10 款）

整個畫面設為天空（air）zone，只有會飛的動物能放上去。

**天空共通原則：**
- 沒有地面、沒有地平線、沒有建築、沒有飛機或鳥（1-10 例外，邊緣有一圈櫻花枝）。
- 月亮、太陽、光芒放在角落或邊緣，不要擠在正中間。

### 1-1 北極光夜空 Aurora Night Sky
**檔名：** `image/backgroud/Aurora Night Sky.png`

適合：蝙蝠、貓頭鷹、飛蛾、螢火蟲
**中文：**
```
一張北極光夜空的攝影照片，16:9 橫向構圖，畫面完全被天空填滿，
深藍黑色的夜空，綠色與淡紫色的極光像柔和的絲帶從畫面上方邊緣流過，
點點細小星星，中間相對乾淨，色彩夢幻但寫實，
沒有地面、沒有地平線、沒有樹、沒有建築、沒有鳥或任何動物，
沒有文字、浮水印，四邊填滿不留白，高解析度、對焦清晰。
```
**English：**
```
photo of an aurora night sky, 16:9 landscape, sky fills the entire frame, deep
navy-black night, soft ribbons of green and pale violet aurora flowing along the
upper edge, tiny scattered stars, relatively clean center, dreamy but realistic
color, no ground, no horizon, no trees, no buildings, no birds or animals, no text,
no watermark, full-bleed, high resolution, sharp focus
```

### 1-2 滿月雲夜 Full Moon Cloudy Night
**檔名：** `image/backgroud/Full Moon Cloudy Night.png`

適合：蝙蝠、貓頭鷹、飛蛾
**中文：**
```
一張滿月夜空的攝影照片，16:9 橫向構圖，畫面完全被天空填滿，
明亮的滿月在畫面右上角，周圍有淡淡的月暈，
深藍色夜空中飄著被月光照亮邊緣的薄雲，中間開闊，
沒有地面、沒有地平線、沒有樹、沒有建築、沒有鳥或任何動物，
沒有文字、浮水印，四邊填滿不留白，高解析度、對焦清晰。
```
**English：**
```
photo of a full-moon night sky, 16:9 landscape, sky fills the entire frame, bright
full moon in the upper-right corner with a faint halo, deep blue night with thin
clouds whose edges are lit by moonlight, open center, no ground, no horizon, no
trees, no buildings, no birds or animals, no text, no watermark, full-bleed, high
resolution, sharp focus
```

### 1-3 魚鱗雲 Mackerel Sky
**檔名：** `image/backgroud/Mackerel Sky.png`

適合：燕子、麻雀、海鷗、鴿子
**中文：**
```
一張魚鱗雲天空的攝影照片，16:9 橫向構圖，畫面完全被天空填滿，
清澈的淡藍色天空，佈滿一排排細小整齊、像魚鱗一樣的白色高積雲，
雲層越往畫面邊緣越密，中間稍微稀疏，柔和的午後陽光，
沒有地面、沒有地平線、沒有建築、沒有鳥或任何動物、沒有飛機，
沒有文字、浮水印，四邊填滿不留白，高解析度、對焦清晰。
```
**English：**
```
photo of a mackerel sky, 16:9 landscape, sky fills the entire frame, clear pale-blue
sky covered with rows of small, even, fish-scale altocumulus clouds, denser toward
the edges and slightly thinner in the center, soft afternoon sunlight, no ground, no
horizon, no buildings, no birds or animals, no planes, no text, no watermark,
full-bleed, high resolution, sharp focus
```

### 1-4 薰衣草紫暮色 Lavender Dusk Sky
**檔名：** `image/backgroud/Lavender Dusk Sky.png`

適合：蝴蝶、蜻蜓、蜂鳥、螢火蟲
**中文：**
```
一張黃昏後的天空攝影照片，16:9 橫向構圖，畫面完全被天空填滿，
由上方的薰衣草紫漸層到下方的淡蜜桃粉，幾縷淡粉色的薄雲，
柔和寧靜的光線，色彩溫柔不刺眼，
沒有太陽、沒有地面、沒有地平線、沒有建築、沒有鳥或任何動物，
沒有文字、浮水印，四邊填滿不留白，高解析度、對焦清晰。
```
**English：**
```
photo of a sky just after sunset, 16:9 landscape, sky fills the entire frame,
lavender-purple at the top fading to soft peach-pink at the bottom, a few wisps of
pale pink cloud, calm gentle light, soft non-glaring color, no sun, no ground, no
horizon, no buildings, no birds or animals, no text, no watermark, full-bleed, high
resolution, sharp focus
```

### 1-5 飄雪灰白天空 Snowfall Sky
**檔名：** `image/backgroud/Snowfall Sky.png`

適合：貓頭鷹、麻雀、鴿子、海鷗
**中文：**
```
一張正在下雪的天空攝影照片，16:9 橫向構圖，畫面完全被天空填滿，
柔和的淺灰白色雲層，大大小小的白色雪花飄落，部分雪花帶點景深模糊，
光線安靜均勻、色調冷而柔和，
沒有地面、沒有地平線、沒有樹、沒有建築、沒有鳥或任何動物，
沒有文字、浮水印，四邊填滿不留白，高解析度。
```
**English：**
```
photo of a snowing sky, 16:9 landscape, sky fills the entire frame, soft pale
grey-white overcast, white snowflakes of different sizes drifting down, some with
gentle depth-of-field blur, quiet even light, cool soft tones, no ground, no horizon,
no trees, no buildings, no birds or animals, no text, no watermark, full-bleed, high
resolution
```

### 1-6 銀河星空 Milky Way Sky
**檔名：** `image/backgroud/Milky Way Sky.png`

適合：蝙蝠、飛蛾、螢火蟲、貓頭鷹
**中文：**
```
一張銀河夜空的天文攝影照片，16:9 橫向構圖，畫面完全被天空填滿，
銀河以斜對角從左下角延伸到右上角，帶有淡紫、淡橘色的星雲與暗塵帶，
滿天密密麻麻的星星，深藍黑色背景，
沒有地面、沒有地平線、沒有樹、沒有建築、沒有鳥或任何動物，
沒有文字、浮水印，四邊填滿不留白，高解析度、對焦清晰。
```
**English：**
```
astrophotography of the Milky Way, 16:9 landscape, sky fills the entire frame, the
galactic band running diagonally from the lower-left to the upper-right corner with
faint violet and orange nebulae and dark dust lanes, dense starfield, deep navy-black
background, no ground, no horizon, no trees, no buildings, no birds or animals, no
text, no watermark, full-bleed, high resolution, sharp focus
```

### 1-7 夏日正午晴空 Summer Noon Sky
**檔名：** `image/backgroud/Summer Noon Sky.png`

適合：蜻蜓、蜜蜂、蝴蝶、燕子
**中文：**
```
一張夏日正午的天空攝影照片，16:9 橫向構圖，畫面完全被天空填滿，
非常飽和的深藍色天空，太陽在左上角帶有柔和光暈，
畫面右側和下方邊緣有高聳蓬鬆、亮白色的積雨雲，中間是大片乾淨藍天，
沒有地面、沒有地平線、沒有建築、沒有鳥或任何動物、沒有飛機，
沒有文字、浮水印，四邊填滿不留白，高解析度、對焦清晰。
```
**English：**
```
photo of a summer midday sky, 16:9 landscape, sky fills the entire frame, very
saturated deep-blue sky, the sun in the upper-left corner with a soft glow, towering
fluffy bright-white cumulus clouds along the right and bottom edges, large clean blue
area in the center, no ground, no horizon, no buildings, no birds or animals, no
planes, no text, no watermark, full-bleed, high resolution, sharp focus
```

### 1-8 雲隙光 Sunbeams Through Clouds
**檔名：** `image/backgroud/Sunbeams Through Clouds.png`

適合：海鷗、鴿子、燕子、貓頭鷹
**中文：**
```
一張雲隙光的天空攝影照片，16:9 橫向構圖，畫面完全被天空填滿，
厚厚的灰白色雲層在畫面上方，金色的光束從雲縫斜斜灑下，
畫面下半部是明亮柔和的淡金藍色天空，氣氛莊嚴溫暖，
沒有地面、沒有地平線、沒有海、沒有建築、沒有鳥或任何動物，
沒有文字、浮水印，四邊填滿不留白，高解析度。
```
**English：**
```
photo of crepuscular sunbeams, 16:9 landscape, sky fills the entire frame, thick
grey-white clouds across the top, golden rays slanting down through gaps in the
clouds, bright soft pale gold-blue sky in the lower half, majestic warm mood, no
ground, no horizon, no sea, no buildings, no birds or animals, no text, no watermark,
full-bleed, high resolution
```

### 1-9 晨霧淡雲 Misty Morning Sky
**檔名：** `image/backgroud/Misty Morning Sky.png`

適合：蝴蝶、蜻蜓、麻雀、蜂鳥
**中文：**
```
一張清晨薄霧天空的攝影照片，16:9 橫向構圖，畫面完全被天空填滿，
非常柔和的奶白、淡藍、淡金色調，輕薄的霧狀雲氣緩緩漂浮，
低對比、空靈安靜的感覺，陽光從右上角透出一點暖光，
沒有地面、沒有地平線、沒有樹、沒有建築、沒有鳥或任何動物，
沒有文字、浮水印，四邊填滿不留白，高解析度。
```
**English：**
```
photo of a misty early-morning sky, 16:9 landscape, sky fills the entire frame, very
soft milky white, pale blue and pale gold tones, thin hazy cloud drifting gently,
low contrast, airy and calm, a little warm light glowing from the upper-right
corner, no ground, no horizon, no trees, no buildings, no birds or animals, no text,
no watermark, full-bleed, high resolution
```

### 1-10 櫻花枝仰望天空 Sky Through Cherry Blossoms
**檔名：** `image/backgroud/Sky Through Cherry Blossoms.png`

適合：蝴蝶、蜜蜂、蜂鳥、麻雀
**中文：**
```
從樹下往上仰望天空的攝影照片，16:9 橫向構圖，
畫面四周邊緣是盛開的粉色櫻花樹枝，圍成一圈自然的框，
中間是大片晴朗的淺藍色天空，幾片櫻花花瓣在空中飄，柔和明亮的春日陽光，
沒有地面、沒有建築、沒有鳥或任何動物、沒有蜜蜂，
沒有文字、浮水印，四邊填滿不留白，高解析度、對焦清晰。
```
**English：**
```
photo looking straight up at the sky from beneath a tree, 16:9 landscape, blooming
pink cherry-blossom branches around all edges forming a natural frame, large clear
pale-blue sky in the center, a few petals floating in the air, soft bright spring
sunlight, no ground, no buildings, no birds, no bees or animals, no text, no
watermark, full-bleed, high resolution, sharp focus
```

---

## 2. 陸地（10 款）

整個畫面設為地面（ground）zone，給烏龜、蝸牛、蜥蜴、蜘蛛、螳螂、瓢蟲、松鼠、田鼠、青蛙、螃蟹、走路的鳥等。

**陸地共通原則：**
- 鏡頭從正上方垂直往下拍，沒有天空、沒有地平線、沒有遠景透視。
- 大石頭、樹根、植物放在邊緣，中間保留平坦乾淨的地面。
- 光線柔和均勻，避免強烈大片陰影。

### 2-1 櫻花花瓣地面 Cherry Petal Ground
**檔名：** `image/backgroud/Cherry Petal Ground.png`

適合：蝸牛、瓢蟲、烏龜、田鼠
**中文：**
```
俯視角度的地面照片，鏡頭從正上方往下拍，
深褐色的泥土與短草地上鋪滿粉白色的櫻花花瓣，邊緣有幾根掉落的小花枝，
中間花瓣分佈均勻、地面平整，柔和的春日散射光，色彩溫柔寫實，
沒有任何動物或昆蟲，沒有天空、沒有地平線，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度、寫實攝影風格。
```
**English：**
```
top-down photo of the ground, camera pointing straight down, dark-brown soil and
short grass covered with pink-white cherry-blossom petals, a few fallen small
blossom twigs near the edges, evenly spread petals and flat ground in the center,
soft diffused spring light, gentle realistic color, no animals, no insects, no sky,
no horizon, no text, no watermark, 16:9, full-bleed, high resolution, photorealistic
```

### 2-2 收割後稻田 Harvested Rice Field
**檔名：** `image/backgroud/Harvested Rice Field.png`

適合：麻雀、鴿子、田鼠、青蛙
**中文：**
```
俯視角度的收割後稻田照片，從正上方往下看，
乾燥的褐色田土上整齊排列著短短的金黃色稻梗，散落一些稻草，
畫面邊緣有幾綑稻草堆，中間是平整開闊的田地，溫暖的秋日陽光，
沒有任何動物或昆蟲，沒有人、沒有機器，沒有天空、沒有地平線，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度、寫實攝影風格。
```
**English：**
```
top-down photo of a harvested rice field, looking straight down, dry brown paddy soil
with neat rows of short golden rice stubble and scattered loose straw, a few straw
bundles near the edges, flat open field in the center, warm autumn sunlight, no
animals, no insects, no people, no machinery, no sky, no horizon, no text, no
watermark, 16:9, full-bleed, high resolution, photorealistic
```

### 2-3 火山黑沙 Volcanic Black Sand
**檔名：** `image/backgroud/Volcanic Black Sand.png`

適合：螃蟹、蜥蜴、寄居蟹、烏龜
**中文：**
```
俯視角度的火山黑沙地面照片，鏡頭正上方往下拍，
細緻閃著微光的黑色火山沙，邊緣散落幾塊多孔的黑色熔岩石和一點綠色小植物，
中間是平整、帶細微風紋的黑沙，明亮的自然日光，色彩寫實，
沒有任何動物或昆蟲，沒有腳印，沒有天空、沒有地平線，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度、寫實攝影風格。
```
**English：**
```
top-down photo of volcanic black sand, camera straight down, fine glittering black
sand, a few porous black lava rocks and small green plants near the edges, flat sand
with subtle wind ripples in the center, bright natural daylight, realistic color, no
animals, no insects, no footprints, no sky, no horizon, no text, no watermark, 16:9,
full-bleed, high resolution, photorealistic
```

### 2-4 石板廣場 Cobblestone Plaza
**檔名：** `image/backgroud/Cobblestone Plaza.png`

適合：鴿子、麻雀、蜥蜴、蜘蛛
**中文：**
```
俯視角度的歐式石板廣場地面照片，從正上方往下看，
灰色與暖米色相間的圓弧排列鵝卵石板，石縫中長出一點點小青苔，
畫面角落有幾片落葉，中間是乾淨平整的石板，柔和的陰天日光，
沒有任何動物或昆蟲，沒有人、沒有垃圾，沒有天空、沒有地平線，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度、寫實攝影風格。
```
**English：**
```
top-down photo of a European cobblestone plaza, looking straight down, grey and warm
beige cobblestones laid in arcing fan patterns, tiny bits of moss in the joints, a few
fallen leaves in the corners, clean flat stones in the center, soft overcast
daylight, no animals, no insects, no people, no litter, no sky, no horizon, no text,
no watermark, 16:9, full-bleed, high resolution, photorealistic
```

### 2-5 竹林地面 Bamboo Forest Floor
**檔名：** `image/backgroud/Bamboo Forest Floor.png`

適合：蝸牛、螳螂、蜘蛛、青蛙
**中文：**
```
俯視角度的竹林地面照片，鏡頭正上方往下拍，
鋪滿細長的乾黃與淺綠色竹葉，畫面四角有幾根粗竹子的底部和新冒出的竹筍，
中間是均勻平整的竹葉層，林間柔和的綠色散射光，
沒有任何動物或昆蟲，沒有天空、沒有地平線，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度、寫實攝影風格。
```
**English：**
```
top-down photo of a bamboo forest floor, camera straight down, covered with long
slender dry yellow and pale-green bamboo leaves, the bases of a few thick bamboo
stalks and young bamboo shoots in the corners, even flat leaf layer in the center,
soft diffused green-tinted forest light, no animals, no insects, no sky, no horizon,
no text, no watermark, 16:9, full-bleed, high resolution, photorealistic
```

### 2-6 紅土地 Red Clay Earth
**檔名：** `image/backgroud/Red Clay Earth.png`

適合：蜥蜴、蜘蛛、螳螂、烏龜
**中文：**
```
俯視角度的紅土地面照片，從正上方往下看，
鐵鏽紅色、細緻平整的乾紅土，帶有細小的土粒和淺淺的紋理，
畫面邊緣有幾叢耐旱的小草和幾顆小石頭，中間是開闊平坦的紅土，溫暖明亮的陽光，
沒有任何動物或昆蟲，沒有腳印、沒有輪胎痕，沒有天空、沒有地平線，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度、寫實攝影風格。
```
**English：**
```
top-down photo of red clay earth, looking straight down, rust-red fine flat dry clay
with tiny grains and shallow texture, a few tufts of hardy grass and small stones
near the edges, open flat red ground in the center, warm bright sunlight, no animals,
no insects, no footprints, no tire tracks, no sky, no horizon, no text, no watermark,
16:9, full-bleed, high resolution, photorealistic
```

### 2-7 枯山水砂紋 Zen Raked Gravel
**檔名：** `image/backgroud/Zen Raked Gravel.png`

適合：烏龜、蝸牛、螳螂、蜘蛛
**中文：**
```
俯視角度的日式枯山水庭園照片，鏡頭正上方往下拍，
白色細碎石被耙出整齊平行的直線砂紋，畫面角落有一兩塊長青苔的大石頭，
石頭周圍有同心圓砂紋，中間是大片整齊的直線砂紋，柔和均勻的日光，
沒有任何動物或昆蟲，沒有人、沒有腳印，沒有天空、沒有地平線，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度、寫實攝影風格。
```
**English：**
```
top-down photo of a Japanese zen rock garden, camera straight down, white fine gravel
raked into neat parallel straight lines, one or two moss-covered boulders in the
corners with concentric ripple patterns around them, large area of straight raked
lines in the center, soft even daylight, no animals, no insects, no people, no
footprints, no sky, no horizon, no text, no watermark, 16:9, full-bleed, high
resolution, photorealistic
```

### 2-8 沙丘風紋 Sand Dune Ripples
**檔名：** `image/backgroud/Sand Dune Ripples.png`

適合：蜥蜴、蜘蛛、螃蟹、烏龜
**中文：**
```
俯視角度的沙丘照片，從正上方往下看，
金橘色的細沙上佈滿規律的波浪狀風紋，紋路柔和地從左到右延伸，
低角度的暖陽讓風紋有淡淡的明暗層次（不要太強烈），
沒有任何動物或昆蟲，沒有腳印、沒有植物，沒有天空、沒有地平線，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度、寫實攝影風格。
```
**English：**
```
top-down photo of a sand dune, looking straight down, golden-orange fine sand covered
with regular wavy wind ripples running gently from left to right, warm low sunlight
giving the ripples soft light-and-shade (not high contrast), no animals, no insects,
no footprints, no plants, no sky, no horizon, no text, no watermark, 16:9,
full-bleed, high resolution, photorealistic
```

### 2-9 穀倉乾草地面 Barn Hay Floor
**檔名：** `image/backgroud/Barn Hay Floor.png`

適合：田鼠、鴿子、麻雀、蜘蛛
**中文：**
```
俯視角度的穀倉地面照片，鏡頭正上方往下拍，
舊木地板上鋪滿散開的金黃色乾草，邊緣有一角方形乾草捆和一個木桶的邊緣，
中間是平整、均勻散開的乾草，溫暖的穀倉室內光，
沒有任何動物或昆蟲，沒有人、沒有農具尖端，沒有天空、沒有地平線，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度、寫實攝影風格。
```
**English：**
```
top-down photo of a barn floor, camera straight down, old wooden boards covered with
loose golden hay, the corner of a square hay bale and the rim of a wooden barrel near
the edges, flat evenly spread hay in the center, warm barn interior light, no
animals, no insects, no people, no sharp farm tools, no sky, no horizon, no text, no
watermark, 16:9, full-bleed, high resolution, photorealistic
```

### 2-10 結冰湖面 Frozen Pond Ice
**檔名：** `image/backgroud/Frozen Pond Ice.png`

適合：烏龜、田鼠、麻雀、鴿子
**中文：**
```
俯視角度的結冰湖面照片，從正上方往下看，
厚實的淡藍灰色冰面，冰裡封著細小的氣泡和白色的裂紋線條，
畫面邊緣有薄薄的積雪和幾片凍住的落葉，中間是平整清透的冰面，柔和的冬日光線，
沒有任何動物或昆蟲，沒有人、沒有溜冰刀痕，沒有天空、沒有地平線，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度、寫實攝影風格。
```
**English：**
```
top-down photo of a frozen pond, looking straight down, thick pale blue-grey ice with
tiny trapped air bubbles and white crack lines inside, thin snow and a few frozen
leaves near the edges, flat clear ice in the center, soft winter light, no animals,
no insects, no people, no skate marks, no sky, no horizon, no text, no watermark,
16:9, full-bleed, high resolution, photorealistic
```

---

## 3. 海洋／水域（10 款）

讓魚類、鯊魚、魟魚、水母、章魚、海龜、海馬、螃蟹等在上面游動／爬行。3-2 和 3-9 是淡水池塘（適合金魚），其餘是海水。

**海洋共通原則：**
- 鏡頭從正上方往下看水底或水面，沒有地平線、沒有海岸遠景。
- 不要有魚、螃蟹、海星、潛水員或任何動物；貝殼可以，但要是空殼。
- 珊瑚、岩石、植物放在邊緣，中間保留沙地或清澈水域。

### 3-1 紅樹林淺水 Mangrove Shallows
**檔名：** `image/backgroud/Mangrove Shallows.png`

適合：螃蟹、小丑魚、海馬、魚群
**中文：**
```
俯視角度的紅樹林淺水區照片，鏡頭從正上方往下拍，
清澈的淡綠色淺水下是細泥沙底，畫面四周邊緣有交錯的紅樹林氣根伸入水中，
中間是開闊平坦的沙泥底，陽光透過水面形成柔和光斑，
沒有魚、沒有螃蟹或任何動物，沒有人，沒有地平線，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度、寫實攝影風格。
```
**English：**
```
top-down photo of mangrove shallows, camera pointing straight down, clear pale-green
shallow water over a fine silty sand bottom, tangled mangrove prop roots reaching
into the water around all edges, open flat bottom in the center, soft sunlight
caustics, no fish, no crabs, no animals, no people, no horizon, no text, no
watermark, 16:9, full-bleed, high resolution, photorealistic
```

### 3-2 荷花池 Lotus Pond
**檔名：** `image/backgroud/Lotus Pond.png`

適合：金魚、青蛙、蜻蜓（水面上飛）
**中文：**
```
俯視角度的荷花池照片，從正上方往下看，
深綠色清澈的池水，畫面四周邊緣漂浮著圓形的大荷葉和幾朵粉紅色荷花，
中間是開闊、平靜、微微反光的水面，看得到一點水下的深色池底，柔和日光，
沒有魚、沒有青蛙或任何動物，沒有地平線，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度、寫實攝影風格。
```
**English：**
```
top-down photo of a lotus pond, looking straight down, clear deep-green pond water,
large round lotus leaves and a few pink lotus flowers floating around the edges,
open calm water with a gentle sheen in the center showing a hint of the dark pond
floor, soft daylight, no fish, no frogs, no animals, no horizon, no text, no
watermark, 16:9, full-bleed, high resolution, photorealistic
```

### 3-3 火山岩礁 Volcanic Rock Reef
**檔名：** `image/backgroud/Volcanic Rock Reef.png`

適合：鯊魚、海鰻、章魚、海膽
**中文：**
```
俯視角度的海底火山岩礁照片，鏡頭正上方往下拍，
深灰黑色的多孔熔岩石塊散佈在畫面邊緣，石頭上長著少量紫色與綠色的海藻，
中間是一片深色細沙，清澈的鈷藍色海水，柔和的水下光線，
沒有魚、沒有海膽或任何動物，沒有潛水員，沒有地平線，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度、寫實攝影風格。
```
**English：**
```
top-down underwater photo of a volcanic rock reef, camera straight down, dark
grey-black porous lava boulders around the edges with sparse purple and green
seaweed, a patch of dark fine sand in the center, clear cobalt-blue water, soft
underwater light, no fish, no sea urchins, no animals, no divers, no horizon, no
text, no watermark, 16:9, full-bleed, high resolution, photorealistic
```

### 3-4 夜光藻海面 Bioluminescent Night Sea
**檔名：** `image/backgroud/Bioluminescent Night Sea.png`

適合：水母、魚群、鯊魚、海龜
**中文：**
```
俯視角度的夜晚海面照片，從正上方往下看，
深藏青色到近乎黑色的海水，水面細小的波紋閃著藍綠色的夜光藻光點，
光點主要集中在畫面邊緣和波紋上，中間是較暗、平靜的海水，夢幻但寫實，
沒有魚、沒有任何動物，沒有船、沒有人，沒有地平線、沒有天空，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度。
```
**English：**
```
top-down photo of the sea at night, looking straight down, deep navy to near-black
water, tiny ripples sparkling with blue-green bioluminescent plankton, the glow
concentrated near the edges and along the ripples, darker calm water in the center,
dreamy but realistic, no fish, no animals, no boats, no people, no horizon, no sky,
no text, no watermark, 16:9, full-bleed, high resolution
```

### 3-5 深海水面俯視 Open Ocean Surface
**檔名：** `image/backgroud/Open Ocean Surface.png`

適合：鯊魚、海龜、魟魚、海鷗（水面上飛）
**中文：**
```
空拍俯視的大海水面照片，鏡頭正上方往下拍，
深邃的寶藍色海水，細緻的小波浪紋理均勻佈滿整個畫面，偶爾有一點白色浪花，
陽光在水面形成細碎的閃光（不要太刺眼），
沒有船、沒有陸地、沒有魚或任何動物，沒有地平線、沒有天空，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度、寫實攝影風格。
```
**English：**
```
aerial top-down photo of the open ocean surface, camera straight down, deep sapphire
blue water, fine small wave texture evenly covering the whole frame, occasional
touches of white foam, small sparkles of sunlight on the water (not glaring), no
boats, no land, no fish or animals, no horizon, no sky, no text, no watermark, 16:9,
full-bleed, high resolution, photorealistic
```

### 3-6 極地浮冰海水 Polar Ice Floe Water
**檔名：** `image/backgroud/Polar Ice Floe Water.png`

適合：魚群、海龜、海鷗（水面上飛）
**中文：**
```
空拍俯視的極地海面照片，從正上方往下看，
深藍黑色的冰冷海水，畫面邊緣漂著大大小小的白色浮冰塊，冰塊邊緣透出淡藍綠色，
中間是開闊的深色海水，冷調柔和的光線，
沒有企鵝、海豹或任何動物，沒有船、沒有人，沒有地平線、沒有天空，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度、寫實攝影風格。
```
**English：**
```
aerial top-down photo of a polar sea, looking straight down, deep blue-black icy
water, white ice floes of many sizes drifting near the edges with pale aqua edges
showing underwater, open dark water in the center, cool soft light, no penguins, no
seals, no animals, no boats, no people, no horizon, no sky, no text, no watermark,
16:9, full-bleed, high resolution, photorealistic
```

### 3-7 貝殼淺灘 Seashell Sandy Shallows
**檔名：** `image/backgroud/Seashell Sandy Shallows.png`

適合：寄居蟹、螃蟹、小丑魚、魚群
**中文：**
```
俯視角度的清澈淺灘照片，鏡頭正上方往下拍，
透明的淺水下是奶油色細沙，邊緣散落著各種顏色的空貝殼、螺殼和小珊瑚碎片，
中間是乾淨平坦的沙底，陽光在沙上形成柔和的水波光紋，
沒有魚、沒有螃蟹、沒有海星或任何活的動物，沒有地平線，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度、寫實攝影風格。
```
**English：**
```
top-down photo of clear sandy shallows, camera straight down, transparent shallow
water over creamy fine sand, empty seashells, spiral shells and small coral fragments
of various colors scattered near the edges, clean flat sand in the center, soft
sunlight caustics on the sand, no fish, no crabs, no starfish, no living animals, no
horizon, no text, no watermark, 16:9, full-bleed, high resolution, photorealistic
```

### 3-8 珊瑚碎石礁台 Coral Rubble Reef Flat
**檔名：** `image/backgroud/Coral Rubble Reef Flat.png`

適合：海鰻、章魚、魟魚、海膽
**中文：**
```
俯視角度的珊瑚碎石礁台照片，從正上方往下看，
淺灰白色與淡粉色的珊瑚碎塊鋪滿海底，邊緣有幾叢褐色與綠色的小型硬珊瑚，
中間是較平整的細碎石和白沙，淡藍綠色清澈海水，柔和光斑，
沒有魚、沒有任何動物，沒有潛水員，沒有地平線，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度、寫實攝影風格。
```
**English：**
```
top-down underwater photo of a coral rubble reef flat, looking straight down,
pale grey-white and soft pink coral fragments covering the seabed, small clumps of
brown and green hard coral near the edges, flatter fine rubble and white sand in the
center, clear pale turquoise water, soft caustics, no fish, no animals, no divers,
no horizon, no text, no watermark, 16:9, full-bleed, high resolution, photorealistic
```

### 3-9 庭園錦鯉池 Garden Koi Pond
**檔名：** `image/backgroud/Garden Koi Pond.png`

適合：金魚、青蛙
**中文：**
```
俯視角度的日式庭園池塘照片，鏡頭正上方往下拍，
清澈的淡綠色池水，畫面四周是圓潤的灰色石頭池岸和垂下的楓葉枝，
水面漂著幾片紅色楓葉，池底有圓卵石，中間是開闊清澈的水面，柔和日光，
沒有錦鯉、沒有魚或任何動物，沒有人，沒有地平線，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度、寫實攝影風格。
```
**English：**
```
top-down photo of a Japanese garden pond, camera straight down, clear pale-green
water, rounded grey stone banks and overhanging maple branches around the edges, a
few red maple leaves floating on the surface, round pebbles on the pond floor, open
clear water in the center, soft daylight, no koi, no fish, no animals, no people, no
horizon, no text, no watermark, 16:9, full-bleed, high resolution, photorealistic
```

### 3-10 沙洲漸層淺海 Turquoise Sandbar
**檔名：** `image/backgroud/Turquoise Sandbar.png`

適合：魟魚、鯊魚、海龜、魚群
**中文：**
```
空拍俯視的熱帶沙洲淺海照片，從正上方往下看，
一條白色沙洲柔和地從畫面左上斜到右下，兩側海水由淺土耳其藍漸層到深藍，
水下細沙紋理清楚，中間大部分是清澈的淺水，明亮的熱帶陽光，
沒有人、沒有船、沒有魚或任何動物，沒有地平線、沒有天空，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度、寫實攝影風格。
```
**English：**
```
aerial top-down photo of a tropical sandbar, looking straight down, a soft white
sandbar curving diagonally from the upper-left to the lower-right, water on both
sides grading from pale turquoise to deep blue, clear sand ripples visible
underwater, mostly clear shallow water in the center, bright tropical sunlight, no
people, no boats, no fish or animals, no horizon, no sky, no text, no watermark,
16:9, full-bleed, high resolution, photorealistic
```

---

## 4. 室內（10 款）

整個畫面設為地面（ground）zone，給壁虎／蜥蜴、蜘蛛、蝸牛、瓢蟲、家蠅、田鼠、寵物烏龜、寄居蟹等。

**室內共通原則：**
- 鏡頭從正上方垂直往下拍地板或桌面，看不到牆壁、天花板、窗外景色。
- 家具腳、杯子、工具等只放在畫面邊緣，中間保留平坦乾淨的表面。
- 像窗光或柔和頂燈的均勻光線，避免強烈窗框陰影或大面積反光。
- 書本、紙箱、包裝上都不要有字。

### 4-1 人字拼木地板 Herringbone Parquet Floor
**檔名：** `image/backgroud/Herringbone Parquet Floor.png`

適合：烏龜、田鼠、蜘蛛、蜥蜴
**中文：**
```
俯視角度的人字拼木地板照片，鏡頭從正上方垂直往下拍，
淺橡木色的人字形拼花木地板，木紋細緻、拼接整齊，
畫面角落有一角白色牆腳板和一盆植物的盆底，中間是開闊乾淨的地板，
柔和明亮的室內窗光，色彩溫暖寫實，
沒有任何動物、昆蟲或人，沒有牆壁、沒有透視，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度、寫實攝影風格。
```
**English：**
```
top-down photo of a herringbone parquet floor, camera pointing straight down, light
oak herringbone wood pattern with fine grain and precise joints, a bit of white
skirting board and the base of a plant pot in the corners, open clean floor in the
center, soft bright window light, warm realistic color, no animals, no insects, no
people, no walls, no perspective, no text, no watermark, 16:9, full-bleed, high
resolution, photorealistic
```

### 4-2 料理台木砧板 Kitchen Cutting Board Counter
**檔名：** `image/backgroud/Kitchen Cutting Board Counter.png`

適合：家蠅、瓢蟲、蝸牛、蜘蛛
**中文：**
```
俯視角度的廚房料理台照片，從正上方往下看，
一塊大大的長方形原木砧板佔滿畫面中間，木紋與細小刀痕清楚，
邊緣是淺灰色檯面，散放著幾片香草葉、一顆番茄和一小撮鹽，
砧板中間是開闊乾淨的木面，柔和明亮的廚房光線，
沒有任何動物、昆蟲或人，沒有手、沒有刀，沒有牆壁、沒有透視，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度、寫實攝影風格。
```
**English：**
```
top-down photo of a kitchen counter, looking straight down, a large rectangular
natural-wood cutting board filling the middle of the frame with clear grain and fine
knife marks, light-grey countertop around the edges with a few herb leaves, a tomato
and a pinch of salt, open clean wood surface in the center of the board, soft bright
kitchen light, no animals, no insects, no people, no hands, no knives, no walls, no
perspective, no text, no watermark, 16:9, full-bleed, high resolution, photorealistic
```

### 4-3 白色床單 White Bed Linen
**檔名：** `image/backgroud/White Bed Linen.png`

適合：瓢蟲、蜘蛛、家蠅、田鼠
**中文：**
```
俯視角度的床鋪照片，鏡頭正上方往下拍，
平整的白色棉麻床單，布料紋理清楚，只有很淺很柔和的皺褶，
畫面邊緣有一角枕頭和折起來的淺灰色毯子，中間是開闊平整的床單，
柔和的晨光、色調乾淨溫暖，
沒有任何動物、昆蟲或人，沒有牆壁、沒有透視，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度、寫實攝影風格。
```
**English：**
```
top-down photo of a bed, camera straight down, smooth white cotton-linen sheet with
visible weave and only very soft shallow wrinkles, the corner of a pillow and a
folded light-grey blanket near the edges, open flat sheet in the center, soft
morning light, clean warm tones, no animals, no insects, no people, no walls, no
perspective, no text, no watermark, 16:9, full-bleed, high resolution, photorealistic
```

### 4-4 波斯地毯 Persian Rug
**檔名：** `image/backgroud/Persian Rug.png`

適合：烏龜、田鼠、蜘蛛、蜥蜴
**中文：**
```
俯視角度的波斯地毯照片，從正上方往下看，
深紅、藏青和象牙白的傳統花紋地毯，花紋細緻但顏色不要太刺眼，
地毯邊緣有流蘇，畫面角落露出一點深色木地板，中間是較簡單的大面積底色區塊，
柔和溫暖的室內燈光，
沒有任何動物、昆蟲或人，花紋裡也不要有動物圖案，沒有牆壁、沒有透視，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度、寫實攝影風格。
```
**English：**
```
top-down photo of a Persian rug, looking straight down, traditional deep-red, navy
and ivory pattern, detailed but not too busy or harsh, fringe along the rug edge, a
little dark wooden floor showing in the corners, a calmer large field of base color
in the center, soft warm indoor lighting, no animals, no insects, no people, no
animal motifs in the pattern, no walls, no perspective, no text, no watermark, 16:9,
full-bleed, high resolution, photorealistic
```

### 4-5 溫室育苗台 Greenhouse Potting Bench
**檔名：** `image/backgroud/Greenhouse Potting Bench.png`

適合：蝸牛、瓢蟲、螳螂、蜘蛛
**中文：**
```
俯視角度的溫室育苗工作台照片，鏡頭正上方往下拍，
老舊的木頭工作台面，散落一點點培養土，
邊緣擺著幾個小陶盆幼苗、一把小鏟子和一捲麻繩，中間是開闊的木頭台面，
透過溫室玻璃灑下的明亮柔和自然光，
沒有任何動物、昆蟲或人，沒有手，沒有牆壁、沒有透視，沒有文字、浮水印（標籤上也不要字），
16:9 橫向構圖，畫面填滿不留白，高解析度、寫實攝影風格。
```
**English：**
```
top-down photo of a greenhouse potting bench, camera straight down, a weathered
wooden work surface with a little scattered potting soil, small terracotta pots of
seedlings, a trowel and a roll of twine near the edges, open wooden surface in the
center, bright soft natural light through greenhouse glass, no animals, no insects,
no people, no hands, no walls, no perspective, no text or labels, no watermark, 16:9,
full-bleed, high resolution, photorealistic
```

### 4-6 手作切割墊 Craft Cutting Mat
**檔名：** `image/backgroud/Craft Cutting Mat.png`

適合：瓢蟲、蜘蛛、家蠅、螳螂
**中文：**
```
俯視角度的手作工作桌照片，從正上方往下看，
一大張深綠色的切割墊佔滿畫面，上面有淡淡的方格線（不要有數字刻度），
邊緣散放著彩色紙片、幾捲紙膠帶和一把剪刀的握柄，中間是開闊乾淨的切割墊，
柔和均勻的桌燈光線，
沒有任何動物、昆蟲或人，沒有手，沒有牆壁、沒有透視，沒有文字、數字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度、寫實攝影風格。
```
**English：**
```
top-down photo of a craft table, looking straight down, a large dark-green cutting mat
filling the frame with faint grid lines (no number markings), colored paper scraps,
a few rolls of washi tape and the handle of scissors near the edges, open clean mat
in the center, soft even desk-lamp light, no animals, no insects, no people, no
hands, no walls, no perspective, no text, no numbers, no watermark, 16:9, full-bleed,
high resolution, photorealistic
```

### 4-7 壁爐紅磚地 Fireplace Brick Hearth
**檔名：** `image/backgroud/Fireplace Brick Hearth.png`

適合：蜥蜴、蜘蛛、田鼠、烏龜
**中文：**
```
俯視角度的壁爐前紅磚地面照片，鏡頭正上方往下拍，
暖紅褐色的舊磚以整齊的錯縫方式鋪設，磚縫是淺灰色灰泥，
畫面邊緣有一小堆木柴和一個鐵製柴架的腳，中間是開闊乾淨的磚面，
溫暖的橘色爐火光加上柔和室內光（不要太強烈），
沒有任何動物、昆蟲或人，沒有火焰在畫面中間，沒有牆壁、沒有透視，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度、寫實攝影風格。
```
**English：**
```
top-down photo of a brick hearth in front of a fireplace, camera straight down, warm
red-brown old bricks in a neat running-bond pattern with light-grey mortar, a small
stack of firewood and the foot of an iron log rack near the edges, open clean bricks
in the center, warm orange firelight mixed with soft room light (not too strong), no
animals, no insects, no people, no flames in the center, no walls, no perspective,
no text, no watermark, 16:9, full-bleed, high resolution, photorealistic
```

### 4-8 絲絨沙發 Velvet Sofa Cushion
**檔名：** `image/backgroud/Velvet Sofa Cushion.png`

適合：瓢蟲、蜘蛛、田鼠、家蠅
**中文：**
```
俯視角度的絲絨沙發坐墊照片，從正上方往下看，
墨綠色絲絨布料，有柔和的絨毛光澤，坐墊之間有一條淺淺的縫，
畫面邊緣有一個芥末黃抱枕的一角和一條針織毯的流蘇，中間是開闊平整的絲絨面，
柔和的室內窗光，
沒有任何動物、昆蟲或人，沒有寵物毛，沒有牆壁、沒有透視，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度、寫實攝影風格。
```
**English：**
```
top-down photo of a velvet sofa seat, looking straight down, deep emerald velvet with
a soft pile sheen, a shallow seam between cushions, the corner of a mustard-yellow
throw pillow and the fringe of a knit blanket near the edges, open smooth velvet in
the center, soft indoor window light, no animals, no insects, no people, no pet hair,
no walls, no perspective, no text, no watermark, 16:9, full-bleed, high resolution,
photorealistic
```

### 4-9 撒麵粉的烘焙檯 Floured Baking Counter
**檔名：** `image/backgroud/Floured Baking Counter.png`

適合：家蠅、瓢蟲、蝸牛、田鼠
**中文：**
```
俯視角度的烘焙工作檯照片，鏡頭正上方往下拍，
淺色木頭檯面上撒著一層薄薄、均勻的白色麵粉，
邊緣有一根木頭擀麵棍、一個打蛋器、幾顆雞蛋和一小團麵糰，中間是開闊平整的麵粉面，
柔和明亮的廚房光線，
沒有任何動物、昆蟲或人，沒有手，沒有手指痕跡，沒有牆壁、沒有透視，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度、寫實攝影風格。
```
**English：**
```
top-down photo of a baking counter, camera straight down, a light wooden worktop
dusted with a thin even layer of white flour, a wooden rolling pin, a whisk, a few
eggs and a small ball of dough near the edges, open flat floured surface in the
center, soft bright kitchen light, no animals, no insects, no people, no hands, no
finger marks, no walls, no perspective, no text, no watermark, 16:9, full-bleed, high
resolution, photorealistic
```

### 4-10 石砌地窖地板 Stone Cellar Floor
**檔名：** `image/backgroud/Stone Cellar Floor.png`

適合：蜘蛛、蜥蜴、田鼠、蝸牛
**中文：**
```
俯視角度的地窖石板地照片，從正上方往下看，
不規則形狀的灰褐色古老石板拼接，石縫中有一點泥土和細青苔，
畫面角落有一個木酒桶的底部和一個舊油燈的底座，中間是開闊平整的石板地，
柔和、略暗但清楚的暖色燈光（不要太陰暗），
沒有任何動物、昆蟲或人，沒有牆壁、沒有透視，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度、寫實攝影風格。
```
**English：**
```
top-down photo of a cellar floor, looking straight down, old irregular grey-brown
flagstones with a little soil and fine moss in the joints, the base of a wooden wine
barrel and an old oil lamp in the corners, open flat stone floor in the center,
soft, slightly dim but clear warm light (not too dark), no animals, no insects, no
people, no walls, no perspective, no text, no watermark, 16:9, full-bleed, high
resolution, photorealistic
```

---

**生成之後：** 存進 `image/backgroud/`，檔名照上面每一款的建議。放好後跟我說，我會幫你加進 `config/scenes.json`（天空設為 air zone、陸地與室內設為 ground zone、海洋設為 water zone），再跑 `npm run prepare-assets`。
