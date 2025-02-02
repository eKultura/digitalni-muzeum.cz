//import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';
class Louder3dModelVR extends Louder3dModel {
   
    constructor(options = {}) {
        super(options);
        this.vrSession = null;
        this.vrSupported = false;
        this.grabbedObject = null;
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
        camera.position.set(0, 1.6, 3); // Standard VR eye height and distance

        // Set up WebXR-compatible renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setClearColor(this.backcolor, 1);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.xr.enabled = true;
        container.appendChild(renderer.domElement);

        // Add VR button
        const vrButton = document.createElement('button');
        vrButton.style.position = 'absolute';
        vrButton.style.bottom = '20px';
        vrButton.style.right = '20px';
        vrButton.style.padding = '12px 24px';
        vrButton.style.backgroundColor = this.vrSupported ? '#4CAF50' : '#cccccc';
        vrButton.style.color = 'white';
        vrButton.style.border = 'none';
        vrButton.style.borderRadius = '4px';
        vrButton.style.cursor = this.vrSupported ? 'pointer' : 'default';
        
        if (await this.checkVRSupport()) {
            vrButton.textContent = 'Enter VR';
            vrButton.addEventListener('click', () => this.enterVR(renderer));
            container.appendChild(vrButton);
        } else {
            vrButton.textContent = 'VR Not Supported';
            vrButton.disabled = true;
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
        this.vrControlPanel = new VRControlPanel(scene, camera, this.objectTest);
        // Load model
        try {
            const materials = await this.loadMaterials();
            await this.loadModel(scene, materials);

            // VR Controllers setup with grip models
            //const controllerModelFactory = new XRControllerModelFactory();
            const controller1 = renderer.xr.getController(0);
            const controller2 = renderer.xr.getController(1);
            const grip1 = renderer.xr.getControllerGrip(0);
            const grip2 = renderer.xr.getControllerGrip(1);

            // Add controller models
           // grip1.add(controllerModelFactory.createControllerModel(grip1));
           // grip2.add(controllerModelFactory.createControllerModel(grip2));

            scene.add(controller1);
            scene.add(controller2);
            scene.add(grip1);
            scene.add(grip2);

            // Object grabbing logic
            let grabbedObject = null;
            const grabDistance = 0.5; // Distance for grabbing

            // Helper function to check if object is near controller
            const isNearObject = (controller) => {
                if (!this.objectTest) return false;
                const distance = controller.position.distanceTo(this.objectTest.position);
                return distance < grabDistance;
            };

            // Grab start event
            controller1.addEventListener('selectstart', () => {
                if (isNearObject(controller1)) {
                    grabbedObject = this.objectTest;
                }
            });

            // Grab end event
            controller1.addEventListener('selectend', () => {
                grabbedObject = null;
            });

            // Animation loop
            renderer.setAnimationLoop((timestamp, frame) => {
                // Update grabbed object position
                if (grabbedObject && frame) {
                    const referenceSpace = renderer.xr.getReferenceSpace();
                    const controllerPose = frame.getPose(controller1.inputSource.gripSpace, referenceSpace);
                    
                    if (controllerPose) {
                        grabbedObject.position.copy(controllerPose.transform.position);
                    }
                }

                // Auto-rotate when not in VR
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
                requiredFeatures: ['local-floor']
            });

            // Set reference space
            const refSpace = await this.vrSession.requestReferenceSpace('local-floor');
            renderer.xr.setReferenceSpace(refSpace);
            
            renderer.xr.setSession(this.vrSession);
            
            this.vrSession.addEventListener('end', () => {
                this.vrSession = null;
            });

        } catch (err) {
            console.error('Error entering VR:', err);
        }
    }
}