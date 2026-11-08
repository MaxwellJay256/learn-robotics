/* 06 节页面逻辑（ESM）：指数积正运动学
   画布：二维平面两自由度臂；两个手柄分别拖 θ1 / θ2
   面板：两条关节旋量 + 指数积 4×4 */
import {
  fmtP, deg, clamp, animating, arrow, drawHandle, fitCanvas, tween,
  throttle, K, setMath, numMat, renderInlineMath, initQuiz,
  C1, C2, C3, eye3, rodrigues, createView,
} from "./core.js";

/* ================= 几何 ================= */
const L1 = 1.3, L2 = 1.0;
const S = { t1: 0.5, t2: 0.8, drag: null };

/* 零位形下两根轴：q1=(0,0,0)、q2=(L1,0,0)，方向都是 ẑ */
const Q1 = [0, 0, 0], Q2 = [L1, 0, 0], OM = [0, 0, 1];

/* ξ = (−ω×q, ω) */
function twistOf(q, om){
  const v = [-(om[1]*q[2]-om[2]*q[1]), -(om[2]*q[0]-om[0]*q[2]), -(om[0]*q[1]-om[1]*q[0])];
  return { v, om };
}
const XI1 = twistOf(Q1, OM), XI2 = twistOf(Q2, OM);

/* 末端位置（解析式，用于与指数积对照） */
function tipPos(t1, t2){
  return [L1*Math.cos(t1) + L2*Math.cos(t1+t2), L1*Math.sin(t1) + L2*Math.sin(t1+t2), 0];
}

/* e^{ξ̂θ}：R = e^{ω̂θ}，p = (I−R)ω̂v + ωωᵀv θ（04.2 的公式，别漏第二项） */
function expXi(xi, th){
  const om = xi.om, v = xi.v;
  const R = rodrigues(om, th);
  const Wv = [om[1]*v[2]-om[2]*v[1], om[2]*v[0]-om[0]*v[2], om[0]*v[1]-om[1]*v[0]]; // ω×v
  const p = [0,0,0];
  for(let i2=0;i2<3;i2++){
    let s2 = 0;
    for(let k=0;k<3;k++) s2 += ((k===i2?1:0) - R[i2][k]) * Wv[k];
    p[i2] = s2 + om[i2]*(om[0]*v[0]+om[1]*v[1]+om[2]*v[2])*th;
  }
  return [[R[0][0],R[0][1],R[0][2],p[0]],
          [R[1][0],R[1][1],R[1][2],p[1]],
          [R[2][0],R[2][1],R[2][2],p[2]],
          [0,0,0,1]];
}

/* 指数积：e^{ξ1θ1} e^{ξ2θ2} g_st(0)，g_st(0) = 平移 (L1+L2, 0, 0) */
function gst(t1, t2){
  const mul = (A, B) => {
    const R = [[0,0,0],[0,0,0],[0,0,0]], p = [0,0,0];
    for(let i=0;i<3;i++){
      for(let j=0;j<3;j++){
        let s = 0;
        for(let k=0;k<3;k++) s += A[i][k]*B[k][j];
        R[i][j] = s;
      }
      let s = A[i][3];
      for(let k=0;k<3;k++) s += A[i][k]*B[k][3];
      p[i] = s;
    }
    return [[R[0][0],R[0][1],R[0][2],p[0]],
            [R[1][0],R[1][1],R[1][2],p[1]],
            [R[2][0],R[2][1],R[2][2],p[2]],
            [0,0,0,1]];
  };
  const E1 = expXi(XI1, t1);
  const E2 = expXi(XI2, t2);
  const G0 = [[1,0,0,L1+L2],[0,1,0,0],[0,0,1,0],[0,0,0,1]];
  return mul(mul(E1, E2), G0);
}

