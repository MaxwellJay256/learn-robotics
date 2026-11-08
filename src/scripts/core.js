/* 机器人学导论 · 交互式学习平台 — 公共脚本（ESM）
   KaTeX 由 npm 包提供；各节脚本从这里 import，不再挂全局。 */

import katex from 'katex';
import renderMathInElement from 'katex/contrib/auto-render';

/* ================= 数值 ================= */
export const U = 46;                              // 画布每单位像素
export const fmtP = v => (Math.abs(v) < 5e-4 ? 0 : v).toFixed(2);
export const deg = r => r * 180 / Math.PI;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* ================= 3×3 线性代数（无依赖，工作过程可查） ================= */
export const eye3 = () => [[1,0,0],[0,1,0],[0,0,1]];
export function matMul(A, B){
  const C = [[0,0,0],[0,0,0],[0,0,0]];
  for(let i=0;i<3;i++) for(let j=0;j<3;j++) for(let k=0;k<3;k++) C[i][j] += A[i][k]*B[k][j];
  return C;
}
export function matPow(A, n){ let M = eye3(); for(let i=0;i<n;i++) M = matMul(M, A); return M; }
export const msc  = (A, s) => A.map(r => r.map(v => v*s));
export const madd = (A, B) => A.map((r,i) => r.map((v,j) => v + B[i][j]));
export const msub = (A, B) => A.map((r,i) => r.map((v,j) => v - B[i][j]));
export const transpose = A => A[0].map((_,j) => A.map(r => r[j]));
export const hat = w => [[0,-w[2],w[1]], [w[2],0,-w[0]], [-w[1],w[0],0]];
export function maxAbsDiff(A, B){
  let m = 0;
  for(let i=0;i<3;i++) for(let j=0;j<3;j++) m = Math.max(m, Math.abs(A[i][j]-B[i][j]));
  return m;
}
export function rodrigues(w, th){
  const W = hat(w), W2 = matMul(W, W);
  return madd(madd(eye3(), msc(W, Math.sin(th))), msc(W2, 1-Math.cos(th)));
}

/* ================= KaTeX ================= */
export const hasKaTeX = true;
export const C1 = '#E30613', C2 = '#555555', C3 = '#999999';   // 矩阵列色：x 轴 / y 轴 / z 轴

/* 往固定槽位里排一条公式；公式没变就不重排（拖动时省掉大量开销） */
const _texCache = new WeakMap();
export function setMath(el, tex){
  if(!el) return;
  if(_texCache.get(el) === tex) return;
  _texCache.set(el, tex);
  try{ katex.render(tex, el, {throwOnError:false, strict:'ignore'}); }
  catch(e){ el.textContent = tex; console.error('[katex]', tex, e); }
}
/* 拼 innerHTML 时用的同步版本 */
export function K(tex){
  try{ return katex.renderToString(tex, {throwOnError:false, strict:'ignore'}); }
  catch(e){ console.error('[katex]', tex, e); return tex; }
}

/* 把一段 HTML 里 \( \) 行内公式、\[ \] 独立公式排出来 */
const MATH_DELIMS = [
  {left:'\\(', right:'\\)', display:false},
  {left:'\\[', right:'\\]', display:true}
];
export function renderInlineMath(root){
  renderMathInElement(root || document.body, {
    delimiters: MATH_DELIMS,
    throwOnError: false, strict: 'ignore',
    ignoredTags: ['script','noscript','style','textarea','pre','code']
  });
}

/* 二维数组 → bmatrix；cols 给每列一个颜色 */
export function matTex(rows, cols){
  const body = rows.map(r => r.map((cell, i) =>
    (cols && cols[i]) ? `\\color{${cols[i]}}{${cell}}` : cell
  ).join(' & ')).join(' \\\\ ');
  return `\\begin{bmatrix}${body}\\end{bmatrix}`;
}
/* 一维数组 → 竖排向量 */
export function vecTex(cells, cols){
  return matTex(cells.map(c => [c]), cols);
}
/* 数值矩阵 → 带列色的 bmatrix */
export function numMat(A, cols){
  return matTex(A.map(r => r.map(fmtP)), cols);
}
export function numVec(a, cols){
  return vecTex(a.map(fmtP), cols);
}

