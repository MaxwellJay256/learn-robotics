/* 09 节页面逻辑（ESM）：单段 / 两段 LFPB 的位置、速度、加速度三曲线
   画布：上下三块小图（θ、θ̇、θ̈）；工具条切换 2024 Q4 数据与单段示例
   面板：两段直线速度、三个混合时间、可行性状态 */
import {
  fitCanvas, setMath, renderInlineMath, initQuiz, arrow,
} from "./core.js";

const INK = '#111', RED = '#E30613', GRAY = '#8a8a8a', SOFT = '#f4f4f2', HAIR = '#d9d9d9';

/* ---------- 状态 ---------- */
const S = {
  mode: 'two',            // 'two' = 2024 Q4 两段；'single' = 单段 0°→30°
  acc: 80,                // |θ̈_b|，单位 °/s²
  td: 1.0,                // 每段时长，单位 s
  th: [5, 10, 20],        // 两段模式的三个角度：起点、经由点、终点
  sTh: [0, 30],           // 单段模式的起点、终点角度
};

/* ---------- 09.1 单段 LFPB ---------- */
function computeSingle(acc, td, thO, thF){
  const d = thF - thO;
  const need = 4*Math.abs(d)/(td*td);
  if(!d || acc <= 0 || td <= 0) return { ok:false, need, acc, td, thO, thF };
  const disc = acc*acc*td*td - 4*acc*d;
  if(disc < -1e-9) return { ok:false, need, acc, td, thO, thF };
  const tb = td/2 - Math.sqrt(Math.max(0, disc))/(2*acc);
  const straight = td - 2*tb;
  if(tb < -1e-9 || straight < -1e-9) return { ok:false, need, acc, td, thO, thF };
  return { ok:true, tb, vl: acc*tb, straight, acc, td, thO, thF };
}

/* ---------- 09.2 两段 LFPB：起点段、终点段先算，中间段最后算 ---------- */
function rawTwo(acc, td, th){
  const [th1, th2, th3] = th;
  const A = acc;
  const acc1 = Math.sign(th2 - th1) * A;
  const acc3 = Math.sign(th2 - th3) * A;
  if(!acc1 || !acc3 || td <= 0) return { ok:false };
  const rad1 = td*td - 2*(th2 - th1)/acc1;
  if(rad1 < -1e-9) return { ok:false };
  const t1 = td - Math.sqrt(Math.max(0, rad1));
  const v12 = (th2 - th1)/(td - t1/2);
  const rad3 = td*td + 2*(th3 - th2)/acc3;
  if(rad3 < -1e-9) return { ok:false };
  const t3 = td - Math.sqrt(Math.max(0, rad3));
  const v23 = (th3 - th2)/(td - t3/2);
  const dv = v23 - v12;
  const acc2 = (dv >= 0 ? 1 : -1) * A;
  const t2 = dv/acc2;
  const T12 = td - t1 - t2/2;
  const T23 = td - t3 - t2/2;
  if(t1 < -1e-9 || t2 < -1e-9 || t3 < -1e-9 || T12 < -1e-9 || T23 < -1e-9) return { ok:false };
  return { ok:true, td, th1, th2, th3, acc1, acc2, acc3, t1, t2, t3, v12, v23, T12, T23 };
}

function minAccTwo(td, th){
  let lo = 0.5, hi = 1e5;
  for(let i = 0; i < 80; i++){
    const m = (lo + hi)/2;
    if(rawTwo(m, td, th).ok) hi = m; else lo = m;
  }
  return hi;
}

function computeTwo(acc, td, th){
  const c = rawTwo(acc, td, th);
  if(!c.ok) return { ok:false, need: minAccTwo(td, th), acc, td };
  /* 经由点处的实际位置与混合段中点速度（画图与验算用） */
  c.viaDev = c.acc2*c.t2*c.t2/8;
  c.xVia = c.th2 + c.viaDev;
  c.vMid = c.v12 + c.acc2*(c.t2/2);
  return c;
}

