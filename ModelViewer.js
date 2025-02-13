class ModelViewer {
    constructor(options = {}) {
        // Získání referencí na HTML prvky podle ID
        this.container = document.getElementById(options.containerId || 'model-container');
        this.loadingOverlay = document.getElementById('loading-overlay');
        this.loadingBar = document.getElementById('loading-bar');
        this.vrButton = document.getElementById('vr-button');
        
        // Uložení nastavení s výchozími hodnotami
        this.options = {
            modelPath: options.modelPath || 'model.stl',
            backgroundColor: options.backgroundColor || '#FFFFFF',
            modelColor: options.modelColor || '#c0c0c0',
            autoRotate: options.autoRotate !== undefined ? options.autoRotate : true,
            enableVR: options.enableVR !== undefined ? options.enableVR : true
        };
        
        // Inicializace Three.js proměnných
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.model = null;
        this.controls = null;
        
        this.init(); // Spuštění inicializace
    }

    async init() {
        this.scene = new THREE.Scene(); // Vytvoření scény
        
        // Nastavení kamery
        this.camera = new THREE.PerspectiveCamera(
            75,
            this.container.clientWidth / this.container.clientHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 2, 5); // Nastavení výchozí pozice kamery

        // Nastavení WebGL rendereru
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: true
        });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setClearColor(this.options.backgroundColor);
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        this.container.appendChild(this.renderer.domElement); // Přidání canvasu do DOMu

        // Přidání světel do scény
        const mainLight = new THREE.DirectionalLight(0xffffff, 1);
        mainLight.position.set(5, 5, 5);
        this.scene.add(mainLight);

        const fillLight = new THREE.DirectionalLight(0xffffff, 0.7);
        fillLight.position.set(-5, 5, -5);
        this.scene.add(fillLight);

        const ambientLight = new THREE.AmbientLight(0x404040, 1.5);
        this.scene.add(ambientLight);

        // Přidání ovládání kamery
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;

        await this.loadModel(); // Načtení 3D modelu

        if (this.options.enableVR) {
            await this.setupVR(); // Inicializace VR
        }

        // Hlavní renderovací smyčka
        this.renderer.setAnimationLoop(() => {
            if (this.options.autoRotate && this.model) {
                this.model.rotation.z += 0.01; // Rotace modelu, pokud je aktivní
            }
            this.controls.update();
            this.renderer.render(this.scene, this.camera);
        });

        // Obsluha změny velikosti okna
        window.addEventListener('resize', () => this.onWindowResize(), false);
    }

    async loadModel() {
        const loader = new THREE.STLLoader(); // Vytvoření loaderu pro STL soubory
        
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

            // Materiál modelu
            const material = new THREE.MeshStandardMaterial({
                color: this.options.modelColor,
                metalness: 0.5,
                roughness: 0.5
            });

            this.model = new THREE.Mesh(geometry, material);

            // Centrování modelu
            geometry.computeBoundingBox();
            const center = geometry.boundingBox.getCenter(new THREE.Vector3());
            this.model.position.sub(center);

            // Umístění modelu v prostoru
            this.model.position.set(0, 0.5, -3);
            this.model.rotation.set(-Math.PI / 2, 0, Math.PI / 6);
            this.model.scale.set(2.0, 2.0, 2.0);

            this.scene.add(this.model);
            
            if (this.loadingOverlay) {
                this.loadingOverlay.style.display = 'none';
            }
        } catch (error) {
            console.error('Error loading model:', error);
        }
    }

    updateLoadingProgress(progress) {
        if (this.loadingBar) {
            this.loadingBar.style.width = `${progress}%`; // Aktualizace loading baru
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
                requiredFeatures: ['local'],
                optionalFeatures: ['bounded-floor']
            });

            await this.renderer.xr.setSession(session);

            // Umístění modelu ve VR prostoru
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
        // Přizpůsobení kamery při změně velikosti okna
        this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    }
}
