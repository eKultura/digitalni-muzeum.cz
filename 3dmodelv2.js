// Louder3D Model Renderer
class Louder3dModel {
    // ==================================================
    // 📐 SCENE CONFIGURATION
    // ==================================================
    backcolor = '#FFFFFF';  // Background color
    objectName = '';  // 3D model filename
    textures = '';  // Texture filename
    autotexture = false;
    nonTexture = true;  // Non-texture flag
    objectTest = null;  // Loaded 3D object reference

    // ==================================================
    // 📷 CAMERA CONFIGURATION
    // ==================================================
    cameraFOV = 75;  // Field of View
    cameraNearPlane = 0.1;  // Near clipping plane
    cameraFarPlane = 1000;  // Far clipping plane
    cameraPosition = { x: 0, y: 0, z: 5 };  // Camera position

    // ==================================================
    // 💡 LIGHTING CONFIGURATION
    // ==================================================
    lightColor = 0xffffff;  // Light color
    lightIntensity = 1;  // Light intensity
    lightPosition = { x: 5, y: 10, z: 7.5 };  // Light position

    // ==================================================
    // 🧩 MODEL CONFIGURATION
    // ==================================================
    modelPosition = { x: 0, y: 0, z: 0 };  // Model position
    modelRotation = { x: Math.PI / -2.5, y: 0, z: 0 };  // Model rotation
    modelScale = { x: 2, y: 2, z: 2 };  // Model scale

    // ==================================================
    // 🎮 INTERACTION CONFIGURATION
    // ==================================================
    autoRotate = true;  // Automatic rotation
    enableOrbitControls = true;  // Orbit controls

    // ==================================================
    // 🖌️ RENDERING CONFIGURATION
    // ==================================================
    pixelRatio = window.devicePixelRatio;  // Pixel ratio
    shadowMapEnabled = true;  // Shadow mapping
    shadowMapType = THREE.PCFSoftShadowMap;  // Shadow map type

    /**
     * Constructor for Louder3D Model
     * @param {Object} options - Configuration options
     */
    constructor(options = {}) {
        // Override default values with provided options
        Object.assign(this, options);
        
        // Auto-generate texture filename if not provided
        if (!this.textures && this.objectName&& this.autotexture) {
            this.textures = this.objectName.substring(0, this.objectName.lastIndexOf('.')) + ".mtl";
        }
    }

