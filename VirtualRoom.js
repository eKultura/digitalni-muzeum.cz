// VirtualRoom.js
import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';

export class VirtualRoomWithModels {
    constructor() {
        // Základní nastavení
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.cameraRig = null;
        this.controller1 = null;
        this.controller2 = null;
        this.raycaster = null;
        this.teleportableObjects = [];
        this.models = new Map(); // Mapa pro uchování všech modelů
        this.modelCallbacks = new Map(); // Nová mapa pro callback funkce

        // Inicializace loaderů
        this.stlLoader = new STLLoader();
        this.objLoader = new OBJLoader();

        this.init();
    }

    init() {
        // Inicializace scény
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xaaaaaa);

        // Camera rig
        this.cameraRig = new THREE.Group();
        this.scene.add(this.cameraRig);

        // Kamera
        this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 1.6, 3);
        this.cameraRig.add(this.camera);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.xr.enabled = true;
        document.body.appendChild(this.renderer.domElement);
        document.body.appendChild(VRButton.createButton(this.renderer));

        // Vytvoření místnosti a osvětlení
        this.createRoom();
        this.setupLighting();
        
        // Nastavení VR kontrolerů
        this.setupControllers();

        // Event listenery
        window.addEventListener('resize', () => this.onWindowResize(), false);

        // Spuštění animační smyčky
        this.animate();
    }

    createRoom() {
        const room = new THREE.Group();

        // Podlaha
        const floorGeometry = new THREE.PlaneGeometry(10, 10);
        const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x808080 });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        room.add(floor);
        this.teleportableObjects.push(floor);

        // Stěny
        const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x999999 });
        const wallHeight = 3;
        const wallWidth = 10;

        // Vytvoření stěn
        [
            { pos: [0, wallHeight / 2, -5], rot: [0, 0, 0] },
            { pos: [0, wallHeight / 2, 5], rot: [0, Math.PI, 0] },
            { pos: [-5, wallHeight / 2, 0], rot: [0, Math.PI / 2, 0] },
            { pos: [5, wallHeight / 2, 0], rot: [0, -Math.PI / 2, 0] }
        ].forEach(wall => {
            const wallGeometry = new THREE.PlaneGeometry(wallWidth, wallHeight);
            const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);
            wallMesh.position.set(...wall.pos);
            wallMesh.rotation.set(...wall.rot);
            room.add(wallMesh);
        });

        // Strop
        const ceiling = new THREE.Mesh(
            new THREE.PlaneGeometry(10, 10),
            new THREE.MeshStandardMaterial({ color: 0xcccccc })
        );
        ceiling.rotation.x = Math.PI / 2;
        ceiling.position.y = wallHeight;
        room.add(ceiling);

        this.scene.add(room);
    }

    setupLighting() {
        // Ambientní světlo
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        // Hlavní směrové světlo
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(0, 4, 4);
        this.scene.add(directionalLight);

        // Doplňkové světlo
        const fillLight = new THREE.DirectionalLight(0xffffff, 0.7);
        fillLight.position.set(-5, 5, -5);
        this.scene.add(fillLight);
    }

    setupControllers() {
        // Inicializace raycasteru
        this.raycaster = new THREE.Raycaster();

        // Geometrie pro kontrolery
        const controllerGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
        const controllerMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });

        // První kontroler
        this.controller1 = this.renderer.xr.getController(0);
        this.controller1.addEventListener('selectstart', (event) => this.onSelectStart(event));
        this.controller1.addEventListener('selectend', (event) => this.onSelectEnd(event));
        
        const controller1Mesh = new THREE.Mesh(controllerGeometry, controllerMaterial);
        this.controller1.add(controller1Mesh);
        this.cameraRig.add(this.controller1);

        // Druhý kontroler
        this.controller2 = this.renderer.xr.getController(1);
        this.controller2.addEventListener('selectstart', (event) => this.onSelectStart(event));
        this.controller2.addEventListener('selectend', (event) => this.onSelectEnd(event));
        
        const controller2Mesh = new THREE.Mesh(controllerGeometry, controllerMaterial);
        this.controller2.add(controller2Mesh);
        this.cameraRig.add(this.controller2);

        // Paprsky pro vizualizaci
        const geometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, -1)
        ]);
        
        const line = new THREE.Line(geometry);
        line.name = 'ray';
        line.scale.z = 5;
        
        this.controller1.add(line.clone());
        this.controller2.add(line.clone());
    }

    onSelectStart(event) {
        event.target.userData.isSelecting = true;
    }

    onSelectEnd(event) {
      const controller = event.target;
      controller.userData.isSelecting = false;

      const intersections = this.getIntersections(controller);
      if (intersections.length > 0) {
          const intersection = intersections[0];
          const object = intersection.object;

          // Projdeme všechny modely a zjistíme, jestli máme callback
          for (let [id, model] of this.models) {
              if (model === object && this.modelCallbacks.has(id)) {
                  // Zavoláme příslušný callback
                  this.modelCallbacks.get(id)(model);
                  return;
              }
          }

          // Pokud nebyl nalezen callback, použijeme původní teleportaci
          if (this.teleportableObjects.includes(object)) {
              this.cameraRig.position.x = intersection.point.x;
              this.cameraRig.position.z = intersection.point.z;
          }
      }
  }

    getIntersections(controller) {
        const tempMatrix = new THREE.Matrix4();
        tempMatrix.identity().extractRotation(controller.matrixWorld);

        this.raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
        this.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

        return this.raycaster.intersectObjects(this.teleportableObjects, false);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        this.renderer.setAnimationLoop(() => {
            this.renderer.render(this.scene, this.camera);
        });
    }

    // Metoda pro přidání nového modelu
    async addModel(modelConfig) {
      const {
          id,
          path,
          type = 'stl', // Nový parametr pro typ souboru ('stl' nebo 'obj')
          position = { x: 0, y: 1.5, z: -3 },
          rotation = { x: -Math.PI / 2, y: 0, z: Math.PI / 6 },
          scale = { x: 1.0, y: 1.0, z: 1.0 },
          color = 0xc0c0c0,
          onInteract = null
      } = modelConfig;

      try {
          let model;

          if (type.toLowerCase() === 'obj') {
              // Načtení OBJ modelu
              model = await new Promise((resolve, reject) => {
                  this.objLoader.load(path, 
                      (object) => {
                          // OBJ loader vrací Group, aplikujeme materiál na všechny meshe
                          object.traverse((child) => {
                              if (child instanceof THREE.Mesh) {
                                  child.material = new THREE.MeshStandardMaterial({
                                      color: color,
                                      metalness: 0.5,
                                      roughness: 0.5
                                  });
                              }
                          });
                          resolve(object);
                      },
                      undefined,
                      reject
                  );
              });
          } else {
              // Načtení STL modelu (původní funkcionalita)
              const geometry = await new Promise((resolve, reject) => {
                  this.stlLoader.load(path, resolve, undefined, reject);
              });

              const material = new THREE.MeshStandardMaterial({
                  color: color,
                  metalness: 0.5,
                  roughness: 0.5
              });

              model = new THREE.Mesh(geometry, material);

              // Centrování STL modelu
              geometry.computeBoundingBox();
              const center = geometry.boundingBox.getCenter(new THREE.Vector3());
              model.position.sub(center);
          }

          // Nastavení pozice, rotace a měřítka
          model.position.set(position.x, position.y, position.z);
          model.rotation.set(rotation.x, rotation.y, rotation.z);
          model.scale.set(scale.x, scale.y, scale.z);

          // Přidání modelu do scény a do mapy modelů
          this.scene.add(model);
          this.models.set(id, model);

          // Uložení callback funkce, pokud byla poskytnuta
          if (onInteract) {
              this.modelCallbacks.set(id, onInteract);
              // Přidání do objektů, které lze zasáhnout raycastem
              this.teleportableObjects.push(model);
          }

          return model;
      } catch (error) {
          console.error(`Chyba při načítání modelu ${id}:`, error);
          return null;
      }
  }

    // Metoda pro odstranění modelu
    removeModel(modelId) {
        const model = this.models.get(modelId);
        if (model) {
            this.scene.remove(model);
            this.models.delete(modelId);
        }
    }

    // Metoda pro aktualizaci pozice modelu
    updateModelPosition(modelId, position) {
        const model = this.models.get(modelId);
        if (model) {
            model.position.set(position.x, position.y, position.z);
        }
    }

    // Metoda pro aktualizaci rotace modelu
    updateModelRotation(modelId, rotation) {
        const model = this.models.get(modelId);
        if (model) {
            model.rotation.set(rotation.x, rotation.y, rotation.z);
        }
    }

    // Metoda pro aktualizaci měřítka modelu
    updateModelScale(modelId, scale) {
        const model = this.models.get(modelId);
        if (model) {
            model.scale.set(scale.x, scale.y, scale.z);
        }
    }
}