"use strict";
/* 机器人学导论 · 交互式学习平台 — 公共脚本
   依赖：assets/katex/katex.min.js 与本文件之前加载。
   页面脚本（02.js / 03.js）只写自己那一节的东西，工具一律从这里取。 */

/* ================= 数值 ================= */
const U = 46;                              // 画布每单位像素
const fmtP = v => (Math.abs(v) < 5e-4 ? 0 : v).toFixed(2);
const deg = r => r * 180 / Math.PI;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* ================= 3×3 线性代数（无依赖，工作过程可查） ================= */
const eye3 = () => [[1,0,0],[0,1,0],[0,0,1]];
function matMul(A, B){
  const C = [[0,0,0],[0,0,0],[0,0,0]];
  for(let i=0;i<3;i++) for(let j=0;j<3;j++) for(let k=0;k<3;k++) C[i][j] += A[i][k]*B[k][j];
  return C;
}
function matPow(A, n){ let M = eye3(); for(let i=0;i<n;i++) M = matMul(M, A); return M; }
const msc  = (A, s) => A.map(r => r.map(v => v*s));
const madd = (A, B) => A.map((r,i) => r.map((v,j) => v + B[i][j]));
const msub = (A, B) => A.map((r,i) => r.map((v,j) => v - B[i][j]));
const transpose = A => A[0].map((_,j) => A.map(r => r[j]));
const hat = w => [[0,-w[2],w[1]], [w[2],0,-w[0]], [-w[1],w[0],0]];
function maxAbsDiff(A, B){
  let m = 0;
  for(let i=0;i<3;i++) for(let j=0;j<3;j++) m = Math.max(m, Math.abs(A[i][j]-B[i][j]));
  return m;
}
function rodrigues(w, th){
  const W = hat(w), W2 = matMul(W, W);
  return madd(madd(eye3(), msc(W, Math.sin(th))), msc(W2, 1-Math.cos(th)));
}

/* ================= KaTeX ================= */
const hasKaTeX = typeof katex !== 'undefined';
const C1 = '#E30613', C2 = '#555555', C3 = '#999999';   // 矩阵列色：x 轴 / y 轴 / z 轴

/* 往固定槽位里排一条公式；公式没变就不重排（拖动时省掉大量开销） */
const _texCache = new WeakMap();
function setMath(el, tex){
  if(!el) return;
  if(_texCache.get(el) === tex) return;
  _texCache.set(el, tex);
  if(!hasKaTeX){ el.textContent = tex; return; }
  try{ katex.render(tex, el, {throwOnError:false, strict:'ignore'}); }
  catch(e){ el.textContent = tex; console.error('[katex]', tex, e); }
}
/* 拼 innerHTML 时用的同步版本 */
function K(tex){
  if(!hasKaTeX) return tex;
  try{ return katex.renderToString(tex, {throwOnError:false, strict:'ignore'}); }
  catch(e){ console.error('[katex]', tex, e); return tex; }
}

/* 把一段 HTML 里 \( \) 行内公式、\[ \] 独立公式排出来（正文、解析、动态说明都用它） */
const MATH_DELIMS = [
  {left:'\\(', right:'\\)', display:false},
  {left:'\\[', right:'\\]', display:true}
];
function renderInlineMath(root){
  if(!hasKaTeX || typeof renderMathInElement !== 'function') return;
  renderMathInElement(root || document.body, {
    delimiters: MATH_DELIMS,
    throwOnError: false, strict: 'ignore',
    ignoredTags: ['script','noscript','style','textarea','pre','code']
  });
}

/* 二维数组 → bmatrix；cols 给每列一个颜色 */
function matTex(rows, cols){
  const body = rows.map(r => r.map((cell, i) =>
    (cols && cols[i]) ? `\\color{${cols[i]}}{${cell}}` : cell
  ).join(' & ')).join(' \\\\ ');
  return `\\begin{bmatrix}${body}\\end{bmatrix}`;
}
/* 一维数组 → 竖排向量 */
function vecTex(cells, cols){
  return matTex(cells.map(c => [c]), cols);
}
/* 数值矩阵（二维 number 数组）→ 带列色的 bmatrix */
function numMat(A, cols){
  return matTex(A.map(r => r.map(fmtP)), cols);
}
function numVec(a, cols){
  return vecTex(a.map(fmtP), cols);
}

