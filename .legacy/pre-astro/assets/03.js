"use strict";
/* 03 指数坐标与 Rodrigues — 页面逻辑
   S1: 03.1 平面特例 (ω = ẑ) + 幂级数收敛
   S2: 03.2 3D 轴角实验台：正向 Rodrigues + 逆向 (tr → θ → ω) 与 π 陷阱
   公共工具：assets/core.js；公式：KaTeX（见 matTex / numMat / K） */

/* ================= 03.1 场景：ω = ẑ 平面特例 ================= */
const cv1 = document.getElementById('cv1'), ctx1 = cv1.getContext('2d');
const S1 = { theta: Math.PI/3, drag: null };

function drawScene1(){
  const {w,h,dpr} = fitCanvas(cv1);
  ctx1.setTransform(dpr,0,0,dpr,0,0);
  ctx1.clearRect(0,0,w,h);
  const ox = w*0.5, oy = h*0.55;
  const X = x => ox + x*U, Y = y => oy - y*U;

  /* 网格 */
  ctx1.strokeStyle = '#ececea'; ctx1.lineWidth = 1;
  const gx0 = ox % U, gy0 = oy % U;
  ctx1.beginPath();
  for(let i=0; i*U+gx0 < w; i++){ ctx1.moveTo(i*U+gx0, 0); ctx1.lineTo(i*U+gx0, h); }
  for(let j=0; j*U+gy0 < h; j++){ ctx1.moveTo(0, j*U+gy0); ctx1.lineTo(w, j*U+gy0); }
  ctx1.stroke();

  /* 空间系 A */
  ctx1.strokeStyle = '#111'; ctx1.lineWidth = 1.6;
  arrow(ctx1, 18, oy, w-14, oy); arrow(ctx1, ox, h-14, ox, 12);
  ctx1.fillStyle = '#111'; ctx1.font = '12px "Helvetica Neue",Arial';
  ctx1.fillText('xᴀ', w-30, oy-8); ctx1.fillText('yᴀ', ox+8, 22);

  const c = Math.cos(S1.theta), s = Math.sin(S1.theta);

  /* 刚体轮廓（与 02 课同款 L 形） */
  ctx1.strokeStyle = '#111'; ctx1.lineWidth = 1.8;
  const pts = [[0,0],[1.0,0],[1.0,0.9],[0.55,0.9],[0.55,0.45],[0,0.45]];
  ctx1.beginPath();
  pts.forEach((pt,i)=>{
    const wx = c*pt[0] - s*pt[1], wy = s*pt[0] + c*pt[1];
    i ? ctx1.lineTo(X(wx),Y(wy)) : ctx1.moveTo(X(wx),Y(wy));
  });
  ctx1.closePath(); ctx1.stroke();

  /* B 系 */
  ctx1.lineWidth = 2.6;
  ctx1.strokeStyle = '#E30613'; arrow(ctx1, X(0),Y(0), X(c*1.3), Y(s*1.3));
  ctx1.strokeStyle = '#555';    arrow(ctx1, X(0),Y(0), X(-s*1.3), Y(c*1.3));
  ctx1.fillStyle = '#E30613'; ctx1.fillText('xᴃ', X(c*1.45)-4, Y(s*1.45)+4);
  ctx1.fillStyle = '#555';    ctx1.fillText('yᴃ', X(-s*1.45)-4, Y(c*1.45)+4);

  /* ω = ẑ 记号 */
  ctx1.strokeStyle = '#111'; ctx1.lineWidth = 1.4;
  ctx1.beginPath(); ctx1.arc(w-46, 34, 8, 0, 7); ctx1.stroke();
  ctx1.beginPath(); ctx1.arc(w-46, 34, 1.8, 0, 7); ctx1.fillStyle = '#111'; ctx1.fill();
  ctx1.font = '11px "Helvetica Neue",Arial'; ctx1.fillText('ω = ẑ', w-70, 56);

  drawHandle(ctx1, X(c*1.3), Y(s*1.3), 9, '#E30613', S1.drag === 'rot');
}

function bindDrag1(){
  const toAngle = e => {
    const r = cv1.getBoundingClientRect();
    const ox = cv1.clientWidth*0.5, oy = cv1.clientHeight*0.55;
    return Math.atan2(-(e.clientY - r.top - oy), e.clientX - r.left - ox);
  };
  cv1.addEventListener('pointerdown', e=>{
    if(animating(S1)) return;
    S1.drag = 'rot'; cv1.setPointerCapture(e.pointerId);
    S1.theta = toAngle(e); render(); e.preventDefault();
  });
  cv1.addEventListener('pointermove', e=>{
    if(S1.drag !== 'rot') return;
    S1.theta = toAngle(e); render();
  });
  const up = ()=>{ S1.drag = null; };
  cv1.addEventListener('pointerup',up); cv1.addEventListener('pointercancel',up);
}

