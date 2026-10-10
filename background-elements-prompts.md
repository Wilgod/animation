# 動態背景素材生成提示詞（Nano Banana）

這份文件是給 Nano Banana（Gemini 圖片生成）用的提示詞，目的是把目前 `garden-with-pond-test` 測試場景裡的「天空/草地佔位圖」跟「藍磚水池佔位圖」換成真的素材，讓 goldfish（水域）、鳥類/蝴蝶（天空）都能落在對的區域。

## 背景：目前的坐標系統

程式內部用的是 **1600×900** 的邏輯座標（跟 `paths/*.json` 記錄滑鼠座標用的是同一套），輸出影片實際是 3840×2160（等比例放大 2.4 倍）。目前測試場景 `garden-with-pond-test` 的設定：

```json
"bands": [
  { "elementId": "sky-placeholder", "zone": "air", "y0": 0, "y1": 180 },
  { "elementId": "grass-base", "zone": "ground", "y0": 180, "y1": 900 }
],
"patches": [{ "elementId": "blue-tile-patch", "zone": "water", "x": 300, "y": 600, "w": 500, "h": 220 }]
```

- `bands`（天空、地面）跟 `patches`（水池）現在都是各自獨立的圖片，依設定的區域堆疊合成成一張完整背景 —— **天空跟草地可以分開生成、分開替換**，不用一張照片裡同時拍到天空跟草地。
- 合成時 patch 是直接貼上矩形，沒有柔邊/羽化，所以水池照片最好本身就有清楚的邊界（石頭、木框等），貼上去才不會看起來像硬生生剪貼的方塊。

---

## 提示詞 1a：天空 Band（取代天空佔位圖）

用途：取代 `sky-placeholder`，佔畫面上方 20%（對應 y0=0, y1=180，180/900=20%）。因為是獨立圖層，之後想換成黃昏/夜晚天空，直接生成新圖換掉這個 element 的 `source` 就好，不用動到草地。

**比例**：橫向長方形，寬:高 約 8:1（對應 1600×180）

**中文提示詞：**
```
一張晴朗天空的攝影照片，橫向長方形構圖（很扁、很寬），
淺藍色天空搭配柔和的白雲，光線自然明亮，
沒有地面、沒有建築物、沒有鳥或其他物體，
沒有文字、浮水印，畫面四邊填滿不留白，高解析度、對焦清晰。
```

**English style keywords：**
```
clear daytime sky photo, wide horizontal banner crop (~8:1), pale blue sky
with soft white clouds, natural bright lighting, no ground, no buildings,
no birds or objects in frame, no text, no watermark, full-bleed, high
detail, sharp focus
```

---

## 提示詞 1b：草地 Band（取代草地底層）

用途：取代 `grass-base`，佔畫面下方 80%（y0=180, y1=900）。目前用的是既有素材 `Garden Lawn Grass Ground.png`，如果想要不同草地風格可以用這個提示詞重新生成。

**比例**：16:9 或更扁一點都可以（會自動裁切/填滿）

**中文提示詞：**
```
一張俯視角度的自然草坪特寫照片，畫面完全被草地填滿，
帶有一些三葉草跟露珠細節，自然光、色彩真實不誇張，
沒有天空、沒有地平線、沒有人物或動物，
沒有文字、浮水印，畫面四邊填滿不留白，高解析度、對焦清晰。
```

**English style keywords：**
```
top-down close-up photo of natural lawn grass, fully filling the frame,
some clover and dew details, natural lighting, realistic color, no sky, no
horizon, no people or animals, no text, no watermark, full-bleed, high
detail, sharp focus
```

---

## 提示詞 1c：飄動雲朵貼圖（讓天空動起來）

用途：疊在天空 band 上方，程式會讓它持續往旁邊飄，做出雲在動的效果（原理：這張圖是透明背景的雲朵貼圖，跟角色動畫一樣，每一幀都重新畫一次、位置持續往右移，橫向鋪滿整個畫面，滑到最後會接回開頭循環播放）。

**這張圖跟其他素材不一樣的地方：**
- **背景要求純色「去背綠」（chroma key green，色碼 #00FF00）**，不是透明 PNG —— Nano Banana 沒辦法直接輸出透明背景，所以改成生成純色綠幕背景的照片/插畫，去背的部分交給程式自動處理（`scripts/lib/chromaKey.js` 新增的 `removeColorBackgroundFloodFill`，原理跟現有動物/裝飾去白底一樣，只是這次是去除綠色而不是白色 —— 用綠色是因為雲朵本身是白色，如果背景也用白色去背會把雲朵一起清掉）。
- **要能左右無縫循環**：圖片最左邊跟最右邊接起來要看不出接縫。最簡單的做法：雲朵造型不要貼到最左/最右邊緣（例如左右各留 10-15% 的純綠色空白區），因為去背之後那些空白區都會變透明，透明接透明本來就是無縫的，不需要真的做到雲朵本身首尾相連。
- **比例**：橫向長方形，寬:高 建議 3:1 ~ 5:1（太窄的話循環一次的時間會太短，容易看出在重複）。

**中文提示詞：**
```
一張純色去背綠幕背景（chroma key green，色碼 #00FF00，整張背景均勻的綠色，
不能有漸層或陰影）的白色雲朵插畫或照片合成，橫向長方形構圖，
畫面中間散佈幾朵柔和蓬鬆的白雲，左右兩側邊緣保留空白（沒有雲朵延伸到邊緣），
雲朵邊緣柔和自然、帶有輕微漸層，風格寫實或半寫實都可以，
畫面中除了雲朵之外沒有任何其他顏色接近綠色的東西，
沒有文字、沒有浮水印，只有雲朵本身跟純綠色背景。
```

**English style keywords：**
```
solid chroma key green background (#00FF00, flat and even, no gradient or
shadow on the backdrop itself), a few soft fluffy white clouds scattered
across a wide horizontal frame (~3:1 to 5:1), clouds kept clear of the
left/right edges (empty green margin on both sides for seamless looping),
soft natural cloud edges with light feathering, realistic or
semi-realistic style, nothing else in the frame close to green, no text,
no watermark, clouds only
```

**設定方式**：在 `config/scenes.json` 的天空 band 上加一個 `cloud` 欄位：
```json
{
  "elementId": "sky-placeholder",
  "zone": "air",
  "y0": 0, "y1": 180,
  "cloud": { "elementId": "cloud-texture", "scrollPxPerSec": 15 }
}
```
`scrollPxPerSec` 是飄動速度（每秒移動的邏輯像素），正值往右飄，負值往左飄，數字越大飄越快 —— 目前測試場景用的是 15（慢慢飄的速度），可以自己調整。

---

## 提示詞 2：水池 Patch（取代藍磚佔位圖）

用途：取代 `blue-tile-patch`，做出真正的水域，goldfish 才有地方游。

**比例**：約 2.27:1 的橫向長方形（對應 patch 尺寸 500×220）

