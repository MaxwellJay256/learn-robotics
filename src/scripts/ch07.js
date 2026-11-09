/* 07 节页面逻辑（ESM）：逆运动学
   四块画布，分别对应三张子问题图与 07.4 的平面 2R 图：
     cv1  子问题 1：沿轴看（垂直平面）+ ρ–h 图
     cv2  子问题 2：两圆交点（3D 等轴测）
     cv3  子问题 3：距离曲线上的两个解
     cv4  07.4：平面 2R 的两支解
   面板：实时公式与状态；小测在文末。 */
import {
  fmtP, deg, clamp, arrow, dashedArrow, drawHandle, fitCanvas,
  setMath, renderInlineMath, initQuiz, createView,
} from "./core.js";

const INK = '#111', RED = '#E30613', BLUE = '#1f5fa8', GRAY = '#8a8a8a',
      HAIR = '#d9d9d9', SOFT = '#f4f4f2';
const DEG = Math.PI / 180;
const S2Q = Math.SQRT1_2;                 // √2/2
const sgn = v => (v < 0 ? '−' : '+');
const fx = v => (Math.abs(v) < 5e-4 ? 0 : v).toFixed(2);

/* 细网格：只用于二维面板 */
function gridBox(ctx, x0, y0, x1, y1, step){
  ctx.strokeStyle = '#efefed'; ctx.lineWidth = 1; ctx.beginPath();
  for(let x = x0; x <= x1 + 0.1; x += step){ ctx.moveTo(x, y0); ctx.lineTo(x, y1); }
  for(let y = y0; y <= y1 + 0.1; y += step){ ctx.moveTo(x0, y); ctx.lineTo(x1, y); }
  ctx.stroke();
}

/* =====================================================================
   子问题 1：e^{ξθ}p = q，沿轴看与 ρ–h 图
   ===================================================================== */
