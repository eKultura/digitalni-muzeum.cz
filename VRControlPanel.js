class VRControlPanel {
    constructor(scene, camera, targetObject) {
        this.scene = scene;
        this.camera = camera;
        this.targetObject = targetObject;
        
        // Vytvoření 3D UI panelu
        this.createVRPanel();
        
        // Nastavení VR ovladačů
        this.setupVRControllers();
    }

    createVRPanel() {
        // Vytvoření TextGeometry pro popisky
        const loader = new THREE.FontLoader();
        
        loader.load('helvetiker_regular.typeface.json', (font) => {
            const textGeometry = new THREE.TextGeometry('Ovládací Panel', {
                font: font,
                size: 0.1,
                height: 0.01
            });
            
            const textMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
            const textMesh = new THREE.Mesh(textGeometry, textMaterial);
            
            // Vytvoření panelu
            const panelGeometry = new THREE.BoxGeometry(1, 0.5, 0.01);
            const panelMaterial = new THREE.MeshBasicMaterial({ 
                color: 0x2c3e50,
                transparent: true,
                opacity: 0.8
            });
            
            this.panel = new THREE.Mesh(panelGeometry, panelMaterial);
            this.panel.position.set(0, 1.5, -1); // Panel před uživatelem
            
            // Přidání tlačítek pro osy
            this.addAxisButtons();
            
            this.scene.add(this.panel);
            textMesh.position.set(-0.4, 1.7, -1);
            this.scene.add(textMesh);
        });
    }

    addAxisButtons() {
        const buttonGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.01);
        const materials = {
            x: new THREE.MeshBasicMaterial({ color: 0xff0000 }),
            y: new THREE.MeshBasicMaterial({ color: 0x00ff00 }),
            z: new THREE.MeshBasicMaterial({ color: 0x0000ff })
        };

        // Vytvoření tlačítek pro každou osu
        const axes = ['x', 'y', 'z'];
        this.axisButtons = {};
        
        axes.forEach((axis, index) => {
            const button = new THREE.Mesh(buttonGeometry, materials[axis]);
            button.position.set(-0.3 + (index * 0.3), 1.5, -0.99);
            button.userData.axis = axis;
            button.userData.isButton = true;
            
            this.axisButtons[axis] = button;
            this.scene.add(button);
        });
    }

    setupVRControllers() {
        this.controller1 = this.renderer.xr.getController(0);
        this.controller2 = this.renderer.xr.getController(1);

        // Přidání ray pro vizualizaci paprsku z ovladače
        const geometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, -1)
        ]);

        const line = new THREE.Line(geometry);
        line.scale.z = 5;

        this.controller1.add(line.clone());
        this.controller2.add(line.clone());

        // Event listenery pro ovladače
        this.controller1.addEventListener('select', (event) => {
            this.handleControllerSelect(this.controller1);
        });

        this.controller2.addEventListener('select', (event) => {
            this.handleControllerSelect(this.controller2);
        });

        this.scene.add(this.controller1);
        this.scene.add(this.controller2);
    }

    handleControllerSelect(controller) {
        // Raycast pro detekci interakce s UI
        const raycaster = new THREE.Raycaster();
        const tempMatrix = new THREE.Matrix4();
        
        tempMatrix.identity().extractRotation(controller.matrixWorld);
        raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
        raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

        // Kontrola intersekce s tlačítky
        const intersects = raycaster.intersectObjects(
            Object.values(this.axisButtons)
        );

        if (intersects.length > 0) {
            const button = intersects[0].object;
            if (button.userData.isButton) {
                this.handleAxisButtonClick(button.userData.axis);
            }
        }
    }

    handleAxisButtonClick(axis) {
        // Implementace změny pozice objektu
        const STEP = 0.1;
        const currentPos = this.targetObject.position[axis];
        
        // Změna pozice podle osy
        this.targetObject.position[axis] = currentPos + STEP;
        
        // Feedback - změna barvy tlačítka
        const button = this.axisButtons[axis];
        const originalColor = button.material.color.getHex();
        
        button.material.color.setHex(0xffff00);
        setTimeout(() => {
            button.material.color.setHex(originalColor);
        }, 100);
    }

    update() {
        // Update pozice panelu relativně ke kameře
        if (this.panel) {
            // Panel sleduje kameru s určitým offsetem
            const cameraDirection = new THREE.Vector3();
            this.camera.getWorldDirection(cameraDirection);
            
            this.panel.position.copy(this.camera.position)
                .add(cameraDirection.multiplyScalar(-1));
            
            // Natočení panelu ke kameře
            this.panel.lookAt(this.camera.position);
        }
    }
}

// Použití:
/*
const vrControlPanel = new VRControlPanel(scene, camera, objectTest);

// V animační smyčce:
function animate() {
    vrControlPanel.update();
    renderer.render(scene, camera);
}
*/