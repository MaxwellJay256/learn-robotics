"use strict";
/* 机器人学导论 · 02 刚体变换 — 交互逻辑
   S1: 02.1 纯旋转   S2: 02.2 旋转 + 平移 */

/* ================= 通用 ================= */
const U = 46;                    // 每单位像素
const fmtP = v => v.toFixed(2);
const deg = r => r*180/Math.PI;
const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));

/* 矩阵 → 真正的多行网格（rows: 二维数组；cls: 附加类名） */
function matHTML(rows, cls){
  return '<span class="mat' + (cls? ' '+cls:'') + '">' +
    rows.map(r => '<span class="r">' +
      r.map((c,i)=>`<span class="c c${i+1}">${c}</span>`).join('') +
    '</span>').join('') + '</span>';
}
/* 列向量：竖排 */
function vecHTML(a, b, cls){
  return matHTML([[a],[b]], cls||'vec');
}

/* ================= 场景状态 ================= */
const cv1 = document.getElementById('cv1'), ctx1 = cv1.getContext('2d');
const cv2 = document.getElementById('cv2'), ctx2 = cv2.getContext('2d');
const S1 = { theta: Math.PI/3, p:[0,0], q:[1.0,0.6], anim:null, drag:null, ghost:false };
const S2 = { theta: Math.PI/4, p:[2.2,1.2], q:[0.8,0.5], anim:null, drag:null, ghost:false };

/* ================= 画布 ================= */
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
function dashedArrow(ctx,x1,y1,x2,y2){
  ctx.setLineDash([5,4]); arrow(ctx,x1,y1,x2,y2); ctx.setLineDash([]);
}
function drawHandle(ctx,x,y,r,color,active){
  ctx.beginPath(); ctx.arc(x,y,r+4,0,7);
  ctx.fillStyle = active? color : '#fff';
  ctx.fill();
  ctx.lineWidth = active? 3:2;
  ctx.strokeStyle = color; ctx.stroke();
  ctx.beginPath(); ctx.arc(x,y,r-3.5,0,7);
  ctx.fillStyle = color; ctx.fill();
}

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
  for(let i=0;i*U+gx0<w;i++){ ctx.moveTo(i*U+gx0,0); ctx.lineTo(i*U+gx0,h); }
  for(let j=0;j*U+gy0<h;j++){ ctx.moveTo(0,j*U+gy0); ctx.lineTo(w,j*U+gy0); }
  ctx.stroke();

  /* 空间系 A 轴 */
  ctx.strokeStyle = '#111'; ctx.lineWidth = 1.6;
  arrow(ctx, 18, oy, w-14, oy); arrow(ctx, ox, h-14, ox, 12);
  ctx.fillStyle = '#111'; ctx.font = '12px "Helvetica Neue",Arial';
  ctx.fillText('xᴀ', w-30, oy-8); ctx.fillText('yᴀ', ox+8, 22);

  const c = Math.cos(S.theta), s = Math.sin(S.theta);
  const R = [[c,-s],[s,c]];
  const px = S.p[0], py = S.p[1];
  const Bx = [c,s], By=[-s,c];
  const qx = px + R[0][0]*S.q[0] + R[0][1]*S.q[1];
  const qy = py + R[1][0]*S.q[0] + R[1][1]*S.q[1];

  /* 零位形幽灵 */
  if(S.ghost){
    ctx.save(); ctx.globalAlpha = .5;
    ctx.lineWidth = 1.2;
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
    i? ctx.lineTo(X(wx),Y(wy)) : ctx.moveTo(X(wx),Y(wy));
  });
  ctx.closePath(); ctx.stroke();

  /* 点 q */
  ctx.fillStyle = '#111';
  ctx.beginPath(); ctx.arc(X(qx),Y(qy),5.5,0,7); ctx.fill();
  ctx.font = 'bold 13px "Helvetica Neue",Arial';
  ctx.fillText('q', X(qx)+9, Y(qy)-8);

  /* 手柄 */
  const hx = px + Bx[0]*1.3, hy = py + Bx[1]*1.3;
  drawHandle(ctx, X(hx),Y(hy), 9, '#E30613', S.drag==='rot');
  if(opts.movableP) drawHandle(ctx, X(px),Y(py), 9, '#111', S.drag==='p');

  return {R, px, py, qx, qy, w, h, ox, oy};
}

