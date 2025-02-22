// Importy – ujisti se, že máš ve svém projektu správně nastavené moduly Three.js a VRButton.
// Pokud nepoužíváš moduly, můžeš využít globální proměnné načtené přes <script> tagy.
//import * as THREE from 'three';
import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.min.js';
import { VRButton } from 'https://cdn.jsdelivr.net/npm/three@0.128/examples/jsm/webxr/VRButton.js';


let scene, camera, renderer, cameraRig;
let controller1, controller2;
let raycaster;
const teleportableObjects = []; // Zde budou objekty, na které lze teleportovat (např. podlaha)

init();
animate();

function init() {
  // --- Vytvoření scény a nastavení pozadí ---
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xaaaaaa);

  // --- Vytvoření "rigu" (skupiny) pro kameru ---
  // Díky této skupině můžeme snadno měnit polohu celé sady (kamera + případně další objekty)
  cameraRig = new THREE.Group();
  scene.add(cameraRig);

  // --- Vytvoření kamery ---
  // Kamera simuluje pozici očí uživatele – zde se nastavuje výchozí výška (1.6 m) a počáteční pozice
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 1.6, 3);
  cameraRig.add(camera);

  // --- Vytvoření rendereru ---
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true; // Povolení VR režimu
  document.body.appendChild(renderer.domElement);

  // --- Přidání VR tlačítka ---
  // Toto tlačítko umožní vstoupit do VR režimu, pokud to prohlížeč podporuje.
  document.body.appendChild(VRButton.createButton(renderer));

  // --- Vytvoření místnosti ---
  createRoom();

  // --- Přidání základního osvětlení ---
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(0, 4, 4);
  scene.add(directionalLight);

  // --- Inicializace raycasteru ---
  // Raycaster slouží k vyhodnocení, kam kontroler "ukazuje" – potřebný pro teleportaci
  raycaster = new THREE.Raycaster();

// --- Nastavení VR kontrolerů ---
// Vytvoření geometrie a materiálu pro kostky
const controllerGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
const controllerMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });

// První kontroler
controller1 = renderer.xr.getController(0);
controller1.addEventListener('selectstart', onSelectStart);
controller1.addEventListener('selectend', onSelectEnd);

// Vytvoření kostky pro první kontroler
const controller1Mesh = new THREE.Mesh(controllerGeometry, controllerMaterial);
controller1.add(controller1Mesh); // Přidání kostky ke kontroleru
cameraRig.add(controller1);

// Druhý kontroler
controller2 = renderer.xr.getController(1);
controller2.addEventListener('selectstart', onSelectStart);
controller2.addEventListener('selectend', onSelectEnd);

// Vytvoření kostky pro druhý kontroler
const controller2Mesh = new THREE.Mesh(controllerGeometry, controllerMaterial);
controller2.add(controller2Mesh); // Přidání kostky ke kontroleru
cameraRig.add(controller2);

// Volitelně můžete přidat XR Grip pro přesnější sledování fyzické pozice kontroleru
const controllerGrip1 = renderer.xr.getControllerGrip(0);
camera.add(controllerGrip1);

const controllerGrip2 = renderer.xr.getControllerGrip(1);
camera.add(controllerGrip2);

  // --- Přidání vizuálního paprsku (volitelné) ---
  // Tento paprsek pomáhá uživateli vidět, kam kontroler ukazuje.
  const geometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -1)
  ]);
  const line = new THREE.Line(geometry);
  line.name = 'ray';
  line.scale.z = 5; // Délka paprsku
  controller1.add(line.clone());
  controller2.add(line.clone());

  // --- Přizpůsobení velikosti okna ---
  window.addEventListener('resize', onWindowResize, false);
}

function createRoom() {
  // Funkce vytvoří místnost se podlahou, stěnami a stropem.
  const room = new THREE.Group();

  // Vytvoření podlahy – používáme rovinnou geometrii (PlaneGeometry)
  const floorGeometry = new THREE.PlaneGeometry(10, 10);
  const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x808080 });
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2; // Otočíme podlahu, aby byla vodorovná
  floor.receiveShadow = true;
  room.add(floor);
  teleportableObjects.push(floor); // Podlaha je vhodná cíl pro teleportaci

  // Vytvoření stěn – zde použijeme čtyři roviny
  const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x999999 });
  const wallHeight = 3;
  const wallWidth = 10;

  // Zadní stěna
  const backWallGeometry = new THREE.PlaneGeometry(wallWidth, wallHeight);
  const backWall = new THREE.Mesh(backWallGeometry, wallMaterial);
  backWall.position.set(0, wallHeight / 2, -5);
  room.add(backWall);

  // Přední stěna
  const frontWall = new THREE.Mesh(backWallGeometry, wallMaterial);
  frontWall.rotation.y = Math.PI;
  frontWall.position.set(0, wallHeight / 2, 5);
  room.add(frontWall);

  // Levá stěna
  const sideWallGeometry = new THREE.PlaneGeometry(10, wallHeight);
  const leftWall = new THREE.Mesh(sideWallGeometry, wallMaterial);
  leftWall.rotation.y = Math.PI / 2;
  leftWall.position.set(-5, wallHeight / 2, 0);
  room.add(leftWall);

  // Pravá stěna
  const rightWall = new THREE.Mesh(sideWallGeometry, wallMaterial);
  rightWall.rotation.y = -Math.PI / 2;
  rightWall.position.set(5, wallHeight / 2, 0);
  room.add(rightWall);

  // Strop – další rovina umístěná nad místností
  const ceilingGeometry = new THREE.PlaneGeometry(10, 10);
  const ceilingMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc });
  const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
  ceiling.rotation.x = Math.PI / 2; // Otočíme strop, aby byl vodorovný nahoře
  ceiling.position.y = wallHeight;
  room.add(ceiling);

  // Přidání místnosti do scény
  scene.add(room);
}

function onSelectStart(event) {
  // Když uživatel stiskne tlačítko na kontroleru, můžeme například zobrazit paprsek nebo jinou vizuální indikaci.
  event.target.userData.isSelecting = true;
}

function onSelectEnd(event) {
  // Po uvolnění tlačítka provedeme teleportaci.
  const controller = event.target;
  controller.userData.isSelecting = false;

  // Zjistíme, kam kontroler "ukazuje" pomocí raycasteru
  const intersections = getIntersections(controller);
  if (intersections.length > 0) {
    const intersection = intersections[0];

    // Teleportace: aktualizujeme pozici celého "rigu" (zachová se výška kamery)
    cameraRig.position.x = intersection.point.x;
    cameraRig.position.z = intersection.point.z;
  }
}

function getIntersections(controller) {
  // Vytvoříme paprsek (ray) z pozice a orientace kontroleru, abychom zjistili, kde paprsek zasáhne teleportovatelný objekt.
  const tempMatrix = new THREE.Matrix4();
  tempMatrix.identity().extractRotation(controller.matrixWorld);

  raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
  raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

  // Vracíme pole průsečíků s objekty v teleportableObjects
  return raycaster.intersectObjects(teleportableObjects, false);
}

function onWindowResize() {
  // Přizpůsobení kamery a rendereru při změně velikosti okna
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  // Funkce pro animaci – renderer se automaticky vykresluje, což podporuje VR režim
  renderer.setAnimationLoop(render);
}

function render() {
  // Vykreslíme scénu z pohledu kamery
  renderer.render(scene, camera);
}