**中文提示詞：**
```
一張俯視角度的庭院錦鯉池照片，畫面中央大部分是水面（帶有輕微漣漪與光反射），
水池邊緣有清楚的石頭或木頭邊框，邊框佔畫面四周一小圈，
橫向長方形構圖，光線自然，色彩清澈偏藍綠，
沒有錦鯉魚本身（魚會由程式另外動畫化，不需要出現在背景圖裡），
沒有文字、浮水印，畫面四邊填滿不留白，高解析度、對焦清晰。
```

**English style keywords：**
```
top-down photo of a garden koi pond, mostly water surface with subtle
ripples and light reflections, a clear stone or wood border visible around
the edge of the frame, wide landscape aspect ratio (~2.27:1), natural
lighting, clean blue-green water color, no fish in the water (animated
separately), no text, no watermark, full-bleed, high detail, sharp focus
```

---

## （選用）提示詞 3：备用水池變化款

如果想要多一種水池風格可以生成備用版本：

```
同上一個提示詞，但改成清晨光線、水面帶一點薄霧感、水池邊緣改成鵝卵石鋪面，
整體氛圍更寧靜、光線更柔和。
```

---

## 生成之後：上傳到哪裡

1. 在專案根目錄新增資料夾（如果還沒有）：`image/elements/`
2. 把生成的圖片存進去，檔名建議用英文、Title Case，跟現有素材風格一致，例如：
   - `image/elements/Clear Sky Band.png`（提示詞 1a 的結果）
   - `image/elements/Garden Lawn Grass Band.png`（提示詞 1b 的結果，選用，也可以繼續沿用現有的 `grass-base`）
   - `image/elements/Drifting Clouds Overlay.png`（提示詞 1c 的結果，透明背景）
   - `image/elements/Koi Pond Water Surface.png`（提示詞 2 的結果）

> 不用放到 `image/backgroud/`（那個資料夾是舊式「單張完整背景」用的），新的可組合元素統一放 `image/elements/`，之後比較好管理。

---

## 上傳完之後：接線步驟

把圖片放進 `image/elements/` 之後，回來跟我說一聲，我會幫你：

1. 在 `config/scenes.json` 的 `"elements"` 陣列裡新增對應項目（`id`、`label`、`source` 指到新檔案）。
2. 把 `garden-with-pond-test` 場景的 `bands` 裡的 `sky-placeholder`/`grass-base` 換成新的 elementId、`patches` 裡的水池換成新的錦鯉池圖片，並依實際照片比例微調 `y0/y1`、`x/y/w/h`。
3. 執行 `npm run prepare-assets` 重新合成背景圖與 `zones.json`。
4. 在編輯器裡點「Reload Scenes」，實際測試 goldfish 是否乖乖待在水池裡、鳥類能不能飛在天空區。

之後你也可以直接照這個模式，自己生成更多 band / patch 元素、寫進 `config/scenes.json`、跑一次 `npm run prepare-assets`，不一定每次都需要我介入 —— 天空、地面、水池都是各自獨立的圖片，混搭組合成新場景就可以了。

---

## 之後怎麼「做得更好」（先看到真實素材效果後再決定要不要做）

等你上傳真的圖之後，看起來的效果如果覺得「水池邊緣看起來像硬貼上去的方塊」，可以再考慮這個改進方向（現在先不做，等你確認需求）：

- **Patch 邊緣羽化**：合成水池圖時加上柔邊遮罩，讓水池邊界跟草地更自然融合，而不是純矩形硬邊。
- **更多場景變化**：用同樣的 band + patch 組合邏輯，混搭不同的天空/地面/水池元素，一次擴充出好幾個「花園」「沙灘」「雪地融冰」場景。

---

## 提示詞 4：海洋／水底完整背景（10 款，靜態圖）

用途：直接生成一整張完整背景（不是 band / patch 元素），存進 `image/backgroud/`，讓魚類、螃蟹等在上面游動／爬行。

**共通原則（每一款都適用）：**
- **俯視角度、沒有地平線**：鏡頭從正上方往下看海底，跟其他場景一致（動物陰影才會自然）。
- **畫面中不要有魚、螃蟹或任何動物**：動物由程式疊上去，背景裡如果已經有魚會跟真的角色搶戲。
- **中間留出開闊空間**：主體（珊瑚、岩石、海草）盡量放在畫面邊緣，中間保留平坦的沙地或清澈水域，讓路徑有地方走。
- **比例 16:9**，盡量高解析度（輸出影片是 3840×2160）。

### 4-1 熱帶珊瑚礁淺灘 Tropical Coral Reef Shallows
**檔名：** `image/backgroud/Tropical coral reef shallows.png`（已存在）

**中文：**
```
俯視角度拍攝的熱帶淺海海底照片，鏡頭從正上方往下看，
白色細沙海床，畫面四周邊緣有色彩繽紛的珊瑚礁跟海葵，中間保留大片平坦沙地，
陽光穿過水面在沙地上形成柔和的波紋光斑，海水清澈透明帶淡藍綠色調，
沒有魚、沒有任何動物、沒有潛水員，沒有地平線，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度、對焦清晰、寫實攝影風格。
```
**English：**
```
top-down photo looking straight down at a shallow tropical seabed, fine white
sand floor, colorful coral and sea anemones around the edges of the frame, large
open flat sand area in the center, soft sunlight caustic patterns on the sand,
crystal clear turquoise water, no fish, no animals, no divers, no horizon, no
text, no watermark, 16:9, full-bleed, high resolution, sharp focus, photorealistic
```

### 4-2 海草床 Seagrass Meadow
**檔名：** `image/backgroud/Seagrass meadow.png`（已存在）

**中文：**
```
俯視角度的淺海海草床照片，鏡頭正上方往下拍，
翠綠色的長條海草從畫面左右兩側往內生長，中間是淺色沙地小路，
自然陽光、水波光斑落在海草與沙地上，色彩真實，
沒有魚、沒有任何動物，沒有地平線，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度、寫實攝影風格。
```
**English：**
```
top-down photo of a shallow seagrass meadow, camera pointing straight down, long
green seagrass blades growing in from the left and right edges, a pale sand
clearing through the middle, natural sunlight with water caustics on grass and
sand, realistic color, no fish, no animals, no horizon, no text, no watermark,
16:9, full-bleed, high resolution, photorealistic
```

### 4-3 岩石潮池 Rocky Tide Pool
**檔名：** `image/backgroud/Rocky tide pool.png`（已存在）

**中文：**
```
俯視角度的海邊潮池照片，從正上方往下看，清澈海水下是深色岩石與小石子，
岩石上有綠色海藻、紫色海膽殼跟粉色石灰藻（只有靜物、沒有活的動物），
中間是一片較平坦的淺色水底，陽光水紋映在底部，
沒有魚、沒有螃蟹、沒有地平線，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度、寫實攝影風格。
```
**English：**
```
top-down photo of a rocky tide pool, looking straight down through clear water at
dark rocks and pebbles, green seaweed, empty purple urchin shells and pink coralline
algae on the rocks, a flatter pale floor in the center, sunlight ripple patterns on
the bottom, no fish, no crabs, no living animals, no horizon, no text, no
watermark, 16:9, full-bleed, high resolution, photorealistic
```