/* ================= 03.1 面板：级数收敛 + 三项式闭合 ================= */
function renderPanel1(){
  const th = S1.theta, c = Math.cos(th), s = Math.sin(th);
  document.getElementById('thetaOut1').textContent = 'θ = ' + deg(th).toFixed(1) + '°';

  const W = hat([0,0,1]);
  const Wt = msc(W, th);
  const R = rodrigues([0,0,1], th);
  let Sk = eye3(), term = eye3();
  const rows = [];
  for(let k=1; k<=5; k++){
    term = msc(matMul(term, Wt), 1/k);          // (ω̂θ)^k / k!
    Sk = madd(Sk, term);
    const err = maxAbsDiff(Sk, R);
    rows.push({lab:'S' + k, m:Sk, err, ok: err < 5e-3});
  }
  document.getElementById('series').innerHTML =
    rows.map(r =>
      `<div class="serow${r.ok?' ok':''}"><span class="lab">${r.lab}</span>` +
      K(numMat(r.m)) +
      `<span class="err">误差 ${r.err.toExponential(1)}</span></div>`).join('') +
    `<div class="serow final"><span class="lab">R 精确</span>` +
      K(numMat(R)) +
      `<span class="err">Rodrigues 闭合式</span></div>`;

  document.getElementById('detOut').textContent =
    'det = ' + (R[0][0]*R[1][1] - R[0][1]*R[1][0]).toFixed(2);

  document.getElementById('pipe1').innerHTML =
   `<div class="row"><span class="cm">ω̂</span>${K(
      `\\hat{\\omega} = ` + numMat(W) + `\\qquad \\hat{\\omega}^{2} = ` + numMat(matMul(W,W)))}</div>` +
   `<div class="row"><span class="cm">sin θ</span>${K(
      `\\sin\\theta = ${fmtP(s)} \\;\\Rightarrow\\; \\sin\\theta\\,\\hat{\\omega} = ` + numMat(msc(W,s)))}</div>` +
   `<div class="row"><span class="cm">1−cos θ</span>${K(
      `1-\\cos\\theta = ${fmtP(1-c)} \\;\\Rightarrow\\; (1-\\cos\\theta)\\,\\hat{\\omega}^{2} = ` + numMat(msc(matMul(W,W), 1-c)))}</div>` +
   `<div class="row"><span class="cm">相加</span>${K(
      `I + \\sin\\theta\\,\\hat{\\omega} + (1-\\cos\\theta)\\,\\hat{\\omega}^{2} = ` + numMat(R))}</div>` +
   `<div class="row"><span class="cm">对照</span>${K(
      `S_{5} = ` + numMat(rows[4].m) + `\\qquad S_{5} - R:\\; \\max|\\cdot| = ${rows[4].err.toExponential(1)}`)}</div>`;
}

/* ================= 03.2 场景：3D 轴角实验台 ================= */
const cv2 = document.getElementById('cv2'), ctx2 = cv2.getContext('2d');
const AXES = { x:[1,0,0], y:[0,1,0], z:[0,0,1] };
const S2 = { axis:'x', omega:[1,0,0], theta:Math.PI/3, drag:false, dragX0:0, dragT0:0 };

const YAW = 0.61, PITCH = 0.42;                       // 固定轴测视角
const cy0 = Math.cos(YAW), sy0 = Math.sin(YAW), cp0 = Math.cos(PITCH), sp0 = Math.sin(PITCH);
function proj(p, w, h){
  const x1 = p[0]*cy0 + p[1]*sy0;
  const y1 = -p[0]*sy0 + p[1]*cy0;
  const y2 = y1*cp0 - p[2]*sp0;
  return [ w*0.5 + x1*U, h*0.62 - y2*U ];
}
function arrow3(ctx, a, b, color, width, w, h){
  const A = proj(a,w,h), B = proj(b,w,h);
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = width;
  ctx.beginPath(); ctx.moveTo(A[0],A[1]); ctx.lineTo(B[0],B[1]); ctx.stroke();
  const ang = Math.atan2(B[1]-A[1], B[0]-A[0]), L = 8;
  ctx.beginPath(); ctx.moveTo(B[0],B[1]);
  ctx.lineTo(B[0]-L*Math.cos(ang-0.42), B[1]-L*Math.sin(ang-0.42));
  ctx.lineTo(B[0]-L*Math.cos(ang+0.42), B[1]-L*Math.sin(ang+0.42));
  ctx.closePath(); ctx.fill();
}