/* ---------- 分段：每段给出 a、v0、x0，位置 = x0 + v0·τ + ½aτ² ---------- */
function intervalsTwo(c){
  const { td, th1, th2, th3, acc1, acc2, acc3, t1, t2, t3, v12, v23 } = c;
  let x = th1;
  const segs = [];
  segs.push({ t0:0, t1, a:acc1, v0:0, x0:x });
  x = th1 + 0.5*acc1*t1*t1;
  segs.push({ t0:t1, t1:td - t2/2, a:0, v0:v12, x0:x });
  x += v12*(td - t2/2 - t1);
  segs.push({ t0:td - t2/2, t1:td, a:acc2, v0:v12, x0:x });
  const vMid = v12 + acc2*(t2/2);
  x += v12*(t2/2) + 0.5*acc2*(t2/2)*(t2/2);
  segs.push({ t0:td, t1:td + t2/2, a:acc2, v0:vMid, x0:x });
  x += vMid*(t2/2) + 0.5*acc2*(t2/2)*(t2/2);
  segs.push({ t0:td + t2/2, t1:2*td - t3, a:0, v0:v23, x0:x });
  x += v23*(2*td - t3 - (td + t2/2));
  segs.push({ t0:2*td - t3, t1:2*td, a:acc3, v0:v23, x0:x });
  return segs;
}

function intervalsSingle(c){
  const { td, thO, acc, tb, vl } = c;
  let x = thO;
  const segs = [];
  segs.push({ t0:0, t1:tb, a:acc, v0:0, x0:x });
  x += 0.5*acc*tb*tb;
  segs.push({ t0:tb, t1:td - tb, a:0, v0:vl, x0:x });
  x += vl*(td - 2*tb);
  segs.push({ t0:td - tb, t1:td, a:-acc, v0:vl, x0:x });
  return segs;
}

function bandsOf(c){
  if(S.mode === 'single') return [[0, c.tb], [c.td - c.tb, c.td]];
  return [[0, c.t1], [c.td - c.t2/2, c.td + c.t2/2], [2*c.td - c.t3, 2*c.td]];
}

/* ---------- 画布 ---------- */
const cv1 = document.getElementById('cv1');
const ctx = cv1.getContext('2d');

function mkY(r, vmin, vmax){
  const yTop = r.top + 16, yBot = r.bottom - 2;
  const span = Math.max(1e-9, vmax - vmin);
  return v => yBot - (v - vmin)/span*(yBot - yTop);
}

function drawAxes(r, X, w, PADL, PADR, Y, ticks, labels, title){
  const yTop = r.top + 16, yBot = r.bottom - 2;
  ctx.strokeStyle = HAIR; ctx.lineWidth = 1;
  labels.forEach((txt, i) => {
    const v = ticks[i];
    ctx.beginPath(); ctx.moveTo(PADL, Y(v)); ctx.lineTo(w - PADR, Y(v)); ctx.stroke();
    ctx.fillStyle = GRAY; ctx.font = '9.5px "Helvetica Neue",Arial';
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ctx.fillText(txt, PADL - 6, Y(v));
  });
  ctx.strokeStyle = INK; ctx.fillStyle = INK; ctx.lineWidth = 1.4;
  arrow(ctx, PADL, yBot, PADL, r.top + 4);
  arrow(ctx, PADL, yBot, w - PADR, yBot);
  ctx.font = 'bold 10px "Helvetica Neue",Arial';
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillText(title, PADL + 4, r.top + 1);
}

