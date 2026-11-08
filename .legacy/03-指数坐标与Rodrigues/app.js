"use strict";
/* 机器人学导论 · 03 指数坐标与 Rodrigues — 交互逻辑
   S1: 03.1 平面特例 (ω=ẑ) + 幂级数收敛
   S2: 03.2 3D 轴角实验台：正向 Rodrigues + 逆向 (tr→θ→ω) 与 π 陷阱 */

/* ================= 通用 ================= */
const U = 46;
const fmtP = v => v.toFixed(2);
const deg = r => r*180/Math.PI;
const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));

/* 矩阵 → 真正的多行网格 */
function matHTML(rows, cls){
  return '<span class="mat' + (cls? ' '+cls:'') + '">' +
    rows.map(r => '<span class="r">' +
      r.map((c,i)=>`<span class="c c${i+1}">${c}</span>`).join('') +
    '</span>').join('') + '</span>';
}
function vecHTML(a, b, c, cls){
  return matHTML([[a],[b],[c]], cls||'vec tiny');
}

/* 3×3 线性代数工具（无依赖，工作过程全部可见） */
const eye3 = () => [[1,0,0],[0,1,0],[0,0,1]];
function matMul(A,B){
  const C = [[0,0,0],[0,0,0],[0,0,0]];
  for(let i=0;i<3;i++) for(let j=0;j<3;j++)
    for(let k=0;k<3;k++) C[i][j] += A[i][k]*B[k][j];
  return C;
}
function matPow(A,n){ let M=eye3(); for(let i=0;i<n;i++) M=matMul(M,A); return M; }
const msc = (A,s) => A.map(r=>r.map(v=>v*s));
const madd = (A,B) => A.map((r,i)=>r.map((v,j)=>v+B[i][j]));
const msub = (A,B) => A.map((r,i)=>r.map((v,j)=>v-B[i][j]));
const transpose = A => A[0].map((_,j)=>A.map(r=>r[j]));
function hat(w){ return [[0,-w[2],w[1]],[w[2],0,-w[0]],[-w[1],w[0],0]]; }
function maxAbsDiff(A,B){
  let m=0;
  for(let i=0;i<3;i++) for(let j=0;j<3;j++) m=Math.max(m,Math.abs(A[i][j]-B[i][j]));
  return m;
}
function rodrigues(w, th){
  const W = hat(w), W2 = matMul(W,W);
  return madd(madd(eye3(), msc(W,Math.sin(th))), msc(W2,1-Math.cos(th)));
}

/* ================= 03.1 场景：ω=ẑ 平面特例 ================= */
const cv1 = document.getElementById('cv1'), ctx1 = cv1.getContext('2d');
const S1 = { theta: Math.PI/3, drag:null, anim:null };

function fitCanvas(cv){
  const dpr = window.devicePixelRatio||1;
  const w = cv.clientWidth || cv.width;
  const h = Math.round(w*520/860);
  cv.width = w*dpr; cv.height = h*dpr;
  cv.style.height = h+'px';
  return {w, h, dpr};
}
function arrow(ctx,x1,y1,x2,y2){
  ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
  const a = Math.atan2(y2-y1,x2-x1), L=9;
  ctx.beginPath(); ctx.moveTo(x2,y2);
  ctx.lineTo(x2-L*Math.cos(a-0.42), y2-L*Math.sin(a-0.42));
  ctx.lineTo(x2-L*Math.cos(a+0.42), y2-L*Math.sin(a+0.42));
  ctx.closePath(); ctx.fill();
}
function drawHandle(ctx,x,y,r,color,active){
  ctx.beginPath(); ctx.arc(x,y,r+4,0,7);
  ctx.fillStyle = active? color : '#fff'; ctx.fill();
  ctx.lineWidth = active? 3:2; ctx.strokeStyle = color; ctx.stroke();
  ctx.beginPath(); ctx.arc(x,y,r-3.5,0,7); ctx.fillStyle = color; ctx.fill();
}

