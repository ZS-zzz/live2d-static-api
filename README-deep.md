# live2d-static-api 深度指南

本手册为开发者提供关于项目部署、接口规范及项目结构的详细说明。

针对不同的使用场景，我们提供了详细的指引：

*   [**部署方案**](#%E9%83%A8%E7%BD%B2%E6%96%B9%E6%A1%88)：公用 CDN、自建 Nginx、集成到 Vue 项目等。
*   [**接口说明**](#%E6%8E%A5%E5%8F%A3%E8%AF%B4%E6%98%8E)：详细的 URL 路径映射逻辑。
*   [**项目结构**](#%E9%A1%B9%E7%9B%AE%E7%BB%93%E6%9E%84%E4%B8%83%E7%BC%96%E8%AF%91)：了解 `models` 与 `indexes` 的关联。

---

## 🏗 部署方案

我们将 API 部署分为以下四类典型场景，您可以根据项目规模选择：

### 1. 项目集成模式（推荐：中小型单体项目）

将 `indexes` 和 `models` 文件夹直接放入前端项目的 `public` 目录下（如 Vue, React, Vite 项目）。
- **优点**：无需跨域配置，随网页一同上线，API 路径与网页路径一致。
- **路径示例**：
  ```js
  apiPath="./live2d-static-api/indexes"
  ```

![apiPath](https://raw.githubusercontent.com/evgo2017/live2d-static-api/main/assets/apiPath.png)

### 2. NPM / 公用 CDN 模式（推荐：博客或跨站点引用）

将本项目发布到 NPM 后，利用公用 CDN 服务进行分发。
- **优点**：极速、支持全局跨域、无需维护服务器空间。
- **路径示例**：
  ```js
  apiPath="https://cdn.jsdelivr.net/npm/live2d-static-api@latest/indexes"
  apiPath="https://unpkg.com/live2d-static-api@latest/indexes"
  ```

### 3. 自建静态服务器（推荐：自有私有模型）

例如使用 Nginx 托管本项目的主目录，并针对目录开启跨域头。
- **优点**：自主掌控所有模型资源。
- **Nginx 配置参考**：
```nginx
server {
    location /live2d-api {
        add_header 'Access-Control-Allow-Origin' '*';
        add_header 'Access-Control-Allow-Methods' 'GET, OPTIONS';
        add_header 'Access-Control-Allow-Headers' 'Content-Type';
        alias /var/www/live2d-static-api;
    }
}
```

### 4. GitHub 负载模式

利用 GitHub 的 Raw 服务作为数据源。Fork 本项目，修改为你的地址即可。
- **路径示例**：
```js
apiPath="https://raw.githubusercontent.com/evgo2017/live2d-static-api/main/indexes"
```

---

## 📡 接口说明

`live2d-static-api` 与 `vue-live2d` 配合使用时，主要分为三层级联请求。路径逻辑完全基于静态文件夹结构。

| 接口类型 | 开发路径 (基于 apiPath) | 响应内容 | 说明 |
| :--- | :--- | :--- | :--- |
| **模型列表** | `/models.json` | 模型列表数组 | 用于工具栏切换模型 |
| **纹理索引** | `/<modelPath>/textures.json` | 服装 ID 数组 | 用于工具栏切换服装 |
| **配置详情** | `/<modelPath>/<texturesId>.json` | 模型完整配置 | 最终由 `loadlive2d` 加载的文件 |

> **注**：`modelPath` 与 `texturesId` 均从上一级 JSON 响应中动态获取。默认皮肤 ID 通常为 `default`。
>
> **注**：`models.json` 中每一项还带有 `type` 字段，取值为 `cubism2` 或 `cubism4`，用于判断该模型需要哪一种运行时。Cubism 4 模型固定只有 `default` 一种皮肤。

---

## 📂 项目结构

深入理解文件夹结构有助于您快速扩展属于自己的模型库。

### 核心目录

大纲：
```text
├─indexes             # 【生产环境】由 build.js 自动生成，部署时只需关注此文件夹
│  ├─models.json      # 模型汇总索引
│  └─<ModelPath>      # 模型分目录
│      ├─textures.json # 该模型的皮肤列表
│      └─<SkinID>.json # 具体的模型皮肤配置文件
│
└─models              # 【开发环境】原始模型资源，放置模型文件与贴图
    ├─<ModelPath>     # Cubism 2：必须包含 model.json
    │   ├─model.json  # 模型模板配置文件，model 字段指向 .moc
    │   ├─textures    # 贴图资源
    │   └─motions     # 动作/音频资源
    │
    └─<ModelPath>     # Cubism 4：必须包含 *.model3.json
        ├─<Name>.model3.json  # 模型模板配置文件，FileReferences.Moc 指向 .moc3
        ├─<Name>.moc3
        ├─<Name>.physics3.json
        └─<Name>.4096/texture_*.png
```

详细：
```
├─indexes // 索引文件夹，每次 build 完全重建
│  │─models.json // 模型索引文件
│  │
│  └─Potion-Maker
│  │   ├─Pio
│  │   │      animal-costume-racoon.json // 特定服装配置
│  │   │      animal-costume.json // 特定服装配置
│  │   │      ... // 特定服装配置，从<默认服装配置>进一步转义而来
│  │   │      default.json // 默认服装配置，从<模板文件>转义而来
│  │   │      textures.json // 服装索引文件
│  │   │
│  │   └─Tia ...
│  │
│  └─bilibili-live
│      ├─22
│      │      closet-default-v2-cba-normal-upper-cba-normal-lower-cba-hat.json // 特定服装配置，服装各部分使用 - 连接
│      │      ...
│
└─models // 模型文件夹，只读不写
    └─Potion-Maker
        ├─Pio
        │  │  model.json // 模型配置（模板文件）
        │  │  model.moc
        │  │
        │  ├─motions
        │  │      Breath Dere1.mtn
        │  │      Breath Dere2.mtn
        │  │      Breath ...
        │  │
        │  └─textures // 服装文件夹
        │      └─textures_00 // 服装是分部分且有顺序的，几个文件夹就几部分，顺序从<模板文件>获取
        │              animal-costume-racoon.png
        │              animal-costume.png
        │              ...
        │
        └─Tia ...
```

### 编译逻辑简述
执行 `npm run build` 后，`build.js` 脚本会：
1.  遍历 `models` 文件夹，按目录内容自动判定模型格式：
    - 存在 `model.json` → 按 **Cubism 2** 处理；
    - 存在 `*.model3.json` → 按 **Cubism 4** 处理。
2.  解析模型模板文件，并写入 `indexes/models.json`（含 `modelIntroduce`、`modelPath`、`type`）。
3.  **Cubism 2**：根据该模型的皮肤（纹理）数量，自动衍生生成 `indexes` 下的多个对应 JSON 文件；**Cubism 4**：生成单个 `default.json`。
4.  将模型内部的相对路径统一转化为相对于 `apiPath` 的正确路径，并生成 `textures.json`。