function drawScene2(){
  const {w,h,dpr} = fitCanvas(cv2);
  ctx2.setTransform(dpr,0,0,dpr,0,0);
  ctx2.clearRect(0,0,w,h);

  /* 空间系 A */
  const O = [0,0,0];
  arrow3(ctx2, O, [1.8,0,0], '#111', 1.4, w, h);
  arrow3(ctx2, O, [0,1.8,0], '#111', 1.4, w, h);
  arrow3(ctx2, O, [0,0,1.8], '#111', 1.4, w, h);
  ctx2.fillStyle = '#111'; ctx2.font = '11px "Helvetica Neue",Arial';
  let p = proj([2.0,0,0],w,h); ctx2.fillText('xᴀ', p[0], p[1]+4);
  p = proj([0,2.0,0],w,h);     ctx2.fillText('yᴀ', p[0], p[1]+4);
  p = proj([0,0,2.0],w,h);     ctx2.fillText('zᴀ', p[0], p[1]+4);

  /* 转轴 ω */
  const om = S2.omega;
  arrow3(ctx2, [-om[0]*0.6, -om[1]*0.6, -om[2]*0.6], [om[0]*1.6, om[1]*1.6, om[2]*1.6], '#E30613', 2.4, w, h);
  p = proj([om[0]*1.75, om[1]*1.75, om[2]*1.75],w,h);
  ctx2.fillStyle = '#E30613'; ctx2.fillText('ω', p[0], p[1]+4);

  /* 旋转后的 B 系与刚体 */
  const R = rodrigues(om, S2.theta);
  const b1 = [R[0][0],R[1][0],R[2][0]], b2 = [R[0][1],R[1][1],R[2][1]], b3 = [R[0][2],R[1][2],R[2][2]];
  arrow3(ctx2, O, [b1[0]*1.2,b1[1]*1.2,b1[2]*1.2], '#E30613', 2.6, w, h);
  arrow3(ctx2, O, [b2[0]*1.2,b2[1]*1.2,b2[2]*1.2], '#555',    2.6, w, h);
  arrow3(ctx2, O, [b3[0]*1.2,b3[1]*1.2,b3[2]*1.2], '#999',    2.6, w, h);
  p = proj([b1[0]*1.35,b1[1]*1.35,b1[2]*1.35],w,h); ctx2.fillStyle = '#E30613'; ctx2.fillText('xᴃ', p[0], p[1]+4);
  p = proj([b2[0]*1.35,b2[1]*1.35,b2[2]*1.35],w,h); ctx2.fillStyle = '#555';    ctx2.fillText('yᴃ', p[0], p[1]+4);
  p = proj([b3[0]*1.35,b3[1]*1.35,b3[2]*1.35],w,h); ctx2.fillStyle = '#999';    ctx2.fillText('zᴃ', p[0], p[1]+4);

  /* 刚体轮廓 */
  const pts = [[0,0,0],[1.0,0,0],[1.0,0.9,0],[0.55,0.9,0],[0.55,0.45,0],[0,0.45,0]];
  ctx2.strokeStyle = '#111'; ctx2.lineWidth = 1.8;
  ctx2.beginPath();
  pts.forEach((pt,i)=>{
    const q = [R[0][0]*pt[0]+R[0][1]*pt[1]+R[0][2]*pt[2],
               R[1][0]*pt[0]+R[1][1]*pt[1]+R[1][2]*pt[2],
               R[2][0]*pt[0]+R[2][1]*pt[1]+R[2][2]*pt[2]];
    const s = proj(q,w,h);
    i ? ctx2.lineTo(s[0],s[1]) : ctx2.moveTo(s[0],s[1]);
  });
  ctx2.closePath(); ctx2.stroke();

  ctx2.fillStyle = '#111'; ctx2.font = 'bold 13px "Helvetica Neue",Arial';
  ctx2.fillText('θ = ' + deg(S2.theta).toFixed(1) + '°', 16, 26);
  ctx2.font = '11px "Helvetica Neue",Arial'; ctx2.fillStyle = '#8a8a8a';
  ctx2.fillText('↔ 拖动扫角', 16, 44);
}

function bindDrag2(){
  cv2.addEventListener('pointerdown', e=>{
    if(animating(S2)) return;
    S2.drag = true; S2.dragX0 = e.clientX; S2.dragT0 = S2.theta;
    cv2.setPointerCapture(e.pointerId); e.preventDefault();
  });
  cv2.addEventListener('pointermove', e=>{
    if(!S2.drag) return;
    S2.theta = S2.dragT0 + (e.clientX - S2.dragX0) * 0.012;
    render();
  });
  const up = ()=>{ S2.drag = false; };
  cv2.addEventListener('pointerup',up); cv2.addEventListener('pointercancel',up);
  cv2.style.cursor = 'ew-resize';
}

function setAxis(name){
  S2.axis = name;
  S2.omega = name === 'rand'
    ? (()=>{ let v; do{ v = [Math.random()*2-1, Math.random()*2-1, Math.random()*2-1]; }
             while(Math.hypot(...v) < 0.3);
             const n = Math.hypot(...v); return v.map(x => x/n); })()
    : [...AXES[name]];
  document.querySelectorAll('.toolbar [id^=ax]').forEach(b => b.classList.remove('on'));
  const btn = document.getElementById({x:'axX', y:'axY', z:'axZ', rand:'axR'}[name]);
  if(btn) btn.classList.add('on');
  render();
}