### 4-4 沙紋海床 Rippled Sand Seabed
**檔名：** `image/backgroud/Rippled sand seabed.png`（已存在）

**中文：**
```
俯視角度的淺海沙底照片，鏡頭正上方往下拍，
整片金黃色細沙上有規律的波浪狀沙紋，零星散落幾個貝殼和小石頭在邊緣，
陽光穿過水面形成明亮的網狀光斑，畫面簡潔開闊，
沒有魚、沒有任何動物，沒有地平線，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度、寫實攝影風格。
```
**English：**
```
top-down photo of a shallow sandy seabed, camera straight down, golden fine sand
with regular rippled sand ridges, a few seashells and pebbles scattered near the
edges, bright net-like sunlight caustics, clean open composition, no fish, no
animals, no horizon, no text, no watermark, 16:9, full-bleed, high resolution,
photorealistic
```

### 4-5 巨藻森林 Kelp Forest
**檔名：** `image/backgroud/Kelp forest.png`（已存在）

**中文：**
```
俯視角度的巨藻森林海底照片，從正上方往下看，
金褐色的巨藻葉片集中在畫面四角與邊緣，中間露出深色岩石與沙地的開闊海底，
光線從上方灑下、水色偏藍綠，氣氛寧靜，
沒有魚、沒有海獺、沒有任何動物，沒有地平線，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度、寫實攝影風格。
```
**English：**
```
top-down view of a kelp forest seabed, looking straight down, golden-brown kelp
fronds clustered in the corners and along the edges, open seabed of dark rock and
sand in the center, light filtering from above, blue-green water tint, calm mood,
no fish, no otters, no animals, no horizon, no text, no watermark, 16:9,
full-bleed, high resolution, photorealistic
```

### 4-6 深海藍調海床 Deep-Blue Seabed
**檔名：** `image/backgroud/Deep-blue seabed.png`（已存在）

**中文：**
```
俯視角度的較深海域海底照片，鏡頭正上方往下拍，
深藍色調的海水下是灰白色沙地，邊緣有暗色岩石與少量軟珊瑚，
光線較暗但仍看得清楚底部，帶微弱的光斑，神秘安靜的氛圍，
沒有魚、沒有任何動物，沒有地平線，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度、寫實攝影風格。
```
**English：**
```
top-down photo of a deeper seabed, camera straight down, grey-white sand under deep
blue water, dark rocks and a few soft corals around the edges, dimmer light but the
floor still clearly visible, faint caustics, mysterious calm mood, no fish, no
animals, no horizon, no text, no watermark, 16:9, full-bleed, high resolution,
photorealistic
```

### 4-7 沉船殘骸旁的沙地 Sand Beside a Shipwreck
**檔名：** `image/backgroud/Sand beside a shipwreck.png`（已存在）

**中文：**
```
俯視角度的海底照片，從正上方往下看，
畫面一側邊緣有長滿珊瑚與海藻的老舊木造沉船殘骸、生鏽的錨，
其餘大部分是平坦的淺色沙地，陽光水紋落在沙上，
沒有魚、沒有任何動物、沒有潛水員，沒有地平線，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度、寫實攝影風格。
```
**English：**
```
top-down photo of the seabed, looking straight down, the edge of an old wooden
shipwreck covered in coral and algae plus a rusty anchor along one side of the
frame, the rest mostly flat pale sand with sunlight caustics, no fish, no animals,
no divers, no horizon, no text, no watermark, 16:9, full-bleed, high resolution,
photorealistic
```

### 4-8 卵石淺灘（清澈海水） Pebble Shallows in Clear Water
**檔名：** `image/backgroud/Pebble shallows in clear water.png`（已存在）

**中文：**
```
俯視角度透過清澈海水看到的卵石海底，鏡頭正上方往下拍，
大小不一的圓潤彩色卵石鋪滿整個底部，海水非常透明、帶淡淡的藍綠色，
水面波光在卵石上形成明亮光紋，
沒有魚、沒有任何動物，沒有地平線、沒有岸邊，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度、寫實攝影風格。
```
**English：**
```
top-down view through very clear sea water onto a pebble seabed, camera straight
down, smooth rounded colorful pebbles of mixed sizes covering the whole floor,
faint turquoise tint, bright caustic light patterns on the pebbles, no fish, no
animals, no horizon, no shoreline, no text, no watermark, 16:9, full-bleed, high
resolution, photorealistic
```

### 4-9 海葵與軟珊瑚花園 Anemone and Soft Coral Garden
**檔名：** `image/backgroud/Anemone and soft coral garden.png`（已存在）

**中文：**
```
俯視角度的海底花園照片，從正上方往下看，
畫面上下邊緣有粉紅、紫色、橘色的海葵與軟珊瑚群，觸手柔軟展開，
中間是一條開闊的白沙帶，陽光水紋柔和，色彩鮮豔但寫實，
沒有魚、沒有小丑魚、沒有任何動物，沒有地平線，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度、寫實攝影風格。
```
**English：**
```
top-down photo of an underwater garden, looking straight down, pink, purple and
orange sea anemones and soft corals along the top and bottom edges with tentacles
gently spread, a wide open strip of white sand through the middle, soft caustics,
vivid but realistic color, no fish, no clownfish, no animals, no horizon, no text,
no watermark, 16:9, full-bleed, high resolution, photorealistic
```

### 4-10 黃昏暖光的淺海 Shallow Sea in Warm Sunset Light
**檔名：** `image/backgroud/Shallow sea in warm sunset light.png`（已存在）

**中文：**
```
俯視角度的淺海海底照片，鏡頭正上方往下拍，傍晚夕陽時分，
暖金色與橘色的光斑透過水面灑在沙地上，邊緣有少量岩石與海草，
中間大片開闊沙地，海水帶暖色調的藍綠漸層，
沒有魚、沒有任何動物，沒有地平線、沒有太陽本體，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度、寫實攝影風格。
```
**English：**
```
top-down photo of a shallow seabed at sunset, camera straight down, warm golden and
orange caustic light on the sand, a few rocks and seagrass tufts at the edges, large
open sand area in the center, warm-tinted turquoise water, no fish, no animals, no
horizon, no visible sun, no text, no watermark, 16:9, full-bleed, high resolution,
photorealistic
```

**生成之後：** 存進 `image/backgroud/`，檔名用英文 Title Case，例如 `Tropical Coral Reef Shallows.png`、`Seagrass Meadow.png`。放好後跟我說，我會幫你加進 `config/scenes.json`（整個畫面設為水域 zone，讓魚可以到處游），再跑 `npm run prepare-assets`。

---

## 提示詞 5：天空完整背景（10 款，靜態圖）

用途：直接生成一整張天空背景（不是 8:1 的天空 band），存進 `image/backgroud/`，給蜻蜓、燕子、蝙蝠等飛行動物在上面飛。整個畫面設為天空（air）zone，所以只有會飛的動物能放上去，Generate Video 會自動排除水中跟地面動物。