function drawScene1(){
  const cv = cv1, ctx = ctx1, S = S1;
  const {w,h,dpr} = fitCanvas(cv);
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.clearRect(0,0,w,h);
  const ox = w*0.5, oy = h*0.55;
  const X = x => ox + x*U, Y = y => oy - y*U;

  ctx.strokeStyle = '#ececea'; ctx.lineWidth = 1;
  const gx0 = ox % U, gy0 = oy % U;
  ctx.beginPath();
  for(let i=0;i*U+gx0<w;i++){ ctx.moveTo(i*U+gx0,0); ctx.lineTo(i*U+gx0,h); }
  for(let j=0;j*U+gy0<h;j++){ ctx.moveTo(0,j*U+gy0); ctx.lineTo(w,j*U+gy0); }
  ctx.stroke();

  ctx.strokeStyle = '#111'; ctx.lineWidth = 1.6;
  arrow(ctx, 18, oy, w-14, oy); arrow(ctx, ox, h-14, ox, 12);
  ctx.fillStyle = '#111'; ctx.font = '12px "Helvetica Neue",Arial';
  ctx.fillText('xᴀ', w-30, oy-8); ctx.fillText('yᴀ', ox+8, 22);

  const c = Math.cos(S.theta), s = Math.sin(S.theta);

  /* 刚体轮廓（02 课同款 L 形） */
  ctx.strokeStyle = '#111'; ctx.lineWidth = 1.8;
  const pts = [[0,0],[1.0,0],[1.0,0.9],[0.55,0.9],[0.55,0.45],[0,0.45]];
  ctx.beginPath();
  pts.forEach((pt,i)=>{
    const wx = c*pt[0] - s*pt[1], wy = s*pt[0] + c*pt[1];
    i? ctx.lineTo(X(wx),Y(wy)) : ctx.moveTo(X(wx),Y(wy));
  });
  ctx.closePath(); ctx.stroke();

  /* B 系 */
  ctx.lineWidth = 2.6;
  ctx.strokeStyle = '#E30613'; arrow(ctx, X(0),Y(0), X(c*1.3), Y(s*1.3));
  ctx.strokeStyle = '#555';    arrow(ctx, X(0),Y(0), X(-s*1.3), Y(c*1.3));
  ctx.fillStyle = '#E30613'; ctx.fillText('xᴃ', X(c*1.45)-4, Y(s*1.45)+4);
  ctx.fillStyle = '#555';    ctx.fillText('yᴃ', X(-s*1.45)-4, Y(c*1.45)+4);

  /* ω = ẑ 记号：画布角落一个 ⊙ */
  ctx.strokeStyle = '#111'; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.arc(w-46, 34, 8, 0, 7); ctx.stroke();
  ctx.beginPath(); ctx.arc(w-46, 34, 1.8, 0, 7); ctx.fillStyle='#111'; ctx.fill();
  ctx.font = '11px "Helvetica Neue",Arial'; ctx.fillText('ω = ẑ', w-70, 56);

  const hx = c*1.3, hy = s*1.3;
  drawHandle(ctx, X(hx), Y(hy), 9, '#E30613', S.drag==='rot');
  return {c, s};
}

function bindDrag1(){
  const toAngle = e => {
    const r = cv1.getBoundingClientRect();
    const w = cv1.clientWidth, h = cv1.clientHeight;
    const ox = w*0.5, oy = h*0.55;
    return Math.atan2(-(e.clientY-r.top-oy), e.clientX-r.left-ox);
  };
  cv1.addEventListener('pointerdown', e=>{
    if(S1.anim) return;
    S1.drag='rot'; cv1.setPointerCapture(e.pointerId);
    S1.theta = toAngle(e); render(); e.preventDefault();
  });
  cv1.addEventListener('pointermove', e=>{
    if(S1.drag!=='rot') return;
    S1.theta = toAngle(e); render();
  });
  const up = ()=>{ S1.drag=null; };
  cv1.addEventListener('pointerup',up); cv1.addEventListener('pointercancel',up);
}

