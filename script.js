const { OrbitControls } = THREE;
const { GLTFLoader } = THREE;

class GLTFModelViewer extends HTMLElement {
  constructor() {
    super();
    this.renderer = null;
    this.renderCanvas = document.getElementById("renderCanvas");
    this.buttonsColor = document.getElementById("buttonsPainting");
    this.buttonsObejma = document.getElementById("buttonsObejma");
    this.buttonsSlizgi = document.getElementById("buttonsSlizgi");
    this.buttonsKoloZapas = document.getElementById("buttonsKoloZapasowe");
    this.buttonsKolo = document.getElementById("buttonsKolo");
    this.scene = null;
    this.camera = null;
    this.controls = null;
    this.frame = -1;
    this.render = this.render.bind(this);
    this.onResize = this.onResize.bind(this);
    this.attributeChangedCallback = this.attributeChangedCallback.bind(this);
    this.dragging = false;
  }
  
  static register() {
    if (typeof customElements.get('gltf-modelviewer') === 'undefined') {
      customElements.define('gltf-modelviewer', GLTFModelViewer);
    }
  }

  static get observedAttributes() {
    return ['src', 'autorotate'];
  }
  
  get autoRotate() {
    return this.hasAttribute('autorotate')
  }
  
  get isInitialized() {
    return Boolean(this.scene && this.controls && this.camera)
  }
  
  onMouseDown(e) {
    console.log('down');
    if (e.target === this.renderCanvas) {
      this.dragging = true;  
    }
  }
  
  onMouseUp(e) {
    this.dragging = false;
  }
  
  attributeChangedCallback(name, oldValue, newValue) { 
    if (name === 'src' && oldValue !== newValue && this.isInitialized) {
      this.cleanupScene();
      this.initScene();
    }
    if (name === 'autorotate' && this.isInitialized) {
      this.updateAutorotate();
    }
  }
  
  updateAutorotate() {
    if (this.isInitialized) {
      this.controls.autoRotate = this.autoRotate;  
      this.controls.update();
    }
    
  }
  connectedCallback() {
    const painting = {
      "Ocynk": false,
      "RAL 9003": true,
      "RAL 9005": false,
    };
    const obejma = {
      "Stalowa": true,
      "Aluminiowa": false,
    }
    const slizgi = {
      "Płozy boczne": true,
      "Rolki boczne": false,
    }
    const koloZapasowe = {
      "Tak": true,
      "Nie": false,
    }
    const kolo = {
      "Stalowe": true,
      "Aluminiowe": false,
    }

    function createToggleButton(parent, data, buttonStyle,callback,)  {
      for (let key in data) {
        let button = document.createElement("button");
        button.innerText = key;
        parent.appendChild(button);

        button.addEventListener('click', () => {
          parent.querySelectorAll('button').forEach(btn => btn.classList.remove(buttonStyle));
          button.classList.add(buttonStyle);
          callback(key);
        });
        // if (data[key]) {
        //   button.classList.add(buttonStyle);
        // }
      }
    }
    createToggleButton(this.buttonsColor, painting, "colorButtons", (selectedKey) => {
      if (selectedKey === "Ocynk") {
        this.togglePartColor(0xA0A29E);
      } else if (selectedKey === "RAL 9003") {
        this.togglePartColor(0xffffff);
      } else {
        this.togglePartColor(0x363636);
      }
    });
    createToggleButton(this.buttonsObejma, obejma, "colorButtons", (selectedKey) => {
      const obejaStalowa = this.findElementsByPath("Obejma_stal");
      const obejaAlu = this.findElementsByPath("Obejma_alu");
      if (selectedKey === "Stalowa") {
        obejaStalowa[0].visible = true;
        obejaAlu[0].visible = false;
      } else {
        obejaStalowa[0].visible = false;
        obejaAlu[0].visible = true;
      }
    });
    createToggleButton(this.buttonsSlizgi, slizgi, "colorButtons", (selectedKey) => {
      const rolkiBoczne = this.findElementsByPath("Rolki_boczne_SKW");
      const plozyBoczne = this.findElementsByPath("Plozy_boczne_SKW");
        if(selectedKey === "Rolki boczne"){
          rolkiBoczne[0].visible = true;
          plozyBoczne[0].visible = false;
        }
        else if (selectedKey === "Płozy boczne"){
          rolkiBoczne[0].visible = false;
          plozyBoczne[0].visible = true;
        }
    });
    createToggleButton(this.buttonsKoloZapas, koloZapasowe, "colorButtons", (selectedKey) => {
      const koloZapas = this.findElementsByPath("Mocowanie_zapas_SKW")
          if(selectedKey === "Tak"){
            koloZapas[0].visible = true;
          }
          else if (selectedKey === "Nie"){
            koloZapas[0].visible = false;
          }
    });
    createToggleButton(this.buttonsKolo, kolo, "colorButtons", (selectedKey) => {
        // TODO przygotowanie modelu ze zmiana koloru felgi 
    });

    if (!this.renderer) {
      this.setup();
    }
  }