**共通原則（每一款都適用）：**
- **整個畫面都是天空**：沒有地面、沒有地平線、沒有建築，像是鏡頭往上看天空（第 5-10 款例外，邊緣有一圈樹葉）。
- **畫面中不要有鳥或任何動物、飛機**：動物由程式疊上去，背景裡如果已經有鳥會跟真的角色搶戲。
- **中間留出開闊空間**：雲朵、月亮、彩虹盡量不要擠在正中間，讓飛行路徑清楚。
- **比例 16:9**，盡量高解析度（輸出影片是 3840×2160）。

### 5-1 晴朗藍天白雲 Clear Blue Sky
**檔名：** `image/backgroud/Clear Blue Sky.png`

適合：所有飛行動物
**中文：**
```
一張晴朗天空的攝影照片，16:9 橫向構圖，畫面完全被天空填滿，
飽和的天藍色漸層，散落幾朵蓬鬆的白色積雲，自然明亮的陽光，
沒有地面、沒有地平線、沒有建築、沒有鳥或其他物體，
沒有文字、浮水印，四邊填滿不留白，高解析度、對焦清晰。
```
**English：**
```
photo of a clear daytime sky, 16:9 landscape, sky fills the entire frame, saturated
sky-blue gradient with a few fluffy white cumulus clouds, bright natural sunlight,
no ground, no horizon, no buildings, no birds or objects, no text, no watermark,
full-bleed, high resolution, sharp focus
```

### 5-2 金色夕陽 Golden Sunset Sky
**檔名：** `image/backgroud/Golden Sunset Sky.png`

適合：海鷗、燕子、蜻蜓
**中文：**
```
一張夕陽天空的攝影照片，16:9 橫向構圖，畫面完全被天空填滿，
橘金色到粉紫色的柔和漸層，雲朵邊緣被夕陽染成金色，溫暖的光線，
太陽本身不入鏡，沒有地面、沒有地平線、沒有鳥或其他物體，
沒有文字、浮水印，四邊填滿不留白，高解析度。
```
**English：**
```
photo of a sunset sky, 16:9 landscape, sky fills the entire frame, soft gradient from
orange-gold to pink-violet, cloud edges lit golden by the setting sun, warm light,
sun itself out of frame, no ground, no horizon, no birds or objects, no text,
no watermark, full-bleed, high resolution
```

### 5-3 粉彩黎明 Pastel Dawn Sky
**檔名：** `image/backgroud/Pastel Dawn Sky.png`

適合：蜂鳥、蝴蝶、飛蛾
**中文：**
```
一張清晨黎明天空的攝影照片，16:9 橫向構圖，畫面完全被天空填滿，
淡粉紅、淡桃色與淡藍色的柔和粉彩漸層，幾縷薄雲，寧靜柔和的晨光，
沒有地面、沒有地平線、沒有鳥或其他物體，
沒有文字、浮水印，四邊填滿不留白，高解析度。
```
**English：**
```
photo of an early dawn sky, 16:9 landscape, sky fills the entire frame, soft pastel
gradient of pale pink, peach and light blue, a few thin wisps of cloud, calm gentle
morning light, no ground, no horizon, no birds or objects, no text, no watermark,
full-bleed, high resolution
```

### 5-4 星空夜晚 Starry Night Sky
**檔名：** `image/backgroud/Starry Night Sky.png`

適合：蝙蝠、貓頭鷹、螢火蟲（螢火蟲的光在夜空特別明顯）
**中文：**
```
一張夜晚星空的攝影照片，16:9 橫向構圖，畫面完全被夜空填滿，
深藍到靛藍的夜空，佈滿細小清晰的星星，右上角一輪明亮的滿月與淡淡月暈，
沒有地面、沒有地平線、沒有樹木剪影、沒有鳥或其他物體，
沒有文字、浮水印，四邊填滿不留白，高解析度、低噪點。
```
**English：**
```
photo of a starry night sky, 16:9 landscape, night sky fills the entire frame, deep
navy to indigo, many small crisp stars, a bright full moon with a faint halo in the
upper right, no ground, no horizon, no tree silhouettes, no birds or objects,
no text, no watermark, full-bleed, high resolution, low noise
```

### 5-5 雨後彩虹 Rainbow After Rain
**檔名：** `image/backgroud/Rainbow After Rain.png`

適合：所有飛行動物，彩色的動物特別搭
**中文：**
```
一張雨後天空的攝影照片，16:9 橫向構圖，畫面完全被天空填滿，
清新的藍天與正在散開的灰白雲層，一道完整清晰的彩虹橫跨畫面，空氣乾淨透亮，
沒有地面、沒有地平線、沒有鳥或其他物體，
沒有文字、浮水印，四邊填滿不留白，高解析度。
```
**English：**
```
photo of a sky right after rain, 16:9 landscape, sky fills the entire frame, fresh
blue sky with clearing grey-white clouds, one complete vivid rainbow arcing across
the frame, crisp clean air, no ground, no horizon, no birds or objects, no text,
no watermark, full-bleed, high resolution
```

### 5-6 暴風雨前 Dramatic Storm Clouds
**檔名：** `image/backgroud/Dramatic Storm Clouds.png`

適合：海鷗、燕子、蝙蝠
**中文：**
```
一張暴風雨前天空的攝影照片，16:9 橫向構圖，畫面完全被天空填滿，
層次豐富的深灰與藍灰色積雨雲，雲層間透出幾道光束，氣氛壯觀戲劇化，
沒有閃電、沒有地面、沒有地平線、沒有鳥或其他物體，
沒有文字、浮水印，四邊填滿不留白，高解析度。
```
**English：**
```
photo of a dramatic pre-storm sky, 16:9 landscape, sky fills the entire frame, layered
dark grey and blue-grey cumulonimbus clouds, a few light rays breaking through gaps,
dramatic moody atmosphere, no lightning, no ground, no horizon, no birds or objects,
no text, no watermark, full-bleed, high resolution
```

### 5-7 高空卷雲 High Cirrus Sky
**檔名：** `image/backgroud/High Cirrus Sky.png`

適合：蜻蜓、燕子、蜂鳥
**中文：**
```
一張高空卷雲天空的攝影照片，16:9 橫向構圖，畫面完全被天空填滿，
清澈的深藍天空，大量細長如羽毛般的白色卷雲斜向延伸，簡潔通透，
沒有地面、沒有地平線、沒有鳥或其他物體、沒有飛機凝結尾，
沒有文字、浮水印，四邊填滿不留白，高解析度、對焦清晰。
```
**English：**
```
photo of a sky with high cirrus clouds, 16:9 landscape, sky fills the entire frame,
clear deep-blue sky with many long feathery white cirrus wisps streaking diagonally,
clean and airy, no ground, no horizon, no birds or objects, no contrails, no text,
no watermark, full-bleed, high resolution, sharp focus
```

### 5-8 棉花糖雲海 Cotton Candy Cloudscape
**檔名：** `image/backgroud/Cotton Candy Cloudscape.png`