/* ================= 03.2 面板：正向拆解 + 逆向 tr → θ → ω ================= */
function renderPanel2(){
  const w = S2.omega, th = S2.theta;
  const W = hat(w), W2 = matMul(W,W);
  const R = rodrigues(w, th);
  const s = Math.sin(th), c = Math.cos(th);
  document.getElementById('thetaOut2').textContent =
    'θ = ' + deg(th).toFixed(1) + '° · ω = (' + w.map(v=>v.toFixed(2)).join(', ') + ')';

  setMath(document.getElementById('Rmat2'), numMat(R, [C1,C2,C3]));

  document.getElementById('pipe2a').innerHTML =
   `<div class="row"><span class="cm">ω̂</span>${K(
      `\\hat{\\omega} = ` + numMat(W) + `\\qquad \\hat{\\omega}^{2} = \\omega\\omega^{\\mathsf{T}} - I = ` + numMat(W2))}</div>` +
   `<div class="row"><span class="cm">sin θ</span>${K(
      `\\sin\\theta = ${fmtP(s)} \\;\\Rightarrow\\; \\sin\\theta\\,\\hat{\\omega} = ` + numMat(msc(W,s)))}</div>` +
   `<div class="row"><span class="cm">1−cos θ</span>${K(
      `1-\\cos\\theta = ${fmtP(1-c)} \\;\\Rightarrow\\; (1-\\cos\\theta)\\,\\hat{\\omega}^{2} = ` + numMat(msc(W2,1-c)))}</div>` +
   `<div class="row"><span class="cm">相加</span>${K(
      `R = I + \\sin\\theta\\,\\hat{\\omega} + (1-\\cos\\theta)\\,\\hat{\\omega}^{2} = ` + numMat(R,[C1,C2,C3]))}</div>`;

  /* 逆向 */
  const tr = R[0][0] + R[1][1] + R[2][2];
  const thRec = Math.acos(clamp((tr-1)/2, -1, 1));
  const sRec = Math.sin(thRec);
  const genericOK = Math.abs(sRec) > 0.1;
  document.getElementById('trOut').textContent =
    'tr = ' + fmtP(tr) + ' · 反解 θ = ' + deg(thRec).toFixed(1) + '°';

  const Rt = transpose(R);
  const D = msub(R, Rt);
  let genericRow = `<div class="row${genericOK?'':' dim'}"><span class="cm">通用式</span>`;
  if(genericOK){
    genericRow += K(
      `\\hat{\\omega} = \\frac{R - R^{\\mathsf{T}}}{2\\sin\\theta} = ` + numMat(msc(D, 1/(2*sRec)))) + `</div>`;
  }else{
    genericRow += K(numMat(D)) +
      `<span class="cm warn">⚠ sin θ = ${fmtP(sRec)} → 除零，禁用</span></div>`;
  }
  /* 备用式：挑 R+I 的最大对角元再开方——除以接近 0 的量会把误差放大 */
  const Ssym = msc(madd(R, eye3()), 0.5);
  const diag = [Ssym[0][0], Ssym[1][1], Ssym[2][2]];
  const iMax = diag.indexOf(Math.max(...diag));
  const wRec = [0,0,0];
  wRec[iMax] = Math.sqrt(Math.max(diag[iMax], 0));
  for(let j=0;j<3;j++) if(j !== iMax) wRec[j] = wRec[iMax] > 1e-9 ? Ssym[iMax][j]/wRec[iMax] : 0;
  const [wx, wy, wz] = wRec;
  /* ω 与 −ω 给出同一个 R，符号本身不可辨——核对比 ±ω 两种取法 */
  const errOf = s => Math.max(Math.abs(s*wx-w[0]), Math.abs(s*wy-w[1]), Math.abs(s*wz-w[2]));
  const matchErr = Math.min(errOf(1), errOf(-1));

  document.getElementById('pipe2b').innerHTML =
   `<div class="row"><span class="cm">第一步</span>${K(
      `\\theta = \\arccos\\!\\left(\\frac{\\operatorname{tr}R - 1}{2}\\right) = \\arccos(${fmtP((tr-1)/2)}) = ` +
      `\\color{${C1}}{${deg(thRec).toFixed(1)}^{\\circ}}`)}</div>` +
   genericRow +
   `<div class="row"><span class="cm">备用式 i=${iMax+1}</span>${K(
      `\\frac{R + I}{2} = \\omega\\omega^{\\mathsf{T}} = ` + numMat(Ssym) +
      `\\;\\Rightarrow\\; \\omega = ` + numVec([wx,wy,wz], [C1]))}</div>` +
   `<div class="row"><span class="cm">核对</span>${K(
      `\\max_i\\,|\\omega_i^{\\text{恢复}} - \\omega_i| = ${matchErr.toExponential(1)}`) +
      (matchErr < 1e-6 || !genericOK
        ? '<span class="cm">✓</span>'
        : '<span class="cm">（备用式只在 θ = 180° 精确成立，当前偏差大是预期的）</span>')}</div>`;

  document.getElementById('trapNote').innerHTML = genericOK
    ? `当前 sin θ = ${fmtP(sRec)}，通用式可用。把 θ 拖到 180° 附近看它熄灭、备用式接管。`
    : '<span class="warn">π 陷阱已触发：</span>sin θ ≈ 0，通用式失效。备用式 \\(R + I = 2\\omega\\omega^{\\mathsf{T}}\\) 从对称矩阵读出 ω——考试遇到 θ = π 就走这条。';
  renderInlineMath(document.getElementById('trapNote'));
}

/* ================= 03.1·B 三维实例：任意转动 → 一条轴 + 一个角 ================= */
const cv3 = document.getElementById('cv3'), ctx3 = cv3.getContext('2d');
const P0 = [1, 0, 0];                                    // 参考方向 p₀ = x̂
const DIR0 = norm3([0.78, 0.46, 0.38]);                  // 初始被拖点
const S3 = { dir: [...DIR0], twist: 0, drag: null };

function norm3(v){ const n = Math.hypot(...v) || 1; return v.map(x => x/n); }
function cross3(a, b){ return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]]; }
function dot3(a, b){ return a[0]*b[0] + a[1]*b[1] + a[2]*b[2]; }
function rodVec(axis, th, v){
  const a = norm3(axis), c = Math.cos(th), s = Math.sin(th);
  const axv = cross3(a, v), d = dot3(a, v);
  return [ v[0]*c + axv[0]*s + a[0]*d*(1-c),
           v[1]*c + axv[1]*s + a[1]*d*(1-c),
           v[2]*c + axv[2]*s + a[2]*d*(1-c) ];
}
/* ---- 本场景专用投影：放大到画布尺度 ---- */
const U3 = 118;                                          // 像素/单位（球半径 ≈ 118px）
function proj3(p, w, h){
  const x1 = p[0]*cy0 + p[1]*sy0;
  const y1 = -p[0]*sy0 + p[1]*cy0;
  const y2 = y1*cp0 - p[2]*sp0;
  return [ w*0.5 + x1*U3, h*0.62 - y2*U3 ];
}
function arrowAt(ctx, a, b, color, width, P){
  const A = P(a), B = P(b);
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = width;
  ctx.beginPath(); ctx.moveTo(A[0],A[1]); ctx.lineTo(B[0],B[1]); ctx.stroke();
  const ang = Math.atan2(B[1]-A[1], B[0]-A[0]), L = 8;
  ctx.beginPath(); ctx.moveTo(B[0],B[1]);
  ctx.lineTo(B[0]-L*Math.cos(ang-0.42), B[1]-L*Math.sin(ang-0.42));
  ctx.lineTo(B[0]-L*Math.cos(ang+0.42), B[1]-L*Math.sin(ang+0.42));
  ctx.closePath(); ctx.fill();
}
/* 视图坐标轴的世界向量与视线方向 */
const RW3 = [cy0, sy0, 0];
const UW3 = [-sy0*cp0, cy0*cp0, -sp0];
const VIEWW = norm3(cross3(RW3, UW3));
/* 光标 → 球面方向：射线与单位球求交，圆盘外夹到轮廓 */
function dirFromScreen(sx, sy, w, h){
  let xs = (sx - w*0.5)/U3, ys = (h*0.62 - sy)/U3;
  const rr = Math.hypot(xs, ys);
  let d = 0;
  if(rr > 1){ xs /= rr; ys /= rr; }
  else { d = Math.sqrt(Math.max(0, 1 - rr*rr)); }
  return norm3([ xs*RW3[0] + ys*UW3[0] + d*VIEWW[0],
                 xs*RW3[1] + ys*UW3[1] + d*VIEWW[1],
                 xs*RW3[2] + ys*UW3[2] + d*VIEWW[2] ]);
}

