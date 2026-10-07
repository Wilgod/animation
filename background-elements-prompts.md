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
