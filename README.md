# 期末生存指南：21 DAYS

「期末生存指南」是一個結合個人網站、視覺小說與資源管理玩法的校園像素風互動式劇情遊戲。玩家扮演大學生，需要在 21 天內完成期末專題與學業要求，同時管理體力、壓力與金錢。

## 使用技術

- 前端：HTML5、CSS3、Vanilla JavaScript
- 後端：Node.js、Express
- 資料庫：MongoDB、Mongoose
- 部署：Render

## 功能列表

- 像素風 Lobby 主選單與單頁式內容切換
- 製作者介紹、本學期課程與期末專題介紹
- 六個校園場景及視覺小說對話介面
- 體力、壓力、金錢、專題進度、學業進度系統
- 知識含量與成長加成系統
- 開心值與好壞事件機率系統
- 每日四次行動與 21 天時間限制
- 早晨、下午、傍晚、晚上四個時段轉場
- 寫專題、查資料、讀書、上課、打工、運動、洗澡及遊戲等行動
- 超商購物與金額檢查
- 招財貓、參考書等永久道具與消耗品
- 依玩家狀態提供建議的固定老師對話
- 每日結束後自動儲存
- 一個自動存檔與三個手動存檔槽位
- Bug、靈感、奧客、下雨及撿到錢等隨機事件
- 睡覺只消耗一個時段，體力耗盡且壓力達 100 時觸發特殊結局
- 簡單、普通、困難三種難度
- 每 7 天一次的週進度檢查
- 具有選擇分支的隨機 NPC 事件
- 道具欄、成就系統及多個隱藏結局
- 房間角色狀態圖片、行動連動與淡入待機動畫
- 循環背景音樂與按鍵、睡覺、存檔、載入、時段音效
- 首次遊玩五步教學
- 彈幕刪除管理
- 可保存的結局收藏頁
- MongoDB 彈幕新增、讀取與指定天數播放
- 多條件隨機結局判定
- 響應式桌面及手機版面

## 安裝方式

1. 安裝 Node.js 18 或更新版本。
2. 下載或 clone 本專案。
3. 在專案根目錄安裝套件：

```bash
npm install
```

4. 複製 `.env.example` 為 `.env`，填入 MongoDB 連線字串：

```env
PORT=3000
MONGODB_URI=mongodb+srv://帳號:密碼@叢集網址/campus-game?retryWrites=true&w=majority
```

## 如何執行

正式模式：

```bash
npm start
```

開發模式：

```bash
npm run dev
```

瀏覽器開啟 `http://localhost:3000` 即可看到 Lobby。

未設定 `MONGODB_URI` 或資料庫暫時無法連線時，伺服器仍會以記憶體模式啟動，方便展示前端與 API。記憶體資料會在伺服器重新啟動後消失，正式使用請設定 MongoDB。

## 環境變數

| 變數 | 說明 | 必填 |
| --- | --- | --- |
| `PORT` | Express 伺服器連接埠，預設 `3000` | 否 |
| `MONGODB_URI` | MongoDB Atlas 或本地 MongoDB 連線字串 | 正式環境必填 |

## API 說明

### 存檔

| 方法 | 路徑 | 說明 |
| --- | --- | --- |
| `GET` | `/api/save/:playerName/:slot` | 讀取指定玩家的 1～4 號存檔 |
| `POST` | `/api/save` | 新增或更新玩家存檔 |

存檔欄位：玩家基本數值、難度、成就、專題行動次數及永久道具持有狀態。

### 彈幕

| 方法 | 路徑 | 說明 |
| --- | --- | --- |
| `GET` | `/api/danmaku` | 取得最新彈幕 |
| `GET` | `/api/danmaku/:day` | 取得指定天數彈幕 |
| `GET` | `/api/danmaku?day=1` | 以 query 取得指定天數彈幕 |
| `POST` | `/api/danmaku` | 新增彈幕 |
| `DELETE` | `/api/danmaku/:id` | 刪除指定彈幕 |

彈幕欄位：`name`、`content`、`color`、`day`、`createdAt`。

## MongoDB Atlas 設定

1. 在 MongoDB Atlas 建立免費 Cluster。
2. 在 Database Access 建立資料庫帳號。
3. 在 Network Access 加入允許連線的 IP。部署 Render 時可先使用 `0.0.0.0/0`，並設定安全密碼。
4. 取得 Node.js Driver 連線字串並放入 `.env` 的 `MONGODB_URI`。

## 部署到 Render

1. 將專案推送到 GitHub Repo。
2. 在 Render 建立新的 Web Service 並連接 Repo。
3. Runtime 選擇 `Node`。
4. Build Command 設為 `npm install`。
5. Start Command 設為 `npm start`。
6. 在 Environment 加入 `MONGODB_URI`。
7. 部署完成後，Render 會提供可公開瀏覽的網站網址。

伺服器已使用 `process.env.PORT`，可直接相容 Render 提供的連接埠。
專案也包含 `render.yaml`。正式環境若 MongoDB 未連線，彈幕送出會回傳錯誤，不會假裝已永久保存。

## 專案結構

```text
campus-game-project/
├── server.js
├── package.json
├── .env.example
├── README.md
├── models/
│   ├── Save.js
│   └── Danmaku.js
├── routes/
│   ├── saveRoutes.js
│   └── danmakuRoutes.js
└── public/
    ├── index.html
    ├── style.css
    ├── script.js
    └── assets/
        └── images/
```

## 更換場景圖片

目前場景使用 CSS placeholder。可將圖片放入 `public/assets/images/`，再於 `style.css` 的 `.scene-room`、`.scene-gate`、`.scene-computer`、`.scene-classroom`、`.scene-library`、`.scene-store` 加入：

```css
background-image:
  linear-gradient(rgba(5, 8, 15, 0.2), rgba(5, 8, 15, 0.7)),
  url("./assets/images/你的圖片.jpg");
background-size: cover;
background-position: center;
```

## 未來可擴充功能

- 串接 GPT API，讓老師依玩家狀態產生動態建議
- 加入更多校園場景、隨機事件與 NPC 支線
- 加入像素風角色立繪、角色表情與對話音效
- 增加道具背包、成就及事件圖鑑
- 增加登入驗證及多存檔欄位
- 增加彈幕刪除、審核及管理員權限
- 加入背景音樂、音量設定及打字機效果
