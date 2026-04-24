import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

const canvas = document.querySelector('[data-where-globe]');
const shell = canvas ? canvas.closest('.where-globe') : null;

if (canvas && shell) {
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'low-power',
  });
  renderer.setClearColor(0x000000, 0);
  if (THREE.SRGBColorSpace) renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  camera.position.set(0, 0, 4.8);

  scene.add(new THREE.AmbientLight(0xfff7d6, 0.95));
  const sun = new THREE.DirectionalLight(0xffffff, 1.75);
  sun.position.set(-2.2, 2.8, 3.6);
  scene.add(sun);

  const candyRim = new THREE.DirectionalLight(0x67e8f9, 1.1);
  candyRim.position.set(2.4, -0.5, -2.4);
  scene.add(candyRim);

  const earthGroup = new THREE.Group();
  scene.add(earthGroup);

  const radius = 1.22;
  const earthTexture = makeCartoonEarthTexture();
  const cloudTexture = makeCartoonCloudTexture();
  if (THREE.SRGBColorSpace) {
    earthTexture.colorSpace = THREE.SRGBColorSpace;
    cloudTexture.colorSpace = THREE.SRGBColorSpace;
  }

  const earth = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 96, 64),
    new THREE.MeshToonMaterial({
      map: earthTexture,
      color: 0xffffff,
    }),
  );
  earthGroup.add(earth);

  const outline = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 1.018, 96, 64),
    new THREE.MeshBasicMaterial({
      color: 0x11345d,
      transparent: true,
      opacity: 0.46,
      side: THREE.BackSide,
    }),
  );
  earthGroup.add(outline);

  const clouds = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 1.018, 96, 64),
    new THREE.MeshBasicMaterial({
      map: cloudTexture,
      transparent: true,
      opacity: 0.56,
      depthWrite: false,
    }),
  );
  earthGroup.add(clouds);

  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 1.072, 96, 64),
    new THREE.MeshBasicMaterial({
      color: 0x7dd3fc,
      transparent: true,
      opacity: 0.16,
      side: THREE.BackSide,
      depthWrite: false,
    }),
  );
  earthGroup.add(atmosphere);

  const marker = new THREE.Group();
  const markerDot = new THREE.Mesh(
    new THREE.SphereGeometry(0.046, 24, 16),
    new THREE.MeshBasicMaterial({ color: 0xfff7ad }),
  );
  const markerCore = new THREE.Mesh(
    new THREE.SphereGeometry(0.026, 18, 12),
    new THREE.MeshBasicMaterial({ color: 0x14b8a6 }),
  );
  const markerRing = new THREE.Mesh(
    new THREE.RingGeometry(0.074, 0.122, 40),
    new THREE.MeshBasicMaterial({
      color: 0xffd166,
      transparent: true,
      opacity: 0.82,
      side: THREE.DoubleSide,
    }),
  );
  marker.add(markerDot, markerCore, markerRing);

  const shenzhenLat = 22.5431;
  const shenzhenLng = 114.0579;
  const shenzhen = latLngToVector3(shenzhenLat, shenzhenLng, radius * 1.035);
  marker.position.copy(shenzhen);
  marker.lookAt(new THREE.Vector3(0, 0, 0));
  marker.rotateY(Math.PI);
  earthGroup.add(marker);

  const labelCanvas = makeLabelCanvas('Shenzhen');
  const labelTexture = new THREE.CanvasTexture(labelCanvas);
  if (THREE.SRGBColorSpace) labelTexture.colorSpace = THREE.SRGBColorSpace;
  const label = new THREE.Sprite(new THREE.SpriteMaterial({
    map: labelTexture,
    transparent: true,
    depthTest: false,
  }));
  label.position.copy(latLngToVector3(shenzhenLat, shenzhenLng, radius * 1.24));
  label.scale.set(0.62, 0.2, 1);
  earthGroup.add(label);

  earthGroup.rotation.y = 2.1;
  earthGroup.rotation.x = -0.12;
  shell.classList.add('is-ready');

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const side = Math.max(1, Math.round(Math.min(rect.width, rect.height)));
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(side, side, false);
    camera.aspect = 1;
    camera.updateProjectionMatrix();
  }

  resize();
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);

  let last = performance.now();
  const spinSpeed = reduceMotion ? 0 : 0.105;

  function animate(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    earthGroup.rotation.y += dt * spinSpeed;
    clouds.rotation.y += dt * spinSpeed * 1.35;
    label.quaternion.copy(camera.quaternion);

    renderer.render(scene, camera);
    if (!reduceMotion) requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}