/* p₀ → p̂ 的最小转动 + 绕 p̂ 的自转 φ，合成实际 R；复合轴角按迹与反对称反解 */
function rotInfo(){
  const p1 = S3.dir;
  const c = clamp(dot3(P0, p1), -1, 1);
  const cr = cross3(P0, p1), s = Math.hypot(...cr);
  const theta = Math.atan2(s, c);                       // 最小转动角 [0, π]
  let axis = null;
  if(s > 1e-6) axis = cr.map(x => x/s);
  else if(c < 0){                                       // θ = π：轴不唯一，取一条垂直 p₀ 的
    const t = Math.abs(P0[0]) < 0.9 ? [1,0,0] : [0,1,0];
    axis = norm3(cross3(P0, t));
  }
  const Rmin = axis ? rodrigues(axis, theta) : eye3();
  const R = Math.abs(S3.twist) > 1e-9 ? matMul(rodrigues(p1, S3.twist), Rmin) : Rmin;

  /* 复合转动的轴角：迹定角，(R−Rᵀ)/2sinθ 定轴；(R+I)/2 备用 */
  const tr = R[0][0] + R[1][1] + R[2][2];
  const thetaC = Math.acos(clamp((tr-1)/2, -1, 1));
  const sC = Math.sin(thetaC);
  const D = msub(R, transpose(R));
  let axisC = null;
  if(Math.abs(sC) > 1e-3){
    const v = [D[2][1]/(2*sC), D[0][2]/(2*sC), D[1][0]/(2*sC)];
    const n = Math.hypot(...v);
    if(n > 1e-6) axisC = v.map(x => x/n);
  } else {
    const Ssym = msc(madd(R, eye3()), 0.5);
    const dg = [Ssym[0][0], Ssym[1][1], Ssym[2][2]];
    const iM = dg.indexOf(Math.max(...dg));
    const w = [0,0,0];
    w[iM] = Math.sqrt(Math.max(dg[iM], 0));
    for(let j=0;j<3;j++) if(j !== iM) w[j] = w[iM] > 1e-9 ? Ssym[iM][j]/w[iM] : 0;
    const n = Math.hypot(...w);
    if(n > 1e-6) axisC = w.map(x => x/n);
  }
  return {c, s, theta, axis, R, Rmin, thetaC, sC, axisC, twist: S3.twist};
}

/* 与 p̂ 垂直的一组基（画自转圈用） */
function perpBasis(p){
  const t = Math.abs(p[0]) < 0.9 ? [1,0,0] : [0,1,0];
  const u = norm3(cross3(p, t));
  const v = norm3(cross3(p, u));
  return [u, v];
}