/* ================= 画布 ================= */
const cv1 = document.getElementById('cv1'), ctx1 = cv1.getContext('2d');
const view1 = createView(cv1, () => drawScene(), { rotate: false });
const U2 = 130;                                  // 像素/单位
function drawScene(){
  const {w,h,dpr} = fitCanvas(cv1);
  ctx1.setTransform(dpr,0,0,dpr,0,0);
  ctx1.clearRect(0,0,w,h);
  const ox = w*0.34 + view1.dx, oy = h*0.62 + view1.dy;
  const X = x => ox + x*U2, Y = y => oy - y*U2;

  /* 网格 */
  ctx1.strokeStyle = '#ececea'; ctx1.lineWidth = 1;
  ctx1.beginPath();
  for(let i=0; X(i)<w; i++){ ctx1.moveTo(X(i),0); ctx1.lineTo(X(i),h); }
  for(let i=0; X(-i)>0; i++){ ctx1.moveTo(X(-i),0); ctx1.lineTo(X(-i),h); }
  for(let j=0; Y(j)>0; j++){ ctx1.moveTo(0,Y(j)); ctx1.lineTo(w,Y(j)); }
  for(let j=0; Y(-j)<h; j++){ ctx1.moveTo(0,Y(-j)); ctx1.lineTo(w,Y(-j)); }
  ctx1.stroke();

  /* 空间系 */
  ctx1.strokeStyle = '#111'; ctx1.lineWidth = 1.6;
  arrow(ctx1, 18, oy, w-14, oy); arrow(ctx1, ox, h-14, ox, 12);
  ctx1.fillStyle = '#111'; ctx1.font = '12px "Helvetica Neue",Arial';
  ctx1.fillText('xₛ', w-30, oy-8); ctx1.fillText('yₛ', ox+8, 22);

  /* 零位形（细灰虚线） */
  ctx1.strokeStyle = '#c9c9c9'; ctx1.lineWidth = 1.3; ctx1.setLineDash([5,4]);
  ctx1.beginPath(); ctx1.moveTo(X(0),Y(0)); ctx1.lineTo(X(L1),Y(0)); ctx1.lineTo(X(L1+L2),Y(0)); ctx1.stroke();
  ctx1.setLineDash([]);

  const {t1, t2} = S;
  const ex = L1*Math.cos(t1), ey = L1*Math.sin(t1);
  const tip = tipPos(t1, t2);

  /* 连杆 */
  ctx1.strokeStyle = '#111'; ctx1.lineWidth = 2.2;
  ctx1.beginPath();
  ctx1.moveTo(X(0),Y(0)); ctx1.lineTo(X(ex),Y(ey)); ctx1.lineTo(X(tip[0]),Y(tip[1]));
  ctx1.stroke();

  /* 关节 */
  [[0,0],[ex,ey]].forEach(([jx,jy])=>{
    ctx1.beginPath(); ctx1.arc(X(jx),Y(jy),4.5,0,7);
    ctx1.fillStyle = '#111'; ctx1.fill();
  });

  /* 工具系（红 x、深灰 y） */
  const c1 = Math.cos(t1+t2), s1 = Math.sin(t1+t2);
  ctx1.lineWidth = 2.2;
  ctx1.strokeStyle = '#E30613'; arrow(ctx1, X(tip[0]),Y(tip[1]), X(tip[0]+c1*0.55), Y(tip[1]+s1*0.55));
  ctx1.strokeStyle = '#555';    arrow(ctx1, X(tip[0]),Y(tip[1]), X(tip[0]-s1*0.55), Y(tip[1]+c1*0.55));
  ctx1.fillStyle = '#E30613'; ctx1.fillText('xᴛ', X(tip[0]+c1*0.72)-4, Y(tip[1]+s1*0.72)+4);

  /* 手柄：肘（θ1）、末端（θ2） */
  drawHandle(ctx1, X(ex), Y(ey), 9, '#E30613', S.drag === 't1');
  drawHandle(ctx1, X(tip[0]), Y(tip[1]), 9, '#555', S.drag === 't2');

  /* 读数 */
  ctx1.fillStyle = '#111'; ctx1.font = 'bold 13px "Helvetica Neue",Arial';
  ctx1.fillText('θ₁ = ' + deg(t1).toFixed(1) + '°　θ₂ = ' + deg(t2).toFixed(1) + '°', 16, 26);
  ctx1.font = '11px "Helvetica Neue",Arial'; ctx1.fillStyle = '#8a8a8a';
  ctx1.fillText('拖红柄转 θ₁，拖灰柄转 θ₂；灰虚线是零位形', 16, 44);
}