  findElementsByPath(name) {
    const elements = [];
    const searchInChildren = (object) => { 
      if (object.userData.name == name) {;
        elements.push(object);
      }
      if (object.children && object.children.length > 0) {
        object.children.forEach(child => {
          searchInChildren(child);
        });
      }
    };
    searchInChildren(this.scene);
    return elements;
  }

  setMeshesColor(meshes, color) {
    meshes.forEach(mesh => {
        if (mesh.isMesh) {
            mesh.material.color.set(color);
        }
        if (mesh.children && mesh.children.length > 0) {
            this.setMeshesColor(mesh.children, color);
        }
    });
  }
  
  togglePartColor(colorName) {
    this.setMeshesColorForPart("Rama_spawana_SKW", colorName)
  }

  setMeshesColorForPart(name, color) {
    const part = this.findElementsByPath(name);
    if (part.length > 0) {
        this.setMeshesColor(part[0].children, color);
    } else {
        console.error('Nie znaleziono części o nazwie:', name);
    }
}
  togglePartVisibility(partName) {
    const part = this.findElementsByPath(partName);
    console.log(part);
    if (part.length > 0) {
      part.forEach(part => {
        part.visible = !part.visible; 
      });
    }
  }

  disconnectedCallback() {
    this.dispose();
  }

  get fov() {
    return parseInt(this.getAttribute('fov'), 10) || 45;
  }

  get aspectRatio() {
    return this.clientWidth / this.clientWidth || 1;
  }
  
  get src() {
    return this.getAttribute('src');
  }

  setup() {
    this.renderCanvas.classList.add('loading');
    this.appendChild(this.renderCanvas);
    
    const renderer = new THREE.WebGLRenderer({
      canvas :this.renderCanvas,
      alpha: true,
      antialias: true,
    });
    const backgroundColor = 0xffffff
    renderer.setClearColor(backgroundColor); 
    this.renderer = renderer;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = 2;
    

    const near = 0.1;
    const far = 100;
    const camera = new THREE.PerspectiveCamera(

      this.fov,
      this.aspectRatio,
      near,
      far
    );
    camera.position.set(-10, 10, -10);
    this.camera = camera;

    const controls = new OrbitControls(camera, this.renderCanvas);
    controls.target.set(0, 5, 0);
    controls.update();
    this.controls = controls;

    const scene = new THREE.Scene();
    this.scene = scene;

    this.initScene();
    
    this.onResize();
    window.addEventListener('resize', this.onResize, true);
    this.updateAutorotate();
    this.frame = requestAnimationFrame(this.render);
  }

  initScene() {
    this.setupLight();
    this.loadModel();
  }

