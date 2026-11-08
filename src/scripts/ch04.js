/* 04 节页面逻辑（ESM）：螺旋轴 · 旋量 · 齐次变换指数
   画布：轴测投影（与 03.2 同视角），三层叠加——转轴（细黑）、螺旋线（红）、纯转动对照（浅灰虚线）
   面板：旋量 → 指数 4×4 → 退化分支，纵向一条链 */
import {
  fmtP, deg, clamp, animating, arrow, drawHandle, fitCanvas, tween,
  throttle, K, setMath, numMat, renderInlineMath, initQuiz,
  C1, C2, C3, eye3, matMul, madd, msc, msub, transpose, hat, rodrigues, maxAbsDiff, createView,
} from "./core.js";

/* ================= 向量工具 ================= */
const dot = (a,b) => a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
const cross = (a,b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
const addv = (a,b) => [a[0]+b[0], a[1]+b[1], a[2]+b[2]];
const subv = (a,b) => [a[0]-b[0], a[1]-b[1], a[2]-b[2]];
const scv = (a,s) => [a[0]*s, a[1]*s, a[2]*s];
const normv = a => { const n = Math.hypot(...a) || 1; return a.map(x => x/n); };
const applyR = (R, v) => [
  R[0][0]*v[0] + R[0][1]*v[1] + R[0][2]*v[2],
  R[1][0]*v[0] + R[1][1]*v[1] + R[1][2]*v[2],
  R[2][0]*v[0] + R[2][1]*v[1] + R[2][2]*v[2],
];

/* ================= 状态 ================= */
const S = {
  theta: Math.PI/3,
  h: 0.35,                                   // 螺距（每弧度沿轴前进量）
  r: [2, 0, 0],                              // 轴上一点（可拖）
  omega: [0, 0, 1],                          // 转轴方向（可拖）
  radius: 0.9,                               // 刚体上被跟踪点到轴的距离
  axial: 0.55,                               // 该点沿轴方向相对 r 的偏移
  mode: 'screw',                             // 'screw' | 'rot' | 'trans'
  drag: null, dragX0: 0, dragT0: 0, dragPlane: null,
};
let LOCK = null;                             // 拖轴手柄时冻结取景，避免自适应缩放抖动
const HIT = { theta: null, r: null, omega: null, proj: null };

const axisDir = () => normv(S.omega);

/* 刚体上被跟踪的点：从 r 出发，沿垂直于轴的半径方向走 radius，再沿轴偏移 axial */
function bodyBase(){
  const om = axisDir();
  const ref = Math.abs(om[0]) > 0.9 ? [0,1,0] : [1,0,0];
  const perp = normv(subv(ref, scv(om, dot(ref, om))));
  return addv(addv(S.r, scv(perp, S.radius)), scv(om, S.axial));
}

/* 当前模式下的 ω 与 h；纯平移时 ω=0，v 直接取单位方向 */
function params(){
  if(S.mode === 'trans') return { omega: [0,0,0], h: 0, v: [0,0,1], axis: null };
  const omega = axisDir();
  const h = S.mode === 'rot' ? 0 : S.h;
  const v = subv(scv(omega, h), cross(omega, S.r));   // v = hω − ω×r
  return { omega, h, v, axis: S.r };
}

/* 指数：ω=0 分支与一般分支 */
function expXi(omega, v, theta){
  const w = Math.hypot(...omega);
  if(w < 1e-9){
    return [[1,0,0,v[0]*theta],[0,1,0,v[1]*theta],[0,0,1,v[2]*theta],[0,0,0,1]];
  }
  const om = omega.map(x => x/w);
  const R = rodrigues(om, theta);
  const Wv = cross(om, v);
  const p1 = applyR(msub(eye3(), R), Wv);
  const p2 = scv(om, dot(om, v) * theta);
  const p = addv(p1, p2);
  return [[R[0][0],R[0][1],R[0][2],p[0]],
          [R[1][0],R[1][1],R[1][2],p[1]],
          [R[2][0],R[2][1],R[2][2],p[2]],
          [0,0,0,1]];
}

/* ================= 画布（轴测投影，与 03.2 同视角） ================= */
const cv1 = document.getElementById('cv1'), ctx1 = cv1.getContext('2d');
const US = 76;                                // 像素/单位（缩放后整体落在画布内）
const view1 = createView(cv1, () => drawScene(), { yaw: 0.61, pitch: 0.42, rotate: true });

/* 通用轴测投影：view 提供平移与视角，us/ax/ay 让每块画布自定比例与原点 */
function project(p, w, h, view = view1, us = US, ax = 0.45, ay = 0.48){
  const cy = Math.cos(view.yaw), sy = Math.sin(view.yaw);
  const cp = Math.cos(view.pitch), sp = Math.sin(view.pitch);
  const x1 = p[0]*cy + p[1]*sy;
  const y1 = -p[0]*sy + p[1]*cy;
  const y2 = y1*cp - p[2]*sp;
  return [ w*ax + x1*us + view.dx, h*ay - y2*us + view.dy ];
}
let AY = 0.52;                     // 纵向原点：随高度自适应，避免内容顶出画布
const proj = (p, w, h) => project(p, w, h, view1, US, 0.24, AY);
function arrowP(ctx, a, b, color, width, w, h){
  const A = proj(a,w,h), B = proj(b,w,h);
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = width;
  ctx.beginPath(); ctx.moveTo(A[0],A[1]); ctx.lineTo(B[0],B[1]); ctx.stroke();
  const ang = Math.atan2(B[1]-A[1], B[0]-A[0]), L = 8;
  ctx.beginPath(); ctx.moveTo(B[0],B[1]);
  ctx.lineTo(B[0]-L*Math.cos(ang-0.42), B[1]-L*Math.sin(ang-0.42));
  ctx.lineTo(B[0]-L*Math.cos(ang+0.42), B[1]-L*Math.sin(ang+0.42));
  ctx.closePath(); ctx.fill();
}

/* 刚体轮廓（L 形），挂在 q0 上 */
const BODY = [[0,0,0],[0.85,0,0],[0.85,0.75,0],[0.5,0.75,0],[0.5,0.4,0],[0,0.4,0]];

function posePoint(q0, omega, h, theta, r){
  /* g(θ) 作用于 q0：绕轴转 θ，再沿轴走 hθ */
  if(Math.hypot(...omega) < 1e-9){
    return addv(q0, scv([0,0,1], theta));      // 纯平移：v 即单位方向
  }
  const R = rodrigues(normv(omega), theta);
  const rel = subv(q0, r);
  return addv(addv(r, applyR(R, rel)), scv(normv(omega), h*theta));
}

function drawScene(){
  const {w,h,dpr} = fitCanvas(cv1);
  ctx1.setTransform(dpr,0,0,dpr,0,0);
  ctx1.clearRect(0,0,w,h);
  const {omega, h: hs, v, axis} = params();
  const th = S.theta;
  const q0 = bodyBase();
  const Rcur = Math.hypot(...omega) < 1e-9 ? eye3() : rodrigues(normv(omega), th);

  /* 先把这一帧要画的点全收齐，再按包围盒自适应取景：任何 θ / 模式都不越界 */
  const pts = [[0,0,0],[1.5,0,0],[0,1.5,0],[0,0,1.5],[1.62,0,0],[0,1.62,0],[0,0,1.62]];
  if(axis) pts.push(addv(axis, scv(omega, 1.9)), addv(axis, scv(omega, -1.2)), axis);
  for(let i=0;i<=24;i++) pts.push(posePoint(q0, omega, 0, Math.PI*2*i/24, axis || S.r));
  for(let i=0;i<=24;i++) pts.push(posePoint(q0, omega, hs, th*i/24, axis || S.r));
  const qNow = posePoint(q0, omega, hs, th, axis || S.r);
  BODY.forEach(pt => pts.push(addv(qNow, applyR(Rcur, pt))));

  /* 旋转后的单位空间坐标（不含缩放与平移），据此定比例与中心 */
  const cy = Math.cos(view1.yaw), sy = Math.sin(view1.yaw);
  const cp = Math.cos(view1.pitch), sp = Math.sin(view1.pitch);
  const unit = p => {
    const x1 = p[0]*cy + p[1]*sy;
    const y1 = -p[0]*sy + p[1]*cy;
    return [x1, y1*cp - p[2]*sp];
  };
  let ux0 = 1e9, ux1 = -1e9, uy0 = 1e9, uy1 = -1e9;
  pts.forEach(p => { const u = unit(p);
    if(u[0] < ux0) ux0 = u[0]; if(u[0] > ux1) ux1 = u[0];
    if(u[1] < uy0) uy0 = u[1]; if(u[1] > uy1) uy1 = u[1]; });
  const spanX = Math.max(ux1 - ux0, 1e-3), spanY = Math.max(uy1 - uy0, 1e-3);
  const padX = 104, padY = 78;                       /* 左留读数，上下留标签 */
  const fitScale = clamp(Math.min((w - padX)/spanX, (h - padY)/spanY), 16, 92);
  const fitOx = padX + (w - padX)/2 - (ux0 + ux1)/2*fitScale;
  const fitOy = (h - padY)/2 + padY*0.55 + (uy0 + uy1)/2*fitScale;
  /* 拖轴手柄期间冻结取景，否则包围盒每帧变化会让手柄追着缩放跑 */
  const scale = LOCK ? LOCK.scale : fitScale;
  const ox = LOCK ? LOCK.ox : fitOx;
  const oy = LOCK ? LOCK.oy : fitOy;
  const P = p => { const u = unit(p); return [ox + u[0]*scale + view1.dx, oy - u[1]*scale + view1.dy]; };
  HIT.proj = { scale, ox, oy, cy, sy, cp, sp, dx: view1.dx, dy: view1.dy };
  const arrowAt = (a, b, color, width) => {
    const A0 = P(a), B0 = P(b);
    ctx1.strokeStyle = color; ctx1.fillStyle = color; ctx1.lineWidth = width;
    ctx1.beginPath(); ctx1.moveTo(A0[0], A0[1]); ctx1.lineTo(B0[0], B0[1]); ctx1.stroke();
    const ang = Math.atan2(B0[1] - A0[1], B0[0] - A0[0]), L = 8;
    ctx1.beginPath(); ctx1.moveTo(B0[0], B0[1]);
    ctx1.lineTo(B0[0] - L*Math.cos(ang - 0.42), B0[1] - L*Math.sin(ang - 0.42));
    ctx1.lineTo(B0[0] - L*Math.cos(ang + 0.42), B0[1] - L*Math.sin(ang + 0.42));
    ctx1.closePath(); ctx1.fill();
  };

  /* 空间系 A */
  arrowAt([0,0,0], [1.5,0,0], '#111', 1.1);
  arrowAt([0,0,0], [0,1.5,0], '#111', 1.1);
  arrowAt([0,0,0], [0,0,1.5], '#111', 1.1);
  ctx1.fillStyle = '#111'; ctx1.font = '11px "Helvetica Neue",Arial';
  let p = P([1.62,0,0]); ctx1.fillText('xᴀ', p[0], p[1]+4);
  p = P([0,1.62,0]);     ctx1.fillText('yᴀ', p[0], p[1]+4);
  p = P([0,0,1.62]);     ctx1.fillText('zᴀ', p[0], p[1]+4);

  /* 转轴（细黑）+ 两个可拖手柄：r = 轴位置，ω = 轴方向 */
  if(axis){
    const a1 = P(addv(axis, scv(omega, 1.9)));
    const a2 = P(addv(axis, scv(omega, -1.2)));
    ctx1.strokeStyle = '#111'; ctx1.lineWidth = 1.4;
    ctx1.beginPath(); ctx1.moveTo(a2[0],a2[1]); ctx1.lineTo(a1[0],a1[1]); ctx1.stroke();
    const pr = P(axis);
    drawHandle(ctx1, pr[0], pr[1], 6, '#111', S.drag === 'r');
    drawHandle(ctx1, a1[0], a1[1], 6, '#111', S.drag === 'omega');
    ctx1.fillStyle = '#111'; ctx1.font = '11px "Helvetica Neue",Arial';
    ctx1.fillText('ω', a1[0]+14, a1[1]+4);
    ctx1.fillStyle = '#777'; ctx1.fillText('r', pr[0]+14, pr[1]+4);
    HIT.r = [pr[0], pr[1]]; HIT.omega = [a1[0], a1[1]];
  }else{
    HIT.r = HIT.omega = null;
  }

  /* 纯转动对照（浅灰虚线，h=0 的轨迹） */
  ctx1.strokeStyle = '#bdbdbd'; ctx1.lineWidth = 1.25; ctx1.setLineDash([5,5]);
  ctx1.beginPath();
  for(let i=0;i<=48;i++){
    const q = posePoint(q0, omega, 0, Math.PI*2*i/48, axis || S.r);
    const s = P(q);
    i ? ctx1.lineTo(s[0],s[1]) : ctx1.moveTo(s[0],s[1]);
  }
  ctx1.stroke(); ctx1.setLineDash([]);

  /* 螺旋线（红） */
  ctx1.strokeStyle = '#E30613'; ctx1.lineWidth = 1.8;
  ctx1.beginPath();
  for(let i=0;i<=48;i++){
    const q = posePoint(q0, omega, hs, th*i/48, axis || S.r);
    const s = P(q);
    i ? ctx1.lineTo(s[0],s[1]) : ctx1.moveTo(s[0],s[1]);
  }
  ctx1.stroke();

  /* 刚体轮廓（当前位形） */
  ctx1.strokeStyle = '#111'; ctx1.lineWidth = 1.8;
  ctx1.beginPath();
  BODY.forEach((pt,i)=>{
    const s = P(addv(qNow, applyR(Rcur, pt)));
    i ? ctx1.lineTo(s[0],s[1]) : ctx1.moveTo(s[0],s[1]);
  });
  ctx1.closePath(); ctx1.stroke();

  /* 手柄：当前位形上的第一点，拖动扫 θ */
  const sH = P(qNow);
  drawHandle(ctx1, sH[0], sH[1], 9, '#E30613', S.drag === 'theta');
  HIT.theta = [sH[0], sH[1]];

  /* 读数 */
  ctx1.fillStyle = '#111'; ctx1.font = 'bold 13px "Helvetica Neue",Arial';
  ctx1.fillText('θ = ' + deg(th).toFixed(1) + '°', 16, 26);
  ctx1.font = '11px "Helvetica Neue",Arial'; ctx1.fillStyle = '#8a8a8a';
  ctx1.fillText('拖红点扫 θ　·　拖 r / ω 改轴　·　Ctrl+拖 = 平移　·　右键拖 = 转视角', 16, 44);
}

/* 屏幕坐标反投影：轴测视图下，一条屏幕射线 = 基础点 + t·视深方向 */
function screenRay(sx, sy, pr){
  const Xs = (sx - pr.ox - pr.dx)/pr.scale;
  const Ys = -(sy - pr.oy - pr.dy)/pr.scale;
  const base = [Xs*pr.cy - Ys*pr.sy*pr.cp, Xs*pr.sy + Ys*pr.cy*pr.cp, -Ys*pr.sp];
  const n = [-pr.sy*pr.sp, pr.cy*pr.sp, pr.cp];
  return {base, n};
}
/* 射線与平面交点（拖 r：平面法向就是轴方向） */
function rayPlane(sx, sy, pr, p0, nrm){
  const {base, n} = screenRay(sx, sy, pr);
  const den = dot(n, nrm);
  if(Math.abs(den) < 1e-5) return null;
  return addv(base, scv(n, dot(subv(p0, base), nrm)/den));
}
/* 射線与球面交点（拖 ω：轴端保持在半径 L 的球面上），取靠近当前方向的那个解 */
function raySphereDir(sx, sy, pr, center, radius, keep){
  const {base, n} = screenRay(sx, sy, pr);
  const d = subv(base, center);
  const b = dot(n, d), c = dot(d, d) - radius*radius;
  const disc = b*b - c;
  let p;
  if(disc >= 0){
    const root = Math.sqrt(disc);
    const p1 = addv(base, scv(n, -b - root));
    const p2 = addv(base, scv(n, -b + root));
    const d1 = normv(subv(p1, center)), d2 = normv(subv(p2, center));
    p = dot(d1, keep) >= dot(d2, keep) ? p1 : p2;
  }else{
    p = addv(base, scv(n, -b));            // 射线错过球面：取最近点
  }
  const dir = subv(p, center);
  const len = Math.hypot(...dir);
  return len > 1e-6 ? dir.map(x => x/len) : keep.slice();
}

function bindDrag(){
  const localPos = e => {
    const rc = cv1.getBoundingClientRect();
    return [e.clientX - rc.left, e.clientY - rc.top];
  };
  const near = (pt, x, y) => pt && Math.hypot(x - pt[0], y - pt[1]) <= 16;

  cv1.addEventListener('pointerdown', e=>{
    if(animating(S) || e.button !== 0) return;
    const [x, y] = localPos(e);
    let kind = 'theta';
    if(near(HIT.r, x, y)) kind = 'r';
    else if(near(HIT.omega, x, y)) kind = 'omega';

    S.drag = kind; S.dragX0 = e.clientX; S.dragT0 = S.theta;
    LOCK = (kind === 'r' || kind === 'omega') && HIT.proj ? {...HIT.proj} : null;
    S.dragPlane = kind === 'r' ? { p: S.r.slice(), n: axisDir() } : null;
    try { cv1.setPointerCapture(e.pointerId); } catch(_) {} e.preventDefault();
    drawScene();
  });
  cv1.addEventListener('pointermove', e=>{
    if(!S.drag) return;
    if(S.drag === 'theta'){
      S.theta = S.dragT0 + (e.clientX - S.dragX0) * 0.012;
    }else{
      const [x, y] = localPos(e);
      if(S.drag === 'r' && LOCK && S.dragPlane){
        const q = rayPlane(x, y, LOCK, S.dragPlane.p, S.dragPlane.n);
        if(q) S.r = [clamp(q[0], -2.4, 2.4), clamp(q[1], -2.4, 2.4), clamp(q[2], -1.2, 2.4)];
      }else if(S.drag === 'omega' && LOCK){
        S.omega = raySphereDir(x, y, LOCK, S.r, 1.9, axisDir());
      }
    }
    render(); renderPanels();
  });
  const up = ()=>{
    if(!S.drag) return;
    S.drag = null; S.dragPlane = null; LOCK = null;
    drawScene(); renderPanels();
  };
  cv1.addEventListener('pointerup', up); cv1.addEventListener('pointercancel', up);
}

/* ================= 面板 ================= */
function renderPanel(){
  const {omega, h, v, axis} = params();
  const th = S.theta;
  const g = expXi(omega, v, th);

  document.getElementById('xiOut').textContent = 'θ = ' + deg(th).toFixed(1) + '°';

  /* 旋量：上三行 v（深灰）、下三行 ω（红） */
  const xiTex =
    `\\xi = \\begin{bmatrix}` +
    [0,1,2].map(i => `\\color{${C2}}{${fmtP(v[i])}}`).join(' \\\\ ') + ` \\\\ ` +
    [0,1,2].map(i => `\\color{${C1}}{${fmtP(omega[i])}}`).join(' \\\\ ') +
    `\\end{bmatrix}`;
  setMath(document.getElementById('XiVec'), xiTex);

  const d = h*th;
  document.getElementById('screwNote').innerHTML =
    `螺距 <b>h = ${h.toFixed(2)}</b>　·　沿轴位移 <b>d = hθ = ${d.toFixed(2)}</b>　·　` +
    (S.mode === 'trans' ? '<b>ω = 0</b>：没有转轴，v 就是平移方向'
      : (h === 0 ? '<b>h = 0</b>：纯转动，轴仍不过原点（v ≠ 0）'
                 : '螺旋：转的同时沿轴前进'));

  document.getElementById('expOut').textContent = 'g live';

  /* 结构式：hat xi 的分块 */
  setMath(document.getElementById('ExpForm'),
    `\\hat\\xi = \\begin{bmatrix} \\hat\\omega & v \\\\ 0 & 0 \\end{bmatrix}`);

  /* 4×4 数值：前三列上色，第四列平移 */
  setMath(document.getElementById('Exp4'),
    `e^{\\hat\\xi\\theta} = ` + numMat(g, [C1, C2, C3, null]));

  /* 退化分支：ω=0 时的 [I, vθ; 0 1] */
  const deg4 = [[1,0,0,v[0]*th],[0,1,0,v[1]*th],[0,0,1,v[2]*th],[0,0,0,1]];
  document.getElementById('degenOut').textContent = 'ω = 0 分支';
  setMath(document.getElementById('Degen4'),
    `e^{\\hat\\xi\\theta}\\big|_{\\omega=0} = ` + numMat(deg4, [C1, C2, C3, null]));
}

/* ================= 渲染节奏 ================= */
function render(){ drawScene(); }
const renderPanels = throttle(() => { renderPanel(); }, 80);

/* ================= 滑块：螺距 h 与转动半径 ρ ================= */
const h1 = document.getElementById('h1'), h1v = document.getElementById('h1v');
const r1 = document.getElementById('r1'), r1v = document.getElementById('r1v');
function showH(v){
  if(h1) h1.value = v;
  if(h1v) h1v.textContent = v.toFixed(2);
}
function showRadius(v){
  if(r1) r1.value = v;
  if(r1v) r1v.textContent = v.toFixed(2);
}
function syncSliders(){ showH(S.h); showRadius(S.radius); }
if(h1) h1.oninput = () => {
  S.h = +h1.value; S.mode = 'screw';
  showH(S.h);
  render(); renderPanels();
};
if(r1) r1.oninput = () => {
  S.radius = +r1.value;
  showRadius(S.radius);
  render(); renderPanels();
};
syncSliders();

/* ================= 按钮 ================= */
function tweenTheta(to, done){
  const from = S.theta;
  tween(S, 700, k => { S.theta = from + (to - from)*k; render(); }, done);
}
document.getElementById('anim1').onclick = () => {
  S.theta = 0; render();
  tweenTheta(Math.PI/3, () => renderPanels());
};
document.getElementById('snap90').onclick = () => tweenTheta(Math.PI/2, () => renderPanels());
document.getElementById('toRot').onclick = () => {
  S.mode = 'rot'; showH(0); render(); renderPanels();
};
document.getElementById('toTrans').onclick = () => {
  S.mode = 'trans'; showH(0); render(); renderPanels();
};
document.getElementById('reset1').onclick = () => {
  S.mode = 'screw'; S.h = 0.35; S.theta = Math.PI/3;
  S.r = [2, 0, 0]; S.omega = [0, 0, 1]; S.radius = 0.9;
  syncSliders();
  render(); renderPanels();
};

bindDrag();
window.addEventListener('resize', render);

/* ================= 小测（题面已在正文里） ================= */
initQuiz({
  answers: { 1:0, 2:0, 3:1 },
  why: {
    1: '代 \\(v = h\\omega - \\omega\\times r\\)：\\(h=0\\) 时只剩 \\(v=-\\omega\\times r = -(0,2,0)=(0,-2,0)\\)。等价地，在 \\(p=0\\) 处直接算圆周速度 \\(\\omega\\times(p-r)\\)，结果相同。见 04.1 第 4 小节。',
    2: '\\(\\omega=0\\) 走退化分支：\\(e^{\\hat\\xi\\theta} = \\begin{bmatrix} I & v\\theta \\\\ 0 & 1 \\end{bmatrix}\\)，平移列是 \\(v\\theta = (0,0,3)\\)。见 04.2 第 4 小节。',
    3: '\\(h=\\omega^{\\mathsf{T}}v=0\\) 说明 \\(v\\) 没有沿轴分量，只剩 \\(-\\omega\\times r\\)；它非零就意味着 \\(r\\neq0\\)——仍是纯转动，只是轴不过原点。把 \\(v\\) 当轴位置的人会在这里选纯平移。见 04.1 第 5 小节。'
  }
});

render();
renderPanel();
renderInlineMath(document.body);

/* 调试钩子：自动化测试用（与 angle3d 的 __A3 同一约定） */
/* ================= 04.1 螺旋线：圆怎么被拉成螺旋 ================= */
const cvA = document.getElementById('cv4a');
const DEMO_A = {};
if(cvA){
  const ctxA = cvA.getContext('2d');
  const A = { h: 0.35, th: Math.PI, r: [2,0,0], omega: [0,0,1] };
  const QA = [2.9, 0, 0.55];
  const viewA = createView(cvA, () => drawA(), { yaw: 0.61, pitch: 0.42, rotate: true });
  const PA = (p, w, h) => project(subv(p, A.r), w, h, viewA, 80, 0.50, 0.40);

  function tracePath(ctx, w, h, hPitch, tMax, n){
    ctx.beginPath();
    for(let i = 0; i <= n; i++){
      const t = tMax * i / n;
      const q = posePoint(QA, A.omega, hPitch, t, A.r);
      const s = PA(q, w, h);
      i ? ctx.lineTo(s[0], s[1]) : ctx.moveTo(s[0], s[1]);
    }
    ctx.stroke();
  }

  function drawA(){
    const {w, h, dpr} = fitCanvas(cvA);
    ctxA.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctxA.clearRect(0, 0, w, h);

    /* 转轴 */
    const a1 = PA(addv(A.r, scv(A.omega, 2.5)), w, h);
    const a2 = PA(addv(A.r, scv(A.omega, -0.7)), w, h);
    ctxA.strokeStyle = '#111'; ctxA.lineWidth = 1.3;
    ctxA.beginPath(); ctxA.moveTo(a2[0], a2[1]); ctxA.lineTo(a1[0], a1[1]); ctxA.stroke();
    ctxA.fillStyle = '#111'; ctxA.font = '11px "Helvetica Neue",Arial';
    ctxA.fillText('ω', a1[0] + 6, a1[1] - 4);
    const pr = PA(A.r, w, h);
    ctxA.beginPath(); ctxA.arc(pr[0], pr[1], 2.6, 0, 7); ctxA.fill();
    ctxA.fillStyle = '#777'; ctxA.fillText('r', pr[0] - 14, pr[1] + 4);

    /* h = 0：整圆（灰虚线） */
    ctxA.strokeStyle = '#c9c9c9'; ctxA.lineWidth = 1.2; ctxA.setLineDash([4, 4]);
    tracePath(ctxA, w, h, 0, Math.PI * 2, 72);
    ctxA.setLineDash([]);

    /* 当前螺距的螺旋（红） */
    ctxA.strokeStyle = '#E30613'; ctxA.lineWidth = 1.9;
    tracePath(ctxA, w, h, A.h, Math.PI * 2, 120);

    /* 当前 θ 的点，以及它到轴的连线（半径） */
    const qNow = posePoint(QA, A.omega, A.h, A.th, A.r);
    const onAxis = addv(A.r, scv(A.omega, qNow[2] - A.r[2]));
    const sQ = PA(qNow, w, h), sAx = PA(onAxis, w, h);
    ctxA.strokeStyle = '#bbbbbb'; ctxA.lineWidth = 1;
    ctxA.beginPath(); ctxA.moveTo(sQ[0], sQ[1]); ctxA.lineTo(sAx[0], sAx[1]); ctxA.stroke();
    drawHandle(ctxA, sQ[0], sQ[1], 6, '#E30613', false);

    ctxA.fillStyle = '#111'; ctxA.font = 'bold 13px "Helvetica Neue",Arial';
    ctxA.fillText('h = ' + A.h.toFixed(2) + '　·　d = hθ = ' + (A.h * A.th).toFixed(2), 16, 26);
    ctxA.font = '11px "Helvetica Neue",Arial'; ctxA.fillStyle = '#8a8a8a';
    ctxA.fillText('h = 0 时轨迹是圆；h ≠ 0 时每转一圈沿轴升 2πh', 16, 44);
  }

  const hA = document.getElementById('hA'), tA = document.getElementById('tA');
  const hAv = document.getElementById('hAv'), tAv = document.getElementById('tAv');
  const syncA = () => {
    if(hAv) hAv.textContent = A.h.toFixed(2);
    if(tAv) tAv.textContent = Math.round(deg(A.th)) + '°';
    drawA();
  };
  if(hA) hA.oninput = () => { A.h = +hA.value; syncA(); };
  if(tA) tA.oninput = () => { A.th = +tA.value; syncA(); };
  window.addEventListener('resize', drawA);
  syncA();
  DEMO_A.state = A; DEMO_A.draw = drawA; DEMO_A.view = viewA;
}

/* ================= 04.2 指数：转 + 沿轴走 ================= */
const cvB = document.getElementById('cv4b');
const DEMO_B = {};
if(cvB){
  const ctxB = cvB.getContext('2d');
  const B = { th: Math.PI / 2, h: 0.35, r: [2, 0, 0], omega: [0, 0, 1] };
  const QB = [2.9, 0, 0.55];
  const viewB = createView(cvB, () => drawB(), { yaw: 0.61, pitch: 0.42, rotate: true });
  const PB = (p, w, h) => project(subv(p, B.r), w, h, viewB, 84, 0.50, 0.46);

  function arrowB(ctx, a, b, color, width, w, h, dash){
    const A0 = PB(a, w, h), B0 = PB(b, w, h);
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = width;
    ctx.setLineDash(dash || []);
    ctx.beginPath(); ctx.moveTo(A0[0], A0[1]); ctx.lineTo(B0[0], B0[1]); ctx.stroke();
    ctx.setLineDash([]);
    const ang = Math.atan2(B0[1] - A0[1], B0[0] - A0[0]), L = 7;
    ctx.beginPath(); ctx.moveTo(B0[0], B0[1]);
    ctx.lineTo(B0[0] - L * Math.cos(ang - 0.42), B0[1] - L * Math.sin(ang - 0.42));
    ctx.lineTo(B0[0] - L * Math.cos(ang + 0.42), B0[1] - L * Math.sin(ang + 0.42));
    ctx.closePath(); ctx.fill();
  }

  function bodyB(ctx, w, h, q0, R, color, lw){
    ctx.strokeStyle = color; ctx.lineWidth = lw;
    ctx.beginPath();
    BODY.forEach((pt, i) => {
      const wp = addv(q0, applyR(R, pt));
      const s = PB(wp, w, h);
      i ? ctx.lineTo(s[0], s[1]) : ctx.moveTo(s[0], s[1]);
    });
    ctx.closePath(); ctx.stroke();
  }

  function drawB(){
    const {w, h, dpr} = fitCanvas(cvB);
    ctxB.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctxB.clearRect(0, 0, w, h);

    /* 转轴 */
    const a1 = PB(addv(B.r, scv(B.omega, 2.2)), w, h);
    const a2 = PB(addv(B.r, scv(B.omega, -0.7)), w, h);
    ctxB.strokeStyle = '#111'; ctxB.lineWidth = 1.3;
    ctxB.beginPath(); ctxB.moveTo(a2[0], a2[1]); ctxB.lineTo(a1[0], a1[1]); ctxB.stroke();
    ctxB.fillStyle = '#111'; ctxB.font = '11px "Helvetica Neue",Arial';
    ctxB.fillText('ω', a1[0] + 6, a1[1] - 4);

    /* 零位形（灰）+ 当前位形（黑） */
    bodyB(ctxB, w, h, QB, eye3(), '#d6d6d6', 1.4);
    const R = rodrigues(normv(B.omega), B.th);
    const qRot = addv(B.r, applyR(R, subv(QB, B.r)));
    const qNow = addv(qRot, scv(normv(B.omega), B.h * B.th));
    bodyB(ctxB, w, h, qNow, R, '#111', 1.8);

    /* 两段位移：R(q0−r)+r 是“只转”的落点，hωθ 是沿轴那一段 */
    arrowB(ctxB, QB, qRot, '#9a9a9a', 1.2, w, h, [4, 4]);
    arrowB(ctxB, qRot, qNow, '#E30613', 1.8, w, h);

    const sQ = PB(qNow, w, h);
    drawHandle(ctxB, sQ[0], sQ[1], 6, '#E30613', false);

    const d = B.h * B.th;
    ctxB.fillStyle = '#111'; ctxB.font = 'bold 13px "Helvetica Neue",Arial';
    ctxB.fillText('θ = ' + Math.round(deg(B.th)) + '°　·　d = hθ = ' + d.toFixed(2), 16, 26);
    ctxB.font = '11px "Helvetica Neue",Arial'; ctxB.fillStyle = '#8a8a8a';
    ctxB.fillText('灰虚线 = 只转（R 作用）　红箭头 = 沿轴 hωθ', 16, 44);
  }

  const tB = document.getElementById('tB'), tBv = document.getElementById('tBv');
  const syncB = () => {
    if(tBv) tBv.textContent = Math.round(deg(B.th)) + '°';
    drawB();
  };
  if(tB) tB.oninput = () => { B.th = +tB.value; syncB(); };
  window.addEventListener('resize', drawB);
  syncB();
  DEMO_B.state = B; DEMO_B.draw = drawB; DEMO_B.view = viewB;
}

/* 调试钩子（放在文件末尾：DEMO_A/DEMO_B 是 const，提前引用会落进 TDZ） */
window.__C4 = { S, params, expXi, render, renderPanel, view1, HIT, DEMO_A, DEMO_B };
