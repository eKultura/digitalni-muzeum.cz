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
        super.renderModel();
       // VR Controllers setup
const controller1 = renderer.xr.getController(0);
const controller2 = renderer.xr.getController(1);
scene.add(controller1);
scene.add(controller2);

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