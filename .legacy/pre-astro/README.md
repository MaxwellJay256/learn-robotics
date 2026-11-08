# 机器人学导论 · 网页课件

自学用的交互式课件。每一节一个目录，共用 `assets/` 下的样式、脚本与 KaTeX。

## 目录结构

```
网页课件/
  index.html              首页：用法 + 目录（.toc），链到各节
  assets/
    site.css              统一样式（02/03 合并而成，新增节直接引用）
    core.js               公共工具：矩阵运算、KaTeX 封装、画布、补间、节流、小测
    02.js  03.js  04.js   各页自己的场景与面板逻辑
    katex/                KaTeX 0.16.22（离线：katex.min.css / katex.min.js / contrib/auto-render.min.js / fonts/）
  02-刚体变换/index.html
  03-指数坐标与Rodrigues/index.html
  04-螺旋与齐次变换指数/index.html
  index.html              首页目录
  .legacy/                改版前的旧文件（分拆的 style.css / app.js 与旧 index.html），仅供比对
```

新增一节后，在 `index.html` 的 `.toc` 里加一行：已写完的用 `<a class="row" href="04-xxx/index.html">`（状态标签写 `.st done`），未写的用 `<div class="row todo">`。页脚用同样的结构：

```html
<span class="fnav">
  <a href="../index.html">目录</a>
  <a class="next" href="../04-xxx/index.html">下一节：… →</a>
</span>
```

## 新开一节

1. 建目录 `04-xxx/index.html`，`<head>` 里只引两条样式：

```html
<link rel="stylesheet" href="../assets/katex/katex.min.css">
<link rel="stylesheet" href="../assets/site.css">
```

2. `</body>` 前按顺序引四条脚本（顺序不能改，core 依赖 KaTeX 与 auto-render）：

```html
<script src="../assets/katex/katex.min.js"></script>
<script src="../assets/katex/contrib/auto-render.min.js"></script>
<script src="../assets/core.js"></script>
<script src="../assets/04.js"></script>
```

3. 页面脚本末尾必须调用一次 `render()` 和 `renderInlineMath(document.body)`。

## 正文结构

`.prose` 里除编号段落外，再加三种块（02 / 03 已全部改用）：

```html
<h3><span class="k">3</span>小节标题</h3>
<div class="formula">\[ ... \]</div>
<div class="box warn"><div class="lbl">常见错误</div><ul><li>…</li></ul></div>
<div class="box"><div class="lbl">离开本节前，合上文字回答</div><ul><li>…</li></ul></div>
```

- `h3` 自带 38px 缩进，与段落文字左对齐；`.k` 是红色等宽编号，`h3` 不参与段号计数。
- `.box` 左侧 3px 竖线，`.warn` 变红，普通版黑色（用于自检、例题）。
- 段号只数 `.prose > p`；`.box` 内用 `li`，不占编号。

## 数学写作规范

- **静态公式**直接写在 HTML 里：行内 `\( ... \)`，独立成行 `\[ ... \]`。不要用 `$...$`。
- 独立公式包在 `<div class="formula">` 里，与正文段落同缩进（38px），左对齐。
- **矩阵一律 `\begin{bmatrix} ... \end{bmatrix}`**：每行一行、每列一列，方括号只有一层；列向量同样竖排，不要转置成一行。
- 转置写 `^{\mathsf{T}}`，不要 `^T`（斜体 T 与变量混淆）。
- 中文不进数学模式；要写就用 `\text{}` 且只放必要的词。
- **动态数字**（随拖动变化）：用 `assets/core.js` 里的 `numMat(A, cols)` / `numVec(a, cols)` / `matTex(rows, cols)` 拼 TeX，再用 `K(tex)` 拼进 innerHTML，或 `setMath(el, tex)` 写固定槽位。三列默认配色 `C1/C2/C3`（红 / 深灰 / 浅灰），对应 x、y、z 轴。
- 动态插入的 HTML 里写 `\( ... \)` **不会**被自动排版——要么走 `K()`，要么插完调 `renderInlineMath(el)`。
- 排版失败时页面上会显示红字 TeX 源码，控制台有 `[katex]` 报错；测试时用 `document.querySelectorAll('.katex-error').length === 0` 自查。

## 渲染节奏

`render()` 只负责画布；数字面板走 `renderPanels`（`throttle(..., 80)`）。面板里每帧重排十几块矩阵会把拖动拖到 45fps 以下，不要在 `render()` 里直接调面板函数。

## 小测

`initQuiz({answers, why})`：`answers` 是题号 → 正确选项下标（从 0 起），`why` 是解析文本，可以内嵌 `\( ... \)`。
