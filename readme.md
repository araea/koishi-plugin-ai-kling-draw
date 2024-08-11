# koishi-plugin-ai-kling-draw

[![npm](https://img.shields.io/npm/v/koishi-plugin-ai-kling-draw?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-ai-kling-draw)

## ✨ 简介

快手[可灵AI](https://klingai.kuaishou.com/text-to-image/new)绘图模型，原生支持生成准确的图内汉字，每日登录大约能免费画 330 张。自带提示词生成器、垫图等功能。🎨

## 🎉 安装

```
前往 Koishi 插件市场添加该插件即可
```

## 🌈 使用

1. **获取 Cookie：**

- 前往 [AI Kling Draw](https://klingai.kuaishou.com/text-to-image/new) 网站登录。
- 登录后，F12 打开控制台，切换到 "Network" (网络) 选项卡。
- 输入提示词生成一次图片，找到 `submit` 请求。
- 在请求标头 (Request Headers) 中，复制 `Cookie` 的值。

2. **配置插件：** 填写 `cookie` 配置项。

```typescript
cookie: 'YOUR_COOKIE' // 替换为你的 AI Kling Draw Cookie
```

3. **开始创作！**

- 使用 `aiKling.绘图 <提示词>` 命令，根据提示词生成图片。 例如：

  ```
  aiKling.绘图 一只戴着草帽的猫咪，在沙滩上晒太阳
  ```

- 使用 `aiKling.提示词生成器 <描述>` 命令，可生成 AI 绘图提示词。 例如：

  ```
  aiKling.提示词生成器 一只猫
  ```
  - 由 `Claude-3.5-Sonnet` 提供支持。

- 使用 `aiKling.参数列表` 命令，查看可灵AI支持的参数列表。

- **建议自行添加别名：** 可以将 `aiKling.绘图` 添加别名为 `绘图` 或 `画图`，以便更方便地使用。

## ⚙️ 配置项

| 配置项               | 默认值  | 说明                             |
|-------------------|------|--------------------------------|
| `cookie`          | 必填   | AI Kling Draw 的 cookie，用于身份验证。 |
| `timeoutDuration` | 10   | 任务超时时长 (分钟)，超过该时间任务将被视为失败。     |
| `printProgress`   | true | 是否打印任务进度，方便你了解绘图的进展。           |

## 🌼 命令

| 命令                    | 说明               |
|-----------------------|------------------|
| `aiKling`             | 查看插件的帮助信息。       |
| `aiKling.绘图 <提示词>`    | 根据提示词生成图片。       |
| `aiKling.提示词生成器 <描述>` | 根据描述生成 AI 绘图提示词。 |
| `aiKling.参数列表`        | 查看 可灵AI 参数列表。    |

## 🍧 致谢

* [Koishi](https://koishi.chat/) - 💖 强大的机器人框架
* [AI Kling Draw](https://klingai.kuaishou.com/text-to-image/new) - ✨ 可灵AI

## 🐱 QQ 群

- 956758505

## ✨ License

MIT License © 2024

希望您喜欢这款插件！ 💫

如有任何问题或建议，欢迎联系我哈~ 🎈