/* ================= 画布 ================= */
function fitCanvas(cv){
  const dpr = window.devicePixelRatio || 1;
  const w = cv.clientWidth || cv.width;
  const h = Math.round(w * 520 / 860);
  cv.width = w * dpr; cv.height = h * dpr;
  cv.style.height = h + 'px';
  return {w, h, dpr};
}
function arrow(ctx, x1, y1, x2, y2){
  ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
  const a = Math.atan2(y2-y1, x2-x1), L = 9;
  ctx.beginPath(); ctx.moveTo(x2,y2);
  ctx.lineTo(x2 - L*Math.cos(a-0.42), y2 - L*Math.sin(a-0.42));
  ctx.lineTo(x2 - L*Math.cos(a+0.42), y2 - L*Math.sin(a+0.42));
  ctx.closePath(); ctx.fill();
}
function dashedArrow(ctx, x1, y1, x2, y2){
  ctx.setLineDash([5,4]); arrow(ctx,x1,y1,x2,y2); ctx.setLineDash([]);
}
function drawHandle(ctx, x, y, r, color, active){
  ctx.beginPath(); ctx.arc(x, y, r+4, 0, 7);
  ctx.fillStyle = active ? color : '#fff'; ctx.fill();
  ctx.lineWidth = active ? 3 : 2;
  ctx.strokeStyle = color; ctx.stroke();
  ctx.beginPath(); ctx.arc(x, y, r-3.5, 0, 7);
  ctx.fillStyle = color; ctx.fill();
}

/* ================= 补间 ================= */
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
/* tween(S, 1300, k => {...}, done)：句柄挂在 S._t 上，重复调用自动取消上一条 */
function tween(handle, dur, apply, done){
  if(handle._t) cancelAnimationFrame(handle._t);
  if(reduceMotion){ apply(1); if(done) done(); return; }
  const t0 = performance.now();
  const step = now => {
    let k = Math.min(1, (now - t0)/dur);
    k = k < 0.5 ? 2*k*k : 1 - Math.pow(-2*k+2, 2)/2;
    apply(k);
    if(k < 1) handle._t = requestAnimationFrame(step);
    else { handle._t = null; if(done) done(); }
  };
  handle._t = requestAnimationFrame(step);
}
const animating = handle => !!handle._t;
/* 从当前角度平滑转到 target（不重置到 0） */
function snapTo(S, target, render, dur = 700){
  const from = S.theta;
  tween(S, dur, k => { S.theta = from + (target - from)*k; render(); });
}
/* 节流：首帧立即跑，之后每 ms 毫秒最多一次，末帧补上。
   画布每帧重画，数字面板吃不满 60Hz——不舍的话拖动时会被公式排版拖慢。 */
function throttle(fn, ms){
  let last = 0, timer = 0;
  return function(){
    const wait = ms - (performance.now() - last);
    if(wait <= 0){ last = performance.now(); fn(); }
    else if(!timer){
      timer = setTimeout(() => { timer = 0; last = performance.now(); fn(); }, wait);
    }
  };
}

/* ================= 小测 ================= */
function initQuiz(cfg){
  const answers = cfg.answers, why = cfg.why;
  const got = {};
  const scoreEl = document.getElementById('scoreNum');
  document.querySelectorAll('.q').forEach(qEl => {
    const qn = qEl.dataset.q;
    const opts = qEl.querySelectorAll('.opt');
    opts.forEach((op, i) => {
      op.addEventListener('click', () => {
        if(qEl.dataset.done) return;
        qEl.dataset.done = '1';
        opts.forEach(o => o.classList.add('locked'));
        op.classList.add('chosen');
        const ok = i === answers[qn];
        if(ok){ op.classList.add('right'); got[qn] = 1; }
        else { op.classList.add('wrong'); opts[answers[qn]].classList.add('right'); got[qn] = 0; }
        const ex = qEl.querySelector('.explain');
        ex.innerHTML = (ok ? '✓ 正确 — ' : '✗ 再看一遍 — ') + why[qn];
        ex.classList.add('show');
        renderInlineMath(ex);
        if(scoreEl) scoreEl.textContent = Object.values(got).filter(Boolean).length;
      });
    });
  });
}
