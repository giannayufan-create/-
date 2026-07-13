# 滷味小哥路人甲 - 線上訂購系統

火鍋料、水餃、滷味的完整線上訂購平台。

## 功能

| 前台 | 後台 |
|------|------|
| 商品瀏覽（三大分類） | 總覽儀表板 |
| 購物車結帳 | 訂單管理（自動扣庫存） |
| 會員登入（Google/FB/Yahoo/Email） | 商品管理 |
| 首次登入填寫基本資料 | 會員管理（自動記錄） |
| 訂單追蹤 | 網站設定 |

## 快速開始

```bash
npm install
npm run dev
```

## 首次設定

1. **管理員登入**：使用 `giannayufan@gmail.com` 或 `ko520940@gmail.com`
2. **匯入商品**：後台 → 商品管理 → 一鍵匯入範例商品
3. **部署 Vercel**：推送到 GitHub 後在 Vercel 匯入
4. **Firebase 授權網域**：Firebase Console → Authentication → Authorized domains → 加入 Vercel 網址
5. **部署安全規則**：`firebase deploy --only firestore:rules`

## 會員註冊流程

1. 選擇 Google / Facebook / Yahoo / Email 註冊
2. 顯示「登入中」直到驗證完成
3. 首次登入強制填寫：姓名、電話、地址
4. 資料自動寫入 Firestore `users` 集合
5. 管理員在「會員管理」頁面可看到所有註冊會員

## 技術架構

- **前端**：React + Vite + Tailwind CSS
- **後端**：Firebase Auth + Firestore
- **部署**：Vercel
