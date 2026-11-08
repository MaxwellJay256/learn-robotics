"use strict";
/* 02 刚体变换 — 页面逻辑
   S1: 02.1 纯旋转   S2: 02.2 旋转 + 平移
   公共工具：assets/core.js；公式：KaTeX（见 matTex / numMat / K） */

const cv1 = document.getElementById('cv1'), ctx1 = cv1.getContext('2d');
const cv2 = document.getElementById('cv2'), ctx2 = cv2.getContext('2d');
const S1 = { theta: Math.PI/3, p: [0,0], q: [1.0,0.6], drag: null, ghost: false };
const S2 = { theta: Math.PI/4, p: [2.2,1.2], q: [0.8,0.5], drag: null, ghost: false };

const sgn = v => (v < 0 ? '-' : '+');

/* ================= 画布 ================= */
function drawScene(cv, ctx, S, opts){
  const {w,h,dpr} = fitCanvas(cv);
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.clearRect(0,0,w,h);
  const ox = opts.movableP ? w*0.40 : w*0.5, oy = h*0.55;
  const X = x => ox + x*U, Y = y => oy - y*U;

  /* 网格 */
  ctx.strokeStyle = '#ececea'; ctx.lineWidth = 1;
  const gx0 = ox % U, gy0 = oy % U;
  ctx.beginPath();
  for(let i=0; i*U+gx0 < w; i++){ ctx.moveTo(i*U+gx0, 0); ctx.lineTo(i*U+gx0, h); }
  for(let j=0; j*U+gy0 < h; j++){ ctx.moveTo(0, j*U+gy0); ctx.lineTo(w, j*U+gy0); }
  ctx.stroke();

  /* 空间系 A */
  ctx.strokeStyle = '#111'; ctx.lineWidth = 1.6;
  arrow(ctx, 18, oy, w-14, oy); arrow(ctx, ox, h-14, ox, 12);
  ctx.fillStyle = '#111'; ctx.font = '12px "Helvetica Neue",Arial';
  ctx.fillText('xᴀ', w-30, oy-8); ctx.fillText('yᴀ', ox+8, 22);

  const c = Math.cos(S.theta), s = Math.sin(S.theta);
  const R = [[c,-s],[s,c]];
  const px = S.p[0], py = S.p[1];
  const Bx = [c,s], By = [-s,c];
  const qx = px + R[0][0]*S.q[0] + R[0][1]*S.q[1];
  const qy = py + R[1][0]*S.q[0] + R[1][1]*S.q[1];

  /* 零位形幽灵 */
  if(S.ghost){
    ctx.save(); ctx.globalAlpha = .5; ctx.lineWidth = 1.2;
    ctx.strokeStyle = '#e30613'; dashedArrow(ctx, X(0),Y(0), X(1.15),Y(0));
    ctx.strokeStyle = '#999';    dashedArrow(ctx, X(0),Y(0), X(0),Y(1.15));
    ctx.restore();
  }

  /* B 系 */
  ctx.lineWidth = 2.6;
  ctx.strokeStyle = '#E30613'; arrow(ctx, X(px),Y(py), X(px+Bx[0]*1.3), Y(py+Bx[1]*1.3));
  ctx.strokeStyle = '#555';    arrow(ctx, X(px),Y(py), X(px+By[0]*1.3), Y(py+By[1]*1.3));
  ctx.fillStyle = '#E30613'; ctx.fillText('xᴃ', X(px+Bx[0]*1.45)-4, Y(py+Bx[1]*1.45)+4);
  ctx.fillStyle = '#555';    ctx.fillText('yᴃ', X(px+By[0]*1.45)-4, Y(py+By[1]*1.45)+4);

  /* 刚体轮廓 */
  ctx.strokeStyle = '#111'; ctx.lineWidth = 1.8; ctx.setLineDash([]);
  const pts = [[0,0],[1.0,0],[1.0,0.9],[0.55,0.9],[0.55,0.45],[0,0.45]];
  ctx.beginPath();
  pts.forEach((pt,i)=>{
    const wx = px + R[0][0]*pt[0] + R[0][1]*pt[1];
    const wy = py + R[1][0]*pt[0] + R[1][1]*pt[1];
    i ? ctx.lineTo(X(wx),Y(wy)) : ctx.moveTo(X(wx),Y(wy));
  });
  ctx.closePath(); ctx.stroke();

  /* 点 q */
  ctx.fillStyle = '#111';
  ctx.beginPath(); ctx.arc(X(qx),Y(qy),5.5,0,7); ctx.fill();
  ctx.font = 'bold 13px "Helvetica Neue",Arial';
  ctx.fillText('q', X(qx)+9, Y(qy)-8);

  /* 手柄 */
  const hx = px + Bx[0]*1.3, hy = py + Bx[1]*1.3;
  drawHandle(ctx, X(hx),Y(hy), 9, '#E30613', S.drag === 'rot');
  if(opts.movableP) drawHandle(ctx, X(px),Y(py), 9, '#111', S.drag === 'p');

  return {R, px, py, qx, qy};
}