適合：蝴蝶、瓢蟲、蜂鳥（可愛童話風）
**中文：**
```
一張夢幻雲海天空的攝影照片，16:9 橫向構圖，畫面完全被天空與雲填滿，
大片柔軟蓬鬆、像棉花糖一樣的雲朵，帶有淡粉紅與淡紫色的光暈，夢幻溫柔的氣氛，
沒有地面、沒有地平線、沒有鳥或其他物體，
沒有文字、浮水印，四邊填滿不留白，高解析度。
```
**English：**
```
photo of a dreamy cloudscape, 16:9 landscape, sky and clouds fill the entire frame,
large soft billowy cotton-candy clouds with pale pink and lavender glow, dreamy gentle
mood, no ground, no horizon, no birds or objects, no text, no watermark, full-bleed,
high resolution
```

### 5-9 黃昏藍調 Blue Hour Twilight
**檔名：** `image/backgroud/Blue Hour Twilight.png`

適合：飛蛾、蝙蝠、貓頭鷹、螢火蟲
**中文：**
```
一張黃昏藍調時刻天空的攝影照片，16:9 橫向構圖，畫面完全被天空填滿，
從深寶藍到淡紫藍的漸層，下方邊緣帶一點殘餘的暖橘光，最早出現的幾顆星星，
沒有地面、沒有地平線、沒有鳥或其他物體，
沒有文字、浮水印，四邊填滿不留白，高解析度、低噪點。
```
**English：**
```
photo of a blue-hour twilight sky, 16:9 landscape, sky fills the entire frame, gradient
from deep sapphire to soft violet-blue, a hint of lingering warm orange glow along the
bottom edge, the first few stars appearing, no ground, no horizon, no birds or objects,
no text, no watermark, full-bleed, high resolution, low noise
```

### 5-10 透過樹葉仰望天空 Sky Through Leafy Canopy
**檔名：** `image/backgroud/Sky Through Leafy Canopy.png`

適合：麻雀、蜜蜂、蝴蝶、螢火蟲（森林感）
**中文：**
```
一張從樹下往上仰望天空的攝影照片，16:9 橫向構圖，
畫面四周邊緣有一圈淡淡的綠色樹葉剪影，中間大部分是明亮的藍天與白雲，
陽光從葉縫灑落，樹葉只在邊緣、不擋住中間，沒有地面、沒有鳥或其他物體，
沒有文字、浮水印，四邊填滿不留白，高解析度。
```
**English：**
```
photo looking straight up at the sky from under trees, 16:9 landscape, a soft frame of
green leaf silhouettes around the outer edges only, the large center open bright blue
sky with white clouds, sunlight filtering through the leaves, leaves kept to the edges
and never covering the center, no ground, no birds or objects, no text, no watermark,
full-bleed, high resolution
```

**生成之後：** 存進 `image/backgroud/`，檔名用英文 Title Case，例如 `Clear Blue Sky.png`、`Starry Night Sky.png`。放好後跟我說，我會幫你加進 `config/scenes.json`（整個畫面設為天空 air zone，只讓飛行動物上場），再跑 `npm run prepare-assets`。

**想只換花園場景上方的天空 band？** 把生成的圖裁成寬:高 約 8:1 的扁長條，照「提示詞 1a」的方式替換天空 band 即可。

---

## 提示詞 6：陸地完整背景（10 款，靜態圖）

用途：直接生成一整張陸地背景，存進 `image/backgroud/`，給烏龜、蝸牛、蜥蜴、蜘蛛、螳螂、瓢蟲、松鼠、青蛙、螃蟹、走路的麻雀/鴿子等地面動物在上面爬行走動。整個畫面設為地面（ground）zone。

**共通原則（每一款都適用）：**
- **俯視角度、沒有地平線**：鏡頭從正上方往下看地面，沒有天空、沒有遠景透視，動物的陰影才會自然。
- **畫面中不要有任何動物或昆蟲**：動物由程式疊上去，背景裡如果已經有蟲或動物會跟真的角色搶戲。
- **中間留出開闊空間**：大型物件（石頭、樹根、蕨類、花叢）盡量放在畫面邊緣，中間保留相對平坦、乾淨的地面，讓路徑有地方走。
- **光線柔和均勻**：避免強烈的大片陰影或高反差，以免跟程式加上的動物陰影互相干擾。
- **比例 16:9**，盡量高解析度（輸出影片是 3840×2160）。

### 6-1 秋天落葉林地 Autumn Leaf Forest Floor
**檔名：** `image/backgroud/Autumn Leaf Forest Floor.png`

適合：松鼠、蝸牛、蜘蛛、烏龜
**中文：**
```
俯視角度的秋天森林地面照片，鏡頭從正上方往下拍，
鋪滿紅、橘、黃、褐色的楓葉與橡樹落葉，邊緣零星有小樹枝與橡實，
中間落葉較平整、層次均勻，柔和自然光，色彩溫暖寫實，
沒有任何動物或昆蟲，沒有天空、沒有地平線，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度、對焦清晰、寫實攝影風格。
```
**English：**
```
top-down photo of an autumn forest floor, camera pointing straight down, covered in
red, orange, yellow and brown maple and oak leaves, a few small twigs and acorns near
the edges, flatter even leaf layer in the center, soft natural light, warm realistic
color, no animals, no insects, no sky, no horizon, no text, no watermark, 16:9,
full-bleed, high resolution, sharp focus, photorealistic
```

### 6-2 青苔森林地面 Mossy Forest Floor
**檔名：** `image/backgroud/Mossy Forest Floor.png`

適合：蝸牛、青蛙、瓢蟲、蜥蜴
**中文：**
```
俯視角度的潮濕森林地面照片，從正上方往下看，
整片柔軟翠綠的青苔地毯，邊緣有長滿青苔的石頭、小蕨類嫩芽和枯樹枝，
中間是平整連續的青苔面，散射柔光、帶一點露水，
沒有任何動物或昆蟲、沒有菇類擠在中間，沒有天空、沒有地平線，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度、寫實攝影風格。
```
**English：**
```
top-down photo of a damp forest floor, looking straight down, a continuous soft
emerald moss carpet, moss-covered stones, small fern sprouts and dry twigs around the
edges, smooth open moss surface in the center, diffused soft light with a little dew,
no animals, no insects, no sky, no horizon, no text, no watermark, 16:9, full-bleed,
high resolution, photorealistic
```

### 6-3 野花草原 Wildflower Meadow Ground
**檔名：** `image/backgroud/Wildflower Meadow Ground.png`

