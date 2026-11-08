/* 08 节页面逻辑（ESM）：空间雅可比 · 物体雅可比 · 奇异
   画布：二维两自由度臂；两列 J 画成箭头，奇异时两列平行
   面板：J_v 数值、det、可操作性 μ2 */
import {
  fmtP, deg, clamp, arrow, drawHandle, fitCanvas,
  setMath, numMat, renderInlineMath, initQuiz, createView,
} from "./core.js";

const L1 = 1.3, L2 = 1.0;
const S = { t1: 35*Math.PI/180, t2: 60*Math.PI/180, drag: null, dragX: 0, dragT: [0,0] };

const cv1 = document.getElementById('cv1'), ctx1 = cv1.getContext('2d');
const view1 = createView(cv1, () => drawScene(), { rotate: false });

const cos = Math.cos, sin = Math.sin;

function fk(t1, t2){
  return {
    p: [L1*cos(t1) + L2*cos(t1+t2), L1*sin(t1) + L2*sin(t1+t2)],
    elbow: [L1*cos(t1), L1*sin(t1)],
    phi: t1 + t2,
  };
}

/* 线速度雅可比（2×2）：两列是“单位关节速率下末端的线速度” */
function jac(t1, t2){
  const s1 = sin(t1), c1 = cos(t1), s12 = sin(t1+t2), c12 = cos(t1+t2);
  return [
    [-L1*s1 - L2*s12, -L2*s12],
    [ L1*c1 + L2*c12,  L2*c12],
  ];
}

function metrics(){
  const J = jac(S.t1, S.t2);
  const det = J[0][0]*J[1][1] - J[0][1]*J[1][0];
  /* 2×2 的奇异值：由 A = JᵀJ 的特征值开方 */
  const a = J[0][0]*J[0][0] + J[1][0]*J[1][0];
  const b = J[0][0]*J[0][1] + J[1][0]*J[1][1];
  const c = J[0][1]*J[0][1] + J[1][1]*J[1][1];
  const tr = a + c, dt = a*c - b*b;
  const disc = Math.sqrt(Math.max(0, tr*tr - 4*dt));
  const lmax = Math.max(1e-12, (tr + disc)/2), lmin = Math.max(0, (tr - disc)/2);
  const smax = Math.sqrt(lmax), smin = Math.sqrt(lmin);
  const mu = smax > 1e-12 ? smin/smax : 0;
  return { J, det, smin, smax, mu };
}

function drawScene(){
  const { w, h, dpr } = fitCanvas(cv1);
  ctx1.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx1.clearRect(0, 0, w, h);
  const ox = w*0.34 + view1.dx, oy = h*0.66 + view1.dy;
  const U = Math.min(w, h*1.5) * 0.135;
  const X = x => ox + x*U, Y = y => oy - y*U;

  /* 网格 */
  ctx1.strokeStyle = '#efefed'; ctx1.lineWidth = 1; ctx1.beginPath();
  for(let i = -3; i <= 12; i++){ ctx1.moveTo(X(i*0.5), 0); ctx1.lineTo(X(i*0.5), h); }
  for(let j = -4; j <= 8; j++){ ctx1.moveTo(0, Y(j*0.5)); ctx1.lineTo(w, Y(j*0.5)); }
  ctx1.stroke();

  const { p, elbow } = fk(S.t1, S.t2);
  const { J, det } = metrics();
  const singular = Math.abs(det) < 0.06;

  /* 零位形 */
  ctx1.strokeStyle = '#d8d8d6'; ctx1.lineWidth = 1.4; ctx1.setLineDash([5,5]);
  ctx1.beginPath(); ctx1.moveTo(X(0), Y(0)); ctx1.lineTo(X(L1+L2), Y(0)); ctx1.stroke();
  ctx1.setLineDash([]);

  /* 连杆 */
  ctx1.strokeStyle = singular ? '#E30613' : '#111';
  ctx1.lineWidth = 3; ctx1.lineCap = 'round';
  ctx1.beginPath(); ctx1.moveTo(X(0), Y(0)); ctx1.lineTo(X(elbow[0]), Y(elbow[1]));
  ctx1.lineTo(X(p[0]), Y(p[1])); ctx1.stroke(); ctx1.lineCap = 'butt';

  [[0,0],[elbow[0],elbow[1]]].forEach(([x,y],i)=>{
    ctx1.fillStyle = '#fff'; ctx1.strokeStyle = singular ? '#E30613' : '#111'; ctx1.lineWidth = 1.6;
    ctx1.beginPath(); ctx1.arc(X(x), Y(y), i ? 5 : 7, 0, 7); ctx1.fill(); ctx1.stroke();
  });

  /* 两列 J：从末端画出去，长度按列向量模长（× 系数） */
  const KS = 46;
  const tip = [X(p[0]), Y(p[1])];
  const drawCol = (col, color, dash) => {
    const L = Math.hypot(col[0], col[1]);
    if(L < 1e-9) return;
    const e = [tip[0] + col[0]*KS, tip[1] - col[1]*KS];
    ctx1.strokeStyle = color; ctx1.lineWidth = 2.2;
    ctx1.setLineDash(dash || []);
    arrow(ctx1, tip[0], tip[1], e[0], e[1]);
    ctx1.setLineDash([]);
  };
  drawCol([J[0][0], J[1][0]], '#E30613');
  drawCol([J[0][1], J[1][1]], '#8a8a8a', [6,4]);
  drawHandle(ctx1, tip[0], tip[1], 6, '#111', false);

  /* 读数 */
  ctx1.fillStyle = '#111'; ctx1.font = 'bold 13px "Helvetica Neue",Arial';
  ctx1.fillText('det J = ' + det.toFixed(3), 16, 26);
  ctx1.font = '11px "Helvetica Neue",Arial';
  ctx1.fillStyle = singular ? '#E30613' : '#8a8a8a';
  ctx1.fillText(singular ? '两列平行 → 末端沿臂方向动不了' : '红 = J 第 1 列　灰虚线 = J 第 2 列', 16, 44);
}