function drawPanels(c, segs, tMax, w, h){
  const PADL = 54, PADR = 14, PADT = 12, PADB = 34, GAP = 10;
  const ph = (h - PADT - PADB - 2*GAP)/3;
  const X = t => PADL + (t/tMax)*(w - PADL - PADR);
  const rects = [0, 1, 2].map(i => ({ top: PADT + i*(ph + GAP), bottom: PADT + i*(ph + GAP) + ph }));

  const posVals = [], velVals = [], accVals = [];
  segs.forEach(s => {
    if(s.t1 - s.t0 <= 1e-9) return;
    const T = s.t1 - s.t0;
    posVals.push(s.x0, s.x0 + s.v0*T + 0.5*s.a*T*T);
    velVals.push(s.v0, s.v0 + s.a*T);
    accVals.push(s.a);
  });
  const posMin = Math.min.apply(null, posVals) - 1.2;
  const posMax = Math.max.apply(null, posVals) + 1.2;
  const velMin = Math.min(0, Math.min.apply(null, velVals)) - 0.5;
  const velMax = Math.max(0.1, Math.max.apply(null, velVals))*1.12 + 0.5;
  const accAbs = Math.max(1, Math.max.apply(null, accVals.map(v => Math.abs(v))))*1.15;

  /* 时间网格与混合段竖带 */
  const tTicks = S.mode === 'single' ? [0, S.td] : [0, S.td, 2*S.td];
  rects.forEach((r, idx) => {
    const yTop = r.top + 16, yBot = r.bottom - 2;
    ctx.fillStyle = SOFT;
    bandsOf(c).forEach(([a, b]) => {
      const xa = X(Math.max(0, a)), xb = X(Math.min(tMax, b));
      if(xb - xa > 0.5) ctx.fillRect(xa, yTop, xb - xa, yBot - yTop);
    });
    ctx.strokeStyle = '#efefed'; ctx.lineWidth = 1;
    tTicks.forEach(t => {
      ctx.beginPath(); ctx.moveTo(X(t), yTop); ctx.lineTo(X(t), yBot); ctx.stroke();
    });
  });

  /* 1. 位置 */
  {
    const r = rects[0], Y = mkY(r, posMin, posMax);
    const ticks = S.mode === 'single'
      ? [c.thO, (c.thO + c.thF)/2, c.thF]
      : [c.th1, c.th2, c.th3];
    drawAxes(r, X, w, PADL, PADR, Y, ticks, ticks.map(v => v.toFixed(0) + '°'), 'θ(t) / °');
    ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.lineJoin = 'round';
    segs.forEach(s => {
      const T = s.t1 - s.t0;
      if(T <= 1e-9) return;
      const N = 20;
      ctx.beginPath();
      for(let k = 0; k <= N; k++){
        const tau = T*k/N, t = s.t0 + tau;
        const val = s.x0 + s.v0*tau + 0.5*s.a*tau*tau;
        if(k === 0) ctx.moveTo(X(t), Y(val)); else ctx.lineTo(X(t), Y(val));
      }
      ctx.stroke();
    });
    if(S.mode === 'two'){
      ctx.setLineDash([4, 4]); ctx.strokeStyle = GRAY; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(PADL, Y(c.th2)); ctx.lineTo(X(c.td), Y(c.th2)); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = INK; ctx.font = '9.5px "Helvetica Neue",Arial';
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText('经由点 ' + c.th2.toFixed(0) + '°', X(c.td) + 4, Y(c.th2) + 3);
    }
  }

  /* 2. 速度 */
  {
    const r = rects[1], Y = mkY(r, velMin, velMax);
    const vTicks = S.mode === 'single' ? [0, c.vl] : [0, c.v12, c.v23];
    drawAxes(r, X, w, PADL, PADR, Y,
      [0, Math.max.apply(null, vTicks)],
      ['0', Math.max.apply(null, vTicks).toFixed(1) + '°/s'],
      'θ̇(t) / (°/s)');
    ctx.strokeStyle = RED; ctx.lineWidth = 2; ctx.lineJoin = 'round';
    segs.forEach(s => {
      const T = s.t1 - s.t0;
      if(T <= 1e-9) return;
      ctx.beginPath();
      ctx.moveTo(X(s.t0), Y(s.v0));
      ctx.lineTo(X(s.t1), Y(s.v0 + s.a*T));
      ctx.stroke();
    });
    ctx.fillStyle = INK; ctx.font = '9.5px "Helvetica Neue",Arial';
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    segs.forEach(s => {
      const T = s.t1 - s.t0;
      if(T <= 1e-9 || Math.abs(s.a) > 1e-9) return;
      const mid = (s.t0 + s.t1)/2;
      ctx.fillText(s.v0.toFixed(2), X(mid), Y(s.v0) - 3);
    });
  }

  /* 3. 加速度 */
  {
    const r = rects[2], Y = mkY(r, -accAbs, accAbs);
    const A = Math.max.apply(null, accVals.map(v => Math.abs(v)));
    drawAxes(r, X, w, PADL, PADR, Y, [-A, 0, A],
      ['−' + A.toFixed(0), '0', '+' + A.toFixed(0)], 'θ̈(t) / (°/s²)');
    ctx.strokeStyle = GRAY; ctx.lineWidth = 2;
    segs.forEach(s => {
      const T = s.t1 - s.t0;
      if(T <= 1e-9) return;
      ctx.beginPath();
      ctx.moveTo(X(s.t0), Y(s.a));
      ctx.lineTo(X(s.t1), Y(s.a));
      ctx.stroke();
    });
    ctx.fillStyle = INK; ctx.font = '9.5px "Helvetica Neue",Arial';
    ctx.textAlign = 'center';
    /* 把加速度相同的相邻段合并成一段再标注，避免经由点处两个 +80 的标签叠在一起 */
    const runs = [];
    segs.forEach(s => {
      const T = s.t1 - s.t0;
      if(T <= 1e-9) return;
      const last = runs[runs.length - 1];
      if(last && Math.abs(last.a - s.a) < 1e-9) last.t1 = s.t1;
      else runs.push({ t0: s.t0, t1: s.t1, a: s.a });
    });
    runs.forEach(run => {
      if(Math.abs(run.a) < 1e-9) return;
      const mid = (run.t0 + run.t1)/2, xm = X(mid);
      if(xm < PADL + 26 || xm > w - PADR - 26) return;
      if(run.a > 0){ ctx.textBaseline = 'top'; ctx.fillText('+' + Math.abs(run.a).toFixed(0), xm, Y(run.a) + 2); }
      else { ctx.textBaseline = 'bottom'; ctx.fillText('−' + Math.abs(run.a).toFixed(0), xm, Y(run.a) - 2); }
    });
  }

  /* 混合段标注 + 时间轴 */
  const r2 = rects[1];
  ctx.fillStyle = GRAY; ctx.font = '9px "Helvetica Neue",Arial';
  ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
  const names = S.mode === 'single' ? ['t_b', 't_b'] : ['t₁', 't₂', 't₃'];
  bandsOf(c).forEach(([a, b], i) => {
    const mid = (Math.max(0, a) + Math.min(tMax, b))/2;
    ctx.fillText(names[i], X(mid), r2.top - 1);
  });

  const rb = rects[2];
  ctx.fillStyle = INK; ctx.font = '10px "Helvetica Neue",Arial';
  ctx.textBaseline = 'top';
  tTicks.forEach((t, i) => {
    ctx.textAlign = i === 0 ? 'left' : (i === tTicks.length - 1 ? 'right' : 'center');
    const xx = i === 0 ? X(t) + 2 : (i === tTicks.length - 1 ? X(t) - 2 : X(t));
    ctx.fillText((Math.round(t*100)/100).toString(), xx, rb.bottom + 4);
  });
  ctx.textAlign = 'right';
  ctx.fillText('t / s', w - PADR, rb.bottom + 16);
}