/* 面板 1：级数收敛 + 三项式闭合 */
function renderPanel1(){
  const th = S1.theta, c = Math.cos(th), s = Math.sin(th);
  document.getElementById('thetaOut1').textContent = 'θ = ' + deg(th).toFixed(1) + '°';

  const W = hat([0,0,1]);                    // ω = ẑ
  const Wt = msc(W, th);
  const R = rodrigues([0,0,1], th);
  let Sk = eye3(), term = eye3();
  const rows = [];
  for(let k=1;k<=5;k++){
    term = matMul(term, Wt); term = msc(term, 1/k);   // (ω̂θ)^k / k!
    Sk = madd(Sk, term);
    const err = maxAbsDiff(Sk, R);
    rows.push({lab:'S'+k, m:Sk, err, ok: err < 5e-3});
  }
  document.getElementById('series').innerHTML =
    rows.map(r =>
      `<div class="serow${r.ok?' ok':''}"><span class="lab">${r.lab}</span>` +
      matHTML(r.m.map(row=>row.map(fmtP)), 'tiny') +
      `<span class="err">误差 ${r.err.toExponential(1)}</span></div>`).join('') +
    `<div class="serow final"><span class="lab">R 精确</span>` +
      matHTML(R.map(row=>row.map(fmtP)), 'tiny') +
      `<span class="err">Rodrigues 闭合式</span></div>`;

  document.getElementById('detOut').textContent =
    'det = ' + (R[0][0]*R[1][1]-R[0][1]*R[1][0]).toFixed(2);
  document.getElementById('pipe1').innerHTML =
   `<div class="row"><span class="cm">ω̂ =</span>` + matHTML([[0,-1,0],[1,0,0],[0,0,0]].map(r=>r.map(fmtP)),'tiny') +
     `<span class="cm">　(ω̂)² =</span>` + matHTML(matMul(W,W).map(r=>r.map(fmtP)),'tiny') + `</div>`+
   `<div class="row"><span class="cm">sin θ =</span> ${fmtP(s)} <span class="cm">× ω̂ →</span>` +
     matHTML(msc(W,s).map(r=>r.map(fmtP)),'tiny') +
     `<span class="cm">　1−cos θ =</span> ${fmtP(1-c)} <span class="cm">× (ω̂)² →</span>` +
     matHTML(msc(matMul(W,W),1-c).map(r=>r.map(fmtP)),'tiny') + `</div>`+
   `<div class="row"><span class="cm">I + 上两项 =</span>` + matHTML(R.map(r=>r.map(fmtP)),'tiny') +
     `<span class="cm">　对照级数和 S₅：</span>` + matHTML(rows[4].m.map(r=>r.map(fmtP)),'tiny') + `</div>`;
}

/* ================= 03.2 场景：3D 轴角实验台 ================= */
const cv2 = document.getElementById('cv2'), ctx2 = cv2.getContext('2d');
const AXES = { x:[1,0,0], y:[0,1,0], z:[0,0,1] };
const S2 = { axis:'x', omega:[1,0,0], theta:Math.PI/3, drag:null, dragX0:0, dragT0:0 };

const YAW = 0.61, PITCH = 0.42;   // 固定轴测视角
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
  const ang = Math.atan2(B[1]-A[1], B[0]-A[0]), L=8;
  ctx.beginPath(); ctx.moveTo(B[0],B[1]);
  ctx.lineTo(B[0]-L*Math.cos(ang-0.42), B[1]-L*Math.sin(ang-0.42));
  ctx.lineTo(B[0]-L*Math.cos(ang+0.42), B[1]-L*Math.sin(ang+0.42));
  ctx.closePath(); ctx.fill();
}