function drawScene3(){
  const {w,h,dpr} = fitCanvas(cv3);
  ctx3.setTransform(dpr,0,0,dpr,0,0);
  ctx3.clearRect(0,0,w,h);
  const {c, s, theta, axis, R, Rmin, thetaC, axisC, twist} = rotInfo();
  const P = p => proj3(p, w, h);
  const o = P([0,0,0]);
  const pEnd = P(S3.dir);

  /* 单位球 */
  ctx3.strokeStyle = '#e6e6e3'; ctx3.lineWidth = 1;
  [ t => [Math.cos(t), Math.sin(t), 0],
    t => [0, Math.cos(t), Math.sin(t)],
    t => [Math.sin(t), 0, Math.cos(t)] ].forEach(f => {
    ctx3.beginPath();
    for(let i=0;i<=72;i++){
      const q = P(f(i/72*2*Math.PI));
      i ? ctx3.lineTo(q[0],q[1]) : ctx3.moveTo(q[0],q[1]);
    }
    ctx3.closePath(); ctx3.stroke();
  });

  /* 空间系 A */
  arrowAt(ctx3, [0,0,0], [1.16,0,0], '#111', 1.2, P);
  arrowAt(ctx3, [0,0,0], [0,1.16,0], '#111', 1.2, P);
  arrowAt(ctx3, [0,0,0], [0,0,1.16], '#111', 1.2, P);
  ctx3.fillStyle = '#111'; ctx3.font = '11px "Helvetica Neue",Arial';
  let q = P([1.28,0,0]); ctx3.fillText('xᴀ', q[0], q[1]+4);
  q = P([0,1.28,0]);     ctx3.fillText('yᴀ', q[0], q[1]+4);
  q = P([0,0,1.28]);     ctx3.fillText('zᴀ', q[0], q[1]+4);

  /* p₀ 参考方向 */
  const a0 = P([P0[0]*1.02, P0[1]*1.02, P0[2]*1.02]);
  ctx3.strokeStyle = '#9a9a9a'; ctx3.lineWidth = 1.4;
  ctx3.setLineDash([5,4]); ctx3.beginPath();
  ctx3.moveTo(o[0],o[1]); ctx3.lineTo(a0[0],a0[1]); ctx3.stroke();
  ctx3.setLineDash([]);
  ctx3.beginPath(); ctx3.arc(a0[0],a0[1],3.2,0,7); ctx3.stroke();
  ctx3.fillStyle = '#777'; ctx3.fillText('p₀', a0[0]+7, a0[1]-4);

  /* 最小转动轨迹（浅灰虚线弧） */
  if(axis){
    ctx3.strokeStyle = '#c9c9c9'; ctx3.lineWidth = 1.3;
    ctx3.setLineDash([4,4]);
    ctx3.beginPath();
    const N = 40;
    for(let i=0;i<=N;i++){
      const v = rodVec(axis, theta*i/N, P0).map(x => x*1.04);
      const qq = P(v);
      i ? ctx3.lineTo(qq[0],qq[1]) : ctx3.moveTo(qq[0],qq[1]);
    }
    ctx3.stroke(); ctx3.setLineDash([]);
    const qm = P(rodVec(axis, theta/2, P0).map(x => x*1.15));
    ctx3.fillStyle = '#9a9a9a'; ctx3.font = '11px "Helvetica Neue",Arial';
    ctx3.fillText('θ₁', qm[0]+4, qm[1]+4);
  }

  /* 复合转动的轴（红线 = 反解结果） */
  if(axisC){
    const A1 = P([axisC[0]*1.5, axisC[1]*1.5, axisC[2]*1.5]);
    const A2 = P([-axisC[0]*0.85, -axisC[1]*0.85, -axisC[2]*0.85]);
    ctx3.strokeStyle = '#E30613'; ctx3.lineWidth = 2.2;
    ctx3.beginPath(); ctx3.moveTo(A2[0],A2[1]); ctx3.lineTo(A1[0],A1[1]); ctx3.stroke();
    const ang = Math.atan2(A1[1]-A2[1], A1[0]-A2[0]), L = 8;
    ctx3.fillStyle = '#E30613';
    ctx3.beginPath(); ctx3.moveTo(A1[0],A1[1]);
    ctx3.lineTo(A1[0]-L*Math.cos(ang-0.42), A1[1]-L*Math.sin(ang-0.42));
    ctx3.lineTo(A1[0]-L*Math.cos(ang+0.42), A1[1]-L*Math.sin(ang+0.42));
    ctx3.closePath(); ctx3.fill();
    ctx3.font = '11px "Helvetica Neue",Arial';
    ctx3.fillText('ω̂', A1[0]+7, A1[1]-4);
  }

  /* 被拖动的点与射线 */
  ctx3.strokeStyle = '#111'; ctx3.lineWidth = 1.6;
  ctx3.beginPath(); ctx3.moveTo(o[0],o[1]); ctx3.lineTo(pEnd[0],pEnd[1]); ctx3.stroke();
  ctx3.fillStyle = '#111';
  ctx3.beginPath(); ctx3.arc(pEnd[0],pEnd[1],6,0,7); ctx3.fill();
  ctx3.fillText('p', pEnd[0]+9, pEnd[1]-6);

  /* 随动三轴 = R 的三列 */
  const b1 = [R[0][0],R[1][0],R[2][0]], b2 = [R[0][1],R[1][1],R[2][1]], b3 = [R[0][2],R[1][2],R[2][2]];
  const bs = S3.dir;
  const F = (b, col) => arrowAt(ctx3, bs, [bs[0]+b[0]*0.3, bs[1]+b[1]*0.3, bs[2]+b[2]*0.3], col, 1.8, P);
  F(b1, '#E30613'); F(b2, '#555'); F(b3, '#999');

  /* 自转提示圈 + 自转弧 + 手柄 */
  const [u1, v1] = perpBasis(S3.dir);
  const RAD = 0.3;
  ctx3.strokeStyle = '#ececea'; ctx3.lineWidth = 1;
  ctx3.beginPath();
  for(let i=0;i<=64;i++){
    const a = i/64*2*Math.PI;
    const v = [ S3.dir[0] + RAD*(Math.cos(a)*u1[0] + Math.sin(a)*v1[0]),
                S3.dir[1] + RAD*(Math.cos(a)*u1[1] + Math.sin(a)*v1[1]),
                S3.dir[2] + RAD*(Math.cos(a)*u1[2] + Math.sin(a)*v1[2]) ];
    const qq = P(v);
    i ? ctx3.lineTo(qq[0],qq[1]) : ctx3.moveTo(qq[0],qq[1]);
  }
  ctx3.closePath(); ctx3.stroke();

  if(Math.abs(twist) > 0.02){
    const e2 = [Rmin[0][1], Rmin[1][1], Rmin[2][1]];
    ctx3.strokeStyle = '#E30613'; ctx3.lineWidth = 1.5;
    ctx3.beginPath();
    const M = Math.max(8, Math.round(Math.abs(deg(twist))/6));
    for(let i=0;i<=M;i++){
      const vv = rodVec(S3.dir, twist*i/M, e2).map(x => x*RAD);
      const qq = P([S3.dir[0]+vv[0], S3.dir[1]+vv[1], S3.dir[2]+vv[2]]);
      i ? ctx3.lineTo(qq[0],qq[1]) : ctx3.moveTo(qq[0],qq[1]);
    }
    ctx3.stroke();
    const mid = rodVec(S3.dir, twist/2, e2).map(x => x*RAD*1.35);
    const qm = P([S3.dir[0]+mid[0], S3.dir[1]+mid[1], S3.dir[2]+mid[2]]);
    ctx3.fillStyle = '#E30613'; ctx3.font = 'bold 11px "Helvetica Neue",Arial';
    ctx3.fillText('φ', qm[0]+3, qm[1]+4);
  }

  const tip = P([bs[0]+b2[0]*RAD, bs[1]+b2[1]*RAD, bs[2]+b2[2]*RAD]);
  drawHandle(ctx3, tip[0], tip[1], 7, '#E30613', S3.drag === 'twist');

  /* 读数 */
  ctx3.fillStyle = '#111'; ctx3.font = 'bold 13px "Helvetica Neue",Arial';
  ctx3.fillText('θ = ' + deg(thetaC).toFixed(1) + '°　φ = ' + deg(twist).toFixed(0) + '°', 16, 26);
  ctx3.font = '11px "Helvetica Neue",Arial'; ctx3.fillStyle = '#8a8a8a';
  ctx3.fillText('拖黑点定方向；拖圆环绕 p̂ 自转', 16, 44);
  if(!axisC){
    ctx3.fillStyle = '#E30613';
    ctx3.fillText('θ ≈ 0：轴无定义（R = I）', 16, 62);
  }
}