/* ---------- 面板读数 ---------- */
function updatePanel(c){
  const thetaOut = document.getElementById('thetaOut');
  const blendOut = document.getElementById('blendOut');
  const stat = document.getElementById('stat');
  const thetaVal = document.getElementById('thetaVal');
  const blendVal = document.getElementById('blendVal');

  if(!c.ok){
    setMath(thetaOut, '—');
    setMath(blendOut, '—');
    thetaVal.textContent = '—'; blendVal.textContent = '—';
    stat.innerHTML = '<b class="warn">加速度不足，无解</b>：这组数据需要 |θ̈_b| ≥ ' +
      c.need.toFixed(1) + '°/s²，请加大加速度或延长段时长。';
    return;
  }
  if(S.mode === 'single'){
    setMath(thetaOut, '\\dot\\theta_l=' + c.vl.toFixed(3) + '^\\circ/\\mathrm{s}');
    setMath(blendOut, 't_b=' + c.tb.toFixed(4) + '\\ \\mathrm{s},\\quad t_d-2t_b=' + c.straight.toFixed(4) + '\\ \\mathrm{s}');
    thetaVal.textContent = c.vl.toFixed(3);
    blendVal.textContent = c.tb.toFixed(4) + ' / ' + c.straight.toFixed(4);
    stat.innerHTML = '可行：直线段 <b>' + c.straight.toFixed(4) + ' s</b>，峰值速度 ' +
      c.vl.toFixed(2) + ' °/s；位置曲线两端是抛物线、中间是直线。';
  }else{
    setMath(thetaOut, '\\dot\\theta_{12}=' + c.v12.toFixed(3) + '^\\circ/\\mathrm{s},\\quad\\dot\\theta_{23}=' + c.v23.toFixed(3) + '^\\circ/\\mathrm{s}');
    setMath(blendOut, 't_1=' + c.t1.toFixed(4) + '\\ \\mathrm{s},\\quad t_2=' + c.t2.toFixed(4) + '\\ \\mathrm{s},\\quad t_3=' + c.t3.toFixed(4) + '\\ \\mathrm{s}');
    thetaVal.textContent = c.v12.toFixed(3) + ' / ' + c.v23.toFixed(3);
    blendVal.textContent = c.t1.toFixed(4) + ' / ' + c.t2.toFixed(4) + ' / ' + c.t3.toFixed(4);
    stat.innerHTML = '可行：两个直线段 <b>' + c.T12.toFixed(4) + ' s</b> / <b>' +
      c.T23.toFixed(4) + ' s</b>；经由点近似经过，偏差 ' + c.viaDev.toFixed(3) + '°。';
  }
}