function drawScene2(){
  const cv = cv2, ctx = ctx2, S = S2;
  const {w,h,dpr} = fitCanvas(cv);
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.clearRect(0,0,w,h);

  /* 空间系 A */
  const O = [0,0,0];
  arrow3(ctx, O, [1.8,0,0], '#111', 1.4, w, h);
  arrow3(ctx, O, [0,1.8,0], '#111', 1.4, w, h);
  arrow3(ctx, O, [0,0,1.8], '#111', 1.4, w, h);
  ctx.fillStyle = '#111'; ctx.font = '11px "Helvetica Neue",Arial';
  let p = proj([2.0,0,0],w,h); ctx.fillText('xᴀ', p[0], p[1]+4);
  p = proj([0,2.0,0],w,h);     ctx.fillText('yᴀ', p[0], p[1]+4);
  p = proj([0,0,2.0],w,h);     ctx.fillText('zᴀ', p[0], p[1]+4);

  /* 转轴 ω（红色，单位长度出头） */
  arrow3(ctx, [-S2.omega[0]*0.6, -S2.omega[1]*0.6, -S2.omega[2]*0.6],
              [ S2.omega[0]*1.6,  S2.omega[1]*1.6,  S2.omega[2]*1.6], '#E30613', 2.4, w, h);
  p = proj([S2.omega[0]*1.75, S2.omega[1]*1.75, S2.omega[2]*1.75],w,h);
  ctx.fillStyle = '#E30613'; ctx.fillText('ω', p[0], p[1]+4);

  /* 旋转后的 B 系与刚体 */
  const R = rodrigues(S2.omega, S2.theta);
  const b1 = [R[0][0],R[1][0],R[2][0]], b2 = [R[0][1],R[1][1],R[2][1]], b3 = [R[0][2],R[1][2],R[2][2]];
  arrow3(ctx, O, [b1[0]*1.2,b1[1]*1.2,b1[2]*1.2], '#E30613', 2.6, w, h);
  arrow3(ctx, O, [b2[0]*1.2,b2[1]*1.2,b2[2]*1.2], '#555',    2.6, w, h);
  arrow3(ctx, O, [b3[0]*1.2,b3[1]*1.2,b3[2]*1.2], '#999',    2.6, w, h);
  p = proj([b1[0]*1.35,b1[1]*1.35,b1[2]*1.35],w,h); ctx.fillStyle='#E30613'; ctx.fillText('xᴃ', p[0], p[1]+4);
  p = proj([b2[0]*1.35,b2[1]*1.35,b2[2]*1.35],w,h); ctx.fillStyle='#555';    ctx.fillText('yᴃ', p[0], p[1]+4);
  p = proj([b3[0]*1.35,b3[1]*1.35,b3[2]*1.35],w,h); ctx.fillStyle='#999';    ctx.fillText('zᴃ', p[0], p[1]+4);

  /* 刚体轮廓：xy 平面上的 L 形，整体被 R 带走 */
  const pts = [[0,0,0],[1.0,0,0],[1.0,0.9,0],[0.55,0.9,0],[0.55,0.45,0],[0,0.45,0]];
  ctx.strokeStyle = '#111'; ctx.lineWidth = 1.8;
  ctx.beginPath();
  pts.forEach((pt,i)=>{
    const q = [R[0][0]*pt[0]+R[0][1]*pt[1]+R[0][2]*pt[2],
               R[1][0]*pt[0]+R[1][1]*pt[1]+R[1][2]*pt[2],
               R[2][0]*pt[0]+R[2][1]*pt[1]+R[2][2]*pt[2]];
    const s = proj(q,w,h);
    i? ctx.lineTo(s[0],s[1]) : ctx.moveTo(s[0],s[1]);
  });
  ctx.closePath(); ctx.stroke();

  /* θ 读数与拖动提示 */
  ctx.fillStyle = '#111'; ctx.font = 'bold 13px "Helvetica Neue",Arial';
  ctx.fillText('θ = ' + deg(S2.theta).toFixed(1) + '°', 16, 26);
  ctx.font = '11px "Helvetica Neue",Arial'; ctx.fillStyle = '#8a8a8a';
  ctx.fillText('↔ 拖动扫角', 16, 44);
  return R;
}

function bindDrag2(){
  cv2.addEventListener('pointerdown', e=>{
    S2.drag = true; S2.dragX0 = e.clientX; S2.dragT0 = S2.theta;
    cv2.setPointerCapture(e.pointerId); e.preventDefault();
  });
  cv2.addEventListener('pointermove', e=>{
    if(!S2.drag) return;
    S2.theta = S2.dragT0 + (e.clientX - S2.dragX0) * 0.012;
    render();
  });
  const up = ()=>{ S2.drag=false; };
  cv2.addEventListener('pointerup',up); cv2.addEventListener('pointercancel',up);
  cv2.style.cursor = 'ew-resize';
}

function setAxis(name){
  S2.axis = name;
  S2.omega = name==='rand'
    ? (()=>{ let v; do{ v=[Math.random()*2-1,Math.random()*2-1,Math.random()*2-1]; }
            while(Math.hypot(...v)<0.3);
            const n=Math.hypot(...v); return v.map(x=>x/n); })()
    : [...AXES[name]];
  document.querySelectorAll('.toolbar [id^=ax]').forEach(b=>b.classList.remove('on'));
  const btn = document.getElementById({x:'axX', y:'axY', z:'axZ', rand:'axR'}[name]);
  if(btn) btn.classList.add('on');
  render();
}

