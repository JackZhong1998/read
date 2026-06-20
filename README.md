# 速读 - AI 智能阅读 App

AI 驱动的书籍推荐与速读 Web 应用，对接 Kimi K2.6 模型。

## 功能

- **用户档案**：选择性别、年龄，个性化推荐
- **书籍推荐 Agent**：对话式推荐，JSON 输出 chat/rec
- **精读 & 深读**：Tool 调用，生成书籍精髓与深度解读
- **Sug 推荐**：智能后续选项
- **阅读页**：翻页/滑动双模式，全屏阅读
- **已读书目**：本地缓存，可追溯重读

## 本地开发

```bash
npm install
cp .env.example .env.local
# 编辑 .env.local 填入 MOONSHOT_API_KEY
npm run dev
```

访问 http://localhost:3000

## 部署到 Vercel

1. 推送代码到 GitHub
2. 在 [Vercel](https://vercel.com) 导入项目
3. 添加环境变量 `MOONSHOT_API_KEY`
4. 部署

## 技术栈

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS 4
- Moonshot Kimi K2.6 API
- localStorage 本地缓存