/* ---------- 主渲染 ---------- */
function render(){
  const { w, h, dpr } = fitCanvas(cv1);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  const c = S.mode === 'two'
    ? computeTwo(S.acc, S.td, S.th)
    : computeSingle(S.acc, S.td, S.sTh[0], S.sTh[1]);
  updatePanel(c);

  if(!c.ok){
    ctx.fillStyle = RED; ctx.font = 'bold 15px "Helvetica Neue",Arial';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('加速度不足，无解', w/2, h/2);
    ctx.fillStyle = GRAY; ctx.font = '11px "Helvetica Neue",Arial';
    ctx.fillText('需要 |θ̈_b| ≥ ' + c.need.toFixed(1) + ' °/s²，或延长段时长', w/2, h/2 + 22);
    return;
  }

  const tMax = S.mode === 'single' ? S.td : 2*S.td;
  const segs = S.mode === 'single' ? intervalsSingle(c) : intervalsTwo(c);
  drawPanels(c, segs, tMax, w, h);
}

/* ---------- 交互 ---------- */
function sync(){
  document.getElementById('acc').value = S.acc;
  document.getElementById('td').value = S.td;
  document.getElementById('accv').textContent = S.acc + '°/s²';
  document.getElementById('tdv').textContent = S.td.toFixed(2) + ' s';
}

document.getElementById('btnQ4').onclick = () => {
  S.mode = 'two'; S.acc = 80; S.td = 1; sync(); render();
};
document.getElementById('btnSingle').onclick = () => {
  S.mode = 'single'; S.acc = 200; S.td = 1; sync(); render();
};
document.getElementById('acc').addEventListener('input', e => {
  S.acc = +e.target.value;
  document.getElementById('accv').textContent = S.acc + '°/s²';
  render();
});
document.getElementById('td').addEventListener('input', e => {
  S.td = +e.target.value;
  document.getElementById('tdv').textContent = S.td.toFixed(2) + ' s';
  render();
});

window.addEventListener('resize', render);

initQuiz({
  answers: { 1:1, 2:2, 3:0 },
  why: {
    1: '把 \\(\\ddot\\theta_b=200\\)、\\(t_d=1\\)、\\(\\theta_f-\\theta_o=30^\\circ\\) 代入 09.1 的求根公式：\\(t_b=0.5-\\dfrac{\\sqrt{200^2-4\\times200\\times30}}{2\\times200}=0.5-0.316=0.184\\) s。0.5 是那个大根（会让直线段时长变负），0.316 只是根号项。见 09.1 第 3 小节。',
    2: '中间经由点的混合时间由前后两段直线速度之差除以混合加速度决定：\\(t_2=(\\dot\\theta_{23}-\\dot\\theta_{12})/\\ddot\\theta_2=(10.718-5.167)/80=0.069\\) s；它既不是段时长的一半，也不是位移除以加速度。见 09.2 第 3 小节。',
    3: '第一段直线速度由位移约束修正：\\(\\dot\\theta_{12}=\\dfrac{5}{1-0.0646/2}=5.17^\\circ/\\mathrm{s}\\)；5.00 是没有混合段时的平均斜率，10.72 是第二段的直线速度。见 09.2 第 4 小节。',
  },
});

sync();
render();
renderInlineMath(document.body);

window.__C9 = {
  S, computeSingle, computeTwo, rawTwo, minAccTwo,
  intervalsSingle, intervalsTwo, render, sync,
  current: () => (S.mode === 'two'
    ? computeTwo(S.acc, S.td, S.th)
    : computeSingle(S.acc, S.td, S.sTh[0], S.sTh[1])),
};