/* 面板 2：正向拆解 + 逆向 tr→θ→ω（含 π 陷阱） */
function renderPanel2(){
  const w = S2.omega, th = S2.theta;
  const W = hat(w), W2 = matMul(W,W);
  const R = rodrigues(w, th);
  const s = Math.sin(th), c = Math.cos(th);
  document.getElementById('thetaOut2').textContent =
    'θ = ' + deg(th).toFixed(1) + '° · ω = (' + w.map(v=>v.toFixed(2)).join(', ') + ')';

  document.getElementById('Rmat2').innerHTML = matHTML(R.map(r=>r.map(fmtP)),'tiny');

  document.getElementById('pipe2a').innerHTML =
   `<div class="row"><span class="cm">ω̂ =</span>` + matHTML(W.map(r=>r.map(fmtP)),'tiny') +
     `<span class="cm">　(ω̂)² = ωωᵀ − I =</span>` + matHTML(W2.map(r=>r.map(fmtP)),'tiny') + `</div>`+
   `<div class="row"><span class="cm">sin θ =</span> ${fmtP(s)} <span class="cm">→</span>` +
     matHTML(msc(W,s).map(r=>r.map(fmtP)),'tiny') +
     `<span class="cm">　1−cos θ =</span> ${fmtP(1-c)} <span class="cm">→</span>` +
     matHTML(msc(W2,1-c).map(r=>r.map(fmtP)),'tiny') + `</div>`+
   `<div class="row"><span class="cm">相加 =</span>` + matHTML(R.map(r=>r.map(fmtP)),'tiny') + `</div>`;

  const tr = R[0][0]+R[1][1]+R[2][2];
  const thRec = Math.acos(clamp((tr-1)/2, -1, 1));
  const sRec = Math.sin(thRec);
  const genericOK = Math.abs(sRec) > 0.1;
  document.getElementById('trOut').textContent =
    'tr = ' + fmtP(tr) + ' · 反解 θ = ' + deg(thRec).toFixed(1) + '°';

  const Rt = transpose(R);
  const D = msub(R, Rt);
  let genericRow = `<div class="row${genericOK?'':' dim'}"><span class="cm">通用式　ω̂ = (R−Rᵀ)/(2 sin θ) =</span>`;
  if(genericOK){
    genericRow += matHTML(msc(D,1/(2*sRec)).map(r=>r.map(fmtP)),'tiny') + `</div>`;
  }else{
    genericRow += matHTML(D.map(r=>r.map(fmtP)),'tiny') +
      `<span class="cm">　⚠ sin θ = ${fmtP(sRec)} → 除零，禁用</span></div>`;
  }
  const Ssym = msc(madd(R, eye3()), 0.5);
  let wx, wy, wz;
  if(Ssym[0][0] > 1e-6){ wx = Math.sqrt(Ssym[0][0]); wy = Ssym[1][0]/wx; wz = Ssym[2][0]/wx; }
  else if(Ssym[1][1] > 1e-6){ wy = Math.sqrt(Ssym[1][1]); wz = Ssym[2][1]/wy; wx = 0; }
  else { wz = Math.sqrt(Math.max(Ssym[2][2],0)); wx = 0; wy = 0; }
  const matchErr = Math.max(Math.abs(wx-w[0]), Math.abs(wy-w[1]), Math.abs(wz-w[2]));

  document.getElementById('pipe2b').innerHTML =
   `<div class="row"><span class="cm">第一步　θ = arccos((tr R − 1)/2) = arccos(${fmtP((tr-1)/2)}) = </span><span class="res">${deg(thRec).toFixed(1)}°</span></div>`+
   genericRow +
   `<div class="row"><span class="cm">备用式　R + I = 2ωωᵀ → (R+I)/2 =</span>` +
     matHTML(Ssym.map(r=>r.map(fmtP)),'tiny') +
     `<span class="cm">→ ω =</span>` + vecHTML(fmtP(wx), fmtP(wy), fmtP(wz)) + `</div>`+
   `<div class="row"><span class="cm">核对　恢复的 ω 与真值最大偏差 =</span> ${matchErr.toExponential(1)} ` +
     (matchErr < 1e-6 ? '<span class="cm">✓</span>'
                      : '<span class="cm">（备用式仅在 θ = ±180° 精确成立；当前 θ ≠ 180°，偏差大是预期的）</span>') + `</div>`;

  document.getElementById('trapNote').innerHTML = genericOK
    ? '当前 sin θ = ' + fmtP(sRec) + '，通用式可用。把 θ 拖到 ±180° 附近看它熄灭、备用式接管。'
    : '<span class="warn">π 陷阱已触发：</span>sin θ ≈ 0，通用式失效。备用式 R + I = 2ωωᵀ 从对称矩阵读出 ω——考试遇到 θ = π 就走这条。';
}