  setupLight() {
    const { scene, camera } = this;
    {
      // const skyColor = 0xb1e1ff; // light blue
       // const groundColor = 0xb97a20; // brownish orange
      const skyColor = 0xffffff; // 
      const groundColor = 0xffffff; // 
      const intensity = 0.1;
      const light = new THREE.HemisphereLight(skyColor, groundColor, intensity);
      camera.add(light);
      }
    {
      const ambientLight = new THREE.AmbientLight(0xffffff,0.25)
      camera.add(ambientLight);
    }
    {
      const color = 0xffffff;
      const intensity = 0.5;
      const dirlight1 = new THREE.DirectionalLight(color, intensity);
      dirlight1.position.set(0, 10, 0);
      camera.add(dirlight1);
      camera.add(dirlight1.target);
      scene.add(camera);
      // scene.add(dirlight1);
    }
    {
      const color = 0xffffff;
      const intensity = 0.6;
      const dirlight2 = new THREE.DirectionalLight(color, intensity);
      dirlight2.position.set(0, -2, 0);
      camera.add(dirlight2);
      camera.add(dirlight2.target);
      scene.add(camera);
      // scene.add(dirlight2);
    }

    {
      const color = 0xffffff;
      const intensity = 0.2;
      const dirlight3 = new THREE.DirectionalLight(color, intensity);
      // dirlight3.position.set(-2, 10, -5);
      dirlight3.position.set(-2, 0, 10);
      dirlight3.castShadow = true;
      dirlight3.shadow.bias =-0.0001;
      camera.add(dirlight3);
      camera.add(dirlight3.target);
      // camera.add(dirlight3);
      scene.add(camera);
      

      // const xAxisMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 });
      // const xAxisGeometry = new THREE.BufferGeometry().setFromPoints([
      //     new THREE.Vector3(0, 0, 0),
      //     new THREE.Vector3(1, 0, 0) // Jednostkowy wektor wzdłuż osi X
      // ]);
      // const xAxis = new THREE.Line(xAxisGeometry, xAxisMaterial);
      // scene.add(xAxis);

      // // Oś Y (zielona)
      // const yAxisMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00 });
      // const yAxisGeometry = new THREE.BufferGeometry().setFromPoints([
      //     new THREE.Vector3(0, 0, 0),
      //     new THREE.Vector3(0, 1, 0) // Jednostkowy wektor wzdłuż osi Y
      // ]);
      // const yAxis = new THREE.Line(yAxisGeometry, yAxisMaterial);
      // scene.add(yAxis);

      // // Oś Z (niebieska)
      // const zAxisMaterial = new THREE.LineBasicMaterial({ color: 0x0000ff });
      // const zAxisGeometry = new THREE.BufferGeometry().setFromPoints([
      //     new THREE.Vector3(0, 0, 0),
      //     new THREE.Vector3(0, 0, 1) // Jednostkowy wektor wzdłuż osi Z
      // ]);
      // const zAxis = new THREE.Line(zAxisGeometry, zAxisMaterial);
      // scene.add(zAxis);

    }
  }