/* ================= 交互 ================= */
function bindDrag(cv, S, opts){
  const toWorld = e => {
    const r = cv.getBoundingClientRect();
    const w = cv.clientWidth, h = cv.clientHeight;
    const ox = opts.movableP? w*0.40 : w*0.5, oy = h*0.55;
    return [ (e.clientX-r.left-ox)/U, (oy-(e.clientY-r.top))/U ];
  };
  cv.addEventListener('pointerdown', e=>{
    if(S.anim) return;
    const [mx,my] = toWorld(e);
    const c=Math.cos(S.theta), s=Math.sin(S.theta);
    const hx = S.p[0]+c*1.3, hy = S.p[1]+s*1.3;
    const dRot = Math.hypot(mx-hx,my-hy);
    const dP   = opts.movableP? Math.hypot(mx-S.p[0],my-S.p[1]) : 99;
    const qx = S.p[0]+c*S.q[0]-s*S.q[1], qy = S.p[1]+s*S.q[0]+c*S.q[1];
    const dQ = Math.hypot(mx-qx,my-qy);
    if(dRot<0.42 && dRot<=dP) S.drag='rot';
    else if(opts.movableP && dP<0.42 && dP<dRot) S.drag='p';
    else if(dQ<0.3) S.drag='q';
    if(S.drag){ cv.setPointerCapture(e.pointerId); e.preventDefault(); }
  });
  cv.addEventListener('pointermove', e=>{
    if(S.anim) return;
    if(!S.drag) { hover(cv,S,toWorld(e),opts); return; }
    const [mx,my] = toWorld(e);
    if(S.drag==='rot'){
      S.theta = Math.atan2(my-S.p[1], mx-S.p[0]);
    }else if(S.drag==='p'){
      S.p = [clamp(mx,-3.6,4.8), clamp(my,-2.6,2.6)];
    }else if(S.drag==='q'){
      const c=Math.cos(S.theta), s=Math.sin(S.theta);
      const dx = mx-S.p[0], dy=my-S.p[1];
      S.q = [ c*dx+s*dy, -s*dx+c*dy ].map(v=>clamp(v,-2.2,2.2));
    }
    render();
  });
  const up = ()=>{ S.drag=null; };
  cv.addEventListener('pointerup',up); cv.addEventListener('pointercancel',up);
}
function hover(cv,S,m,opts){
  const hx=S.p[0]+Math.cos(S.theta)*1.3, hy=S.p[1]+Math.sin(S.theta)*1.3;
  const near = Math.hypot(m[0]-hx,m[1]-hy)<0.42 || (opts.movableP&&Math.hypot(m[0]-S.p[0],m[1]-S.p[1])<0.42);
  cv.style.cursor = near? 'grab' : 'crosshair';
}

/* ================= 面板 ================= */
function renderPanel1(st){
  const {R} = st, c=R[0][0], s=R[1][0];
  document.getElementById('thetaOut').textContent = 'θ = ' + deg(Math.atan2(s,c)).toFixed(1) + '°';
  document.getElementById('Rmat').innerHTML = matHTML([[fmtP(c),fmtP(-s)],[fmtP(s),fmtP(c)]]);
  document.getElementById('qOut').textContent = `qᴮ = ( ${fmtP(S1.q[0])}, ${fmtP(S1.q[1])} )`;

  const qx = R[0][0]*S1.q[0] + R[0][1]*S1.q[1];
  const qy = R[1][0]*S1.q[0] + R[1][1]*S1.q[1];
  document.getElementById('pipe1').innerHTML =
   `<div class="row">qᴀ = R·qᴮ = ` +
     matHTML([[fmtP(R[0][0]),fmtP(R[0][1])],[fmtP(R[1][0]),fmtP(R[1][1])]]) +
     ` · ` + vecHTML(fmtP(S1.q[0]), fmtP(S1.q[1])) + `</div>`+
   `<div class="row"><span class="cm">xᴀ =</span> ${fmtP(R[0][0])}×${fmtP(S1.q[0])} − ${fmtP(-R[0][1])}×${fmtP(S1.q[1])} <span class="cm">=</span> ${fmtP(R[0][0]*S1.q[0])} ${R[0][1]<0?'+':'−'} ${fmtP(Math.abs(R[0][1]*S1.q[1]))} <span class="cm">=</span> <span class="res">${fmtP(qx)}</span></div>`+
   `<div class="row"><span class="cm">yᴀ =</span> ${fmtP(R[1][0])}×${fmtP(S1.q[0])} + ${fmtP(R[1][1])}×${fmtP(S1.q[1])} <span class="cm">=</span> ${fmtP(R[1][0]*S1.q[0])} + ${fmtP(R[1][1]*S1.q[1])} <span class="cm">=</span> <span class="res">${fmtP(qy)}</span></div>`+
   `<div class="row"><span class="cm">校验 RᵀR 的对角元：</span> ${fmtP(c*c+s*s)} , ${fmtP(s*s+c*c)} <span class="cm">→ 恒为 1 ✓</span></div>`;
}
function renderPanel2(st){
  const {R} = st;
  document.getElementById('gOut').textContent =
    `p = ( ${fmtP(S2.p[0])}, ${fmtP(S2.p[1])} )`;
  document.getElementById('Gmat').innerHTML = matHTML([
    [fmtP(R[0][0]),fmtP(R[0][1]),fmtP(S2.p[0])],
    [fmtP(R[1][0]),fmtP(R[1][1]),fmtP(S2.p[1])],
    ['0','0','1']]);
  const iR = [[R[0][0],R[1][0]],[R[0][1],R[1][1]]];
  const ipx = -(iR[0][0]*S2.p[0]+iR[0][1]*S2.p[1]);
  const ipy = -(iR[1][0]*S2.p[0]+iR[1][1]*S2.p[1]);
  document.getElementById('Ginv').innerHTML = matHTML([
    [fmtP(iR[0][0]),fmtP(iR[0][1]),fmtP(ipx)],
    [fmtP(iR[1][0]),fmtP(iR[1][1]),fmtP(ipy)],
    ['0','0','1']]);
  document.getElementById('pipe2').innerHTML =
   `<div class="row"><span class="cm">逆的位置块：</span>−Rᵀp = −` +
     matHTML([[fmtP(iR[0][0]),fmtP(iR[0][1])],[fmtP(iR[1][0]),fmtP(iR[1][1])]]) +
     ` · ` + vecHTML(fmtP(S2.p[0]), fmtP(S2.p[1])) + `</div>`+
   `<div class="row"><span class="cm">　　　　　　</span>= −` +
     vecHTML(fmtP(iR[0][0]*S2.p[0]+iR[0][1]*S2.p[1]), fmtP(iR[1][0]*S2.p[0]+iR[1][1]*S2.p[1])) +
     ` = ` + vecHTML(fmtP(ipx), fmtP(ipy)) + `</div>`;
}