function render(){
  drawScene1(); renderPanel1();
  drawScene2(); renderPanel2();
}

/* ================= 动画与按钮 ================= */
function animate(S, to, cb){
  if(S.anim) cancelAnimationFrame(S.anim);
  const from = S.theta, t0 = performance.now(), D = 1300;
  const step = now=>{
    let k = Math.min(1,(now-t0)/D);
    k = k<0.5? 2*k*k : 1-Math.pow(-2*k+2,2)/2;
    S.theta = from + (to-from)*k;
    render();
    if(k<1) S.anim = requestAnimationFrame(step);
    else { S.anim=null; if(cb) cb(); }
  };
  S.anim = requestAnimationFrame(step);
}
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

document.getElementById('snap601').onclick = ()=>
  reduceMotion ? (S1.theta=Math.PI/3, render()) : animate(S1, Math.PI/3);
document.getElementById('snap901').onclick = ()=>
  reduceMotion ? (S1.theta=Math.PI/2, render()) : animate(S1, Math.PI/2);
document.getElementById('reset1').onclick = ()=>
  reduceMotion ? (S1.theta=Math.PI/3, render()) : animate(S1, Math.PI/3);

document.getElementById('axX').onclick = ()=> setAxis('x');
document.getElementById('axY').onclick = ()=> setAxis('y');
document.getElementById('axZ').onclick = ()=> setAxis('z');
document.getElementById('axR').onclick = ()=> setAxis('rand');
document.getElementById('snap1202').onclick = ()=>
  reduceMotion ? (S2.theta=2*Math.PI/3, render()) : animate(S2, 2*Math.PI/3);
document.getElementById('snap1802').onclick = ()=>
  reduceMotion ? (S2.theta=Math.PI, render()) : animate(S2, Math.PI);
document.getElementById('reset2').onclick = ()=>{
  setAxis('x');
  reduceMotion ? (S2.theta=Math.PI/3, render()) : animate(S2, Math.PI/3);
};

bindDrag1(); bindDrag2();
window.addEventListener('resize', render);

/* ================= 小测 ================= */
const answers = { 1:1, 2:1, 3:1 };
const why = {
  1:'tr R = 1 + 2cosθ = 0 → cosθ = −1/2 → θ = 120°（主值）。90° 的迹是 1、180° 的迹是 −1。可用 03.2 面板拖到 120° 核对 tr = 0。',
  2:'θ = π 时 sin θ = 0，通用式除零失效。走对称路线 R + I = 2ωωᵀ：对角元给 |ωᵢ|，非对角元给符号。03.2 面板的「θ=180°」按钮现场演示这个切换。',
  3:'指数坐标到 R 是多对一：θ 加 2πk 后 e 不变；(−ω, −θ) 绕同一轴反向转同一角，R 也相同。arccos 的 [0,π] 只是人为选定的主值约定。'
};
let got = {};
document.querySelectorAll('.q').forEach(qEl=>{
  const qn = qEl.dataset.q;
  const opts = qEl.querySelectorAll('.opt');
  opts.forEach((op,i)=>{
    op.addEventListener('click', ()=>{
      if(qEl.dataset.done) return;
      qEl.dataset.done = '1';
      opts.forEach(o=>o.classList.add('locked'));
      op.classList.add('chosen');
      if(i===answers[qn]){ op.classList.add('right'); got[qn]=1; }
      else { op.classList.add('wrong'); opts[answers[qn]].classList.add('right'); got[qn]=0; }
      const ex = qEl.querySelector('.explain');
      ex.textContent = (i===answers[qn]? '✓ 正确 — ':'✗ 再看一遍 — ') + why[qn];
      ex.classList.add('show');
      document.getElementById('scoreNum').textContent = Object.values(got).filter(Boolean).length;
    });
  });
});

render();
