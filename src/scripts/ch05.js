/* 05 节页面逻辑（ESM）：空间速度 · 物体速度 · 伴随
   画布：二维两自由度臂；红箭头 = v_s，灰箭头 = R v_b
   面板：V_s、V_b 两个 6×1 与 Ad 换算校验 */
import {
  fmtP, deg, clamp, arrow, dashedArrow, drawHandle, fitCanvas,
  K, setMath, numMat, renderInlineMath, initQuiz, createView,
} from "./core.js";

/* ================= 几何 ================= */
const L1 = 1.3, L2 = 1.0;
const S = { t1: Math.PI/6, t2: Math.PI/4, w1: 1, w2: 0.5, drag: null, dragT: 0, dragX: 0 };

const cv1 = document.getElementById('cv1'), ctx1 = cv1.getContext('2d');
const view1 = createView(cv1, () => drawScene(), { rotate: false });

const cos = Math.cos, sin = Math.sin;
const sub = (a,b) => [a[0]-b[0], a[1]-b[1]];
const add = (a,b) => [a[0]+b[0], a[1]+b[1]];
const mul = (a,s) => [a[0]*s, a[1]*s];

/* 平面两连杆：末端位置与朝向 */
function fk(t1, t2){
  const p = [L1*cos(t1) + L2*cos(t1+t2), L1*sin(t1) + L2*sin(t1+t2)];
  return { p, phi: t1 + t2, elbow: [L1*cos(t1), L1*sin(t1)] };
}

/* 空间雅可比（平面版）：两列都是 6×1，只有 vx, vy, ωz 三个分量非零 */
function jac(t1, t2){
  /* ξ1 = (0,0,0; 0,0,1)；ξ2 = (0,−L1,0; 0,0,1)，q2=(L1,0,0)
     J_s 第 2 列 = Ad_{e^{ξ1θ1}} ξ2：旋转把 v 一起转 */
  const c = cos(t1), s = sin(t1);
  /* Ad_g ξ 对纯旋转 g=(R,0)：v' = R v, ω' = R ω；ξ2 的 v = −ẑ×q2 = (0,−L1) */
  const vb2 = [0, -L1];
  const v2r = [c*vb2[0] - s*vb2[1], s*vb2[0] + c*vb2[1]];
  return [
    [0, v2r[0]],          // vx
    [0, v2r[1]],          // vy
    [0, 0],               // vz
    [0, 0],               // ωx
    [0, 0],               // ωy
    [1, 1],               // ωz
  ];
}

function velocities(){
  const { p, phi } = fk(S.t1, S.t2);
  const J = jac(S.t1, S.t2);
  const Vs = J.map(row => row[0]*S.w1 + row[1]*S.w2);
  /* V_b = Ad_{g^{-1}} V_s：R^T 转回去，v_b = R^T(v_s − ω×p) */
  const c = cos(phi), s = sin(phi);
  const w = Vs[5];
  const vsp = [Vs[0], Vs[1]];
  const wxp = [-w*p[1], w*p[0]];
  const rel = sub(vsp, wxp);
  const vb = [c*rel[0] + s*rel[1], -s*rel[0] + c*rel[1]];
  const Vb = [vb[0], vb[1], 0, 0, 0, w];
  return { p, phi, J, Vs, Vb };
}

