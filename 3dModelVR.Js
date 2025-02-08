class Louder3dModelVR extends Louder3dModel {
    constructor(options = {}) {
        super(options);
        this.vrSession = null;
        this.vrSupported = false;
    }

    async checkVRSupport() {
        if ('xr' in navigator) {
            try {
                this.vrSupported = await navigator.xr.isSessionSupported('immersive-vr');
                return this.vrSupported;
            } catch (err) {
                console.error('Error checking VR support:', err);
                return false;
            }
        }
        return false;
    }

    // Přidáváme metodu pro načítání materiálů
    loadMaterials() {
        return new Promise((resolve, reject) => {
            if (!this.textures || this.nonTexture) {
                resolve(null);
                return;
            }

            const mtlLoader = new THREE.MTLLoader();
            mtlLoader.load(
                this.textures,
                (materials) => {
                    materials.preload();
                    resolve(materials);
                },
                (progress) => {
                    // Progress handling
                },
                (error) => {
                    console.error('Error loading materials:', error);
                    resolve(null);
                }
            );
        });
    }

    // Přidáváme metodu pro načítání modelů
    loadModel(scene, materials) {
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
                        loader.setMaterials(materials);
                    }

                    this.objectTest = object;
                    object.position.set(
                        this.modelPosition.x-10, 
                        this.modelPosition.y-20, //+20 normalni, 
                        this.modelPosition.z-50 //-50 normalni, +50 nahoru
                    );
                    object.rotation.set(
                        this.modelRotation.x,
                        this.modelRotation.y,
                        this.modelRotation.z
                    );
                    object.scale.set(
                        this.modelScale.x * 10,
                        this.modelScale.y * 10,
                        this.modelScale.z * 10
                    );

                    scene.add(object);
                    resolve(object);
                },
                (progress) => {
                    // Progress handling
                },
                (error) => {
                    console.error('Error loading model:', error);
                    reject(error);
                }
            );
        });
    }

    async renderModel() {
        const container = document.getElementById("3dModelScreen");
        container.innerHTML = "";

        // Scene setup from parent class
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(
            this.cameraFOV,
            container.clientWidth / container.clientHeight,
            this.cameraNearPlane,
            this.cameraFarPlane
        );
        camera.position.set(
            this.cameraPosition.x+1,
            this.cameraPosition.y+10,
            this.cameraPosition.z+20
        );

        // Set up WebXR-compatible renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setClearColor(this.backcolor, 1);
        renderer.setPixelRatio(this.pixelRatio);
        renderer.xr.enabled = true;
        container.appendChild(renderer.domElement);

        // Add VR button
        const vrButton = document.createElement('button');
        vrButton.style.position = 'absolute';
        vrButton.style.bottom = '20px';
        vrButton.style.right = '20px';
        vrButton.style.padding = '12px 24px';
        vrButton.style.backgroundColor = '#4CAF50';
        vrButton.style.color = 'white';
        vrButton.style.border = 'none';
        vrButton.style.borderRadius = '4px';
        vrButton.style.cursor = 'pointer';
        
        if (await this.checkVRSupport()) {
            vrButton.textContent = 'Enter VR';
            vrButton.addEventListener('click', () => this.enterVR(renderer));
            container.appendChild(vrButton);
        } else {
            vrButton.textContent = 'VR Not Supported';
            vrButton.disabled = true;
            vrButton.style.backgroundColor = '#cccccc';
            container.appendChild(vrButton);
        }

        // Lighting
        const light = new THREE.DirectionalLight(
            this.lightColor,
            this.lightIntensity
        );
        light.position.set(
            this.lightPosition.x,
            this.lightPosition.y,
            this.lightPosition.z
        );
        scene.add(light);
        scene.add(new THREE.AmbientLight(0x404040));

        // Load model
        try {
            const materials = await this.loadMaterials();
            await this.loadModel(scene, materials);

            // VR Controllers setup
            const controller1 = renderer.xr.getController(0);
            const controller2 = renderer.xr.getController(1);
            scene.add(controller1);
            scene.add(controller2);

            // Controller grip setup
            const grip1 = renderer.xr.getControllerGrip(0);
            const grip2 = renderer.xr.getControllerGrip(1);
            
            grip1.addEventListener('connected', (event) => {
                const mesh = event.data.targetRaySpace.getObjectByName('mesh');
                if (mesh) {
                    grip1.add(mesh);
                }
            });
            
            grip2.addEventListener('connected', (event) => {
              const mesh = event.data.targetRaySpace.getObjectByName('mesh');
                if (mesh) {
                    grip2.add(mesh);
                }
            });
            
            
            scene.add(grip1);
            scene.add(grip2);

            // Controller event listeners
            controller1.addEventListener('selectstart', () => this.onControllerSelect());
            controller1.addEventListener('selectend', () => this.onControllerSelectEnd());

            // Animation loop
            renderer.setAnimationLoop((timestamp, frame) => {
                if (this.autoRotate && this.objectTest && !this.vrSession) {
                    this.objectTest.rotation.y += 0.01;
                }
                renderer.render(scene, camera);
            });

        } catch (error) {
            console.error('Error loading model:', error);
            container.innerHTML = 'Error loading model';
        }
    }

    async enterVR(renderer) {
        try {
            this.vrSession = await navigator.xr.requestSession('immersive-vr', {
                optionalFeatures: ['local-floor', 'bounded-floor']
            });
            renderer.xr.setSession(this.vrSession);
            
            this.vrSession.addEventListener('end', () => {
                this.vrSession = null;
            });

        } catch (err) {
            console.error('Error entering VR:', err);
        }
    }

    onControllerSelect() {
        // Handle controller select event (e.g., trigger press)
        if (this.objectTest) {
            this.objectTest.scale.multiplyScalar(1.1);
        }
    }

    onControllerSelectEnd() {
        // Handle controller select end event
        if (this.objectTest) {
            this.objectTest.scale.multiplyScalar(1/1.1);
        }
    }
}