(function(){
  const cv = document.getElementById('cv1'); if(!cv) return;
  const ctx = cv.getContext('2d');
  const S = { th: 30*DEG, phi: Math.PI/2, badR: false, badH: false };

  function geom(){
    const rq = S.badR ? 1.45 : 1.0;          // |v⊥|
    const hgt = S.badH ? 0.55 : 0.0;         // 沿轴高度
    const vx = rq*Math.cos(S.phi), vy = rq*Math.sin(S.phi);
    /* u⊥=(1,0,0)、ω=ẑ：ωᵀ(u⊥×v⊥)=vy，u⊥ᵀv⊥=vx */
    const thSol = Math.atan2(vy, vx);
    const okR = Math.abs(rq - 1) < 1e-9, okH = Math.abs(hgt) < 1e-9;
    return { rq, hgt, vx, vy, thSol, okR, okH, ok: okR && okH };
  }

  function draw(){
    const { w, h, dpr } = fitCanvas(cv);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const g = geom();

    /* ---------- 左：垂直平面（沿轴看） ---------- */
    const lcx = w*0.27, lcy = h*0.53, U = Math.min(w*0.16, h*0.30);
    gridBox(ctx, lcx - U*1.7, lcy - U*1.7, lcx + U*1.7, lcy + U*1.7, U*0.5);
    ctx.strokeStyle = '#cfcfcd'; ctx.fillStyle = '#cfcfcd'; ctx.lineWidth = 1.2;
    arrow(ctx, lcx - U*1.7, lcy, lcx + U*1.75, lcy);
    arrow(ctx, lcx, lcy + U*1.7, lcx, lcy - U*1.75);
    ctx.fillStyle = GRAY; ctx.font = '11px "Helvetica Neue",Arial';
    ctx.fillText('x', lcx + U*1.62, lcy - 8); ctx.fillText('y', lcx + 8, lcy - U*1.55);

    /* 单位圆（p 的旋转圆） */
    ctx.strokeStyle = HAIR; ctx.lineWidth = 1.4; ctx.setLineDash([6, 5]);
    ctx.beginPath(); ctx.arc(lcx, lcy, U, 0, Math.PI*2); ctx.stroke();
    ctx.setLineDash([]);
    /* 目标方向 v⊥ 与 p 当前位置 */
    const vx = g.vx, vy = g.vy;
    ctx.strokeStyle = GRAY; ctx.lineWidth = 2;
    arrow(ctx, lcx, lcy, lcx + vx*U, lcy - vy*U);
    ctx.fillStyle = GRAY;
    ctx.beginPath(); ctx.arc(lcx + vx*U, lcy - vy*U, 5, 0, 7); ctx.fill();
    const px = Math.cos(S.th), py = Math.sin(S.th);
    ctx.strokeStyle = RED; ctx.lineWidth = 2;
    arrow(ctx, lcx, lcy, lcx + px*U, lcy - py*U);
    ctx.fillStyle = RED;
    ctx.beginPath(); ctx.arc(lcx + px*U, lcy - py*U, 6, 0, 7); ctx.fill();
    /* 转角弧线 */
    const RARC = U*0.38;
    ctx.strokeStyle = RED; ctx.lineWidth = 1.6; ctx.beginPath();
    const N = 40;
    for(let i = 0; i <= N; i++){
      const a = S.th * i / N;
      const X = lcx + RARC*Math.cos(a), Y = lcy - RARC*Math.sin(a);
      if(i === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
    }
    ctx.stroke();
    const am = S.th / 2;
    ctx.fillStyle = RED; ctx.font = 'bold 12px "Helvetica Neue",Arial';
    ctx.fillText('θ', lcx + RARC*1.18*Math.cos(am) - 4, lcy - RARC*1.18*Math.sin(am) + 4);
    ctx.fillStyle = '#111'; ctx.font = '11px "Helvetica Neue",Arial';
    ctx.fillText('p(θ)', lcx + px*U + 9, lcy - py*U - 8);
    const dAng = Math.abs(Math.atan2(Math.sin(S.th - S.phi), Math.cos(S.th - S.phi)));
    if(g.ok && dAng < 1*DEG){
      ctx.fillStyle = RED;
      ctx.fillText('重合', lcx + px*U + 12, lcy - py*U - 24);
    } else {
      ctx.fillStyle = GRAY;
      ctx.fillText('q 的投影', lcx + vx*U + 10, lcy - vy*U + 16);
    }
    const narrow = w < 560;
    ctx.fillStyle = INK; ctx.font = 'bold 11px "Helvetica Neue",Arial';
    ctx.fillText(narrow ? '沿轴看' : '垂直平面 · 沿轴看', 16, 24);

    /* ---------- 右：ρ–h 图 ---------- */
    const rx0 = w*0.60, ry0 = h*0.53, U2 = Math.min(w*0.095, h*0.17);
    gridBox(ctx, rx0 - U2*0.18, ry0 - U2*1.2, rx0 + U2*2.25, ry0 + U2*1.2, U2*0.5);
    ctx.strokeStyle = '#cfcfcd'; ctx.fillStyle = '#cfcfcd'; ctx.lineWidth = 1.2;
    arrow(ctx, rx0 - U2*0.2, ry0, rx0 + U2*2.35, ry0);
    arrow(ctx, rx0, ry0 + U2*1.25, rx0, ry0 - U2*1.3);
    ctx.fillStyle = GRAY; ctx.font = '11px "Helvetica Neue",Arial';
    ctx.fillText('ρ', rx0 + U2*2.05, ry0 + 16);
    ctx.fillText('h', rx0 + 8, ry0 - U2*1.18);
    ctx.strokeStyle = '#cfcfcd'; ctx.lineWidth = 1;
    [0, 0.5, 1.0, 1.5, 2.0].forEach(r => {
      ctx.beginPath(); ctx.moveTo(rx0 + r*U2, ry0); ctx.lineTo(rx0 + r*U2, ry0 + 4); ctx.stroke();
    });
    [0, 1, -1].forEach(v => {
      ctx.beginPath(); ctx.moveTo(rx0, ry0 - v*U2); ctx.lineTo(rx0 - 4, ry0 - v*U2); ctx.stroke();
    });
    ctx.fillStyle = GRAY; ctx.font = '9.5px "Helvetica Neue",Arial';
    ctx.textAlign = 'center';
    ctx.fillText('1', rx0 + U2, ry0 + 14);
    ctx.fillText('2', rx0 + 2*U2, ry0 + 14);
    ctx.textAlign = 'right';
    ctx.fillText('1', rx0 - 6, ry0 - U2 + 3);
    ctx.fillText('−1', rx0 - 6, ry0 + U2 + 3);
    ctx.textAlign = 'left';
    /* p 的 ρ–h 坐标：绕轴转不改变 */
    const px2 = rx0 + 1.0*U2, py2 = ry0;
    ctx.strokeStyle = RED; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(px2, py2, 7, 0, 7); ctx.stroke();
    ctx.fillStyle = RED;
    ctx.beginPath(); ctx.arc(px2, py2, 3.2, 0, 7); ctx.fill();
    /* q 的 ρ–h 坐标 */
    const qx2 = rx0 + g.rq*U2, qy2 = ry0 - g.hgt*U2;
    ctx.strokeStyle = GRAY; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(qx2, qy2, 7, 0, 7); ctx.stroke();
    ctx.fillStyle = GRAY;
    ctx.beginPath(); ctx.arc(qx2, qy2, 3.2, 0, 7); ctx.fill();
    if(g.ok){
      ctx.strokeStyle = RED; ctx.lineWidth = 1.4; ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.arc(px2, py2, 13, 0, 7); ctx.stroke();
      ctx.setLineDash([]);
    } else {
      ctx.strokeStyle = RED; ctx.lineWidth = 1.2; ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(px2, py2); ctx.lineTo(qx2, qy2); ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.fillStyle = INK; ctx.font = '11px "Helvetica Neue",Arial';
    if(g.ok){
      ctx.fillText('p = q', px2 + 15, py2 - 9);
    } else {
      ctx.fillText('p', px2 + 11, py2 + 4);
      ctx.fillStyle = GRAY;
      ctx.fillText('q', qx2 + 10, qy2 - 8);
    }
    ctx.fillStyle = INK; ctx.font = 'bold 11px "Helvetica Neue",Arial';
    ctx.fillText(narrow ? 'ρ–h' : 'ρ–h 平面 · 旋转不改变这两个数', w*0.60, 24);
    ctx.fillStyle = g.ok ? '#3a7d44' : RED; ctx.font = 'bold 12px "Helvetica Neue",Arial';
    ctx.fillText(narrow ? (g.ok ? '重合 → 有解' : '不重合 → 无解') : (g.ok ? '两点重合 → 有解' : '两点不重合 → 无解'), w*0.60, 42);

    updatePanel(g);
  }

  function updatePanel(g){
    setMath(document.getElementById('s1cond'),
      `\\omega^{\\mathsf T}u=0,\\quad\\omega^{\\mathsf T}v=${fx(g.hgt)},\\qquad ` +
      `\\lVert u_\\perp\\rVert=1,\\quad\\lVert v_\\perp\\rVert=${fx(g.rq)}`);
    const thSol = deg(g.thSol);
    setMath(document.getElementById('s1ang'),
      `\\theta=\\mathrm{atan2}\\bigl(\\omega^{\\mathsf T}(u_\\perp\\times v_\\perp),\\,u_\\perp^{\\mathsf T}v_\\perp\\bigr)` +
      `=\\mathrm{atan2}(${fx(g.vy)},\\,${fx(g.vx)})=${thSol.toFixed(1)}^\\circ`);
    const stat = document.getElementById('s1statOut');
    const note = document.getElementById('s1note');
    stat.textContent = g.ok ? '有解' : '无解';
    stat.style.color = g.ok ? '#3a7d44' : RED;
    let txt;
    if(g.ok){
      txt = `两条条件都满足：把 θ 拖到 ${(deg(g.thSol)).toFixed(1)}°，红点 p(θ) 就落到灰色目标点上，这就是唯一的解（在 0°–360° 内）。`;
    } else if(!g.okR){
      txt = `半径不等：\\(\\lVert u_\\perp\\rVert=1\\) 而 \\(\\lVert v_\\perp\\rVert=${fx(g.rq)}\\)，q 不在 p 的旋转圆上，无论转多少度都对不上。`;
    } else {
      txt = `高度不等：\\(\\omega^{\\mathsf T}u=0\\) 而 \\(\\omega^{\\mathsf T}v=${fx(g.hgt)}\\)，q 不在 p 的旋转平面内；绕轴转只在平面内走，永远到不了 q。`;
    }
    note.innerHTML = txt;
    renderInlineMath(note);
    document.getElementById('s1thv').textContent = Math.round(deg(S.th)) + '°';
    document.getElementById('s1phiv').textContent = Math.round(deg(S.phi)) + '°';
  }

  const thEl = document.getElementById('s1th'), phiEl = document.getElementById('s1phi');
  thEl.value = 30;
  thEl.addEventListener('input', () => { S.th = (+thEl.value)*DEG; draw(); });
  phiEl.addEventListener('input', () => { S.phi = (+phiEl.value)*DEG; draw(); });
  const btnR = document.getElementById('s1badr'), btnH = document.getElementById('s1badh');
  btnR.addEventListener('click', () => {
    S.badR = !S.badR;
    btnR.textContent = S.badR ? '恢复：半径相等' : '破坏：半径不等';
    draw();
  });
  btnH.addEventListener('click', () => {
    S.badH = !S.badH;
    btnH.textContent = S.badH ? '恢复：高度相等' : '破坏：高度不等';
    draw();
  });
  document.getElementById('s1reset').addEventListener('click', () => {
    S.th = 30*DEG; S.phi = Math.PI/2; S.badR = false; S.badH = false;
    thEl.value = 30; phiEl.value = 90;
    btnR.textContent = '破坏：半径不等'; btnH.textContent = '破坏：高度不等';
    draw();
  });
  window.addEventListener('resize', draw);
  draw();
  window.__C7_S1 = { S, geom, draw };
})();

/* =====================================================================
   子问题 2：e^{ξ1θ1} e^{ξ2θ2} p = q，两圆交点 z±
   ===================================================================== */
(function(){
  const cv = document.getElementById('cv2'); if(!cv) return;
  const ctx = cv.getContext('2d');
  const S = { t1: 40*DEG, t2: 20*DEG };
  const PM = [0, 1, 0];
  const QM = [-S2Q, 0, S2Q];
  const ZP = [0, S2Q, S2Q], ZM = [0, -S2Q, S2Q];
  const YAW = 0.72, PITCH = 0.40;

  function rotX(v, a){
    const c = Math.cos(a), s = Math.sin(a);
    return [v[0], v[1]*c - v[2]*s, v[1]*s + v[2]*c];
  }
  function rotZ(v, a){
    const c = Math.cos(a), s = Math.sin(a);
    return [v[0]*c - v[1]*s, v[0]*s + v[1]*c, v[2]];
  }
  const sub = (a, b) => [a[0]-b[0], a[1]-b[1], a[2]-b[2]];
  const norm = v => Math.hypot(v[0], v[1], v[2]);

  function project(x, y, z, cx, cy, sc){
    const X = x*Math.cos(YAW) - y*Math.sin(YAW);
    const Y = z*Math.cos(PITCH) - (x*Math.sin(YAW) + y*Math.cos(YAW))*Math.sin(PITCH);
    return [cx + X*sc, cy - Y*sc];
  }

  function draw(){
    const { w, h, dpr } = fitCanvas(cv);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const narrow = w < 560;
    const cx = w*0.50, cy = h*(narrow ? 0.64 : 0.56), sc = Math.min(w, h*1.55)*0.205;
    const P = (v) => project(v[0], v[1], v[2], cx, cy, sc);

    /* 坐标轴 */
    const axes = [[[1.25,0,0], 'x'], [[0,1.25,0], 'y'], [[0,0,1.25], 'z']];
    axes.forEach(([v, name]) => {
      const p0 = P([0,0,0]), p1 = P(v);
      ctx.strokeStyle = '#cfcfcd'; ctx.fillStyle = '#cfcfcd'; ctx.lineWidth = 1.2;
      arrow(ctx, p0[0], p0[1], p1[0], p1[1]);
      ctx.fillStyle = GRAY; ctx.font = '11px "Helvetica Neue",Arial';
      ctx.fillText(name, p1[0] + 6, p1[1] - 4);
    });

    /* 圆 C2：p 绕 x 轴；圆 C1：q 绕 z 轴转回来的轨迹 */
    const drawCircle = (fn, color, dash) => {
      ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.setLineDash(dash || []);
      ctx.beginPath();
      for(let i = 0; i <= 96; i++){
        const a = Math.PI*2*i/96;
        const p = P(fn(a));
        if(i === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]);
      }
      ctx.stroke(); ctx.setLineDash([]);
    };
    drawCircle(a => [0, Math.cos(a), Math.sin(a)], BLUE, [6, 5]);
    drawCircle(a => [S2Q*Math.cos(a), S2Q*Math.sin(a), S2Q], HAIR, [6, 5]);

    /* 两圆交点 z± */
    [ZP, ZM].forEach((z, i) => {
      const p = P(z);
      ctx.strokeStyle = INK; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.arc(p[0], p[1], 6, 0, 7); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.fill();
      ctx.fillStyle = INK; ctx.font = 'bold 11px "Helvetica Neue",Arial';
      ctx.fillText(i === 0 ? 'z₊' : 'z₋', p[0] + 9, p[1] - 5);
    });

    /* 当前两步旋转 */
    const c = rotX(PM, S.t2);
    const fin = rotZ(c, S.t1);
    const pp = P(PM), pc = P(c), pf = P(fin), pq = P(QM);
    ctx.strokeStyle = BLUE; ctx.lineWidth = 2;
    arrow(ctx, pp[0], pp[1], pc[0], pc[1]);
    ctx.strokeStyle = RED; ctx.lineWidth = 2;
    arrow(ctx, pc[0], pc[1], pf[0], pf[1]);

    const dot = (p, color, r) => {
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, 7); ctx.fill();
    };
    const tag = (p, text, color, dx, dy) => {
      ctx.fillStyle = color; ctx.font = 'bold 11px "Helvetica Neue",Arial';
      ctx.fillText(text, p[0] + dx, p[1] + dy);
    };
    dot(pp, INK, 5); dot(pc, BLUE, 6); dot(pf, RED, 6);
    tag(pp, 'p', INK, -14, -6);
    tag(pc, 'c', BLUE, 10, 4);
    tag(pf, '结果', RED, -38, 2);
    /* q 用方块表示 */
    ctx.strokeStyle = INK; ctx.lineWidth = 2;
    ctx.strokeRect(pq[0] - 5, pq[1] - 5, 10, 10);
    ctx.fillStyle = INK; ctx.font = 'bold 11px "Helvetica Neue",Arial';
    ctx.fillText('q', pq[0] + 9, pq[1] + 4);

    const err = norm(sub(fin, QM));
    if(err < 0.04){
      ctx.strokeStyle = '#3a7d44'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(pq[0], pq[1], 13, 0, 7); ctx.stroke();
    }

    /* 画布角注 */
    ctx.fillStyle = INK; ctx.font = 'bold 11px "Helvetica Neue",Arial';
    ctx.fillText(narrow ? '蓝：绕 x 转 → c　红：再绕 z 转' : '蓝：p 绕 x 轴转 θ₂ 到 c　红：再绕 z 轴转 θ₁', 16, 24);
    if(!narrow){
      ctx.font = '11px "Helvetica Neue",Arial'; ctx.fillStyle = BLUE;
      ctx.fillText('蓝虚线：c 绕 x 轴转的圆', 16, 42);
      ctx.fillStyle = GRAY;
      ctx.fillText('灰虚线：z 绕 z 轴转的圆（q 转回去的轨迹）', 16, 58);
    }

    updatePanel(err, c);
  }

  function updatePanel(err, c){
    setMath(document.getElementById('s2z'),
      `z_\\pm=\\bigl(0,\\;\\pm\\tfrac{\\sqrt2}{2},\\;\\tfrac{\\sqrt2}{2}\\bigr),\\qquad ` +
      `c=\\bigl(0,\\;${fx(c[1])},\\;${fx(c[2])}\\bigr)`);
    setMath(document.getElementById('s2abg'),
      `\\alpha=\\tfrac{\\sqrt2}{2},\\quad\\beta=0,\\quad\\gamma=\\pm\\tfrac{\\sqrt2}{2}`);
    document.getElementById('s2t2v').textContent = Math.round(deg(S.t2)) + '°';
    document.getElementById('s2t1v').textContent = Math.round(deg(S.t1)) + '°';
    document.getElementById('s2zOut').textContent = err < 0.04 ? '命中 q' : '未命中';
    const note = document.getElementById('s2note');
    if(err < 0.04){
      note.innerHTML = '红点落到 q 上了：此时中间点 c 正好是某个交点 z，两个角同时解出。换另一个交点还能得到第二组解。';
    } else {
      note.innerHTML = '把蓝点 c 沿蓝圆转到空心交点 z₊ 或 z₋（θ₂ = 45° 或 135°），再拖 θ₁ 让红点回到 q。';
    }
    renderInlineMath(note);
  }

  const t2El = document.getElementById('s2t2'), t1El = document.getElementById('s2t1');
  t2El.value = 20; t1El.value = 40;
  function setAngles(t2, t1){
    S.t2 = t2; S.t1 = t1;
    t2El.value = Math.round(deg(t2)); t1El.value = Math.round(deg(t1));
    draw();
  }
  t2El.addEventListener('input', () => { S.t2 = (+t2El.value)*DEG; draw(); });
  t1El.addEventListener('input', () => { S.t1 = (+t1El.value)*DEG; draw(); });
  document.getElementById('s2sol1').addEventListener('click', () => setAngles(45*DEG, 90*DEG));
  document.getElementById('s2sol2').addEventListener('click', () => setAngles(135*DEG, -90*DEG));
  document.getElementById('s2reset').addEventListener('click', () => setAngles(20*DEG, 40*DEG));
  window.addEventListener('resize', draw);
  draw();
  window.__C7_S2 = { S, draw };
})();

