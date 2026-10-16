![live2d-static-api](https://socialify.git.ci/evgo2017/live2d-static-api/image?custom_description=live2d.min.js+api+%E9%9D%99%E6%80%81%E5%8C%96%E7%9A%84%E9%9B%B6%E7%BB%B4%E6%8A%A4%E6%96%B9%E6%A1%88&custom_language=Node.js&description=1&forks=1&language=1&name=1&owner=1&stargazers=1&theme=Light)

## 🚀 快速预览

*   **在线 DEMO**：[https://live2d.evgo2017.com](https://live2d.evgo2017.com)
*   **配套应用示例：** [vue-live2d](https://github.com/evgo2017/vue-live2d)

## 💡 如何使用？

本项目的核心产出是 `indexes` 文件夹。你只需要将该文件夹部署，并获取其 URL 作为 apiPath 即可。更多信息参阅 [深度指南](./README-deep.md)。

---

## 🌟 核心理念：API 静态化

**live2d-static-api** 是经典 `live2d.min.js` api、[fghrsh/live2d_api](https://github.com/fghrsh/live2d_api) (PHP 版) 等项目的**优化解决方案**。

### 🔄 为什么要替代？

如果你正在使用以下项目，本项目可以为你提供更稳定、更省心的体验：
- **正在使用 `live2d.min.js` 及其衍生库**：只需更改 `apiPath`，即可无缝切换到静态资源。
- **正在使用 `fghrsh/live2d_api`**：无需再折腾 PHP 环境、Docker 或负载均衡。
- **各种看板娘组件 (`live2d-widget`, `live2d_demo` 等)**：受够了第三方接口的 404 和不稳定，本项目是你自行托管的最佳选择。

### ⚡ 静态 API 的降维打击

它的逻辑非常简单：**将原本需要后端处理的逻辑（PHP/Node.js）提前在编译阶段完成，生成纯 JSON 索引文件。**

这样，你只需要把生成的文件夹扔进任何静态 Web 服务器（甚至 CDN），API 就能跑起来。

### ⚡ 为什么选择静态 API？

| 特性 | 传统动态 API (PHP/Node.js) | 本项目 (静态 API) |
| :--- | :--- | :--- |
| **服务器要求** | 必须安装 PHP/Node.js 环境 | 任意 Web 服务器 (Nginx, GitHub Pages, CDN) |
| **维护成本** | 需维护服务进程、担心宕机 | **零维护**，部署即永久在线 |
| **加载性能** | 受到后端处理速度限制 | **极致速度**，直接读取静态文件 |
| **跨域处理** | 需要后端配置 CORS | 托管商(如 CDN)配置或天然支持 |
| **安全性** | 存在脚本注入等风险 | **绝对安全**，仅分发静态资源 |

## ✨ 特性

-   **零门槛部署**：像发布网页一样发布 API。
-   **全平台兼容**：适配所有前端构建工具及静态平台。
-   **CDN 友好**：支持一键发布到 NPM 并通过 `unpkg` / `jsdelivr` 加速，国内访问极速稳定。
-   **灵活可定制**：一键脚本，轻松生成属于你自己的模型索引。
-   **双格式支持**：编译脚本同时支持 Cubism 2（`model.json` + `.moc`）与 Cubism 4（`*.model3.json` + `.moc3`）模型，按目录内容自动识别。

---

## 🛠 进阶：修改与生成模型

如果你想新增模型、修改服装或调整配置，只需在 `models` 文件夹中操作，然后运行编译脚本：

### 支持的模型格式

`build.js` 会自动识别目录格式，两种模型可以混放：

| 格式 | 目录内必须包含 | 生成结果 |
| :--- | :--- | :--- |
| **Cubism 2** | `model.json`（`model` 字段指向 `.moc`）+ `textures/<部件>/*.png` | 按部件组合派生多套皮肤 JSON |
| **Cubism 4** | `*.model3.json`（`FileReferences.Moc` 指向 `.moc3`） | 生成 `default.json`，只有一套皮肤 |

> **关于 Cubism 4**：其模型定义会原样转义为 `default.json`。若源文件未声明 `Expressions` / `Motions`，编译时会按目录内的 `*.exp3.json`、`*.motion3.json` 自动补全（动作统一归入 `Idle` 分组）。可选在 `*.model3.json` 顶层加一个 `modelIntroduce` 字段作为模型介绍，缺失时以文件夹名代替。
>
> **注意**：Cubism 4 模型需要 Cubism 4 运行时渲染（如 `live2dcubismcore.min.js` + `pixi-live2d-display`），经典的 `live2d.min.js` 只能渲染 Cubism 2 模型。可通过 `models.json` 里的 `type` 字段（`cubism2` / `cubism4`）区分。

### 编译指令
```bash
# 1. 默认编译（推荐）
npm run build

# 2. 自定义参数编译
node build.js fromBasePath=models toBasePath=indexes isCompress=true
```

### 编译参数
| 参数 | 含义 | 默认值 |
| :--- | :--- | :--- |
| `fromBasePath` | 模型原始资源路径 | `models` |
| `toBasePath` | 生成的索引输出路径 | `indexes` |
| `isCompress` | 生成的 JSON 索引是否压缩 | `false` |

---

## 📋 参考资料

本项目逻辑灵感源自 [fghrsh/live2d_api](https://github.com/fghrsh/live2d_api)。
在原项目的基础上，我们去除了对 PHP 环境的依赖，转而使用 Node.js 预编译 + 静态分发的模式。

> **作者自述**：
> “原版的 PHP 实现很棒，但我不想为了一个看板娘去折腾容器或后端环境。通过静态化处理，我发现不仅复杂度降低了，加载速度也更快了。这就是完美的解决方案。”

## ⚖️ 版权说明

*   **模型资源**：`models` 文件夹内的 Live2D 模型版权均属于原作者，**仅供研究学习，严禁用于商业用途**。
*   **其他内容**：代码部分遵循 MIT 协议，版权属于 [evgo2017](https://github.com/evgo2017)。

## 🤝 参与开发

如果您发现问题，或希望贡献，欢迎提交 Pull Request。