/* ================= 画布 ================= */
function drawScene(){
  const { w, h, dpr } = fitCanvas(cv1);
  ctx1.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx1.clearRect(0, 0, w, h);
  const ox = w*0.30 + view1.dx, oy = h*0.62 + view1.dy;
  const U = Math.min(w, h*1.5) * 0.135;
  const X = x => ox + x*U, Y = y => oy - y*U;

  /* 网格 */
  ctx1.strokeStyle = '#efefed'; ctx1.lineWidth = 1;
  ctx1.beginPath();
  for(let i = -2; i <= 10; i++){ ctx1.moveTo(X(i*0.5), 0); ctx1.lineTo(X(i*0.5), h); }
  for(let j = -6; j <= 6; j++){ ctx1.moveTo(0, Y(j*0.5)); ctx1.lineTo(w, Y(j*0.5)); }
  ctx1.stroke();

  const { p, phi, Vs, Vb } = velocities();
  const { elbow } = fk(S.t1, S.t2);

  /* 零位形对照 */
  ctx1.strokeStyle = '#d8d8d6'; ctx1.lineWidth = 1.4; ctx1.setLineDash([5,5]);
  ctx1.beginPath(); ctx1.moveTo(X(0), Y(0)); ctx1.lineTo(X(L1+L2), Y(0)); ctx1.stroke();
  ctx1.setLineDash([]);

  /* 连杆 */
  ctx1.strokeStyle = '#111'; ctx1.lineWidth = 3; ctx1.lineCap = 'round';
  ctx1.beginPath(); ctx1.moveTo(X(0), Y(0)); ctx1.lineTo(X(elbow[0]), Y(elbow[1]));
  ctx1.lineTo(X(p[0]), Y(p[1])); ctx1.stroke();
  ctx1.lineCap = 'butt';

  /* 关节 */
  [[0,0],[elbow[0],elbow[1]]].forEach(([x,y],i)=>{
    ctx1.fillStyle = '#fff'; ctx1.strokeStyle = '#111'; ctx1.lineWidth = 1.6;
    ctx1.beginPath(); ctx1.arc(X(x), Y(y), i ? 5 : 7, 0, 7); ctx1.fill(); ctx1.stroke();
  });

  /* 工具系两根轴 */
  const ex = [cos(phi), sin(phi)], ey = [-sin(phi), cos(phi)];
  arrow(ctx1, X(p[0]), Y(p[1]), X(p[0] + 0.45*ex[0]), Y(p[1] + 0.45*ex[1]));
  ctx1.strokeStyle = '#888'; ctx1.lineWidth = 1.2;
  arrow(ctx1, X(p[0]), Y(p[1]), X(p[0] + 0.45*ey[0]), Y(p[1] + 0.45*ey[1]));

  /* 速度箭头：红 = v_s，灰 = R v_b（两者差一个 ω×p） */
  const KS = 52;
  const tip = [X(p[0]), Y(p[1])];
  const vsEnd = [tip[0] + Vs[0]*KS, tip[1] - Vs[1]*KS];
  const c = cos(phi), s = sin(phi);
  const rvb = [c*Vb[0] - s*Vb[1], s*Vb[0] + c*Vb[1]];
  const vbEnd = [tip[0] + rvb[0]*KS, tip[1] - rvb[1]*KS];
  ctx1.strokeStyle = '#9a9a9a'; ctx1.lineWidth = 2.2; ctx1.setLineDash([6,4]);
  arrow(ctx1, tip[0], tip[1], vbEnd[0], vbEnd[1]);
  ctx1.setLineDash([]);
  ctx1.strokeStyle = '#E30613'; ctx1.lineWidth = 2.4;
  arrow(ctx1, tip[0], tip[1], vsEnd[0], vsEnd[1]);
  drawHandle(ctx1, tip[0], tip[1], 6, '#E30613', false);

  /* 读数 */
  ctx1.fillStyle = '#111'; ctx1.font = 'bold 13px "Helvetica Neue",Arial';
  ctx1.fillText('|v_s| = ' + Math.hypot(Vs[0], Vs[1]).toFixed(2) +
                '　|v_b| = ' + Math.hypot(Vb[0], Vb[1]).toFixed(2), 16, 26);
  ctx1.font = '11px "Helvetica Neue",Arial'; ctx1.fillStyle = '#8a8a8a';
  ctx1.fillText('红 = v_s（空间系）　灰虚线 = R·v_b（把物体速度转回空间方向）', 16, 44);
}

/* ================= 面板 ================= */
const fmt6 = v => numMat(v.map(x => [x]));