function bindDrag3(){
  /* 光标屏幕角 → 绕 p̂ 圆参数角：投影是线性的，2×2 反解即可精确跟手 */
  const twistAngleFromScreen = (sx, sy) => {
    const w = cv3.clientWidth, h = cv3.clientHeight;
    const c = proj3(S3.dir, w, h);
    const o = proj3([0,0,0], w, h);
    const {Rmin} = rotInfo();
    const u = [Rmin[0][1], Rmin[1][1], Rmin[2][1]];
    const v = [Rmin[0][2], Rmin[1][2], Rmin[2][2]];
    const pu = proj3(u, w, h), pv = proj3(v, w, h);
    const U = [pu[0]-o[0], pu[1]-o[1]];
    const V = [pv[0]-o[0], pv[1]-o[1]];
    const P = [sx - c[0], sy - c[1]];
    const det = U[0]*V[1] - U[1]*V[0];
    if(Math.abs(det) < 1e-6) return null;
    const a = ( P[0]*V[1] - P[1]*V[0]) / det;
    const b = (-P[0]*U[1] + P[1]*U[0]) / det;
    return Math.atan2(b, a);
  };
  const toLocal = e => {
    const r = cv3.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  };
  const pick = (sx, sy) => dirFromScreen(sx, sy, cv3.clientWidth, cv3.clientHeight);
  const center = () => proj3(S3.dir, cv3.clientWidth, cv3.clientHeight);
  const tipScreen = () => {
    const {R} = rotInfo();
    const b2 = [R[0][1], R[1][1], R[2][1]];
    return proj3([S3.dir[0]+b2[0]*0.3, S3.dir[1]+b2[1]*0.3, S3.dir[2]+b2[2]*0.3],
                 cv3.clientWidth, cv3.clientHeight);
  };
  cv3.addEventListener('pointerdown', e=>{
    const [sx, sy] = toLocal(e);
    const tp = tipScreen();
    if(Math.hypot(sx - tp[0], sy - tp[1]) < 16){
      S3.drag = 'twist';
      S3.lastA = twistAngleFromScreen(sx, sy);
    } else {
      S3.drag = 'pick';
      S3.dir = pick(sx, sy);
    }
    render(); e.preventDefault();
  });
  cv3.addEventListener('pointermove', e=>{
    if(!S3.drag) return;
    const [sx, sy] = toLocal(e);
    if(S3.drag === 'twist'){
      const psi = twistAngleFromScreen(sx, sy);
      if(psi !== null){ S3.twist = psi; S3.lastA = psi; }
    } else {
      S3.dir = pick(sx, sy);
    }
    render();
  });
  const up = ()=>{ S3.drag = null; };
  cv3.addEventListener('pointerup', up); cv3.addEventListener('pointercancel', up);
  cv3.style.cursor = 'grab';
}