/* ================= 交互 ================= */
function bindDrag(cv, S, opts){
  const toWorld = e => {
    const r = cv.getBoundingClientRect();
    const w = cv.clientWidth, h = cv.clientHeight;
    const ox = opts.movableP ? w*0.40 : w*0.5, oy = h*0.55;
    return [ (e.clientX-r.left-ox)/U, (oy-(e.clientY-r.top))/U ];
  };
  cv.addEventListener('pointerdown', e=>{
    if(animating(S)) return;
    const [mx,my] = toWorld(e);
    const c = Math.cos(S.theta), s = Math.sin(S.theta);
    const hx = S.p[0]+c*1.3, hy = S.p[1]+s*1.3;
    const dRot = Math.hypot(mx-hx, my-hy);
    const dP   = opts.movableP ? Math.hypot(mx-S.p[0], my-S.p[1]) : 99;
    const qx = S.p[0]+c*S.q[0]-s*S.q[1], qy = S.p[1]+s*S.q[0]+c*S.q[1];
    const dQ = Math.hypot(mx-qx, my-qy);
    if(dRot < 0.42 && dRot <= dP) S.drag = 'rot';
    else if(opts.movableP && dP < 0.42 && dP < dRot) S.drag = 'p';
    else if(dQ < 0.3) S.drag = 'q';
    if(S.drag){ cv.setPointerCapture(e.pointerId); e.preventDefault(); }
  });
  cv.addEventListener('pointermove', e=>{
    if(animating(S)) return;
    if(!S.drag){ hover(cv,S,toWorld(e),opts); return; }
    const [mx,my] = toWorld(e);
    if(S.drag === 'rot'){
      S.theta = Math.atan2(my-S.p[1], mx-S.p[0]);
    }else if(S.drag === 'p'){
      S.p = [clamp(mx,-3.6,4.8), clamp(my,-2.6,2.6)];
    }else if(S.drag === 'q'){
      const c = Math.cos(S.theta), s = Math.sin(S.theta);
      const dx = mx-S.p[0], dy = my-S.p[1];
      S.q = [ c*dx+s*dy, -s*dx+c*dy ].map(v => clamp(v,-2.2,2.2));
    }
    render();
  });
  const up = ()=>{ S.drag = null; };
  cv.addEventListener('pointerup',up); cv.addEventListener('pointercancel',up);
}
function hover(cv, S, m, opts){
  const hx = S.p[0]+Math.cos(S.theta)*1.3, hy = S.p[1]+Math.sin(S.theta)*1.3;
  const near = Math.hypot(m[0]-hx, m[1]-hy) < 0.42
            || (opts.movableP && Math.hypot(m[0]-S.p[0], m[1]-S.p[1]) < 0.42);
  cv.style.cursor = near ? 'grab' : 'crosshair';
}

/* ================= 面板 1：纯旋转 ================= */
function renderPanel1(st){
  const {R} = st;
  const c = R[0][0], s = R[1][0];
  document.getElementById('thetaOut').textContent = 'θ = ' + deg(Math.atan2(s,c)).toFixed(1) + '°';
  setMath(document.getElementById('Rmat'), numMat([[c,-s],[s,c]], [C1,C2]));
  document.getElementById('qOut').textContent =
    `qᴮ = ( ${fmtP(S1.q[0])}, ${fmtP(S1.q[1])} )`;

  const [q1,q2] = S1.q;
  const qx = R[0][0]*q1 + R[0][1]*q2;
  const qy = R[1][0]*q1 + R[1][1]*q2;

  document.getElementById('pipe1').innerHTML =
   `<div class="row"><span class="cm">代入</span>${K(
      `q^{A} = R_{AB}\\,q^{B} = ` + numMat(R,[C1,C2]) + `\\,` + numVec([q1,q2]))}</div>` +
   `<div class="row"><span class="cm">第 1 行</span>${K(
      `x^{A} = ${fmtP(R[0][0])}\\times${fmtP(q1)} ${sgn(R[0][1])} ${fmtP(Math.abs(R[0][1]))}\\times${fmtP(Math.abs(q2))}
       = ${fmtP(R[0][0]*q1)} ${sgn(R[0][1]*q2)} ${fmtP(Math.abs(R[0][1]*q2))}
       = \\color{${C1}}{${fmtP(qx)}}`)}</div>` +
   `<div class="row"><span class="cm">第 2 行</span>${K(
      `y^{A} = ${fmtP(R[1][0])}\\times${fmtP(q1)} ${sgn(R[1][1])} ${fmtP(Math.abs(R[1][1]))}\\times${fmtP(Math.abs(q2))}
       = ${fmtP(R[1][0]*q1)} ${sgn(R[1][1]*q2)} ${fmtP(Math.abs(R[1][1]*q2))}
       = \\color{${C1}}{${fmtP(qy)}}`)}</div>` +
   `<div class="row"><span class="cm">结果</span>${K(
      `q^{A} = ` + numVec([qx,qy], [C1]))}</div>` +
   `<div class="row"><span class="cm">校验</span>${K(
      `R^{\\mathsf{T}}R = ` + numMat([[c*c+s*s, c*(-s)+s*c],[(-s)*c+c*s, s*s+c*c]], [C1,C2]) +
      `\\;=\\;I`)}</div>`;
}