/* ================= 画布 ================= */
export function fitCanvas(cv){
  const dpr = window.devicePixelRatio || 1;
  const w = cv.clientWidth || cv.width;
  const h = Math.round(w * 520 / 860);
  cv.width = w * dpr; cv.height = h * dpr;
  cv.style.height = h + 'px';
  return {w, h, dpr};
}
export function arrow(ctx, x1, y1, x2, y2){
  ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
  const a = Math.atan2(y2-y1, x2-x1), L = 9;
  ctx.beginPath(); ctx.moveTo(x2,y2);
  ctx.lineTo(x2 - L*Math.cos(a-0.42), y2 - L*Math.sin(a-0.42));
  ctx.lineTo(x2 - L*Math.cos(a+0.42), y2 - L*Math.sin(a+0.42));
  ctx.closePath(); ctx.fill();
}
export function dashedArrow(ctx, x1, y1, x2, y2){
  ctx.setLineDash([5,4]); arrow(ctx,x1,y1,x2,y2); ctx.setLineDash([]);
}
export function drawHandle(ctx, x, y, r, color, active){
  ctx.beginPath(); ctx.arc(x, y, r+4, 0, 7);
  ctx.fillStyle = active ? color : '#fff'; ctx.fill();
  ctx.lineWidth = active ? 3 : 2;
  ctx.strokeStyle = color; ctx.stroke();
  ctx.beginPath(); ctx.arc(x, y, r-3.5, 0, 7);
  ctx.fillStyle = color; ctx.fill();
}

/* ================= 补间 ================= */
export const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
export function tween(handle, dur, apply, done){
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
export const animating = handle => !!handle._t;
export function snapTo(S, target, render, dur = 700){
  const from = S.theta;
  tween(S, dur, k => { S.theta = from + (target - from)*k; render(); });
}
/* 节流：首帧立即跑，之后每 ms 毫秒最多一次，末帧补上 */
export function throttle(fn, ms){
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
export function initQuiz(cfg){
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

/* ================= 视图操作：Ctrl + 左键平移，右键旋转（3D 画布） =================
   每块画布一个 view 对象；章节的投影函数读 view.dx/dy 做平移、view.yaw/pitch 做旋转。
   监听挂在捕获阶段并 stopPropagation，避免和章节自己的拖点逻辑抢事件。 */
export function createView(cv, redraw, opts = {}){
  const yaw0 = opts.yaw ?? 0.61, pitch0 = opts.pitch ?? 0.42;
  const v = {
    dx: 0, dy: 0, yaw: yaw0, pitch: pitch0,
    yaw0, pitch0, rotate: !!opts.rotate,
    mode: null, x0: 0, y0: 0, dx0: 0, dy0: 0, yawA: 0, pitchA: 0,
  };
  const down = e => {
    const pan = e.button === 0 && (e.ctrlKey || e.metaKey);
    const rot = e.button === 2 && v.rotate;
    if(!pan && !rot) return;
    v.mode = pan ? 'pan' : 'rot';
    v.x0 = e.clientX; v.y0 = e.clientY;
    v.dx0 = v.dx; v.dy0 = v.dy; v.yawA = v.yaw; v.pitchA = v.pitch;
    try { cv.setPointerCapture(e.pointerId); } catch(_) {}
    e.preventDefault(); e.stopPropagation();
    cv.style.cursor = pan ? 'grabbing' : 'move';
  };
  const move = e => {
    if(!v.mode) return;
    const mx = e.clientX - v.x0, my = e.clientY - v.y0;
    if(v.mode === 'pan'){
      v.dx = v.dx0 + mx; v.dy = v.dy0 + my;
    }else{
      v.yaw = v.yawA + mx * 0.008;
      v.pitch = clamp(v.pitchA - my * 0.008, -1.25, 1.25);
    }
    e.preventDefault(); e.stopPropagation();
    redraw();
  };
  const up = e => {
    if(!v.mode) return;
    v.mode = null; cv.style.cursor = '';
    e.preventDefault(); e.stopPropagation();
  };
  cv.addEventListener('pointerdown', down, true);
  cv.addEventListener('pointermove', move, true);
  cv.addEventListener('pointerup', up, true);
  cv.addEventListener('pointercancel', up, true);
  cv.addEventListener('contextmenu', e => e.preventDefault());
  v.reset = () => { v.dx = 0; v.dy = 0; v.yaw = v.yaw0; v.pitch = v.pitch0; redraw(); };
  return v;
}
