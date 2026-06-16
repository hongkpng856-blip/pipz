pipz/
├── apps/web/          # Next.js Web MVP（運行中，localhost:3000）
│   ├── src/app/
│   │   ├── layout.tsx
│   │   ├── page.tsx       # 主頁（行路+寵物+孵化）
│   │   └── globals.css
│   └── public/
├── packages/core/     # 純 TS 遊戲邏輯（平台重用）
│   └── src/
│       ├── types/         # 數據類型
│       ├── formulas/      # 公式（進化、遇見、mood）
│       └── utils/         # 工具函數
└── backend/           # 後端（準備中）