/* ================= 面板 2：齐次变换 ================= */
function renderPanel2(st){
  const {R} = st;
  const p = S2.p;
  document.getElementById('gOut').textContent = `p = ( ${fmtP(p[0])}, ${fmtP(p[1])} )`;
  setMath(document.getElementById('Gmat'), numMat([
    [R[0][0], R[0][1], p[0]],
    [R[1][0], R[1][1], p[1]],
    [0, 0, 1]
  ], [C1,C2,C3]));

  const iR = [[R[0][0], R[1][0]], [R[0][1], R[1][1]]];
  const ipx = -(iR[0][0]*p[0] + iR[0][1]*p[1]);
  const ipy = -(iR[1][0]*p[0] + iR[1][1]*p[1]);
  setMath(document.getElementById('Ginv'), numMat([
    [iR[0][0], iR[0][1], ipx],
    [iR[1][0], iR[1][1], ipy],
    [0, 0, 1]
  ], [C1,C2,C3]));

  document.getElementById('pipe2').innerHTML =
   `<div class="row"><span class="cm">位置块</span>${K(
      `-R^{\\mathsf{T}}p = -` + numMat(iR,[C1,C2]) + `\\,` + numVec(p) +
      ` = -` + numVec([iR[0][0]*p[0]+iR[0][1]*p[1], iR[1][0]*p[0]+iR[1][1]*p[1]]) +
      ` = \\color{${C1}}{` + numVec([ipx,ipy]) + `}`)}</div>` +
   `<div class="row"><span class="cm">验证</span>${K(
      `g_{AB}^{-1}g_{AB} = ` + numMat([[1,0,0],[0,1,0],[0,0,1]]) + `\\;=\\;I`)}</div>`;
}

let st1 = null, st2 = null;
function render(){
  st1 = drawScene(cv1, ctx1, S1, {movableP:false});
  st2 = drawScene(cv2, ctx2, S2, {movableP:true});
  renderPanels();
}
/* 画布每帧重画；数字面板 ~12Hz 足够，拖动时不被 KaTeX 排版拖慢 */
const renderPanels = throttle(() => { renderPanel1(st1); renderPanel2(st2); }, 80);

/* ================= 演示动画与按钮 ================= */
document.getElementById('anim1').onclick = () => {
  S1.ghost = true;
  tween(S1, 1300, k => {
    S1.theta = (Math.PI/3) * k;
    render();
  }, () => { S1.ghost = false; render(); });
};
document.getElementById('snap90').onclick  = () => snapTo(S1, Math.PI/2, render);
document.getElementById('snap180').onclick = () => snapTo(S1, Math.PI, render);
document.getElementById('reset1').onclick   = () => { S1.ghost = false; snapTo(S1, Math.PI/3, render); };
document.getElementById('anim2').onclick = () => {
  S2.ghost = true;
  tween(S2, 1300, k => {
    S2.theta = (Math.PI/4) * k;
    S2.p = [2.2*k, 1.2*k];
    render();
  }, () => { S2.ghost = false; render(); });
};
document.getElementById('reset2').onclick = () => {
  S2.ghost = false;
  tween(S2, 700, k => { S2.theta = (Math.PI/4)*k; S2.p = [2.2*k, 1.2*k]; render(); });
};

bindDrag(cv1, S1, {movableP:false});
bindDrag(cv2, S2, {movableP:true});
window.addEventListener('resize', render);

/* ================= 小测 ================= */
initQuiz({
  answers: { 1:1, 2:1, 3:0 },
  why: {
    1: 'θ = 90° 时 \\(\\cos\\theta = 0\\)、\\(\\sin\\theta = 1\\)，\\(x_B\\) 转到 \\(y_A\\) 方向，第 1 列就是 \\((0,1)\\)。列怎么来的见 02.1 第 1 小节，面板怎么用见第 7 小节。',
    2: '\\(q^{A} = R\\,q^{B} + p\\)：\\(R\\) 把 \\((1,0)\\) 转成 \\((-1,0)\\)，再加平移 \\((2,0)\\)，得 \\((1,0)\\)。同一组数 02.2 第 7 小节走过一遍。',
    3: '姿态块转置 \\(R^{\\mathsf{T}}\\)，位置块 \\(-R^{\\mathsf{T}}p\\)。块方程的解法在 02.2 第 6 小节，右下面板同步验证。'
  }
});

render();
renderInlineMath(document.body);
