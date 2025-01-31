class Louder3dModel {
    backcolor;
    objectName;
    textures;
    nonTexture = true;
    objectTest;

    /**
     * 
     * @param {string} backcolor - background color
     * @param {string} objectName - file names .obj / .fbx
     */
    constructor(backcolor, objectName, textures = objectName.substring(0, objectName.lastIndexOf('.'))+".mtl") {
      this.backcolor = backcolor;
      this.objectName = objectName;
      this.textures = textures;
    }
      
    async renderModel() {
      const container = document.getElementById("3dModelScreen");
      container.innerHTML = "";

      // Create loading overlay
      const loadingOverlay = document.createElement('div');
      loadingOverlay.style.position = 'absolute';
      loadingOverlay.style.top = '0';
      loadingOverlay.style.left = '0';
      loadingOverlay.style.width = '100%';
      loadingOverlay.style.height = '100%';
      loadingOverlay.style.display = 'flex';
      loadingOverlay.style.justifyContent = 'center';
      loadingOverlay.style.alignItems = 'center';
      loadingOverlay.style.backgroundColor = 'rgba(0,0,0,0.5)';
      loadingOverlay.style.zIndex = '1000';
      
      const loadingText = document.createElement('div');
      loadingText.textContent = 'Loading 3D Model...';
      loadingText.style.color = 'white';
      loadingText.style.fontSize = '24px';
      
      const progressBar = document.createElement('div');
      progressBar.style.width = '0%';
      progressBar.style.height = '4px';
      progressBar.style.backgroundColor = 'white';
      progressBar.style.marginTop = '10px';
      
      loadingOverlay.appendChild(loadingText);
      loadingOverlay.appendChild(progressBar);
      container.appendChild(loadingOverlay);

      // Inicializace scény, kamery a rendereru
      let autoRotate = true;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
      const renderer = new THREE.WebGLRenderer();
      renderer.setSize(container.clientWidth, container.clientHeight);
      renderer.setClearColor(this.backcolor, 1); 
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      
      // Připojení rendereru do prvku
      container.appendChild(renderer.domElement);

      // Aktualizace velikosti při změně velikosti okna
      const resizeHandler = () => {
          camera.aspect = container.clientWidth / container.clientHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(container.clientWidth, container.clientHeight);
      };
      window.addEventListener('resize', resizeHandler);
  
      // OrbitControls pro ovládání
      const controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.screenSpacePanning = false;

      // Události pro ovládání rotace
      controls.addEventListener('start', () => {
          autoRotate = false;
      });

      controls.addEventListener('end', () => {
          autoRotate = true;
      });
  
      // Nastavení světla
      const light = new THREE.DirectionalLight(0xffffff, 1);
      light.position.set(5, 10, 7.5);
      camera.add(light);
      scene.add(camera);
  
      // Asynchronní načítání materiálů
      const loadMaterials = () => {
        return new Promise((resolve, reject) => {
          const mtlLoader = new THREE.MTLLoader();
          mtlLoader.load(
            this.textures, 
            (materials) => {
              materials.preload();
              resolve(materials);
            },
            (progress) => {
              // Update progress for materials
              const progressPercent = (progress.loaded / progress.total) * 50;
              progressBar.style.width = `${progressPercent}%`;
            },
            (error) => {
              console.error('Error loading materials:', error);
              resolve(null);
            }
          );
        });
      };

      // Asynchronní načítání modelu
      const loadModel = (materials) => {
        return new Promise((resolve, reject) => {
          let loader;
          let stlType = false;

          switch (this.getFileExtension(this.objectName)) {  
            case 'fbx':  
                loader = new THREE.FBXLoader();
                break;
            case 'obj':  
                loader = new THREE.OBJLoader();
                break;
            case 'stl':
                loader = new THREE.STLLoader();
                stlType = true;
                break;
            default:
                reject(new Error('Nepodporovaný formát souboru'));
                return;
          }

 

          loader.load(
            this.objectName, 
            (object) => {
              if (stlType) {
                // Vytvoříme materiál
                const material = new THREE.MeshStandardMaterial({});
                // Vytvoříme Mesh
                object = new THREE.Mesh(object, material);
              }
         if (materials) {
            //loader.setMaterials(materials);
          }
              this.objectTest = object;
              object.position.set(0, 0, 0);
              object.rotation.x = Math.PI / -2.5; 
              object.scale.set(2, 2, 2);

              scene.add(object);
              resolve(object);
            }, 
            (progress) => {
              // Update progress for model
              const progressPercent = 50 + (progress.loaded / progress.total) * 50;
              progressBar.style.width = `${progressPercent}%`;
            },
            (error) => {
              console.error('Chyba při načítání modelu:', error);
              reject(error);
            }
          );
        });
      };

      try {
        // Sekvenční asynchronní načítání
        const materials = await loadMaterials();
        await loadModel(materials);

        // Odstraň loading overlay
        container.removeChild(loadingOverlay);

        // Nastavení kamery
        camera.position.set(0, 0, 5);
  
        // Animace
        const animate = () => {
          requestAnimationFrame(animate);
          controls.update();
          if (autoRotate && this.objectTest) {
            this.objectTest.rotation.z += 0.01;
          }
          renderer.render(scene, camera);
        };
  
        animate();
      } catch (error) {
        console.error('Chyba při načítání:', error);
        loadingText.textContent = 'Error loading model';
      }
    }
  
    getFileExtension(filename) {
      const lastDot = filename.lastIndexOf('.');
      return lastDot === -1 ? '' : filename.slice(lastDot + 1).toLowerCase();
    }
}