/* 手柄拾取：肘点 / 末端点 */
function handles(){
  const {t1, t2} = S;
  const ex = L1*Math.cos(t1), ey = L1*Math.sin(t1);
  const tip = tipPos(t1, t2);
  const {w,h} = {w: cv1.clientWidth, h: cv1.clientHeight};
  const ox = w*0.34 + view1.dx, oy = h*0.62 + view1.dy;
  return {
    elbow: [ox + ex*U2, oy - ey*U2],
    tip: [ox + tip[0]*U2, oy - tip[1]*U2],
    ox, oy
  };
}
function bindDrag(){
  cv1.addEventListener('pointerdown', e=>{
    if(animating(S)) return;
    const r = cv1.getBoundingClientRect();
    const sx = e.clientX - r.left, sy = e.clientY - r.top;
    const H = handles();
    if(Math.hypot(sx - H.elbow[0], sy - H.elbow[1]) < 16){ S.drag = 't1'; }
    else if(Math.hypot(sx - H.tip[0], sy - H.tip[1]) < 16){ S.drag = 't2'; }
    if(S.drag){ try { cv1.setPointerCapture(e.pointerId); } catch(_) {} e.preventDefault(); drawScene(); }
  });
  cv1.addEventListener('pointermove', e=>{
    if(!S.drag) return;
    const r = cv1.getBoundingClientRect();
    const sx = e.clientX - r.left, sy = e.clientY - r.top;
    const H = handles();
    if(S.drag === 't1'){
      S.t1 = Math.atan2(-(sy - H.oy), sx - H.ox);
    }else{
      const ex = L1*Math.cos(S.t1), ey = L1*Math.sin(S.t1);
      const ang = Math.atan2(-(sy - (H.oy - ey*U2)), sx - (H.ox + ex*U2));
      S.t2 = ang - S.t1;
    }
    render(); renderPanels();
  });
  const up = ()=>{
    if(!S.drag) return;
    S.drag = null; renderPanels();
  };
  cv1.addEventListener('pointerup', up); cv1.addEventListener('pointercancel', up);
}

/* ================= 面板 ================= */
function xiTex(xi){
  return `\\xi = \\begin{bmatrix}` +
    xi.v.map(x => `\\color{${C2}}{${fmtP(x)}}`).join(' \\\\ ') + ` \\\\ ` +
    xi.om.map(x => `\\color{${C1}}{${fmtP(x)}}`).join(' \\\\ ') +
    `\\end{bmatrix}`;
}
function renderPanel(){
  const {t1, t2} = S;
  document.getElementById('xiOut').textContent =
    'θ = (' + deg(t1).toFixed(0) + '°, ' + deg(t2).toFixed(0) + '°)';
  setMath(document.getElementById('Xi1'), xiTex(XI1));
  setMath(document.getElementById('Xi2'), xiTex(XI2));

  /* 零位形旋量是常量；真正随 θ1 移动的是第二关节的轴点 q2 */
  const q2 = [L1*Math.cos(t1), L1*Math.sin(t1), 0];
  setMath(document.getElementById('Q2Live'),
    `q_2(\\theta) = \\begin{bmatrix}` +
    q2.map(x => `\\color{${C2}}{${fmtP(x)}}`).join(' \\\\ ') +
    `\\end{bmatrix}`);

  const g = gst(t1, t2);
  document.getElementById('gOut').textContent = 'g live';
  setMath(document.getElementById('Gmat'), numMat(g, [C1, C2, C3, null]));
}

/* ================= 渲染节奏 ================= */
function render(){ drawScene(); }
const renderPanels = throttle(() => { renderPanel(); }, 80);

/* ================= 按钮 ================= */
function tweenTo(target, done){
  const from = {t1: S.t1, t2: S.t2};
  tween(S, 700, k => {
    S.t1 = from.t1 + (target.t1 - from.t1)*k;
    S.t2 = from.t2 + (target.t2 - from.t2)*k;
    render(); renderPanels();
  }, done);
}
document.getElementById('anim1').onclick = () => {
  S.t1 = 0; S.t2 = 0; render();
  tweenTo({t1: 0.5, t2: 0.8}, () => renderPanels());
};
document.getElementById('snap45').onclick = () =>
  tweenTo({t1: Math.PI/4, t2: Math.PI/4}, () => renderPanels());
document.getElementById('reset1').onclick = () => {
  S.t1 = 0; S.t2 = 0; render(); renderPanels();
};

bindDrag();
window.addEventListener('resize', render);

/* ================= 小测 ================= */
initQuiz({
  answers: { 1:0, 2:0, 3:0 },
  why: {
    1: '\\(h=0\\) 时 \\(v=-\\omega\\times q\\)。符号别丢：原点在轴的“外侧”时，绕轴转会把原点甩向 \\(-\\omega\\times q\\) 方向。见 06.1 第 1 小节。',
    2: '指数积按关节顺序左乘，零位形 \\(g_{st}(0)\\) 在最右。放左边等于“只有工具在转”，顺序反了等于“从末端往基座装”。见 06.2 第 1、3 小节。',
    3: '\\(g_{st}(0)\\) 是零位形下工具系相对空间系的位姿，一般不是单位阵（工具离原点有距离）。它是量出来的常数。见 06.2 第 2 小节。'
  }
});

render();
renderPanel();
renderInlineMath(document.body);

/* 调试钩子：自动化测试用 */
window.__C6 = { S, gst, tipPos, XI1, XI2, L1, L2 };