/* =====================================================================
   子问题 3：‖q − e^{ξθ}p‖ = δ
   ===================================================================== */
(function(){
  const cv = document.getElementById('cv3'); if(!cv) return;
  const ctx = cv.getContext('2d');
  const S = { th: 0, delta: 2.6, hgt: 0 };
  const QX = 2.2;

  function geom(){
    const d2 = S.delta*S.delta - S.hgt*S.hgt;
    let arg = NaN, sol = null, one = false, ok = false, why = '';
    if(d2 <= 0){
      why = 'δ′² ≤ 0：沿轴偏移已超过目标距离';
    } else {
      arg = (1 + QX*QX - d2) / (2*1*QX);
      if(arg > 1 + 1e-9) why = '目标距离太小：δ′ 比 |ρq−1| 还小';
      else if(arg < -1 - 1e-9) why = '目标距离太大：δ′ 超过 ρq+1';
      else {
        ok = true; sol = Math.acos(clamp(arg, -1, 1));
        one = Math.abs(Math.sin(sol)) < 1e-6;
      }
    }
    return { d2, dp: d2 > 0 ? Math.sqrt(d2) : NaN, arg, sol, one, ok, why };
  }
  const dist = th => Math.sqrt(1 + QX*QX + S.hgt*S.hgt - 2*QX*Math.cos(th));

  function draw(){
    const { w, h, dpr } = fitCanvas(cv);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const g = geom();

    /* ---------- 左：垂直平面 ---------- */
    const lcx = w*0.23, lcy = h*0.52, U = Math.min(w*0.10, h*0.20);
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, w*0.57, h); ctx.clip();
    gridBox(ctx, lcx - U*2.4, lcy - U*2.4, lcx + U*4.8, lcy + U*2.4, U*0.5);
    ctx.strokeStyle = '#cfcfcd'; ctx.fillStyle = '#cfcfcd'; ctx.lineWidth = 1.2;
    arrow(ctx, lcx - U*2.4, lcy, lcx + U*4.9, lcy);
    arrow(ctx, lcx, lcy + U*2.4, lcx, lcy - U*2.5);
    ctx.fillStyle = GRAY; ctx.font = '11px "Helvetica Neue",Arial';
    ctx.fillText('x', lcx + U*2.6, lcy - 8); ctx.fillText('y', lcx + 8, lcy - U*2.25);
    /* 单位圆 */
    ctx.strokeStyle = HAIR; ctx.lineWidth = 1.4; ctx.setLineDash([6, 5]);
    ctx.beginPath(); ctx.arc(lcx, lcy, U, 0, Math.PI*2); ctx.stroke();
    ctx.setLineDash([]);
    /* q 在平面上的投影 q′ 与 δ′ 圆 */
    const qx = lcx + QX*U, qy = lcy;
    if(g.d2 > 0){
      ctx.strokeStyle = HAIR; ctx.lineWidth = 1.2; ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.arc(qx, qy, g.dp*U, 0, Math.PI*2); ctx.stroke();
      ctx.setLineDash([]);
    }
    /* 两个解的位置 */
    if(g.ok && !g.one){
      [[g.sol], [-g.sol]].forEach(([t]) => {
        ctx.strokeStyle = '#3a7d44'; ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(lcx + Math.cos(t)*U, lcy - Math.sin(t)*U, 7, 0, 7); ctx.stroke();
      });
    }
    /* 当前 p(θ) 与 q′ 的连线 */
    const px = Math.cos(S.th), py = Math.sin(S.th);
    ctx.strokeStyle = RED; ctx.lineWidth = 1.4; ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.moveTo(lcx + px*U, lcy - py*U); ctx.lineTo(qx, qy); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = RED;
    ctx.beginPath(); ctx.arc(lcx + px*U, lcy - py*U, 6, 0, 7); ctx.fill();
    ctx.fillStyle = INK;
    ctx.strokeStyle = INK; ctx.lineWidth = 2;
    ctx.strokeRect(qx - 5, qy - 5, 10, 10);
    ctx.font = 'bold 11px "Helvetica Neue",Arial';
    ctx.fillText('q′', qx + 9, qy + 4);
    ctx.fillText('p(θ)', lcx + px*U + 9, lcy - py*U + 16);
    ctx.fillStyle = GRAY; ctx.font = '11px "Helvetica Neue",Arial';
    ctx.fillText("δ′", (lcx + px*U + qx)/2 - 4, (lcy - py*U + qy)/2 - 8);
    const narrow = w < 560;
    ctx.fillStyle = INK; ctx.font = 'bold 11px "Helvetica Neue",Arial';
    ctx.fillText(narrow ? '沿轴看' : '垂直平面 · 沿轴看', 16, 24);
    ctx.restore();

    /* ---------- 右：距离曲线 d(θ) ---------- */
    const rx0 = w*0.63, rx1 = w - 22, ry0 = 30, ry1 = h - 34;
    const dmin = Math.sqrt(Math.max(1e-6, 1 + QX*QX + S.hgt*S.hgt - 2*QX));
    const dmax = Math.sqrt(1 + QX*QX + S.hgt*S.hgt + 2*QX);
    const ylo = Math.max(0, dmin - 0.25*S.delta), yhi = dmax + 0.15*S.delta;
    const XD = t => rx0 + (t/(Math.PI*2))*(rx1 - rx0);
    const YD = v => ry1 - (v - ylo)/(yhi - ylo)*(ry1 - ry0);
    gridBox(ctx, rx0, ry0, rx1, ry1, 24);
    ctx.strokeStyle = '#cfcfcd'; ctx.fillStyle = '#cfcfcd'; ctx.lineWidth = 1.2;
    arrow(ctx, rx1 + 4, ry1, rx0 - 4, ry1);
    arrow(ctx, rx0, ry1, rx0, ry0 - 6);
    ctx.fillStyle = GRAY; ctx.font = '11px "Helvetica Neue",Arial';
    ctx.fillText('d(θ)', rx0 - 4, ry0 - 10);
    ctx.fillText('θ', rx1 - 6, ry1 + 16);
    [0, 90, 180, 270].forEach(d => {
      const x = XD(d*DEG);
      ctx.fillText(d + '°', Math.max(rx0 + 6, x - 10), ry1 + 16);
    });
    /* δ 水平线 */
    ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.setLineDash([6, 5]);
    ctx.beginPath(); ctx.moveTo(rx0, YD(S.delta)); ctx.lineTo(rx1, YD(S.delta)); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = INK; ctx.font = 'bold 11px "Helvetica Neue",Arial';
    ctx.fillText('δ=' + S.delta.toFixed(2), rx1 - 58, YD(S.delta) - 6);
    /* 曲线 */
    ctx.strokeStyle = RED; ctx.lineWidth = 2; ctx.beginPath();
    for(let i = 0; i <= 160; i++){
      const t = Math.PI*2*i/160;
      const x = XD(t), y = YD(dist(t));
      if(i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    /* 交点 */
    if(g.ok){
      const ts = g.one ? [g.sol] : [g.sol, Math.PI*2 - g.sol];
      ts.forEach(t => {
        ctx.fillStyle = '#3a7d44';
        ctx.beginPath(); ctx.arc(XD(t), YD(S.delta), 4.5, 0, 7); ctx.fill();
      });
    }
    /* 当前 θ 的位置 */
    const cxr = XD(S.th), cyr = YD(dist(S.th));
    ctx.strokeStyle = BLUE; ctx.lineWidth = 1.2; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(cxr, cyr); ctx.lineTo(cxr, ry1); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = BLUE;
    ctx.beginPath(); ctx.arc(cxr, cyr, 5, 0, 7); ctx.fill();
    ctx.fillStyle = INK; ctx.font = 'bold 11px "Helvetica Neue",Arial';
    ctx.fillText(narrow ? '距离曲线' : '距离曲线 · δ 与曲线交几点就有几个解', w*0.60, 16);

    updatePanel(g);
  }

  function updatePanel(g){
    setMath(document.getElementById('s3formula'),
      `\\delta'^2=\\delta^2-h^2=${fx(S.delta*S.delta)}-${fx(S.hgt*S.hgt)}=${fx(g.d2)}`);
    const out = document.getElementById('s3solOut');
    const note = document.getElementById('s3note');
    if(g.ok){
      const t = deg(g.sol);
      setMath(document.getElementById('s3ang'),
        `\\cos\\theta=\\frac{1^2+2.2^2-\\delta'^2}{2\\cdot1\\cdot2.2}=${fx(g.arg)},\\qquad ` +
        `\\theta_0=0^\\circ,\\quad \\theta=${g.one ? t.toFixed(1) : '\\pm' + t.toFixed(1)}^\\circ`);
      out.textContent = g.one ? '一个解' : '两个解';
      out.style.color = '#3a7d44';
      note.innerHTML = g.one
        ? 'δ 水平线正好切到曲线谷底（或峰顶），两支解合并成一个。'
        : `δ 水平线与距离曲线有两个交点，分别在 θ = ${t.toFixed(1)}° 与 ${(360 - t).toFixed(1)}°；两支关于 θ=0° 对称。`;
    } else {
      setMath(document.getElementById('s3ang'), `\\theta:\\ \\text{无实数解}`);
      out.textContent = '无解';
      out.style.color = RED;
      note.innerHTML = g.why + '；拖 δ 让水平线进入曲线值域，或把 h 拉回 0 附近。';
    }
    renderInlineMath(note);
    document.getElementById('s3thv').textContent = Math.round(deg(S.th)) + '°';
    document.getElementById('s3dv').textContent = S.delta.toFixed(2);
    document.getElementById('s3hv').textContent = S.hgt.toFixed(1);
    document.getElementById('s3dOut').textContent = 'δ′=' + (g.d2 > 0 ? Math.sqrt(g.d2).toFixed(2) : '—');
  }

  const thEl = document.getElementById('s3th'),
        dEl = document.getElementById('s3d'),
        hEl = document.getElementById('s3h');
  thEl.addEventListener('input', () => { S.th = (+thEl.value)*DEG; draw(); });
  dEl.addEventListener('input', () => { S.delta = (+dEl.value)/10; draw(); });
  hEl.addEventListener('input', () => { S.hgt = (+hEl.value)/10; draw(); });
  document.getElementById('s3sol').addEventListener('click', () => {
    const g = geom();
    if(g.ok){ S.th = g.sol; thEl.value = Math.round(deg(g.sol)); draw(); }
  });
  document.getElementById('s3reset').addEventListener('click', () => {
    S.th = 0; S.delta = 2.6; S.hgt = 0;
    thEl.value = 0; dEl.value = 26; hEl.value = 0;
    draw();
  });
  window.addEventListener('resize', draw);
  draw();
  window.__C7_S3 = { S, draw, geom };
})();

/* =====================================================================
   07.4：平面 2R 的两支解（原图，画布顺延为 cv4）
   ===================================================================== */
(function(){
  const cv = document.getElementById('cv4'); if(!cv) return;
  const ctx = cv.getContext('2d');
  const L1 = 1.3, L2 = 1.0;
  const RMAX = L1 + L2, RMIN = Math.abs(L1 - L2);
  const C1 = '#E30613', CG = '#8a8a8a';
  const S = { x: 1.0, y: 1.0, drag: false };
  const view = createView(cv, () => draw(), { rotate: false });

  function solveIK(x, y){
    const r2 = x*x + y*y, r = Math.sqrt(r2);
    const eps = 1e-9;
    if(r > RMAX + eps || r < RMIN - eps) return { ok: false, r, rmax: RMAX, rmin: RMIN };
    const c2 = clamp((r2 - L1*L1 - L2*L2) / (2*L1*L2), -1, 1);
    const t2abs = Math.acos(c2);
    const beta = Math.acos(clamp((r2 + L1*L1 - L2*L2) / (2*r*L1), -1, 1));
    const phi = Math.atan2(y, x);
    const merged = Math.abs(t2abs) < 1e-6 || Math.abs(t2abs - Math.PI) < 1e-6;
    return {
      ok: true, r, rmax: RMAX, rmin: RMIN, c2, t2abs, beta, phi, merged,
      up: { t1: phi + beta, t2: -t2abs },
      dn: { t1: phi - beta, t2: +t2abs },
    };
  }
  function fk(t1, t2){
    const ex = [L1*Math.cos(t1), L1*Math.sin(t1)];
    return { elbow: ex, tip: [ex[0] + L2*Math.cos(t1+t2), ex[1] + L2*Math.sin(t1+t2)] };
  }

  function drawScene(){
    const { w, h, dpr } = fitCanvas(cv);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const ox = w*0.5 + view.dx, oy = h*0.55 + view.dy;
    const U = Math.min(w, h*1.5) * 0.115;
    const X = x => ox + x*U, Y = y => oy - y*U;

    gridBox(ctx, 0, 0, w, h, 48);
    ctx.strokeStyle = '#cfcfcd'; ctx.fillStyle = '#cfcfcd'; ctx.lineWidth = 1.2;
    arrow(ctx, 0, Y(0), w - 4, Y(0));
    arrow(ctx, X(0), h - 4, X(0), 4);
    ctx.fillStyle = '#8a8a8a'; ctx.font = '11px "Helvetica Neue",Arial';
    ctx.fillText('x', w - 18, Y(0) - 8);
    ctx.fillText('y', X(0) + 8, 16);

    ctx.strokeStyle = '#c0c0be'; ctx.lineWidth = 1.4; ctx.setLineDash([6, 5]);
    ctx.beginPath(); ctx.arc(X(0), Y(0), RMAX*U, 0, Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.arc(X(0), Y(0), RMIN*U, 0, Math.PI*2); ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = '#dddddb'; ctx.lineWidth = 1.2; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(X(0), Y(0)); ctx.lineTo(X(S.x), Y(S.y)); ctx.stroke();
    ctx.setLineDash([]);

    const sol = solveIK(S.x, S.y);
    const drawArm = (t1, t2, color, dash) => {
      const { elbow, tip } = fk(t1, t2);
      ctx.setLineDash(dash || []);
      ctx.strokeStyle = color; ctx.lineWidth = 2.8; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(X(0), Y(0));
      ctx.lineTo(X(elbow[0]), Y(elbow[1]));
      ctx.lineTo(X(tip[0]), Y(tip[1]));
      ctx.stroke();
      ctx.setLineDash([]); ctx.lineCap = 'butt';
      [[0, 0, 5], [elbow[0], elbow[1], 4.5], [tip[0], tip[1], 4]].forEach(([jx, jy, rr]) => {
        ctx.beginPath(); ctx.arc(X(jx), Y(jy), rr, 0, Math.PI*2);
        ctx.fillStyle = '#fff'; ctx.fill();
        ctx.strokeStyle = color; ctx.lineWidth = 1.8; ctx.stroke();
      });
    };
    if(sol.ok && !sol.merged){
      drawArm(sol.dn.t1, sol.dn.t2, CG, [6, 4]);
      drawArm(sol.up.t1, sol.up.t2, C1, []);
    } else if(sol.ok){
      drawArm(sol.phi, sol.up.t2, '#111', []);
    }

    drawHandle(ctx, X(S.x), Y(S.y), 7, '#111', S.drag);
    ctx.fillStyle = '#111'; ctx.font = '11px "Helvetica Neue",Arial';
    ctx.fillText('目标', X(S.x) + 12, Y(S.y) - 10);

    const head = sol.ok
      ? (sol.merged
          ? 'θ₂ = ' + (Math.abs(sol.t2abs) < 1e-6 ? '0.0' : '±180.0') + '°（两解合并）'
          : 'θ₂ = ±' + deg(sol.t2abs).toFixed(1) + '°')
      : '无解';
    ctx.fillStyle = '#111'; ctx.font = 'bold 13px "Helvetica Neue",Arial';
    ctx.fillText(head + '　　r = ' + fmtP(sol.r), 16, 26);
    ctx.font = '11px "Helvetica Neue",Arial'; ctx.fillStyle = '#8a8a8a';
    ctx.fillText(
      sol.ok
        ? '红 = 肘部朝上（θ₂ 负支）　灰虚线 = 肘部朝下（θ₂ 正支）'
        : '目标在可达环带外：r 必须落在 |l₁−l₂| 与 l₁+l₂ 之间',
      16, 44
    );
  }

  function renderPanel(){
    const sol = solveIK(S.x, S.y);
    const solOut = document.getElementById('solOut');
    const statOut = document.getElementById('statOut');
    const stat = document.getElementById('stat');
    const mathSol = document.getElementById('mathSol');
    const tx = document.getElementById('tx'), ty = document.getElementById('ty');
    tx.value = Math.round(S.x*100); ty.value = Math.round(S.y*100);
    document.getElementById('txv').textContent = S.x.toFixed(2);
    document.getElementById('tyv').textContent = S.y.toFixed(2);

    if(!sol.ok){
      solOut.textContent = 'θ₂ 无解';
      statOut.textContent = 'r = ' + fmtP(sol.r) + '（不可达）';
      if(sol.r > sol.rmax){
        setMath(mathSol, `\\lVert p\\rVert=${fmtP(sol.r)}\\gt l_1+l_2=${fmtP(sol.rmax)}`);
        stat.innerHTML = '<b class="warn">无解</b>：目标在可达环带外，\\(r=' + fmtP(sol.r) +
          '\\gt l_1+l_2=' + fmtP(sol.rmax) + '\\)；把目标拖回环带内再看。';
      } else {
        setMath(mathSol, `\\lVert p\\rVert=${fmtP(sol.r)}\\lt |l_1-l_2|=${fmtP(sol.rmin)}`);
        stat.innerHTML = '<b class="warn">无解</b>：目标落进腕部够不到的内孔，\\(r=' + fmtP(sol.r) +
          '\\lt |l_1-l_2|=' + fmtP(sol.rmin) + '\\)；外圈够得着、内圈反而不行，这是两根连杆长度差决定的。';
      }
      renderInlineMath(stat);
      return;
    }

    const t2d = deg(sol.t2abs);
    if(sol.merged){
      const isFold = Math.abs(sol.t2abs - Math.PI) < 1e-6;
      solOut.textContent = isFold ? 'θ₂ = ±180°（两解合并）' : 'θ₂ = 0°（两解合并）';
      setMath(mathSol,
        `\\theta_2=${isFold ? '\\pm180' : '0'}^\\circ,\\qquad ` +
        `\\theta_1=\\varphi_w=${deg(sol.phi).toFixed(2)}^\\circ`);
      statOut.textContent = isFold ? 'r = ' + fmtP(sol.r) + ' = |l₁−l₂|' : 'r = ' + fmtP(sol.r) + ' = l₁+l₂';
      stat.innerHTML = isFold
        ? '边界位形：腕心落在内圆上，两根连杆折回重合成一条线，两支解合并；此时 \\(\\theta_2=\\pm180^\\circ\\)，腕心仍在目标点上。'
        : '边界位形：目标在外圆上，两根连杆伸直成一条线，两支解合并；此时 \\(\\theta_2=0^\\circ\\)，再往外就没有解了。';
      renderInlineMath(stat);
      return;
    }

    solOut.textContent = 'θ₂ = ±' + t2d.toFixed(2) + '°';
    statOut.textContent = 'r = ' + fmtP(sol.r);
    const u1 = deg(sol.up.t1).toFixed(2), u2 = deg(sol.up.t2).toFixed(2);
    const d1 = deg(sol.dn.t1).toFixed(2), d2 = deg(sol.dn.t2).toFixed(2);
    setMath(mathSol,
      `\\begin{aligned}` +
      `\\color{${C1}}{\\theta_1=\\varphi_w+\\beta=${u1}^\\circ,}\\quad` +
      `\\color{${C1}}{\\theta_2=${u2}^\\circ}\\\\` +
      `\\color{${CG}}{\\theta_1=\\varphi_w-\\beta=${d1}^\\circ,}\\quad` +
      `\\color{${CG}}{\\theta_2=+${d2}^\\circ}` +
      `\\end{aligned}`);
    stat.innerHTML =
      '<b>可达</b>：\\(|l_1-l_2|=' + fmtP(sol.rmin) + '\\le r=' + fmtP(sol.r) +
      '\\le l_1+l_2=' + fmtP(sol.rmax) + '\\)，两支解都在环带内；' +
      '把 x、y 调到 0.80、0.60 可复现 07.4 算例的 \\(\\theta_2=\\pm130.54^\\circ\\)。';
    renderInlineMath(stat);
  }

  let lastPanel = 0;
  function renderPanelsThrottled(){
    const now = performance.now();
    if(now - lastPanel < 60) return;
    lastPanel = now;
    renderPanel();
  }
  function render(){ drawScene(); renderPanelsThrottled(); }

  function setTarget(x, y){
    S.x = clamp(x, -2.4, 2.4);
    S.y = clamp(y, -2.4, 2.4);
    render(); renderPanel();
  }
  function canvasPoint(e){
    const rect = cv.getBoundingClientRect();
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
    const w = cv.clientWidth, h = cv.clientHeight;
    const ox = w*0.5 + view.dx, oy = h*0.55 + view.dy;
    const U = Math.min(w, h*1.5) * 0.115;
    return { x: clamp((sx - ox)/U, -2.4, 2.4), y: clamp(-(sy - oy)/U, -2.4, 2.4) };
  }

  const tx = document.getElementById('tx'), ty = document.getElementById('ty');
  tx.addEventListener('input', () => { S.x = (+tx.value)/100; render(); renderPanel(); });
  ty.addEventListener('input', () => { S.y = (+ty.value)/100; render(); renderPanel(); });
  document.getElementById('btnReach').onclick = () => setTarget(RMAX, 0);
  document.getElementById('btn45').onclick = () => setTarget(1, 1);

  cv.addEventListener('pointerdown', e => {
    if(e.button !== 0 || e.ctrlKey || e.metaKey) return;
    S.drag = true;
    const p = canvasPoint(e);
    S.x = p.x; S.y = p.y;
    try { cv.setPointerCapture(e.pointerId); } catch(_) {}
    e.preventDefault();
    render(); renderPanel();
  });
  cv.addEventListener('pointermove', e => {
    if(!S.drag) return;
    const p = canvasPoint(e);
    S.x = p.x; S.y = p.y;
    render();
  });
  const up = () => { if(!S.drag) return; S.drag = false; render(); renderPanel(); };
  cv.addEventListener('pointerup', up);
  cv.addEventListener('pointercancel', up);

  window.addEventListener('resize', render);
  render();
  renderPanel();
  window.__C7_S4 = { S, solveIK, fk, render, renderPanel };
})();

/* ================= 小测 ================= */
initQuiz({
  answers: { 1: 1, 2: 2, 3: 0 },
  why: {
    1: '叉乘项正比于 \\(\\sin\\theta\\)、点积项正比于 \\(\\cos\\theta\\)，用 \\(\\theta=\\mathrm{atan2}(\\sin\\text{分子},\\cos\\text{分子})\\) 才能同时保留象限与符号；普通 \\(\\arccos\\) 只返回 \\([0,\\pi]\\)，会丢掉负解。见 07.1 第 3 小节。',
    2: '\\(r=\\lVert(1,1)\\rVert=\\sqrt2\\)，\\(\\cos\\theta_2=\\frac{r^2-l_1^2-l_2^2}{2l_1l_2}=\\frac{2-1-1}{2}=0\\)，所以 \\(\\theta_2=\\pm90^\\circ\\)。见 07.3 第 4 小节。',
    3: '两轴重合时两个旋转绕同一根轴，合起来只剩总转角 \\(\\theta_1+\\theta_2\\)，子问题 2 退化成子问题 1，单独两个角有无穷多组分法。见 07.2 第 4 小节。',
  },
});

renderInlineMath(document.body);
