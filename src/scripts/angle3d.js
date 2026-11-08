/* 03.1 三维实例 · three.js 渲染层
   只负责画与拾取；状态（p 的方向、自转角）仍由 ch03.js 的 S3 持有。

   视角：固定的轴测方向（yaw / pitch 与 03.2 的画布一致），透视投影，
   上方向取旧 2D 投影的屏幕 y 轴，这样三维图与页面上其他图的“高度方向”一致。 */

import * as THREE from 'three';

const RED = 0xE30613, INK = 0x111111, MID = 0x555555, LIGHT = 0x999999;
const HAIR = 0xE6E6E3;

const YAW0 = 0.61, PITCH0 = 0.42;
const RING_R = 0.3;                  // 自转圆环半径（单位球上）

export function createAngle3D(canvas, io) {
  const box = canvas.parentElement;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setClearAlpha(0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);

  // 视角：右键拖动改 yaw/pitch，Ctrl+左键平移（setViewOffset 位移）
  let yaw = YAW0, pitch = PITCH0, panX = 0, panY = 0;
  let RIGHT, UP, VIEW, rim = null;

  // 屏幕右 / 屏幕上 / 视线（由旧投影公式反解，保证与其他画布同角度）
  function updateBasis(){
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    RIGHT = new THREE.Vector3(cy, sy, 0);
    UP    = new THREE.Vector3(-sy * cp, cy * cp, -sp);
    VIEW  = new THREE.Vector3(-sy * sp, cy * sp, cp).normalize();
    camera.up.copy(UP);
    if(rim) rim.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), VIEW);
  }
  updateBasis();

  /* ---------- 静态几何 ---------- */
  // 单位球：浅色不透明面，背面线条自然被遮住，给出深度线索
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(1, 64, 48),
    new THREE.MeshBasicMaterial({ color: 0xF7F7F5 })
  );
  scene.add(sphere);

  // 轮廓：垂直于视线的圆，给球一条清晰的边（否则白底上看不出球）
  {
    const pts = [];
    for (let i = 0; i <= 160; i++) {
      const a = (i / 160) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a), Math.sin(a), 0));
    }
    rim = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color: 0xD8D8D4 })
    );
    rim.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), VIEW);
    rim.scale.setScalar(1.001);
    scene.add(rim);
  }

  // 三条大圆：球的横向、纵向、赤道
  const circleGeom = new THREE.BufferGeometry();
  {
    const pts = [];
    const SEG = 160;
    for (let i = 0; i <= SEG; i++) {
      const t = (i / SEG) * Math.PI * 2;
      pts.push(Math.cos(t), Math.sin(t), 0);
    }
    circleGeom.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  }
  const circleMat = new THREE.LineBasicMaterial({ color: HAIR });
  [
    [0, 0, 0],            // xy 平面
    [Math.PI / 2, 0, 0],  // yz
    [0, Math.PI / 2, 0],  // xz
  ].forEach(rot => {
    const line = new THREE.Line(circleGeom, circleMat);
    line.rotation.set(rot[0], rot[1], rot[2]);
    line.scale.setScalar(1.002);
    scene.add(line);
  });

  /* ---------- 动态容器 ---------- */
  const gAxes = new THREE.Group();        // 空间系 A
  const gP0 = new THREE.Group();          // p₀ 参考方向
  const gArc = new THREE.Group();         // θ₁ 弧
  const gAxisC = new THREE.Group();       // 复合转轴
  const gRay = new THREE.Group();         // 原点 → p
  const gTriad = new THREE.Group();       // 随动三轴
  const gRing = new THREE.Group();        // 自转圆环 + 手柄 + φ 弧
  [gAxes, gP0, gArc, gAxisC, gRay, gTriad, gRing].forEach(g => scene.add(g));

  // 叠加层的线不参与深度测试：轴与弧是“画在球面上”的标注，被球挡住就看不见了
  const overlay = { depthTest: false, transparent: true };
  const matInk = new THREE.LineBasicMaterial({ color: INK, ...overlay });
  const matMid = new THREE.LineBasicMaterial({ color: MID, ...overlay });
  const matLight = new THREE.LineBasicMaterial({ color: LIGHT, ...overlay });
  const matRed = new THREE.LineBasicMaterial({ color: RED, ...overlay });
  const matHair = new THREE.LineBasicMaterial({ color: HAIR, ...overlay });

  const coneGeom = new THREE.ConeGeometry(0.032, 0.085, 12);
  function arrowMesh(color) {
    const mat = new THREE.MeshBasicMaterial({ color });
    mat.depthTest = false;
    return new THREE.Mesh(coneGeom, mat);
  }
  /** 在 group 里放一条从 a 到 b 的线段，返回 Line */
  function seg(group, a, b, mat) {
    const geom = new THREE.BufferGeometry().setFromPoints([a, b]);
    const line = new THREE.Line(geom, mat);
    group.add(line);
    return line;
  }
  /** 箭头尖：把圆锥从 +y 方向转到 dir，端口放在 tip */
  function cone(group, tip, dir, color) {
    const m = arrowMesh(color);
    m.position.copy(tip).addScaledVector(dir, -0.0425);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    group.add(m);
    return m;
  }

  // 空间系 A：三条轴 + 箭头
  const AX = new THREE.Vector3(1, 0, 0), AY = new THREE.Vector3(0, 1, 0), AZ = new THREE.Vector3(0, 0, 1);
  [[AX, 0xD0D0CD], [AY, 0xD0D0CD], [AZ, 0xD0D0CD]].forEach(([d]) => {
    seg(gAxes, new THREE.Vector3(), d.clone().multiplyScalar(1.16), matInk);
    cone(gAxes, d.clone().multiplyScalar(1.16), d, INK);
  });

  // p₀ 参考方向：虚线 + 端点
  {
    const geom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(), new THREE.Vector3(1.02, 0, 0),
    ]);
    const line = new THREE.Line(geom, new THREE.LineDashedMaterial({
      color: LIGHT, dashSize: 0.045, gapSize: 0.035,
    }));
    line.computeLineDistances();
    gP0.add(line);
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.018, 12, 10),
      new THREE.MeshBasicMaterial({ color: LIGHT })
    );
    dot.position.set(1.02, 0, 0);
    gP0.add(dot);
  }

  // 被拖动的点 p 与它的射线
  const pDot = new THREE.Mesh(
    new THREE.SphereGeometry(0.042, 20, 16),
    new THREE.MeshBasicMaterial({ color: INK })
  );
  const pRay = seg(gRay, new THREE.Vector3(), new THREE.Vector3(1, 0, 0), matInk);

  // 随动三轴（R 的三列）
  const triadMats = [matRed, matMid, matLight];
  const triad = [0, 1, 2].map(i => seg(gTriad, new THREE.Vector3(), new THREE.Vector3(), triadMats[i]));

  // 自转圆环、φ 弧、手柄
  const ringLine = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(new Array(73).fill(0).map(() => new THREE.Vector3())),
    matHair
  );
  const phiLine = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(new Array(73).fill(0).map(() => new THREE.Vector3())),
    matRed
  );
  const handle = new THREE.Mesh(
    new THREE.SphereGeometry(0.032, 16, 12),
    new THREE.MeshBasicMaterial({ color: RED })
  );
  gRing.add(ringLine, phiLine, handle);

  // θ₁ 弧 / 复合轴
  const arcLine = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(new Array(49).fill(0).map(() => new THREE.Vector3())),
    matHair
  );
  const axisLine = seg(gAxisC, new THREE.Vector3(), new THREE.Vector3(), matRed);
  const axisCone = cone(gAxisC, new THREE.Vector3(0, 0, 1.5), new THREE.Vector3(0, 0, 1), RED);

  /* ---------- 文本标签（DOM 覆盖层，字体与正文一致） ---------- */
  const labelBox = document.createElement('div');
  labelBox.className = 'labels';
  box.appendChild(labelBox);

  function label(text, cls) {
    const el = document.createElement('span');
    el.className = cls || 'ink';
    el.textContent = text;
    labelBox.appendChild(el);
    return { el, pos: new THREE.Vector3(), off: [0, 0], show: true };
  }
  const L = {
    x: label('xᴀ'), y: label('yᴀ'), z: label('zᴀ'),
    p0: label('p₀', 'gray'), w: label('ω̂', 'red'),
    p: label('p', 'ink'), th: label('θ₁', 'gray'), phi: label('φ', 'red'),
    read: label('', 'readout'),
  };
  L.read.el.style.left = '16px';
  L.read.el.style.top = '18px';
  L.read.static = true;
  L.note = label('', 'note');
  L.note.el.style.left = '16px';
  L.note.el.style.top = '40px';
  L.note.static = true;

  function place(lab, v3, dx, dy) {
    if (lab.static) return;
    const v = v3.clone().project(camera);
    if (v.z > 1) { lab.el.style.opacity = '0'; return; }
    lab.el.style.opacity = '1';
    const x = (v.x * 0.5 + 0.5) * size.w + dx;
    const y = (-v.y * 0.5 + 0.5) * size.h + dy;
    lab.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
  }

  /* ---------- 尺寸 ---------- */
  const size = { w: 1, h: 1 };
  function resize() {
    updateBasis();
    const w = Math.max(1, canvas.clientWidth);
    const h = Math.round(w * 520 / 860);
    canvas.style.height = h + 'px';
    size.w = w; size.h = h;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // 桌面 118px/单位；窄屏按画布高度收，避免球被裁掉
    const ppu = Math.min(118, h * 0.34);
    const halfH = h / (2 * ppu);
    const dist = halfH / Math.tan(THREE.MathUtils.degToRad(30 / 2));
    camera.position.copy(VIEW).multiplyScalar(dist);
    camera.lookAt(0, 0, 0);
    // 底部有图注条压着，画面整体上移半条，球心落在可见区的中心
    const cap = box.querySelector('.cap');
    camera.setViewOffset(w, h, -panX, (cap ? cap.offsetHeight : 0) / 2 - panY, w, h);
    camera.updateProjectionMatrix();
    // 标签投影发生在 renderer.render() 之前，相机的世界矩阵要自己先更新
    camera.updateMatrixWorld(true);
    camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
  }

  /* ---------- 每帧更新 ---------- */
  const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3();

  function rotVec(axis, th, v) {
    // Rodrigues：绕单位轴 axis 转 th，作用于 v（不分配矩阵）
    const c = Math.cos(th), s = Math.sin(th);
    const axv = tmpA.copy(axis).cross(v);
    const d = axis.dot(v);
    return new THREE.Vector3(
      v.x * c + axv.x * s + axis.x * d * (1 - c),
      v.y * c + axv.y * s + axis.y * d * (1 - c),
      v.z * c + axv.z * s + axis.z * d * (1 - c)
    );
  }
  function perpBasis(p) {
    const t = Math.abs(p.x) < 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
    const u = new THREE.Vector3().crossVectors(p, t).normalize();
    const v = new THREE.Vector3().crossVectors(p, u).normalize();
    return [u, v];
  }

  function render(S3, info) {
    resize();

    const dir = new THREE.Vector3(...S3.dir).normalize();
    const { R, Rmin, thetaC, axisC, axis, theta, twist } = info;

    // 刚体上那一点
    pDot.position.copy(dir);
    pRay.geometry.setFromPoints([new THREE.Vector3(), dir]);

    // 随动三轴 = R 的三列
    const cols = [0, 1, 2].map(j => new THREE.Vector3(R[0][j], R[1][j], R[2][j]));
    triad.forEach((line, j) => {
      line.geometry.setFromPoints([dir, dir.clone().addScaledVector(cols[j], 0.3)]);
    });

    // 自转圆环 + 手柄
    const [u1, v1] = perpBasis(dir);
    const ringPts = [];
    for (let i = 0; i <= 72; i++) {
      const a = (i / 72) * Math.PI * 2;
      ringPts.push(new THREE.Vector3()
        .copy(dir)
        .addScaledVector(u1, Math.cos(a) * RING_R)
        .addScaledVector(v1, Math.sin(a) * RING_R));
    }
    ringLine.geometry.setFromPoints(ringPts);

    const e2 = new THREE.Vector3(Rmin[0][1], Rmin[1][1], Rmin[2][1]);
    handle.position.copy(dir).addScaledVector(e2, RING_R);

    // φ 弧
    if (Math.abs(twist) > 0.02) {
      const M = Math.max(8, Math.round(Math.abs(twist * 180 / Math.PI) / 6));
      const pts = [];
      for (let i = 0; i <= M; i++) {
        const q = rotVec(dir, twist * (i / M), e2).multiplyScalar(RING_R);
        pts.push(q.add(dir));
      }
      phiLine.geometry.setFromPoints(pts);
      phiLine.visible = true;
    } else {
      phiLine.visible = false;
    }

    // θ₁ 最小转动弧
    if (axis) {
      const ax = new THREE.Vector3(...axis);
      const pts = [];
      for (let i = 0; i <= 48; i++) {
        pts.push(rotVec(ax, theta * (i / 48), new THREE.Vector3(1, 0, 0)).multiplyScalar(1.04));
      }
      arcLine.geometry.setFromPoints(pts);
      gArc.visible = true;
    } else {
      gArc.visible = false;
    }

    // 复合转轴：过原点，双向延长
    if (axisC) {
      const a = new THREE.Vector3(...axisC).normalize();
      axisLine.geometry.setFromPoints([a.clone().multiplyScalar(-0.75), a.clone().multiplyScalar(1.34)]);
      axisCone.position.copy(a).multiplyScalar(1.34 - 0.0425);
      axisCone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), a);
      gAxisC.visible = true;
    } else {
      gAxisC.visible = false;
    }

    // 标签
    place(L.x, new THREE.Vector3(1.26, 0, 0), 4, 4);
    place(L.y, new THREE.Vector3(0, 1.26, 0), 4, 4);
    place(L.z, new THREE.Vector3(0, 0, 1.26), 4, 4);
    place(L.p0, new THREE.Vector3(1.06, 0, 0), 6, -6);
    place(L.p, dir.clone().multiplyScalar(1.05), 7, -8);
    if (axis) {
      const mid = rotVec(new THREE.Vector3(...axis), theta / 2, new THREE.Vector3(1, 0, 0)).multiplyScalar(1.16);
      place(L.th, mid, 4, 4);
    } else L.th.el.style.opacity = '0';
    if (axisC) place(L.w, new THREE.Vector3(...axisC).normalize().multiplyScalar(1.5), 7, -4);
    else L.w.el.style.opacity = '0';
    if (Math.abs(twist) > 0.02) {
      const mid = rotVec(dir, twist / 2, e2).multiplyScalar(RING_R * 1.35).add(dir);
      place(L.phi, mid, 3, 3);
    } else L.phi.el.style.opacity = '0';

    L.read.el.textContent = `θ = ${(thetaC * 180 / Math.PI).toFixed(1)}°　φ = ${(twist * 180 / Math.PI).toFixed(0)}°`;
    L.note.el.textContent = axisC ? '拖黑点定方向；拖圆环绕 p̂ 自转' : 'θ ≈ 0：轴无定义（R = I）';
    L.note.el.style.color = axisC ? '#8a8a8a' : '#E30613';

    renderer.render(scene, camera);
  }

  /* ---------- 拾取 ---------- */
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const unitSphere = new THREE.Sphere(new THREE.Vector3(), 1);

  function toNdc(ev) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
  }
  function dirFromPointer(ev) {
    toNdc(ev);
    const hit = raycaster.ray.intersectSphere(unitSphere, new THREE.Vector3());
    if (hit) return hit.normalize();
    // 射线错过球：夹到轮廓上（与旧版 dirFromScreen 的行为一致）
    const t = -raycaster.ray.origin.dot(raycaster.ray.direction);
    const p = raycaster.ray.at(t, new THREE.Vector3());
    return p.lengthSq() > 1e-9 ? p.normalize() : new THREE.Vector3(0, 0, 1);
  }
  function twistFromPointer(ev, dir, Rmin) {
    toNdc(ev);
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(dir, dir);
    const hit = raycaster.ray.intersectPlane(plane, new THREE.Vector3());
    if (!hit) return null;
    const local = hit.sub(dir);
    if (local.lengthSq() < 1e-8) return null;
    const e2 = new THREE.Vector3(Rmin[0][1], Rmin[1][1], Rmin[2][1]);
    const e3 = new THREE.Vector3(Rmin[0][2], Rmin[1][2], Rmin[2][2]);
    return Math.atan2(local.dot(e3), local.dot(e2));
  }
  function screenOf(v3) {
    const v = v3.clone().project(camera);
    return { x: (v.x * 0.5 + 0.5) * size.w, y: (-v.y * 0.5 + 0.5) * size.h };
  }

  let drag = null;

  function bind() {
    canvas.style.cursor = 'grab';

    /* 视图手势：Ctrl+左键平移，右键旋转（捕获阶段截走，不干扰拾取） */
    let gesture = null;
    canvas.addEventListener('pointerdown', ev => {
      const pan = ev.button === 0 && (ev.ctrlKey || ev.metaKey);
      const rot = ev.button === 2;
      if(!pan && !rot) return;
      gesture = { mode: pan ? 'pan' : 'rot', x0: ev.clientX, y0: ev.clientY,
                  yaw0: yaw, pitch0: pitch, px0: panX, py0: panY };
      try { canvas.setPointerCapture(ev.pointerId); } catch(_) {}
      canvas.style.cursor = pan ? 'grabbing' : 'move';
      ev.preventDefault(); ev.stopPropagation();
    }, true);
    canvas.addEventListener('pointermove', ev => {
      if(!gesture) return;
      const mx = ev.clientX - gesture.x0, my = ev.clientY - gesture.y0;
      if(gesture.mode === 'pan'){
        panX = gesture.px0 + mx; panY = gesture.py0 + my;
      }else{
        yaw = gesture.yaw0 + mx * 0.008;
        pitch = Math.max(-1.2, Math.min(1.2, gesture.pitch0 - my * 0.008));
      }
      ev.preventDefault(); ev.stopPropagation();
      resize(); io.redraw();          // 走页面自己的重绘入口：render 需要 (S3, info)
    }, true);
    const gEnd = ev => {
      if(!gesture) return;
      gesture = null; canvas.style.cursor = 'grab';
      ev.preventDefault(); ev.stopPropagation();
    };
    canvas.addEventListener('pointerup', gEnd, true);
    canvas.addEventListener('pointercancel', gEnd, true);
    canvas.addEventListener('contextmenu', ev => ev.preventDefault());
    canvas.addEventListener('pointerdown', ev => {
      const { dir: d, info } = io.get();
      const dir = new THREE.Vector3(...d).normalize();
      const e2 = new THREE.Vector3(info.Rmin[0][1], info.Rmin[1][1], info.Rmin[2][1]);
      const hp = screenOf(dir.clone().addScaledVector(e2, RING_R));
      const r = canvas.getBoundingClientRect();
      const mx = ev.clientX - r.left, my = ev.clientY - r.top;
      if (Math.hypot(mx - hp.x, my - hp.y) < 16) {
        drag = { kind: 'twist' };
        try { canvas.setPointerCapture(ev.pointerId); } catch(_) {}
      } else {
        drag = { kind: 'pick' };
        try { canvas.setPointerCapture(ev.pointerId); } catch(_) {}
        io.setDir(dirFromPointer(ev).toArray());
      }
      ev.preventDefault();
    });
    canvas.addEventListener('pointermove', ev => {
      if (!drag) return;
      const { dir: d, info } = io.get();
      if (drag.kind === 'twist') {
        const psi = twistFromPointer(ev, new THREE.Vector3(...d).normalize(), info.Rmin);
        if (psi !== null) io.setTwist(psi);
      } else {
        io.setDir(dirFromPointer(ev).toArray());
      }
    });
    const up = () => { drag = null; };
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    window.addEventListener('resize', () => io.redraw());
  }

  /* 调试用：自转手柄的屏幕坐标（画布内 CSS 像素） */
  function handleScreen() {
    const { dir: d, info } = io.get();
    const dir = new THREE.Vector3(...d).normalize();
    const e2 = new THREE.Vector3(info.Rmin[0][1], info.Rmin[1][1], info.Rmin[2][1]);
    return screenOf(dir.clone().addScaledVector(e2, RING_R));
  }

  return { render, bind, resize, handleScreen, view: () => ({ yaw, pitch, panX, panY }) };
}