適合：瓢蟲、螳螂、蜜蜂（停在地上）、蝴蝶（停在地上）
**中文：**
```
俯視角度的野花草原照片，鏡頭正上方往下拍，
綠色短草地上點綴白色雛菊、黃色蒲公英與紫色小野花，花朵集中在畫面邊緣，
中間是較低矮、平整的綠草區，明亮自然的陽光，色彩清新寫實，
沒有任何動物或昆蟲，沒有天空、沒有地平線，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度、寫實攝影風格。
```
**English：**
```
top-down photo of a wildflower meadow, camera straight down, short green grass dotted
with white daisies, yellow dandelions and small purple wildflowers concentrated
toward the edges, lower flatter green grass in the center, bright natural sunlight,
fresh realistic color, no animals, no insects, no sky, no horizon, no text, no
watermark, 16:9, full-bleed, high resolution, photorealistic
```

### 6-4 乾燥沙灘 Dry Sandy Beach
**檔名：** `image/backgroud/Dry Sandy Beach.png`

適合：螃蟹、寄居蟹、海龜、烏龜
**中文：**
```
俯視角度的乾燥沙灘照片，從正上方往下看，
整片淺米色細沙，帶有自然的風吹沙紋，邊緣零星散落貝殼、小卵石和一段漂流木，
中間是乾淨平坦的沙面，明亮陽光，色彩溫暖寫實，
沒有海水、沒有浪花、沒有腳印、沒有任何動物，沒有天空、沒有地平線，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度、寫實攝影風格。
```
**English：**
```
top-down photo of a dry sandy beach, looking straight down, pale beige fine sand with
natural wind ripples, a few seashells, small pebbles and a piece of driftwood
scattered near the edges, clean flat sand in the center, bright sunlight, warm
realistic color, no water, no waves, no footprints, no animals, no sky, no horizon,
no text, no watermark, 16:9, full-bleed, high resolution, photorealistic
```

### 6-5 沙漠龜裂土地 Cracked Desert Earth
**檔名：** `image/backgroud/Cracked Desert Earth.png`

適合：蜥蜴、烏龜、蜘蛛
**中文：**
```
俯視角度的乾旱沙漠地面照片，鏡頭正上方往下拍，
土黃與赤褐色的乾裂泥土，形成不規則的多邊形龜裂紋路，邊緣有少量乾枯小草和碎石，
中間裂紋較細緻、地面平整，溫暖明亮但不刺眼的陽光，
沒有任何動物或昆蟲、沒有骨頭，沒有天空、沒有地平線，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度、寫實攝影風格。
```
**English：**
```
top-down photo of parched desert ground, camera straight down, ochre and rust-brown
dry mud with irregular polygonal crack patterns, a little dry grass and gravel near
the edges, finer cracks and flatter ground in the center, warm bright but not harsh
sunlight, no animals, no insects, no bones, no sky, no horizon, no text, no
watermark, 16:9, full-bleed, high resolution, photorealistic
```

### 6-6 菜園泥土 Vegetable Garden Soil
**檔名：** `image/backgroud/Vegetable Garden Soil.png`

適合：蝸牛、瓢蟲、螳螂、麻雀、鴿子
**中文：**
```
俯視角度的菜園土壤照片，從正上方往下看，
鬆軟深褐色的濕潤泥土，畫面上下邊緣有一排排綠色菜苗（萵苣、小白菜嫩葉），
中間是平整乾淨的泥土走道，柔和自然光，色彩真實，
沒有任何動物、昆蟲或蚯蚓，沒有工具、沒有人，沒有天空、沒有地平線，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度、寫實攝影風格。
```
**English：**
```
top-down photo of vegetable garden soil, looking straight down, loose dark-brown
moist soil, rows of young green seedlings (lettuce, bok choy leaves) along the top
and bottom edges, a smooth clean strip of soil through the middle, soft natural
light, realistic color, no animals, no insects, no worms, no tools, no people, no
sky, no horizon, no text, no watermark, 16:9, full-bleed, high resolution,
photorealistic
```

### 6-7 山間碎石地衣 Alpine Gravel with Lichen
**檔名：** `image/backgroud/Alpine Gravel with Lichen.png`

適合：蜥蜴、蜘蛛、烏龜
**中文：**
```
俯視角度的高山碎石地面照片，鏡頭正上方往下拍，
灰色與淺褐色的大小碎石，邊緣較大的石塊上長著橘黃與淡綠色的地衣，
中間是細碎、平坦的小碎石，清爽自然的日光，色彩寫實，
沒有任何動物或昆蟲，沒有天空、沒有地平線，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度、寫實攝影風格。
```
**English：**
```
top-down photo of alpine gravel ground, camera straight down, grey and light-brown
stones of mixed sizes, larger rocks near the edges covered with orange-yellow and
pale-green lichen, fine flat gravel in the center, crisp natural daylight, realistic
color, no animals, no insects, no sky, no horizon, no text, no watermark, 16:9,
full-bleed, high resolution, photorealistic
```

### 6-8 熱帶雨林地面 Rainforest Floor with Ferns
**檔名：** `image/backgroud/Rainforest Floor with Ferns.png`

適合：青蛙、蜥蜴、蜘蛛、螳螂
**中文：**
```
俯視角度的熱帶雨林地面照片，從正上方往下看，
深色潮濕的腐植土與落葉，畫面四角有茂密的大片蕨類葉子和粗壯的樹根，
中間是開闊的深褐色地面，林間柔和的散射光、帶濕潤光澤，
蕨類只在邊緣、不擋住中間，沒有任何動物或昆蟲，沒有天空、沒有地平線，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度、寫實攝影風格。
```
**English：**
```
top-down photo of a tropical rainforest floor, looking straight down, dark moist humus
and fallen leaves, lush large fern fronds and thick tree roots in the corners, open
dark-brown ground in the center, soft diffused jungle light with a wet sheen, ferns
kept to the edges and never covering the center, no animals, no insects, no sky, no
horizon, no text, no watermark, 16:9, full-bleed, high resolution, photorealistic
```

### 6-9 鄉間泥土小徑 Country Dirt Path
**檔名：** `image/backgroud/Country Dirt Path.png`

適合：麻雀、鴿子、松鼠、烏龜、蝸牛
**中文：**
```
俯視角度的鄉間小路照片，鏡頭正上方往下拍，
一條淺褐色的平坦泥土路從畫面左邊延伸到右邊，佔畫面中間大部分，
上下兩側邊緣是綠色雜草與小野花，路面有細小砂礫，自然陽光，
沒有輪胎痕、沒有腳印、沒有任何動物或昆蟲，沒有天空、沒有地平線，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度、寫實攝影風格。
```
**English：**
```
top-down photo of a country dirt path, camera straight down, a flat light-brown dirt
road running from the left edge to the right edge and filling most of the middle,
green weeds and small wildflowers along the top and bottom edges, fine grit on the
path surface, natural sunlight, no tire tracks, no footprints, no animals, no
insects, no sky, no horizon, no text, no watermark, 16:9, full-bleed, high
resolution, photorealistic
```

### 6-10 松針林地 Pine Needle Forest Floor
**檔名：** `image/backgroud/Pine Needle Forest Floor.png`