  createPlane() {
    const { scene } = this;
    const planeSize = 40;
    const loader = new THREE.TextureLoader();
    const texture = loader.load('/textures/checker.png');
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.magFilter = THREE.NearestFilter;
    const repeats = planeSize / 2;
    texture.repeat.set(repeats, repeats);
    const planeGeo = new THREE.PlaneBufferGeometry(planeSize, planeSize);
    const planeMat = new THREE.MeshPhongMaterial({
      map: texture,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(planeGeo, planeMat);
    mesh.rotation.x = Math.PI * -0.5;
    scene.add(mesh);
  }

  loadModel() {
    const { controls, scene, camera, canvas } = this;
    const gltfLoader = new GLTFLoader();
    gltfLoader.load(
      this.src,
      (gltf) => {
        const root = gltf.scene;
        scene.add(root);
        this.model = root;

        root.traverse(function(node){
          if(node.isMesh)
            node.castShadow=true;
            node.receiveShadow = true;
        })
        // compute the box that contains all the stuff
        // from root and below
        const box = new THREE.Box3().setFromObject(root);

        const boxSize = box.getSize(new THREE.Vector3()).length();
        const boxCenter = box.getCenter(new THREE.Vector3());

        // set the camera to frame the box
        this.frameArea(boxSize * 2., boxSize, boxCenter, camera);

        // update the Trackball controls to handle the new size
        controls.maxDistance = boxSize * 10;
        controls.target.copy(boxCenter);
        controls.update();
        this.renderCanvas.classList.remove('loading');

         // Oblicz bounding box modelu
        const boundingBox = new THREE.Box3().setFromObject(this.model);

        // Tworzenie płaszczyzny
        const planeGeometry = new THREE.PlaneGeometry(100, 100);
        const planeMaterial = new THREE.MeshPhongMaterial({ color: 0xFFFFFF ,dithering: true });
        const plane = new THREE.Mesh(planeGeometry, planeMaterial);
        plane.rotation.x = -Math.PI / 2;

        // Ustawienie pozycji płaszczyzny pod modelem
        plane.position.y = boundingBox.min.y; 
        scene.add(plane); 
        plane.receiveShadow = true;
        plane.castShadow=false;
      }
    );
  }
  /**
   * Arrange the camera so the object fits in the canvas
   * @param {*} sizeToFitOnScreen
   * @param {*} boxSize
   * @param {*} boxCenter
   */
  frameArea(sizeToFitOnScreen, boxSize, boxCenter) {
    const { camera } = this;
    const halfSizeToFitOnScreen = sizeToFitOnScreen * 0.25;
    const halfFovY = THREE.MathUtils.degToRad(camera.fov * 0.5);
    const distance = halfSizeToFitOnScreen / Math.tan(halfFovY);

    // compute a unit vector that points in the direction the camera is now
    // in the xz plane from the center of the box
    const direction = new THREE.Vector3()
      .subVectors(camera.position, boxCenter)
      .multiply(new THREE.Vector3(0.5, 0.5, 0.5))
      .normalize();

    // move the camera to a position distance units way from the center
    // in whatever direction the camera was from the center already
    camera.position.copy(direction.multiplyScalar(distance).add(boxCenter));

    // pick some near and far values for the frustum that
    // will contain the box.
    camera.near = boxSize / 100;
    camera.far = boxSize * 100;

    camera.updateProjectionMatrix();

    // point the camera to look at the center of the box
    camera.lookAt(boxCenter.x, boxCenter.y, boxCenter.z);
  }

  /**
   * Clean up the scene materials, meshes, geometries, textures
   */
  cleanupScene(groupOrScene = null) {
    if (groupOrScene === null) {
      groupOrScene = this.scene;
    }
    const items = [...groupOrScene.children];
    for (let item of items) {
      if (item.children && item.children.length > 0) {
        this.cleanupScene(item);
      }
      const { geometry, material, texture } = item;
      if (geometry) {
        geometry.dispose();
      }
      if (material) {
        material.dispose();
      }
      if (texture) {
        texture.dispose();
      }
      if (typeof item.dispose === 'function') {
        item.dispose();
      }
      groupOrScene.remove(item);
    }
  }

  dispose() {
    this.cleanupScene();
    window.removeEventListener('resize', this.onResize, false);
    if (this.frame > -1) {
      cancelAnimationFrame(this.frame);
      this.frame = -1;
    }
    const context = this.renderer.getContext();
    this.renderer.dispose();
    const loseCtx = context.getExtension('WEBGL_lose_context');
    if (loseCtx && typeof loseCtx.loseContext === 'function') {
      loseCtx.loseContext();
    }
    this.removeChild(this.canvas);
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.controls = null;
  }

  onResize() {
    const { renderer, camera } = this;
    const height = this.clientHeight;
    const width = this.clientWidth;
    // camera.aspect = this.clientWidth*0.8 / this.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    // renderer.setSize(this.clientWidth, this.clientHeight);
    renderer.setSize(width, height);
  }

  needsResize() {
    // const { canvas } = this;
    const dpr = this.devicePixelRatio;
    return (
      this.renderCanvas.width !== this.clientWidth * dpr ||
      this.renderCanvas.height !== this.clientHeight * dpr
    );
  }

  render() {
    const { renderer, scene, camera } = this;
    if (this.needsResize()) {
      this.onResize();
    }
    this.controls.update();
    renderer.render(scene, camera);
    this.frame = requestAnimationFrame(this.render);
  }
}

GLTFModelViewer.register();