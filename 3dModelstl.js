class Louder3dModel {
    backcolor;
    objectName;
    textures;
    nonTexture = true;
    objectTest;
    stlObjectColor; 
    /**
     * 
     * @param {string} backcolor - background collor
     * @param {string} objectName - fille names .obj / .fbx
     */
    constructor(backcolor, objectName, textures = objectName.substring(0, objectName.lastIndexOf('.'))+".mtl") {
      this.backcolor = backcolor;
      this.objectName = objectName;
      this.textures = textures;
    }
      
    renderModel() {
      const container = document.getElementById("3dModelScreen");
      container.innerHTML = "";
// Inicializace scény, kamery a rendereru
let autoRotate = true; // Přepínač pro automatickou rotaci
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
window.addEventListener('resize', () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
});
  
      // OrbitControls pro ovládání
      const controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.screenSpacePanning = false;

      // Událost při začátku interakce
controls.addEventListener('start', () => {
    autoRotate = false; // Vypne automatickou rotaci
});

// Událost při ukončení interakce
controls.addEventListener('end', () => {
    autoRotate = true; // Zapne automatickou rotaci (volitelné, pokud to chceš)
});
  
      // Nastavení světla
      const light = new THREE.DirectionalLight(0xffffff, 1);
      light.position.set(5, 10, 7.5);
      camera.add(light);
      scene.add(camera);
  
      // Uložení this do self nebo použití arrow funkce
      const self = this; 
      let loader;
      let stlType = false;

      switch (this.getFileExtension(this.objectName)) {  
            case 'stl':
            loader = new THREE.STLLoader();
            stlType = true;
            break;
        default:
            console.error('Nepodporovaný formát souboru');
            return;
    }

    if (!loader) {
        console.error('Loader nebyl inicializován');
        return;
    }
    //loader.setMaterials(materials);
    loader.load(this.objectName, (object) => {  
if (stlType) {
            // Vytvoříme materiál
            const material = new THREE.MeshStandardMaterial({ color:self.stlObjectColor,metalness: 1, // Střední metalický vzhled
                roughness: 0.6  // Hladký povrch pro výrazné odlesky
                 });
            // Vytvoříme Mesh
            object = new THREE.Mesh(object, material);
}
        self.objectTest = object;

        scene.add(object);
        object.position.set(0, 0, 0);
        object.rotation.x = Math.PI / -2.5; // -90 stupňů v radiánech

        object.scale.set(2, 2, 2);
    }, undefined, (error) => {  
        console.error('Chyba při načítání modelu:', error);
    });
  
      // Nastavení kamery
      camera.position.set(0, 0, 5);
  
      // Animace
      function animate() {
          requestAnimationFrame(animate);
          controls.update();
          if (autoRotate & typeof(self.objectTest) !="undefined") {
            self.objectTest.rotation.z += 0.01; // Automatická rotace jen pokud autoRotate === true
        }
          renderer.render(scene, camera);
      }
  
      animate();
    }
  
    getFileExtension(filename) {
      const lastDot = filename.lastIndexOf('.');
      return lastDot === -1 ? '' : filename.slice(lastDot + 1).toLowerCase(); // přidáno toLowerCase()
    }
  }