/* 面板 3：正向 R（最小转动 × 自转）+ 反向 tr → θ → ω 的实时对照 */
function renderPanel3(){
  const {c, s, R, thetaC, sC, axisC, twist} = rotInfo();
  document.getElementById('thetaOut3').textContent =
    'θ = ' + deg(thetaC).toFixed(1) + '° · φ = ' + deg(twist).toFixed(0) + '°';
  document.getElementById('pOut3').textContent = 'cosθ₁ = ' + fmtP(c);
  setMath(document.getElementById('Rmat3'), numMat(R, [C1, C2, C3]));

  const tr = R[0][0] + R[1][1] + R[2][2];
  const ok = Math.abs(sC) > 0.1;
  const D = msub(R, transpose(R));
  const wRec = ok ? [D[2][1]/(2*sC), D[0][2]/(2*sC), D[1][0]/(2*sC)] : [0,0,0];

  let rows =
   `<div class="row"><span class="cm">几何</span>${K(
      `p_0 \\cdot \\hat p = ${fmtP(c)} = \\cos\\theta_1, \\qquad |p_0 \\times \\hat p| = ${fmtP(s)} = \\sin\\theta_1`)}</div>` +
   `<div class="row"><span class="cm">构造</span>${K(
      `R = e^{\\hat p \\, \\phi} \\, e^{\\hat \\omega_1 \\theta_1}, \\qquad \\phi = ${deg(twist).toFixed(1)}^\\circ`)}</div>` +
   `<div class="row"><span class="cm">迹检验</span>${K(
      `\\operatorname{tr}R = ${fmtP(tr)} \\;\\Rightarrow\\; \\theta = \\arccos(${fmtP((tr-1)/2)}) = ${deg(thetaC).toFixed(1)}^\\circ`)}</div>`;

  if(ok){
    rows +=
     `<div class="row"><span class="cm">定轴</span>${K(
        `\\hat \\omega = \\frac{R - R^{\\mathsf{T}}}{2\\sin\\theta} = ` + numMat(msc(D, 1/(2*sC))))}</div>` +
     `<div class="row"><span class="cm">重建</span>${K(
        `\\max|e^{\\hat \\omega \\theta} - R| = ${maxAbsDiff(rodrigues(axisC, thetaC), R).toExponential(1)}`)}</div>`;
  }else{
    rows +=
     `<div class="row dim"><span class="cm">定轴</span>${K(
        `\\hat \\omega = \\frac{R - R^{\\mathsf{T}}}{2\\sin\\theta}\\quad \\text{（}` +
        (axisC ? `\\sin\\theta \\approx 0` : `\\theta \\approx 0`) + `\\text{，除零失效）}`)}</div>`;
  }
  document.getElementById('pipe3').innerHTML = rows;

  const trap = document.getElementById('trap3');
  if(!axisC){
    trap.innerHTML = `<span class="warn">θ ≈ 0：</span>轴无定义，R 是单位阵。把点拖离 p₀，或转动圆环手柄。`;
  }else if(thetaC > Math.PI - 0.02){
    trap.innerHTML = `<span class="warn">θ = 180° 边界：</span>轴不唯一——任何垂直方向的轴都给出同一个 R，图中红线只是代表。通用式除零，与 03.2 的 π 陷阱同一件事。`;
  }else if(Math.abs(twist) > 0.02){
    trap.innerHTML = `自转 φ = ${deg(twist).toFixed(0)}°：复合轴已偏离最小转动轴（灰虚线弧那条），只能靠迹与 R − Rᵀ 反解——这正是 03.2 公式不能省的原因。`;
  }else{
    trap.innerHTML = `两条路一致：迹定角、R − Rᵀ 定轴。拖点改方向，拖圆环原地改朝向。`;
  }
  renderInlineMath(trap);
}

function render(){
  drawScene1(); drawScene2(); drawScene3();
  renderPanels();
}
/* 画布每帧重画；数字面板 ~12Hz 足够，拖动时不被 KaTeX 排版拖慢 */
const renderPanels = throttle(() => { renderPanel1(); renderPanel2(); renderPanel3(); }, 80);

/* ================= 按钮 ================= */
document.getElementById('snap601').onclick = () => snapTo(S1, Math.PI/3, render);
document.getElementById('snap901').onclick = () => snapTo(S1, Math.PI/2, render);
document.getElementById('reset1').onclick = () => snapTo(S1, Math.PI/3, render);

document.getElementById('axX').onclick = () => setAxis('x');
document.getElementById('axY').onclick = () => setAxis('y');
document.getElementById('axZ').onclick = () => setAxis('z');
document.getElementById('axR').onclick = () => setAxis('rand');
document.getElementById('snap1202').onclick = () => snapTo(S2, 2*Math.PI/3, render);
document.getElementById('snap1802').onclick = () => snapTo(S2, Math.PI, render);
document.getElementById('reset2').onclick = () => {
  setAxis('x');
  snapTo(S2, Math.PI/3, render);
};

document.getElementById('snap903').onclick = () => {
  S3.dir = rodVec(norm3(cross3(P0, [0,1,0])), Math.PI/2, P0); render();
};
document.getElementById('snap1803').onclick = () => {
  S3.dir = P0.map(x => -x); render();
};
document.getElementById('tw903').onclick = () => {
  S3.twist += Math.PI/2; render();
};
document.getElementById('reset3').onclick = () => {
  S3.dir = [...DIR0]; S3.twist = 0; render();
};

bindDrag1(); bindDrag2(); bindDrag3();
window.addEventListener('resize', render);

/* ================= 小测 ================= */
initQuiz({
  answers: { 1:1, 2:1, 3:1 },
  why: {
    1: '\\(\\operatorname{tr}R = 1 + 2\\cos\\theta = 0 \\Rightarrow \\cos\\theta = -\\tfrac{1}{2}\\)，主值 \\(\\theta = 120^\\circ\\)。90° 的迹是 1，180° 的迹是 −1。迹的两条推导见 03.2 第 2 小节。',
    2: '\\(\\theta = \\pi\\) 时 \\(\\sin\\theta = 0\\)，通用式除零。走对称路线 \\(R + I = 2\\omega\\omega^{\\mathsf{T}}\\)：对角元给 \\(|\\omega_i|\\)，非对角元给符号。四步在 03.2 第 6 小节。',
    3: '指数坐标到 \\(R\\) 是多对一：\\(\\theta\\) 加 \\(2\\pi k\\) 后不变；\\((-\\omega, -\\theta)\\) 绕同轴反向转同角，\\(R\\) 也相同。\\(\\arccos\\) 的 \\([0,\\pi]\\) 只是人为的主值约定。见 03.2 第 8 小节。'
  }
});

render();
renderInlineMath(document.body);
