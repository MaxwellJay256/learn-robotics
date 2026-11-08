# 机器人学导论 · 网页课件

交互式自学站点。Astro 静态站点，公式 KaTeX，画布 Canvas 2D + three.js。

```bash
npm run dev       # 本地开发 http://localhost:4321
npm run build     # 产出 dist/
npm run preview   # 预览 dist/
```

## 目录

```txt
src/
  pages/
    index.astro                 首页：用法 + 目录（由 chapters.js 生成）
    <slug>/index.astro          每一节一页，正文来自 src/content/
  layouts/
    Base.astro                页头、页脚、KaTeX 样式表、全局样式注入
  content/
    NN.mdx                    正文：Markdown 散文 + 组件，公式走 remark-math/rehype-katex
    fragments/*.html          交互块（画布、面板、小测）的原样 HTML，用 ?raw 注入
  components/
    Section.astro          章节容器：大号编号 + 中英标题
    Prose.astro            正文容器（.prose：段号计数、行宽、间距）
    Box.astro              提示框（warn 时竖线转红）
    Raw.astro              把一段 HTML 字符串原样注入（给 fragments 用）
    _legacy/                  转换前的 HTML 正文，仅供比对
  data/
    chapters.js                  章节清单：编号、标题、关键词、状态、前后导航
    meta.json                    各节页眉元数据（kicker / 标题 / 副标题 / meta 条）
  styles/
    site.css                   统一样式（瑞士国际主义：位置、栏宽、横线、留白）
  scripts/
    core.js                   公共工具：3×3 线代、KaTeX 封装、画布、补间、小测
    ch02.js ch03.js ch04.js   各节交互：画布绘制、面板联动、小测答案
    angle3d.js                03.1 三维实例的 three.js 渲染与拾取
public/
  katex/                       KaTeX 样式与字体（不走打包器，路径自控）
scripts/
  build.mjs                   构建包装（见下方「已知坑」）
.legacy/
  pre-astro/                  迁移前的整站，仅供比对，不参与构建
```

## 新增一节

1. `src/content/NN.mdx` 写正文：每节一个 `<Section n t en>`，正文包在 `<Prose>` 里，交互块照抄旧节并放进 `content/fragments/`，用 `<Raw html={wNN_1} />` 注入。
2. `src/data/meta.json` 加一条页眉元数据。
3. `src/data/chapters.js` 把该条 `status` 改成 `'done'` 并补 `slug`。
4. `src/pages/<slug>/index.astro` 照抄现有页面，改 `import Content from '../../content/NN.mdx'` 与 `neighbours()` 的 slug。
5. `src/scripts/chNN.js` 写本节交互，顶部从 `./core.js` import。

## 正文与公式规范

