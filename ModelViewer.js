class ModelViewer {
    constructor(options = {}) {
        this.container = document.getElementById(options.containerId || 'model-container');
        this.loadingOverlay = document.getElementById('loading-overlay');
        this.loadingBar = document.getElementById('loading-bar');
        this.vrButton = document.getElementById('vr-button');
        
        this.options = {
            modelPath: options.modelPath || 'model.stl',
            backgroundColor: options.backgroundColor || '#FFFFFF',
            modelColor: options.modelColor || '#c0c0c0',
            autoRotate: options.autoRotate !== undefined ? options.autoRotate : true,
            enableVR: options.enableVR !== undefined ? options.enableVR : true
        };
        
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.model = null;
        this.controls = null;
        
        this.init();
    }

    async init() {
        this.scene = new THREE.Scene();
        
        this.camera = new THREE.PerspectiveCamera(
            75,
            this.container.clientWidth / this.container.clientHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 2, 5); // Upravená pozice kamery

        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: true
        });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setClearColor(this.options.backgroundColor);
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        this.container.appendChild(this.renderer.domElement);

        // Vylepšené osvětlení
        const mainLight = new THREE.DirectionalLight(0xffffff, 1);
        mainLight.position.set(5, 5, 5);
        this.scene.add(mainLight);

        const fillLight = new THREE.DirectionalLight(0xffffff, 0.7);
        fillLight.position.set(-5, 5, -5);
        this.scene.add(fillLight);

        const ambientLight = new THREE.AmbientLight(0x404040, 1.5);
        this.scene.add(ambientLight);

        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;

        await this.loadModel();

        if (this.options.enableVR) {
            await this.setupVR();
        }

        this.renderer.setAnimationLoop(() => {
            if (this.options.autoRotate && this.model) {
                this.model.rotation.z += 0.01;
            }
            this.controls.update();
            this.renderer.render(this.scene, this.camera);
        });

        window.addEventListener('resize', () => this.onWindowResize(), false);
    }

    async loadModel() {
        const loader = new THREE.STLLoader();
        
        try {
            const geometry = await new Promise((resolve, reject) => {
                loader.load(
                    this.options.modelPath,
                    resolve,
                    (xhr) => {
                        const progress = (xhr.loaded / xhr.total) * 100;
                        this.updateLoadingProgress(progress);
                    },
                    reject
                );
            });

            const material = new THREE.MeshStandardMaterial({
                color: this.options.modelColor,
                metalness: 0.5,
                roughness: 0.5
            });


this.model = new THREE.Mesh(geometry, material);

// Centrování
geometry.computeBoundingBox();
const center = geometry.boundingBox.getCenter(new THREE.Vector3());
this.model.position.sub(center);

// Pozice pro VR - důležitá je záporná hodnota Z (před uživatelem)
this.model.position.set(0, 0.5, -3); // z: -3 znamená 3 metry před uživatelem
this.model.rotation.set(-Math.PI / 2, 0, Math.PI / 6);

// Menší velikost v VR 0.3
const scale = 2.0;  // zmenšíme model
this.model.scale.set(scale, scale, scale);


            this.scene.add(this.model);
            
            if (this.loadingOverlay) {
                this.loadingOverlay.style.display = 'none';
            }
        } catch (error) {
            console.error('Error loading model:', error);
            if (this.loadingOverlay) {
                const loadingText = this.loadingOverlay.querySelector('.loading-text');
                if (loadingText) {
                    loadingText.textContent = 'Error loading model';
                }
            }
        }
    }

    updateLoadingProgress(progress) {
        if (this.loadingBar) {
            this.loadingBar.style.width = `${progress}%`;
        }
    }

async setupVR() {
if (!navigator.xr) return;

try {
const vrSupported = await navigator.xr.isSessionSupported('immersive-vr');
if (vrSupported) {
    this.renderer.xr.enabled = true;
    
    // Důležité - nastavení referenčního prostoru
    this.renderer.xr.setReferenceSpaceType('local');
    
    if (this.vrButton) {
        this.vrButton.style.display = 'block';
        this.vrButton.addEventListener('click', () => this.enterVR());
    }

    // Přidáme prostor pro VR
    const vrSpace = await navigator.xr.requestReferenceSpace('local');
    this.renderer.xr.setReferenceSpace(vrSpace);
}
} catch (err) {
console.error('Error checking VR support:', err);
}
}



async enterVR() {
if (!this.renderer.xr.enabled) return;

try {
const session = await navigator.xr.requestSession('immersive-vr', {
    requiredFeatures: ['local'],  // Změníme na 'local' místo 'local-floor'
    optionalFeatures: ['bounded-floor']
});

await this.renderer.xr.setSession(session);

// Umístíme model před uživatele při vstupu do VR
if (this.model) {
    this.model.position.set(0, 1.5, -3);
}

session.addEventListener('end', () => {
    this.renderer.xr.setSession(null);
});
} catch (err) {
console.error('Error entering VR:', err);
}
}




    onWindowResize() {
        this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    }
}