function render(){
  const st1 = drawScene(cv1, ctx1, S1, {movableP:false});
  renderPanel1(st1);
  const st2 = drawScene(cv2, ctx2, S2, {movableP:true});
  renderPanel2(st2);
}

/* ================= 演示动画 ================= */
function animate(S, to, cb){
  if(S.anim) cancelAnimationFrame(S.anim);
  const from = {theta:S.theta, p:[...S.p]};
  const t0 = performance.now(), D = 1300;
  const step = now=>{
    let k = Math.min(1,(now-t0)/D);
    k = k<0.5? 2*k*k : 1-Math.pow(-2*k+2,2)/2;
    S.theta = from.theta + (to.theta-from.theta)*k;
    if(to.p) S.p = [from.p[0]+(to.p[0]-from.p[0])*k, from.p[1]+(to.p[1]-from.p[1])*k];
    render();
    if(k<1) S.anim = requestAnimationFrame(step);
    else { S.anim=null; if(cb) cb(); }
  };
  S.anim = requestAnimationFrame(step);
}
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
function instant(S,to){ Object.assign(S,to); render(); }

document.getElementById('anim1').onclick = () => {
  S1.ghost = true;
  if (reduceMotion) { instant(S1, {theta:Math.PI/3}); S1.ghost = false; }
  else animate(S1, {theta:Math.PI/3}, () => S1.ghost = false);
};
document.getElementById('snap90').onclick  = ()=> animate(S1,{theta:Math.PI/2});
document.getElementById('snap180').onclick = ()=> animate(S1,{theta:Math.PI});
document.getElementById('reset1').onclick = ()=>{ S1.ghost=false; animate(S1,{theta:Math.PI/3}); };
document.getElementById('anim2').onclick = () => {
  S2.ghost = true;
  if (reduceMotion) { instant(S2, {theta:Math.PI/4, p:[2.2,1.2]}); S2.ghost = false; }
  else animate(S2, {theta:Math.PI/4, p:[2.2,1.2]}, () => S2.ghost = false);
};
document.getElementById('reset2').onclick = ()=>{ S2.ghost=false; animate(S2,{theta:Math.PI/4, p:[2.2,1.2]}); };

bindDrag(cv1,S1,{movableP:false});
bindDrag(cv2,S2,{movableP:true});
window.addEventListener('resize', render);

/* ================= 小测 ================= */
const answers = { 1:1, 2:1, 3:0 };
const why = {
  1:'θ=90° 时 cosθ=0、sinθ=1，基向量 xᴮ 转到 yᴀ 方向 → 第 1 列 (0,1)。也可用 02.1 面板直接验证：转到 90° 看矩阵列。',
  2:'qᴀ = R·qᴮ + p = (−1,0)·1 + (2,0) = (1,0)。旋转把 (1,0) 变到 (−1,0)，平移再加 (2,0)。',
  3:'齐次求逆套路：姿态块转置 Rᵀ，位置块 −Rᵀp。B 相对 A 的姿态取逆 = 姿态转置；位置反向变换要先转到 A 的方向再取反。02.2 右侧面板实时验证。'
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
