import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { PointerLockControls } from "three-stdlib";

export const scene = new THREE.Scene();
let camera;
let controls;
let renderer;

export const setupScene = () => {
  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  scene.add(camera);
  camera.position.set(0, 2, 15);

  renderer = new THREE.WebGLRenderer({ antialias: false });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0xffffff, 1);
  document.body.appendChild(renderer.domElement);

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // Detect device type
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  if (isMobile) {
    // Use OrbitControls on mobile
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = true;
    controls.enableRotate = true;
    controls.enablePan = false;

    const fixedPolarAngle = Math.PI / 2.30; // Looking straight horizontally
    controls.minPolarAngle = fixedPolarAngle;
    controls.maxPolarAngle = fixedPolarAngle;
  
    // Add horizontal boundaries if needed
    controls.maxAzimuthAngle = Infinity ; // Limit horizontal panning to 45 degrees
    controls.minAzimuthAngle = -Infinity; // Limit horizontal panning to -45 degrees
    controls.maxDistance = 20; // Limit zoom out distance
    controls.minDistance = 5; // Limit zoom in distance
    
    
  } else {
    // Use PointerLockControls on desktop
    controls = new PointerLockControls(camera, renderer.domElement);
    scene.add(controls.getObject());
  }

  window.addEventListener("resize", onWindowResize, false);

  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  return { camera, controls, renderer };
};
