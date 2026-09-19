import * as THREE from 'three';
import * as CANNON from 'cannon-es';

/*
  Élan hero scene — brushed-brass orbs (coffee crema bubbles / champagne
  beads, take your pick) drift and collide inside an invisible glass box.
  Gravity is gentle, collisions are real (Cannon-es), and the whole thing
  responds to cursor position for a quiet parallax. Object count and
  shadow quality scale down on smaller / lower-power screens.
*/

const canvas = document.getElementById('heroCanvas');
if (canvas) {
  const isMobile = window.innerWidth < 760;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const OBJECT_COUNT = isMobile ? 9 : 20;

  // ---------- Renderer ----------
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = !isMobile;

  // ---------- Scene / Camera ----------
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0, 16);

  // ---------- Lights ----------
  const ambient = new THREE.AmbientLight(0x1a4644, 1.2);
  scene.add(ambient);

  const keyLight = new THREE.PointLight(0xe2c68d, 42, 60);
  keyLight.position.set(6, 8, 10);
  keyLight.castShadow = !isMobile;
  scene.add(keyLight);

  const rimLight = new THREE.PointLight(0x2a6b63, 20, 60);
  rimLight.position.set(-8, -4, 4);
  scene.add(rimLight);

  // ---------- Bounds (invisible walls) ----------
  const bounds = { x: 9, y: 5.4, z: 4 };

  // ---------- Physics world ----------
  const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -1.0, 0) });
  world.broadphase = new CANNON.SAPBroadphase(world);
  world.allowSleep = true;

  const sphereMaterial = new CANNON.Material('sphere');
  const wallMaterial = new CANNON.Material('wall');
  world.addContactMaterial(new CANNON.ContactMaterial(sphereMaterial, sphereMaterial, {
    friction: 0.22, restitution: 0.75
  }));
  world.addContactMaterial(new CANNON.ContactMaterial(sphereMaterial, wallMaterial, {
    friction: 0.1, restitution: 0.55
  }));

  function addWall(pos, normal) {
    const body = new CANNON.Body({ mass: 0, material: wallMaterial });
    body.addShape(new CANNON.Plane());
    body.position.copy(pos);
    body.quaternion.setFromVectors(new CANNON.Vec3(0, 0, 1), normal);
    world.addBody(body);
  }
  addWall(new CANNON.Vec3(0, -bounds.y, 0), new CANNON.Vec3(0, 1, 0));
  addWall(new CANNON.Vec3(0, bounds.y, 0), new CANNON.Vec3(0, -1, 0));
  addWall(new CANNON.Vec3(-bounds.x, 0, 0), new CANNON.Vec3(1, 0, 0));
  addWall(new CANNON.Vec3(bounds.x, 0, 0), new CANNON.Vec3(-1, 0, 0));
  addWall(new CANNON.Vec3(0, 0, -bounds.z), new CANNON.Vec3(0, 0, 1));
  addWall(new CANNON.Vec3(0, 0, bounds.z), new CANNON.Vec3(0, 0, -1));

  // ---------- Orbs (visual + physics pairs) ----------
  const orbs = [];
  const geometry = new THREE.SphereGeometry(1, 32, 32);
  const palette = [0xc6a05e, 0xe2c68d, 0x8c6b3d, 0xf2ede3];

  for (let i = 0; i < OBJECT_COUNT; i++) {
    const radius = THREE.MathUtils.randFloat(0.2, 0.5);
    const material = new THREE.MeshStandardMaterial({
      color: palette[i % palette.length],
      metalness: 0.85,
      roughness: 0.3,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.scale.setScalar(radius);
    mesh.castShadow = !isMobile;
    mesh.receiveShadow = !isMobile;
    scene.add(mesh);

    const body = new CANNON.Body({
      mass: radius * 2,
      shape: new CANNON.Sphere(radius),
      material: sphereMaterial,
      linearDamping: 0.5,
      angularDamping: 0.6,
    });
    body.position.set(
      THREE.MathUtils.randFloatSpread(bounds.x * 1.6),
      THREE.MathUtils.randFloat(0, bounds.y * 1.6),
      THREE.MathUtils.randFloatSpread(bounds.z * 1.4)
    );
    world.addBody(body);

    orbs.push({ mesh, body, radius });
  }

  // ---------- Click-to-spawn (interactive 3D feature) ----------
  window.addEventListener('pointerdown', (e) => {
    if (e.target.closest('a, button, .nav, .reserve-form')) return;
    if (orbs.length > (isMobile ? 16 : 34)) return;
    const radius = THREE.MathUtils.randFloat(0.2, 0.5);
    const material = new THREE.MeshStandardMaterial({
      color: palette[Math.floor(Math.random() * palette.length)],
      metalness: 0.85,
      roughness: 0.3,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.scale.setScalar(radius);
    scene.add(mesh);
    const body = new CANNON.Body({
      mass: radius * 2,
      shape: new CANNON.Sphere(radius),
      material: sphereMaterial,
      linearDamping: 0.5,
      angularDamping: 0.6,
    });
    body.position.set(
      (e.clientX / window.innerWidth - 0.5) * bounds.x * 1.6,
      bounds.y * 1.2,
      THREE.MathUtils.randFloatSpread(bounds.z)
    );
    world.addBody(body);
    orbs.push({ mesh, body, radius });
  }, { passive: true });

  // ---------- Mouse parallax ----------
  const mouse = { x: 0, y: 0 };
  window.addEventListener('pointermove', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  }, { passive: true });

  // ---------- Resize ----------
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // ---------- Animate ----------
  const clock = new THREE.Clock();
  let elapsed = 0;

  function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 1 / 30);
    elapsed += dt;

    if (!reducedMotion) {
      world.step(1 / 60, dt, 3);

      orbs.forEach((o, i) => {
        const drift = Math.sin(elapsed * 0.5 + i) * 0.02;
        o.body.applyForce(new CANNON.Vec3(drift, 0.32, Math.cos(elapsed * 0.4 + i) * 0.02), o.body.position);
        o.mesh.position.copy(o.body.position);
        o.mesh.quaternion.copy(o.body.quaternion);
      });

      camera.position.x += (mouse.x * 1.4 - camera.position.x) * 0.03;
      camera.position.y += (mouse.y * 0.8 - camera.position.y) * 0.03;
      camera.lookAt(0, 0, 0);
    }

    renderer.render(scene, camera);
  }
  animate();

  // Pause heavy work when the hero scrolls out of view
  const heroSection = document.querySelector('.hero');
  if ('IntersectionObserver' in window && heroSection) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => { renderer.domElement.style.opacity = entry.isIntersecting ? '1' : '0.4'; });
    }, { threshold: 0.05 });
    io.observe(heroSection);
  }
}