function renderPanel(){
  const { Vs, Vb } = velocities();
  document.getElementById('vsOut').textContent = 'ω = ' + Vs[5].toFixed(2);
  document.getElementById('vbOut').textContent = 'ω = ' + Vb[5].toFixed(2);
  setMath(document.getElementById('Vs'), fmt6(Vs));
  setMath(document.getElementById('Vb'), fmt6(Vb));

  /* Ad_g V_b − V_s 的残差：应当为 0 */
  const { p, phi } = velocities();
  const c = cos(phi), s = sin(phi);
  const vRec = [c*Vb[0] - s*Vb[1], s*Vb[0] + c*Vb[1]];
  const corr = [-Vb[5]*p[1], Vb[5]*p[0]];
  const res = Math.hypot(Vs[0] - (vRec[0] + corr[0]), Vs[1] - (vRec[1] + corr[1]));
  document.getElementById('chkOut').textContent = 'res = ' + res.toExponential(1);
  document.getElementById('chk').innerHTML =
    'V_s = Ad_g V_b：先 R v_b 转进空间方向，再补 ω×p 的 <b>' +
    Math.hypot(corr[0], corr[1]).toFixed(2) + '</b>。残差 ' + res.toExponential(1) +
    '，说明两者是同一个旋量的两份坐标。';
}

const renderPanels = (() => {
  let t = 0;
  return () => { const now = Date.now(); if(now - t > 80){ t = now; renderPanel(); } };
})();

function render(){ drawScene(); renderPanels(); }

/* ================= 交互 ================= */
function bindInputs(){
  const pairs = [['t1','t1v', v => Math.round(deg(v)) + '°'], ['t2','t2v', v => Math.round(deg(v)) + '°'],
                 ['w1','w1v', v => v.toFixed(2)], ['w2','w2v', v => v.toFixed(2)]];
  pairs.forEach(([id, outId, fmt]) => {
    const el = document.getElementById(id), out = document.getElementById(outId);
    el.addEventListener('input', () => {
      const v = +el.value;
      if(id === 't1' || id === 't2') S[id] = v * Math.PI / 180;
      else S[id] = v;
      out.textContent = fmt(id[0] === 't' ? S[id] : S[id]);
      render();
    });
  });

  /* 拖末端改 θ1、θ2（逆解式：抓住末端甩） */
  cv1.addEventListener('pointerdown', e => {
    S.drag = true; S.dragX = e.clientX;
    S.dragT = [S.t1, S.t2];
    try { cv1.setPointerCapture(e.pointerId); } catch(_) {}
    e.preventDefault();
  });
  cv1.addEventListener('pointermove', e => {
    if(!S.drag) return;
    const d = (e.clientX - S.dragX) * 0.006;
    S.t1 = S.dragT[0] + d;
    S.t2 = S.dragT[1] + d*0.6;
    document.getElementById('t1').value = Math.round(deg(S.t1));
    document.getElementById('t2').value = Math.round(deg(S.t2));
    document.getElementById('t1v').textContent = Math.round(deg(S.t1)) + '°';
    document.getElementById('t2v').textContent = Math.round(deg(S.t2)) + '°';
    render();
  });
  const up = () => { S.drag = null; };
  cv1.addEventListener('pointerup', up);
  cv1.addEventListener('pointercancel', up);
}

bindInputs();
window.addEventListener('resize', render);

initQuiz({
  answers: { 1:1, 2:2, 3:0 },
  why: {
    1: '右乘自己的转置读空间系：\\(\\dot R R^{\\mathsf T}\\)；左乘读物体系。见 05.1 第 2 小节。',
    2: '按定义 \\(v_s=\\dot p-\\omega_s\\times p=(0,1,0)-(0,1,0)=0\\)。末端在动，但与空间原点重合的那一点在转轴上，所以 \\(v_s=0\\)。见 05.2 第 2 小节。',
    3: '\\(\\mathrm{Ad}_g\\) 的右上块是 \\(\\hat pR\\)：先把角速度转进空间系，再做叉乘。见 05.3 第 1 小节。'
  }
});

render();
renderPanel();
renderInlineMath(document.body);

/* 调试钩子（放在末尾，避免 TDZ） */
window.__C5 = { S, fk, jac, velocities, render, renderPanel };
