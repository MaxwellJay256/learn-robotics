"use strict";
/* 04 螺旋运动与齐次变换指数 — 页面逻辑（占位骨架，面板由 patchouli 接）
   正文与 DOM 已就位，本文件目前只实现小测；render() 是空实现，画布与三块面板待接。

   ── 面板 hook 清单 ──────────────────────────────────────────────
   cv1        画布。fitCanvas / arrow / drawHandle / tween / snapTo / throttle 都在 core.js；
              03.2 的轴测投影 proj / arrow3 待从 03.js 提到 core.js（说好的），提到后这边直接取。
   xiOut      第一块 plabel 右侧 .val：建议显示 "θ = 0°"，与 thetaOut 同格式。
   XiVec      6×1 旋量：上三行 v、下三行 ω；建议 \underbrace 标「平移」「转轴」两块。
              配色与全页一致：ω 块给 C1（红，画布上转轴也是红），v 块给 C2（深灰）。
   screwNote  螺距 h = ωᵀv 与沿轴位移 d = hθ，走 innerHTML + renderInlineMath 或直接 K()。
   expOut     第二块 .val：可放 "g live" 或 θ 的当前值。
   ExpForm    解析式，一行：e^{\hat\xi\theta}=\begin{bmatrix}e^{\hat\omega\theta} & (I-e^{\hat\omega\theta})\hat\omega v+\omega\omega^{\mathsf T}v\theta\\0&1\end{bmatrix}
              面板只有 320–380px，这一行会横向滚动（.eq 已 overflow-x:auto）；放不下就留空，正文 04.2 已有整式。
   Exp4       4×4 数值：左上按列 C1/C2/C3，右上平移列用 C3（或 #bbb）。
   degenOut   第三块 .val：纯平移 / 纯旋转 / 螺旋，按当前 ξ 判定。
   Degen4     退化 4×4：[[I, vθ],[0,1]]；ω≠0 时照样显示这一支做对照，别隐藏。
   按钮       anim1 从零演示 / snap90 转到 90° / toRot 令 h:=0（v 改成 -ω×r）/
              toTrans 令 ω:=0、v:=ẑ / reset1 重置。
   画布三层   细黑转轴 → 红螺旋线 → 浅灰虚线纯转动对照（h=0），叠同一个轴测视角里。
   ─────────────────────────────────────────────────────────────── */

/* 画布与其上的一切由 patchouli 接；先留空实现，保证页面不抛错。 */
function render(){}

initQuiz({
  answers: { 1:0, 2:0, 3:1 },
  why: {
    1: '代 \\(v = h\\omega - \\omega\\times r\\)：\\(h=0\\) 时只剩 \\(v=-\\omega\\times r = -(0,2,0)=(0,-2,0)\\)。等价地，在 \\(p=0\\) 处直接算圆周速度 \\(\\omega\\times(p-r)\\)，结果相同。见 04.1 第 4 小节。',
    2: '\\(\\omega=0\\) 走退化分支：\\(e^{\\hat\\xi\\theta} = \\begin{bmatrix} I & v\\theta \\\\ 0 & 1 \\end{bmatrix}\\)，平移列是 \\(v\\theta = (0,0,3)\\)。见 04.2 第 4 小节。',
    3: '\\(h=\\omega^{\\mathsf{T}}v=0\\) 说明 \\(v\\) 没有沿轴分量，只剩 \\(-\\omega\\times r\\)；它非零就意味着 \\(r\\neq0\\)——仍是纯转动，只是轴不过原点。把 \\(v\\) 当轴位置的人会在这里选纯平移。见 04.1 第 5 小节。'
  }
});

render();
renderInlineMath(document.body);