function renderPanel(){
  const { J, det, mu, smin, smax } = metrics();
  setMath(document.getElementById('Jm'), numMat(J));
  document.getElementById('detOut').textContent = 'det = ' + det.toFixed(3);
  document.getElementById('muOut').textContent = 'μ₂ = ' + mu.toFixed(3);

  const sing = Math.abs(det) < 0.06;
  const near = Math.abs(det) < 0.35 && !sing;   /* det = l1 l2 sinθ2，0.35 ≈ θ2 < 16° */
  const el = document.getElementById('stat');
  if(sing){
    el.innerHTML = '<b class="warn">奇异位形</b>：两列平行（' +
      (Math.abs(S.t2) < 0.05 || Math.abs(Math.abs(S.t2) - Math.PI) < 0.05
        ? '两连杆共线' : '接近共线') + '），末端沿臂长方向的速度为零。';
  }else if(near){
    el.innerHTML = '接近奇异：σ_min = ' + smin.toFixed(3) + '，σ_max = ' + smax.toFixed(3) +
      '。μ₂ 小，关节速度稍大末端速度就会爆。';
  }else{
    el.innerHTML = '正常位形：σ_min = ' + smin.toFixed(3) + '，σ_max = ' + smax.toFixed(3) +
      '，两列张开得够开。';
  }
}

const renderPanels = (() => {
  let t = 0;
  return () => { const now = Date.now(); if(now - t > 80){ t = now; renderPanel(); } };
})();

function render(){ drawScene(); renderPanels(); }

function syncSliders(){
  document.getElementById('t1').value = Math.round(deg(S.t1));
  document.getElementById('t2').value = Math.round(deg(S.t2));
  document.getElementById('t1v').textContent = Math.round(deg(S.t1)) + '°';
  document.getElementById('t2v').textContent = Math.round(deg(S.t2)) + '°';
}

function bindInputs(){
  ['t1','t2'].forEach(id => {
    const el = document.getElementById(id);
    el.addEventListener('input', () => {
      S[id] = (+el.value) * Math.PI/180;
      document.getElementById(id + 'v').textContent = el.value + '°';
      render();
    });
  });

  document.getElementById('snapSing').onclick = () => {
    S.t2 = 0; syncSliders(); render();
  };
  document.getElementById('snapPerp').onclick = () => {
    S.t2 = Math.PI/2; syncSliders(); render();
  };

  cv1.addEventListener('pointerdown', e => {
    S.drag = true; S.dragX = e.clientX; S.dragT = [S.t1, S.t2];
    try { cv1.setPointerCapture(e.pointerId); } catch(_) {}
    e.preventDefault();
  });
  cv1.addEventListener('pointermove', e => {
    if(!S.drag) return;
    const d = (e.clientX - S.dragX) * 0.006;
    S.t1 = S.dragT[0] + d;
    S.t2 = S.dragT[1] + d*0.7;
    syncSliders(); render();
  });
  const up = () => { S.drag = null; };
  cv1.addEventListener('pointerup', up);
  cv1.addEventListener('pointercancel', up);
}

bindInputs();
window.addEventListener('resize', render);

initQuiz({
  answers: { 1:0, 2:0, 3:0 },
  why: {
    1: '第 i 列只被前面 i−1 个关节搬过：\\(\\mathrm{Ad}_{e^{\\hat\\xi_1\\theta_1}\\cdots e^{\\hat\\xi_{i-1}\\theta_{i-1}}}\\xi_i\\)。用整条臂的 \\(g_{st}\\) 是物体雅可比的换算，不是列公式。见 08.1 第 1 小节。',
    2: '每列都满足 \\(V_s=\\mathrm{Ad}_gV_b\\)，排成矩阵即 \\(J_s=\\mathrm{Ad}_{g_{st}}J_b\\)。见 08.2 第 1 小节。',
    3: '\\(\\det J_v=l_1l_2\\sin\\theta_2\\)，所以 \\(\\theta_2=0\\)（伸直）与 \\(\\pi\\)（折回）两处降秩。见 08.3 第 2 小节。'
  }
});

render();
renderPanel();
renderInlineMath(document.body);

window.__C8 = { S, fk, jac, metrics, render, renderPanel };
