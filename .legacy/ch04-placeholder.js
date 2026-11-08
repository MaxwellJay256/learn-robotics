/* 04 节页面逻辑（ESM）。公共工具见 core.js。 */
import { initQuiz, renderInlineMath } from "./core.js";

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