function latLngToVector3(lat, lng, radius) {
  const phi = (90 - lat) * Math.PI / 180;
  const theta = (lng + 180) * Math.PI / 180;
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

function makeCartoonEarthTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  const ocean = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  ocean.addColorStop(0, '#6dd5ff');
  ocean.addColorStop(0.48, '#2f9df4');
  ocean.addColorStop(1, '#1564c0');
  ctx.fillStyle = ocean;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.globalAlpha = 0.3;
  ctx.strokeStyle = '#a7f3ff';
  ctx.lineWidth = 5;
  for (let lat = -60; lat <= 60; lat += 30) {
    const y = projectLatLng(lat, 0, canvas).y;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(canvas.width * 0.28, y - 14, canvas.width * 0.72, y + 14, canvas.width, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  const landFill = '#84cc16';
  const landShade = '#4d9a2a';
  const landStroke = '#215732';

  drawLandBlob(ctx, canvas, [
    [72, -168], [60, -132], [48, -110], [28, -98], [12, -84],
    [-18, -78], [-54, -72], [-55, -38], [-18, -42], [7, -52],
    [28, -70], [54, -86], [72, -130],
  ], landFill, landStroke);
  drawLandBlob(ctx, canvas, [
    [70, -18], [62, 24], [50, 58], [30, 72], [8, 46],
    [-28, 28], [-36, 18], [-18, 8], [6, -8], [34, -12],
  ], landFill, landStroke);
  drawLandBlob(ctx, canvas, [
    [55, 48], [62, 86], [54, 126], [40, 146], [22, 122],
    [10, 96], [-8, 78], [8, 58], [28, 50],
  ], landFill, landStroke);
  drawLandBlob(ctx, canvas, [
    [36, 76], [30, 106], [14, 126], [-4, 114], [-10, 92],
    [8, 74], [24, 70],
  ], landShade, landStroke);
  drawLandBlob(ctx, canvas, [
    [2, 108], [-12, 130], [-28, 148], [-44, 136], [-38, 112],
    [-18, 104],
  ], '#a3d977', landStroke);
  drawLandBlob(ctx, canvas, [
    [-10, 112], [-14, 154], [-31, 154], [-40, 136], [-33, 116],
  ], '#fbbf24', landStroke);

  addIsland(ctx, canvas, 22.5, 114, 15, '#ffef8a');
  addIsland(ctx, canvas, 23, 121, 13, '#a3d977');
  addIsland(ctx, canvas, 35, 139, 16, '#a3d977');
  addIsland(ctx, canvas, 1.3, 103.8, 10, '#d9f99d');

  for (const [lat, lng, size] of [[18, -155, 8], [-17, -149, 6], [-20, 57, 7], [64, -22, 11]]) {
    addIsland(ctx, canvas, lat, lng, size, '#d9f99d');
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

function makeCartoonCloudTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const clouds = [
    [18, -165, 80], [42, -42, 96], [-8, -22, 104], [30, 68, 94],
    [4, 136, 72], [-35, 154, 86], [58, 112, 70], [-46, -96, 78],
  ];
  clouds.forEach(([lat, lng, size]) => drawCloud(ctx, canvas, lat, lng, size));

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return texture;
}

function drawLandBlob(ctx, canvas, points, fill, stroke) {
  ctx.save();
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 8;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  points.forEach(([lat, lng], index) => {
    const point = projectLatLng(lat, lng, canvas);
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.globalAlpha = 0.18;
  ctx.fillStyle = '#fff7ad';
  points.slice(0, 3).forEach(([lat, lng]) => addIsland(ctx, canvas, lat - 4, lng + 6, 22, '#fff7ad'));
  ctx.restore();
}

function addIsland(ctx, canvas, lat, lng, size, fill) {
  const point = projectLatLng(lat, lng, canvas);
  ctx.save();
  ctx.fillStyle = fill;
  ctx.strokeStyle = '#215732';
  ctx.lineWidth = Math.max(3, size * 0.16);
  ctx.beginPath();
  ctx.ellipse(point.x, point.y, size * 1.1, size * 0.72, -0.28, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawCloud(ctx, canvas, lat, lng, size) {
  const point = projectLatLng(lat, lng, canvas);
  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
  ctx.beginPath();
  ctx.ellipse(point.x - size * 0.35, point.y + size * 0.04, size * 0.38, size * 0.2, 0, 0, Math.PI * 2);
  ctx.ellipse(point.x, point.y - size * 0.04, size * 0.48, size * 0.24, 0, 0, Math.PI * 2);
  ctx.ellipse(point.x + size * 0.38, point.y + size * 0.06, size * 0.34, size * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function projectLatLng(lat, lng, canvas) {
  return {
    x: (lng + 180) / 360 * canvas.width,
    y: (90 - lat) / 180 * canvas.height,
  };
}

function makeLabelCanvas(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 360;
  canvas.height = 108;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff7ad';
  roundRect(ctx, 24, 22, 312, 64, 32);
  ctx.fill();
  ctx.strokeStyle = '#11345d';
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.fillStyle = '#11345d';
  ctx.font = '800 32px ui-rounded, "Arial Rounded MT Bold", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 180, 55);
  return canvas;
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}