適合：松鼠、蜘蛛、螳螂、蝸牛
**中文：**
```
俯視角度的松樹林地面照片，從正上方往下看，
鋪滿金褐色乾燥松針，邊緣散落幾顆松果和小塊樹皮，
中間是均勻平整的松針層，透過樹梢灑下的柔和斑駁光（光斑不要太強烈），
沒有任何動物或昆蟲，沒有天空、沒有地平線，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度、寫實攝影風格。
```
**English：**
```
top-down photo of a pine forest floor, looking straight down, covered in golden-brown
dry pine needles, a few pine cones and small bark pieces scattered near the edges,
an even flat needle layer in the center, soft gentle dappled light through the
canopy (not high contrast), no animals, no insects, no sky, no horizon, no text, no
watermark, 16:9, full-bleed, high resolution, photorealistic
```

**生成之後：** 存進 `image/backgroud/`，檔名照上面每一款的建議（英文 Title Case）。放好後跟我說，我會幫你加進 `config/scenes.json`（整個畫面設為地面 ground zone，讓爬行／走路的動物上場），再跑 `npm run prepare-assets`。

---

## 提示詞 7：室內完整背景（10 款，靜態圖）

用途：直接生成一整張室內地面／桌面背景，存進 `image/backgroud/`，給家裡常見的小動物在上面爬行走動，例如壁虎／蜥蜴、蜘蛛、蝸牛、瓢蟲、家蠅、田鼠、寵物烏龜、寄居蟹。整個畫面設為地面（ground）zone。

**共通原則（每一款都適用）：**
- **俯視角度、沒有牆角透視**：鏡頭從正上方垂直往下拍地板或桌面，看不到牆壁、天花板、窗外景色，動物的陰影才會自然。
- **畫面中不要有任何動物、昆蟲或人**：連人的手、腳、寵物毛都不要，動物由程式疊上去。
- **中間留出開闊空間**：家具腳、拖鞋、杯子、書本等物件只放在畫面邊緣，中間保留平坦乾淨的表面，讓路徑有地方走。
- **光線柔和均勻**：像室內窗光或柔和的頂燈，避免強烈的窗框陰影、大面積反光或高反差，以免跟程式加上的動物陰影互相干擾。
- **比例 16:9**，盡量高解析度（輸出影片是 3840×2160）。

### 7-1 溫暖木地板 Warm Wooden Floor
**檔名：** `image/backgroud/Warm Wooden Floor.png`

適合：烏龜、田鼠、蜘蛛、蜥蜴
**中文：**
```
俯視角度的室內木地板照片，鏡頭從正上方垂直往下拍，
蜂蜜色的橡木長條地板從畫面左邊延伸到右邊，木紋清楚、拼縫整齊，
邊緣角落有一小角地毯流蘇和一雙拖鞋的鞋尖，中間是開闊乾淨的木地板，
柔和的室內窗光、色彩溫暖寫實，沒有強烈窗框陰影，
沒有任何動物、昆蟲或人，沒有牆壁、沒有透視，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度、寫實攝影風格。
```
**English：**
```
top-down photo of an indoor wooden floor, camera pointing straight down, honey-toned
oak planks running from left to right with clear grain and neat seams, a corner of a
rug fringe and the toes of a pair of slippers at the edges, open clean floor in the
center, soft indoor window light, warm realistic color, no hard window shadows, no
animals, no insects, no people, no walls, no perspective, no text, no watermark,
16:9, full-bleed, high resolution, photorealistic
```

### 7-2 廚房格紋磁磚 Kitchen Checkered Tiles
**檔名：** `image/backgroud/Kitchen Checkered Tiles.png`

適合：家蠅、蜘蛛、田鼠、瓢蟲
**中文：**
```
俯視角度的廚房地板照片，鏡頭正上方往下拍，
米白與淺灰相間的方形格紋磁磚，磁磚縫隙乾淨整齊，
畫面邊緣有一角木櫥櫃底座和幾顆掉落的米粒，中間是開闊乾淨的磁磚地面，
柔和明亮的室內光，磁磚只有微微光澤、沒有刺眼反光，
沒有任何動物、昆蟲或人，沒有牆壁、沒有透視，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度、寫實攝影風格。
```
**English：**
```
top-down photo of a kitchen floor, camera straight down, cream and light-grey
checkered square tiles with clean even grout lines, the edge of a wooden cabinet base
and a few dropped grains of rice near the borders, open clean tile floor in the
center, soft bright indoor light, tiles with a subtle sheen and no glare, no animals,
no insects, no people, no walls, no perspective, no text, no watermark, 16:9,
full-bleed, high resolution, photorealistic
```

### 7-3 客廳羊毛地毯 Living Room Wool Rug
**檔名：** `image/backgroud/Living Room Wool Rug.png`

適合：烏龜、田鼠、瓢蟲、蝸牛
**中文：**
```
俯視角度的客廳地毯照片，從正上方往下看，
柔軟的米色羊毛地毯，帶有淡淡的藍灰色幾何花紋，毛絨質感清楚，
畫面角落露出一點木地板和沙發腳，中間是平整開闊的地毯，
柔和均勻的室內光、色彩溫和寫實，
沒有任何動物、昆蟲或人，沒有牆壁、沒有透視，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度、寫實攝影風格。
```
**English：**
```
top-down photo of a living-room rug, looking straight down, soft beige wool rug with a
faint blue-grey geometric pattern and visible pile texture, a little wooden floor and
a sofa leg showing in the corners, flat open rug in the center, soft even indoor
light, gentle realistic color, no animals, no insects, no people, no walls, no
perspective, no text, no watermark, 16:9, full-bleed, high resolution, photorealistic
```

### 7-4 浴室馬賽克磁磚 Bathroom Mosaic Tiles
**檔名：** `image/backgroud/Bathroom Mosaic Tiles.png`

適合：蜘蛛、蝸牛、壁虎／蜥蜴
**中文：**
```
俯視角度的浴室地板照片，鏡頭正上方往下拍，
白色與淡青色的小方塊馬賽克磁磚，邊緣有一角毛巾地墊和排水孔蓋，
中間是乾燥、平整、開闊的磁磚地面，幾滴小水珠點綴，
柔和明亮的白光，沒有刺眼反光，
沒有任何動物、昆蟲或人，沒有牆壁、沒有透視，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度、寫實攝影風格。
```
**English：**
```
top-down photo of a bathroom floor, camera straight down, small white and pale-aqua
square mosaic tiles, a corner of a towel bath mat and a drain cover near the edges,
dry flat open tile floor in the center with a few tiny water droplets, soft bright
white light, no glare, no animals, no insects, no people, no walls, no perspective,
no text, no watermark, 16:9, full-bleed, high resolution, photorealistic
```

### 7-5 木頭書桌桌面 Wooden Study Desk
**檔名：** `image/backgroud/Wooden Study Desk.png`