    // ==================================================
    // 🚀 MODEL RENDERING METHOD
    // ==================================================
    async renderModel() {
        const container = document.getElementById("3dModelScreen");
        container.innerHTML = "";

        // [Rest of the original renderModel method remains unchanged]
        const loadingOverlay = document.createElement('div');
        //loadingOverlay.style.position = 'absolute';
        //loadingOverlay.style.top = '0';
        //loadingOverlay.style.left = '0';
        loadingOverlay.style.width = '100%';
        loadingOverlay.style.height = '100%';
        loadingOverlay.style.display = 'flex';
        //loadingOverlay.style.justifyContent = 'center';
        loadingOverlay.style.alignItems = 'center';
        loadingOverlay.style.backgroundColor = 'white';
        loadingOverlay.style.zIndex = '1000';
        
        const loadingText = document.createElement('div');
        loadingText.textContent = 'Loading 3D Model...';
        loadingText.style.color = 'black';
        loadingText.style.fontSize = '24px';
        
        const progressBar = document.createElement('div');
        progressBar.style.width = '0%';
        progressBar.style.height = '4px';
        progressBar.style.backgroundColor = 'black';
        progressBar.style.marginTop = '10px';
        
        loadingOverlay.appendChild(loadingText);
        loadingOverlay.appendChild(progressBar);
        container.appendChild(loadingOverlay);

        // Scene initialization with custom configuration
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(
            this.cameraFOV, 
            container.clientWidth / container.clientHeight, 
            this.cameraNearPlane, 
            this.cameraFarPlane
        );
        camera.position.set(
            this.cameraPosition.x, 
            this.cameraPosition.y, 
            this.cameraPosition.z
        );

        const renderer = new THREE.WebGLRenderer();
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setClearColor(this.backcolor, 1); 
        renderer.setPixelRatio(this.pixelRatio);
        renderer.shadowMap.enabled = this.shadowMapEnabled;
        renderer.shadowMap.type = this.shadowMapType;
        renderer.domElement.style.display = "none";
        container.appendChild(renderer.domElement);

        // Resize handler
        const resizeHandler = () => {
            camera.aspect = container.clientWidth / container.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(container.clientWidth, container.clientHeight);
        };
        window.addEventListener('resize', resizeHandler);
  
        // Orbit Controls
        const controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.screenSpacePanning = false;

        // Rotation control events
        let autoRotate = this.autoRotate;
        controls.addEventListener('start', () => {
            autoRotate = false;
        });

        controls.addEventListener('end', () => {
            autoRotate = true;
        });
  
        // Lighting with custom configuration
        const light = new THREE.DirectionalLight(
            this.lightColor, 
            this.lightIntensity
        );
        light.position.set(
            this.lightPosition.x, 
            this.lightPosition.y, 
            this.lightPosition.z
        );
        camera.add(light);
        scene.add(camera);
  
        // Materials loading (unchanged)
        const loadMaterials = () => {
            let primobj = this;
            return new Promise((resolve, reject) => {

        
                const mtlLoader = new THREE.MTLLoader();
                mtlLoader.load(
                    this.textures,
                    (materials) => {
                        materials.preload();
                        resolve(materials);
                    },
                    (progress) => {
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

        // Model loading with custom positioning
        let loader;
        const loadModel = (materials) => {
            return new Promise((resolve, reject) => {
                
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
                        reject(new Error('Unsupported file format'));
                        return;
                }

                loader.load(
                    this.objectName, 
                    (object) => {
                        if (stlType) {
                            const material = new THREE.MeshStandardMaterial({});
                            object = new THREE.Mesh(object, material);
                        }

                        if (materials) {
                            // Commented out as in original code
                            //loader.setMaterials(materials);
                        }

                        this.objectTest = object;
                        object.position.set(
                            this.modelPosition.x, 
                            this.modelPosition.y, 
                            this.modelPosition.z
                        );
                        object.rotation.set(
                            this.modelRotation.x, 
                            this.modelRotation.y, 
                            this.modelRotation.z
                        );
                        object.scale.set(
                            this.modelScale.x, 
                            this.modelScale.y, 
                            this.modelScale.z
                        );

                        scene.add(object);
                        resolve(object);
                    }, 
                    (progress) => {
                        const progressPercent = 50 + (progress.loaded / progress.total) * 50;
                        progressBar.style.width = `${progressPercent}%`;
                    },
                    (error) => {
                        console.error('Error loading model:', error);
                        reject(error);
                    }
                );
            });
        };

        try {
            // Sequential asynchronous loading
            const materials = await loadMaterials();
            if (materials) {
                   await loadModel(materials);
            }
         

            // Remove loading overlay
            container.removeChild(loadingOverlay);
            
            renderer.domElement.style.display = "block";

            // Animation
            const animate = () => {
                requestAnimationFrame(animate);
                controls.update();
                if (this.vrControlPanel) {
                    this.vrControlPanel.update();
                }
                if (autoRotate && this.objectTest) {
                    this.objectTest.rotation.z += 0.01;
                }
                renderer.render(scene, camera);
            };
  
            animate();
        } catch (error) {
            console.error('Loading error:', error);
            loadingText.textContent = 'Error loading model';
        }
    }
  
    /**
     * Get file extension
     * @param {string} filename - Filename to extract extension from
     * @returns {string} Lowercase file extension
     */
    getFileExtension(filename) {
        const lastDot = filename.lastIndexOf('.');
        return lastDot === -1 ? '' : filename.slice(lastDot + 1).toLowerCase();
    }
}

// ==================================================
// 🌟 USAGE EXAMPLE
// ==================================================
// const model = new Louder3dModel({
//     backcolor: '#87CEEB',  // Sky blue background
//     objectName: 'model.obj',
//     cameraPosition: { x: 0, y: 5, z: 10 },
//     modelScale: { x: 1.5, y: 1.5, z: 1.5 }
// });
// model.renderModel();