- 正文是 Markdown：段落空行分隔，标题 `### <span className="k">1</span> 标题`，列表用 `-`。
- 行内公式 `$ ... $`；独立公式写成 ```math 围栏块（不是 `$$`，原因见「已知坑」），渲染成 `.katex-display`，CSS 已按 38px 缩进左对齐。
- 粗体用 `<strong>`，斜体用 `<em>`；不要用 `**`——中文紧邻时收尾星号不满足 CommonMark 的 flanking 规则，会原样露出来。
- 数学里不要出现裸 `<`，写 `\lt`（KaTeX 的小于号）。
- 矩阵一律 `egin{bmatrix}`：每行一行、每列一列，方括号只有一层；列向量竖排，不转置。
- 转置写 `^{\mathsf{T}}`；中文不进数学模式。
- **动态数字**用 `numMat / numVec / matTex / vecTex` 拼 TeX，再交给 `K()` 或 `setMath()`。
- 插入的 HTML 里写 `\( \)` 不会被自动排版：要么走 `K()`，要么插完调 `renderInlineMath(el)`。
- 自查：`document.querySelectorAll('.katex-error').length === 0`。

## 画布操作

所有画布统一两种手势：

- **Ctrl + 左键拖动 = 平移**（每块画布各自记位移，互不影响）
- **右键拖动 = 旋转视角**（只给有三维投影的画布：04 主图与两张小图、03.1 的 three.js 球）

平面图（02、06）不给旋转：把网格和坐标轴一起转，矩阵读数与“第 1 列朝哪”的方位感就废了，只保留平移。

实现：`core.js` 的 `createView(cv, redraw, { yaw, pitch, rotate })` 在捕获阶段截走 Ctrl+左键与右键（`stopPropagation`，不干扰章节自己的拖点），投影函数读 `view.dx/dy/yaw/pitch`。three.js 画布在 `angle3d.js` 里自己处理：右键改 yaw/pitch 后 `updateBasis()` 重算 RIGHT/UP/VIEW，平移走 `camera.setViewOffset`。

04 主画布不写死比例：每帧先收集要画的点，按包围盒算 `scale` 与原点，所以任何 θ、任何模式都不会把刚体顶出画布。

## 渲染节奏

`render()` 只画布；数字面板走 `renderPanels`（`throttle(..., 80)`）。面板每帧重排十几块矩阵会把拖动拖到 45fps 以下。

## three.js 画布（03.1）

- `angle3d.js` 只负责画与拾取，状态（`S3.dir`、`S3.twist`）仍在 `ch03.js`。
- 透视相机，视角由 `YAW / PITCH` 决定；`camera.up` 取旧 2D 投影的屏幕 y 轴，保证与其他画布同角度。
- 叠加层的线（轴、弧、参考线）一律 `depthTest: false`，否则会被球面挡住。
- 标签是 DOM 覆盖层（`.canvasbox .labels`），投影前必须 `camera.updateMatrixWorld()`，否则首帧错位。
- 调试钩子：`window.__A3.handleScreen()` 返回自转手柄在画布内的坐标。

## 已知坑

- **不要在取 WebGL 的画布上先取 2d 上下文**，否则 `THREE.WebGLRenderer` 报 "existing context of a different type"。
- **`node_modules` 直接放在项目里**。项目已经迁到 `F:\Astro\learn-robotics`，不在 OneDrive 内，所以不再需要目录联接那套绕法。
- **`satteri` 用 overrides 钉在 0.11.5**：Astro 7 依赖的 0.11.6 没有发布 win32 原生包。
- **构建走 `node scripts/build.mjs`**：直接 `astro build` 在本机会在打印 Complete! 之后不退出（原生绑定留下的句柄）。CI 里会一直等到超时。
- **KaTeX 用 `public/katex/`**：从 npm 包 import CSS 时 Vite 会把 `url(fonts/...)` 重写成 `/_astro/fonts/...` 而文件不在那儿，字体会 404。
- Astro 7 里在 `.astro` 顶部 `import 'x.css'` 没有生成 `<link>`，样式改由 `Base.astro` 底部的 `<style is:global>@import` 注入。
- **Astro 7 默认的 Markdown 处理器是 Sätteri**，要挂 remark/rehype 插件必须装 `@astrojs/markdown-remark`，否则配置校验直接报错。
- **`$$ … $$` 跨行写在 JSX 子节点里会让 MDX 报 “Expected a closing tag”**；单行 `$$ … $$` 又退化成行内模式。所以独立公式一律用 ```math 围栏块——多行安全，且是 display 模式。
- **MDX 里 `{` 是表达式**：数学里的花括号在 `$ … $` 内是安全的（数学记号先被切开），但在正文里出现裸 `{` 会炸。
- `Fragment set:html` 是 Astro 语法，JSX 里写不了；注入 HTML 片段要走 `components/Raw.astro`。


## 部署（Cloudflare Pages）

站点发布在 `https://learn.keinestudio.cn/`：仓库推到 GitHub，Cloudflare Pages 拉 `main` 分支构建 `dist/`，再把 `learn` 子域指过去。主域 `keinestudio.cn` 归个人博客，这里只占一个子域，两套解析互不影响。

三处与部署相关的配置：

- `astro.config.mjs` 里 `site` 写 `https://learn.keinestudio.cn`。域名落在子域根部，所以 `base` 保持 `/`；页面链接与 `/katex`、`/_astro` 资源都经 `import.meta.env.BASE_URL` 生成，改成子路径部署时只动 `base` 一处。
- `.node-version` 钉 `22.23.4`，这是 Astro 7 `engines.node` 的下限；Cloudflare 的构建镜像会读这个文件选 Node。
- `src/pages/404.astro` 产出 `dist/404.html`。缺了它，Cloudflare Pages 会把整站当 SPA 处理，任何未知路径都回退到首页。

Dashboard 里的构建设置：

| 项 | 值 |
| --- | --- |
| Framework preset | `Astro` |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | 留空（仓库根） |
| Production branch | `main` |

自定义域名先在 Pages 项目的 **Custom domains** 里加 `learn.keinestudio.cn`，再由它自动在 Cloudflare DNS 写下 `CNAME learn → <项目>.pages.dev`。顺序反了（先手工加 DNS 记录）会在访问时报 522。

部署后自查：

```bash
curl -I https://learn.keinestudio.cn/                     # 200，且是 text/html
curl -I https://learn.keinestudio.cn/02-刚体变换/          # 中文路径能通
curl -sI https://learn.keinestudio.cn/katex/katex.min.css # 字体样式 200
```