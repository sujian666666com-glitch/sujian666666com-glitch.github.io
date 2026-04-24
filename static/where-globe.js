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
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0, 4.6);

  scene.add(new THREE.AmbientLight(0xffffff, 0.62));
  const sun = new THREE.DirectionalLight(0xffffff, 1.5);
  sun.position.set(-2.6, 2.1, 3.2);
  scene.add(sun);

  const rim = new THREE.DirectionalLight(0x6ee7ff, 0.72);
  rim.position.set(2.5, -0.8, -2.2);
  scene.add(rim);

  const earthGroup = new THREE.Group();
  scene.add(earthGroup);

  const radius = 1.22;
  const earth = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 96, 64),
    new THREE.MeshPhongMaterial({
      color: 0x1d4ed8,
      shininess: 26,
    }),
  );
  earthGroup.add(earth);

  const clouds = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 1.012, 96, 64),
    new THREE.MeshLambertMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
    }),
  );
  earthGroup.add(clouds);

  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 1.045, 96, 64),
    new THREE.MeshBasicMaterial({
      color: 0x67e8f9,
      transparent: true,
      opacity: 0.12,
      side: THREE.BackSide,
      depthWrite: false,
    }),
  );
  earthGroup.add(atmosphere);

  const marker = new THREE.Group();
  const markerMat = new THREE.MeshBasicMaterial({ color: 0x2dd4bf });
  const markerDot = new THREE.Mesh(new THREE.SphereGeometry(0.038, 24, 16), markerMat);
  const markerRing = new THREE.Mesh(
    new THREE.RingGeometry(0.07, 0.105, 36),
    new THREE.MeshBasicMaterial({
      color: 0x2dd4bf,
      transparent: true,
      opacity: 0.58,
      side: THREE.DoubleSide,
    }),
  );
  marker.add(markerDot, markerRing);

  const shenzhenLat = 22.5431;
  const shenzhenLng = 114.0579;
  const shenzhen = latLngToVector3(shenzhenLat, shenzhenLng, radius * 1.026);
  marker.position.copy(shenzhen);
  marker.lookAt(new THREE.Vector3(0, 0, 0));
  marker.rotateY(Math.PI);
  earthGroup.add(marker);

  const labelCanvas = makeLabelCanvas('Shenzhen');
  const labelTexture = new THREE.CanvasTexture(labelCanvas);
  const label = new THREE.Sprite(new THREE.SpriteMaterial({
    map: labelTexture,
    transparent: true,
    depthTest: false,
  }));
  label.position.copy(latLngToVector3(shenzhenLat, shenzhenLng, radius * 1.22));
  label.scale.set(0.58, 0.18, 1);
  earthGroup.add(label);

  const textureLoader = new THREE.TextureLoader();
  textureLoader.crossOrigin = 'anonymous';
  Promise.all([
    loadTexture(textureLoader, 'https://threejs.org/examples/textures/planets/earth_day_4096.jpg'),
    loadOptionalTexture(textureLoader, 'https://threejs.org/examples/textures/planets/earth_normal_2048.jpg'),
    loadOptionalTexture(textureLoader, 'https://threejs.org/examples/textures/planets/earth_specular_2048.jpg'),
    loadOptionalTexture(textureLoader, 'https://threejs.org/examples/textures/planets/earth_clouds_1024.png'),
  ]).then(([map, normalMap, specularMap, cloudMap]) => {
    if (THREE.SRGBColorSpace) map.colorSpace = THREE.SRGBColorSpace;
    earth.material = new THREE.MeshPhongMaterial({
      map,
      normalMap: normalMap || null,
      specularMap: specularMap || null,
      specular: new THREE.Color(0x243b53),
      shininess: 22,
    });
    earth.material.needsUpdate = true;

    if (cloudMap) {
      if (THREE.SRGBColorSpace) cloudMap.colorSpace = THREE.SRGBColorSpace;
      clouds.material = new THREE.MeshLambertMaterial({
        map: cloudMap,
        transparent: true,
        opacity: 0.26,
        depthWrite: false,
      });
      clouds.material.needsUpdate = true;
    }

    shell.classList.add('is-ready');
  }).catch(() => {
    shell.classList.add('is-fallback');
  });

  earthGroup.rotation.y = 2.1;
  earthGroup.rotation.x = -0.1;

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
  const spinSpeed = reduceMotion ? 0 : 0.11;

  function animate(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    earthGroup.rotation.y += dt * spinSpeed;
    clouds.rotation.y += dt * spinSpeed * 1.45;
    label.quaternion.copy(camera.quaternion);

    renderer.render(scene, camera);
    if (!reduceMotion) requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}

function loadTexture(loader, url) {
  return new Promise((resolve, reject) => {
    loader.load(url, resolve, undefined, reject);
  });
}

function loadOptionalTexture(loader, url) {
  return new Promise((resolve) => {
    loader.load(url, resolve, undefined, () => resolve(null));
  });
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

function makeLabelCanvas(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
  roundRect(ctx, 22, 20, 276, 56, 28);
  ctx.fill();
  ctx.strokeStyle = 'rgba(45, 212, 191, 0.42)';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = 'rgba(241, 245, 249, 0.98)';
  ctx.font = '700 30px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 160, 48);
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