適合：瓢蟲、家蠅、蜘蛛、螳螂
**中文：**
```
俯視角度的木頭書桌桌面照片，從正上方垂直往下拍，
胡桃木色的桌面木紋清楚，邊緣散放著鉛筆、打開一角的筆記本、橡皮擦和一個馬克杯的杯緣，
中間是大片開闊乾淨的桌面，柔和的檯燈與窗光、色彩溫暖寫實，
沒有任何動物、昆蟲或人，沒有手，沒有牆壁、沒有透視，沒有文字、浮水印（筆記本上也不要字），
16:9 橫向構圖，畫面填滿不留白，高解析度、寫實攝影風格。
```
**English：**
```
top-down photo of a wooden study desk, camera pointing straight down, walnut-toned
desktop with clear wood grain, a pencil, the corner of an open notebook, an eraser and
the rim of a mug scattered at the edges, a large open clean desk surface in the
center, soft lamp and window light, warm realistic color, no animals, no insects, no
people, no hands, no walls, no perspective, no text or writing anywhere, no
watermark, 16:9, full-bleed, high resolution, photorealistic
```

### 7-6 格紋桌布餐桌 Checkered Tablecloth Dining Table
**檔名：** `image/backgroud/Checkered Tablecloth Dining Table.png`

適合：家蠅、瓢蟲、蝸牛、蜜蜂
**中文：**
```
俯視角度的餐桌照片，鏡頭正上方往下拍，
鋪著紅白格紋棉布桌布，布料紋理清楚、平整沒有大皺褶，
畫面邊緣有一角白色餐盤、幾片麵包屑和一顆紅蘋果，中間是開闊平整的桌布，
柔和明亮的白天室內光、色彩寫實，
沒有任何動物、昆蟲或人，沒有手，沒有牆壁、沒有透視，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度、寫實攝影風格。
```
**English：**
```
top-down photo of a dining table, camera straight down, covered with a red-and-white
gingham cotton tablecloth with visible weave and no big wrinkles, the edge of a white
plate, a few bread crumbs and a red apple near the borders, open flat tablecloth in
the center, soft bright daytime indoor light, realistic color, no animals, no
insects, no people, no hands, no walls, no perspective, no text, no watermark, 16:9,
full-bleed, high resolution, photorealistic
```

### 7-7 和室榻榻米 Japanese Tatami Room
**檔名：** `image/backgroud/Japanese Tatami Room.png`

適合：烏龜、蜘蛛、螳螂、田鼠
**中文：**
```
俯視角度的和室榻榻米地面照片，從正上方往下看，
淡黃綠色的榻榻米，草蓆編織紋理清楚，深色布邊整齊拼接，
畫面角落有一角矮木桌的桌腳和一個坐墊，中間是開闊平整的榻榻米，
柔和的紙窗散射光、色彩自然寫實，
沒有任何動物、昆蟲或人，沒有牆壁、沒有透視，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度、寫實攝影風格。
```
**English：**
```
top-down photo of a Japanese tatami room floor, looking straight down, pale
yellow-green tatami mats with clear woven rush texture and neat dark fabric borders,
a low wooden table leg and a floor cushion in the corners, open flat tatami in the
center, soft diffused shoji-screen light, natural realistic color, no animals, no
insects, no people, no walls, no perspective, no text, no watermark, 16:9,
full-bleed, high resolution, photorealistic
```

### 7-8 車庫水泥地 Garage Concrete Floor
**檔名：** `image/backgroud/Garage Concrete Floor.png`

適合：蜘蛛、蜥蜴、田鼠、螃蟹
**中文：**
```
俯視角度的車庫水泥地照片，鏡頭正上方往下拍，
淺灰色光滑水泥地，帶有細微斑點、髮絲細紋和一條直直的伸縮縫，
畫面邊緣有一角紙箱、一捆麻繩和幾顆螺絲，中間是開闊乾淨的水泥地，
柔和的頂燈光、色彩寫實，沒有油漬大污點，
沒有任何動物、昆蟲或人，沒有牆壁、沒有透視，沒有文字、浮水印（紙箱上也不要字），
16:9 橫向構圖，畫面填滿不留白，高解析度、寫實攝影風格。
```
**English：**
```
top-down photo of a garage concrete floor, camera straight down, smooth light-grey
concrete with fine speckles, hairline cracks and one straight expansion joint, the
corner of a cardboard box, a coil of twine and a few screws near the edges, open
clean concrete in the center, soft overhead light, realistic color, no big oil
stains, no animals, no insects, no people, no walls, no perspective, no text or
labels anywhere, no watermark, 16:9, full-bleed, high resolution, photorealistic
```

### 7-9 窗台盆栽 Windowsill with Potted Plants
**檔名：** `image/backgroud/Windowsill with Potted Plants.png`

適合：瓢蟲、蝸牛、螳螂、蜘蛛
**中文：**
```
俯視角度的寬木窗台照片，從正上方往下看，
白色漆面的寬窗台橫跨畫面，上下兩側邊緣擺著小陶盆的多肉植物、香草盆栽，
有幾片葉子和一點點散落的泥土，中間是開闊乾淨的窗台表面，
柔和明亮的晨光、色彩清新寫實，沒有強烈窗框陰影，
沒有任何動物、昆蟲或人，看不到窗外景色、沒有透視，沒有文字、浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度、寫實攝影風格。
```
**English：**
```
top-down photo of a wide wooden windowsill, looking straight down, a broad
white-painted sill spanning the frame, small terracotta pots of succulents and herbs
along the top and bottom edges, a few leaves and a little scattered soil, open clean
sill surface in the center, soft bright morning light, fresh realistic color, no hard
window-frame shadows, no animals, no insects, no people, no outdoor view, no
perspective, no text, no watermark, 16:9, full-bleed, high resolution,
photorealistic
```

### 7-10 兒童房遊戲地墊 Kids Room Play Mat
**檔名：** `image/backgroud/Kids Room Play Mat.png`

適合：烏龜、田鼠、瓢蟲、螃蟹
**中文：**
```
俯視角度的兒童房地面照片，鏡頭正上方往下拍，
柔和粉彩色（淡藍、淡黃、淡綠、淡粉）的方塊拼接軟墊，拼接邊緣整齊，
畫面角落有幾個木頭積木和一個小玩具車，中間是開闊平整的地墊，
柔和明亮的室內光、色彩溫和寫實，
沒有任何動物、昆蟲或人，沒有動物造型玩具，沒有牆壁、沒有透視，沒有文字、字母或數字圖案，沒有浮水印，
16:9 橫向構圖，畫面填滿不留白，高解析度、寫實攝影風格。
```
**English：**
```
top-down photo of a kids room floor, camera straight down, soft pastel (pale blue,
pale yellow, pale green, pale pink) interlocking foam play-mat squares with neat
seams, a few wooden blocks and a small toy car in the corners, open flat mat in the
center, soft bright indoor light, gentle realistic color, no animals, no insects, no
people, no animal-shaped toys, no walls, no perspective, no letters, numbers or text,
no watermark, 16:9, full-bleed, high resolution, photorealistic
```

**生成之後：** 存進 `image/backgroud/`，檔名照上面每一款的建議（英文 Title Case）。放好後跟我說，我會幫你加進 `config/scenes.json`（整個畫面設為地面 ground zone，讓爬行／走路的動物上場），再跑 `npm run prepare-assets`。
