import * as THREE from './three.module.js';
import { OrbitControls } from './OrbitControls.js';
import GUI from './lil-gui.esm.js';
import { loadGLTF, loader } from './loaders.js';
import { applyPointMaterialSettings, createStarCloudMaterial, focusCameraOnObject, setPointSize, createTextSprite } from './utils.js';
import { thicknessSteps, axisRanges, labels } from './constants.js';
import { initGUIs } from './ui.js';

export class App {
  static scene = null;
  static camera = null;
  static renderer = null;
  static controls = null;
  static loader = loader;

  // Data / state
  static allegianceGroups = {};
  static loadedCount = 0;
  static isoFiles = [
    { level: "1e-1", file: "KDEglb/iso_0.1_draco.glb" },
    { level: "1e-2", file: "KDEglb/iso_0.01_draco.glb" },
    { level: "1e-3", file: "KDEglb/iso_0.001_draco.glb" },
    { level: "1e-4", file: "KDEglb/iso_0.0001_draco.glb" },
    { level: "1e-5", file: "KDEglb/iso_1e-05_draco.glb" },
    { level: "1e-6", file: "KDEglb/iso_1e-06_draco.glb" },
    { level: "1e-7", file: "KDEglb/iso_1e-07_draco.glb" }
  ];
  static isoMeshes = [];
  static isoGroup = null;
  static currentIsoSlider = 0;
  static isoLoadCount = 0;

  // GUI / interactive state
  // Selection UI removed for this application

  static starCloud = null;
  static starCloudControllers = [];
  static starCloudMaterials = [];
  static starCloudBaseOpacity = { near: 0.8, far: 0.02 };
  static starCloudOpacitySlider = 0.4; // linear 0-1

  static colonyCloud = null;
  static colonyCloudController = null;
  static colonyMeta = [];

  static galacticPlane = null;
  static galacticPlaneControllers = [];
  static galacticPlaneState = { opacity: 0.3, y: -5000 };

  static heliumGroup = null;
  static heliumController = null;
  static heliumState = { opacity: 0.5, intensity: 1.0 };

  static guardianGroup = null;
  static guardianController = null;
  
  static guardianBeaconsGroup = null;
  static guardianBeaconsController = null;
  static guardianBeaconsState = { opacity: 0.5 };

  static guardianRuinsGroup = null;
  static guardianRuinsController = null;
  static guardianRuinsState = { opacity: 0.5 };

  static guardianStructuresGroup = null;
  static guardianStructuresController = null;
  static guardianStructuresState = { opacity: 0.5 };

  static guardianConnectionsGroup = null;
  static guardianConnectionsController = null;
  static guardianConnectionsState = { opacity: 0.5 };

  static densityScanGroup = null;
  static densityScanController = null;

  static hMassGroup = null;
  static hMassController = null;
  static hMassState = { opacity: 0.5, colorTemp: 0.9 };

  static gMassGroup = null;
  static gMassController = null;
  static gMassState = { opacity: 0.5, colorTemp: 0.7 };

  static fMassGroup = null;
  static fMassController = null;
  static fMassState = { opacity: 0.5, colorTemp: 0.75 };

  static eMassGroup = null;
  static eMassController = null;
  static eMassState = { opacity: 0.5, colorTemp: 0.8 };

  static wolfRayetGroup = null;
  static wolfRayetController = null;
  static wolfRayetState = { opacity: 0.5, colorTemp: 1.0 };
  static coloniesOpacity = 0.15;
  static coloniesVisible = true;
  static coloniesController = null;

  static clipPlanes = [];
  static clippingEnabled = false;
  static clipController = null;
  static clipState = { axis: 'x', center: 0, thicknessIndex: 0 };

  static thicknessSteps = thicknessSteps;
  static axisRanges = axisRanges;

  static sprite_sphere = null;

  static raycaster = new THREE.Raycaster();
  static mouse = new THREE.Vector2();

  static async init() {
    // Scene, camera, renderer
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x111111);

    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 120000);
    this.camera.position.set(500, 4000, 4000);
    this.camera.lookAt(0, 0, 0);

    const ambient = new THREE.AmbientLight(0xffffff, 0.9);
    this.scene.add(ambient);
    const hemi = new THREE.HemisphereLight(0x88ccff, 0x222244, 0.8);
    this.scene.add(hemi);
    const directional = new THREE.DirectionalLight(0xffffff, 0.8);
    directional.position.set(1, 1, 1);
    this.scene.add(directional);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(0, 0, 0);
    this.controls.update();

    // Resize handler (single consolidated)
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Sprite
    this.sprite_sphere = new THREE.TextureLoader().load('https://threejs.org/examples/textures/sprites/disc.png');
    this.sprite_sphere.colorSpace = THREE.SRGBColorSpace;

    // Allegiance files
    const allegianceFiles = [
      { name: 'Empire',     url: './glbdata/vis_bubbleEmpire.gltf'},
      { name: 'Federation', url: './glbdata/vis_bubbleFederation.gltf'},
      { name: 'Alliance',   url: './glbdata/vis_bubbleAlliance.gltf'},
      { name: 'Independent', url: './glbdata/vis_bubbleIndependent.gltf'},
      { name: 'IGAU',       url: './glbdata/vis_bubbleIGAU.gltf'},
      { name: 'Mikunn',     url: './glbdata/vis_bubbleMikunn.gltf'},
      { name: 'Guardian',   url: './glbdata/vis_bubbleGuardian.gltf'},
      { name: 'Thargoid',   url: './glbdata/vis_bubbleThargoid.gltf'},
    ];

    allegianceFiles.forEach(async ({ name, url }) => {
      try {
        const gltf = await loadGLTF(url);
        const group = new THREE.Group();
        group.add(gltf.scene);
        // Skip adding the 'Guardian' allegiance group because it is a partial duplicate
        if (name === 'Guardian') {
          console.info('Skipping Guardian allegiance group (will remain unloaded)');
          // Still count this file as loaded so GUI initialization proceeds
          this.loadedCount++;
          if (this.loadedCount === allegianceFiles.length) {
            this.guiRefs = initGUIs(this);
            // Ensure default mode UI is visible once GUIs are ready (start in Galaxy Visuals)
            this.switchMode('Galaxy Visuals');
            // Ensure Galactic Map is shown by default
            try { if (!this.galacticPlane || !this.galacticPlane.visible) this.toggleGalacticPlane(); } catch (e) {}
            // Sync allegiance groups visibility with initial coloniesVisible state
            Object.values(this.allegianceGroups).forEach(g => { g.visible = this.coloniesVisible; });
            if (this.coloniesController) {
              try { this.coloniesController.name(this.coloniesVisible ? 'Hide Colonies' : 'Show Colonized Systems'); } catch (e) {}
            }
            // Apply initial colonies opacity
            if (this.setColoniesOpacity) this.setColoniesOpacity(this.coloniesOpacity);
          }
          return;
        }
        this.allegianceGroups[name] = group;
        this.scene.add(group);
        applyPointMaterialSettings(group, this.sprite_sphere);
        this.loadedCount++;
        if (this.loadedCount === allegianceFiles.length) {
          this.guiRefs = initGUIs(this);
          // Ensure default mode UI is visible once GUIs are ready (start in Galaxy Visuals)
          this.switchMode('Galaxy Visuals');
          // Ensure Galactic Map is shown by default
          try { if (!this.galacticPlane || !this.galacticPlane.visible) this.toggleGalacticPlane(); } catch (e) {}
          // Sync allegiance groups visibility with initial coloniesVisible state
          Object.values(this.allegianceGroups).forEach(g => { g.visible = this.coloniesVisible; });
          if (this.coloniesController) {
            try { this.coloniesController.name(this.coloniesVisible ? 'Hide Colonies' : 'Show Colonized Systems'); } catch (e) {}
          }
        }
      } catch (err) {
        console.error('Error loading', url, err);
      }
    });

    // Iso, clip initial state
    this.clipState.thicknessIndex = 0;

    // Create minimal target marker, search box, target line
    this.initTargetMarker();
    this.initSearchBox();

    // Setup click and keyboard handlers
    this.renderer.domElement.addEventListener('click', (e) => this.onClick(e));
    document.addEventListener('keydown', (e) => this.handleKeyDown(e), false);

    // Start animation
    this.animate();
  }

  static initTargetMarker() {
    const targetMarkerGeometry = new THREE.SphereGeometry(5, 16, 16);
    const targetMarkerMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    this.targetMarker = new THREE.Mesh(targetMarkerGeometry, targetMarkerMaterial);
    this.scene.add(this.targetMarker);

    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(6);
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.LineBasicMaterial({ color: 0x00ff00 });
    this.targetLine = new THREE.Line(geom, mat);
    this.scene.add(this.targetLine);

    this.baseMarker = new THREE.Mesh(new THREE.CircleGeometry(5, 32), new THREE.MeshBasicMaterial({ color: 0x00ff00 }));
    this.baseMarker.rotation.x = -Math.PI / 2;
    this.scene.add(this.baseMarker);
  }

  static handleKeyDown(event) {
    const moveDistance = 10;
    const targetMoveDistance = 10;
    switch (event.key) {
      case 'w': this.camera.position.x -= moveDistance; this.controls.target.x -= targetMoveDistance; break;
      case 's': this.camera.position.x += moveDistance; this.controls.target.x += targetMoveDistance; break;
      case 'a': this.camera.position.z -= moveDistance; this.controls.target.z -= targetMoveDistance; break;
      case 'd': this.camera.position.z += moveDistance; this.controls.target.z += targetMoveDistance; break;
      case 'q': this.camera.position.y += moveDistance; this.controls.target.y += targetMoveDistance; break;
      case 'e': this.camera.position.y -= moveDistance; this.controls.target.y -= targetMoveDistance; break;
      case 'b': this.toggleSearchBox(); break;
      case 'n': if (this.searchBox && this.searchBox.visible) this.analyzePointsInBox(this.searchBox); break;
    }
    this.controls.update();
  }

  static initSearchBox() {
    const boxGeometry = new THREE.BoxGeometry(100, 100, 100);
    const boxMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true });
    this.searchBox = new THREE.Mesh(boxGeometry, boxMaterial);
    this.searchBox.visible = false;
    this.scene.add(this.searchBox);
    this.searchBox.geometry.computeBoundingBox();
  }

  static toggleSearchBox() {
    if (!this.searchBox) return;
    this.searchBox.visible = !this.searchBox.visible;
    if (this.searchBox.visible) this.searchBox.position.copy(this.controls.target);
  }

  static analyzePointsInBox(targetBox) {
    const pointsInside = [];
    const box = new THREE.Box3().setFromObject(targetBox);
    if (!this.colonyCloud) return this.updateGuiWithPoints([]);
    this.colonyCloud.traverse(obj => {
      if (obj.isPoints && obj.geometry && obj.geometry.attributes.position) {
        const positions = obj.geometry.attributes.position;
        const pos = new THREE.Vector3();
        for (let i = 0; i < positions.count; i++) {
          pos.fromBufferAttribute(positions, i);
          const worldPos = pos.clone();
          obj.localToWorld(worldPos);
          if (box.containsPoint(worldPos)) {
            const meta = this.colonyMeta[i];
            pointsInside.push({ id64: meta?.systemId64, x: worldPos.z, y: worldPos.y, z: worldPos.x });
          }
        }
      }
    });
    // Points found - no selection UI in this application, so we don't display them
  }

  static updateGuiWithPoints(pointsInside) {
    // intentionally no-op (selection UI removed)
  }

  static onClick(event) {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);
    if (!this.colonyCloud) return;
    const intersects = this.raycaster.intersectObject(this.colonyCloud, true);
    if (intersects.length > 0) {
      const intersect = intersects[0];
      const idx = intersect.index;
      const meta = this.colonyMeta[idx];
      if (meta) {
        // selection UI removed; no UI update required for clicked colony
        console.info('Colony clicked:', meta.systemId64);
      }
    }
  }

  static animate() {
    requestAnimationFrame(() => this.animate());
    this.controls.update();
    this.targetMarker.position.copy(this.controls.target);
    if (this.targetLine) {
      const pos = this.targetLine.geometry.attributes.position.array;
      pos[0] = this.targetMarker.position.x; pos[1] = this.targetMarker.position.y; pos[2] = this.targetMarker.position.z;
      pos[3] = this.targetMarker.position.x; pos[4] = 0; pos[5] = this.targetMarker.position.z;
      this.targetLine.geometry.attributes.position.needsUpdate = true;
    }
    this.baseMarker.position.set(this.targetMarker.position.x, 0, this.targetMarker.position.z);
    if (this.searchBox && this.searchBox.visible) this.searchBox.position.copy(this.controls.target);
    this.renderer.render(this.scene, this.camera);
  }

  // ---- Feature toggles moved across from index.html ----
  static async toggleStarCloud() {
    if (!this.starCloud) {
      try {
        const gltf = await loadGLTF('./star_cloud.glb');
        this.starCloud = gltf.scene;
        this.starCloud.traverse((obj) => {
          if (obj.isPoints) {
            const mat = createStarCloudMaterial(this.camera, {
              sizeNear: 6,
              sizeFar: 0.05,
              opacityNear: this.starCloudBaseOpacity.near,
              opacityFar: this.starCloudBaseOpacity.far,
              biasPower: 1.5
            });
            obj.material = mat;
            this.starCloudMaterials.push(mat);
          }
        });
        // Apply current slider-driven opacity to the new materials
        this.setStarCloudOpacity(this.starCloudOpacitySlider);
        this.scene.add(this.starCloud);
        this.starCloud.visible = true;
          this.starCloudControllers.forEach(c => { try { c.name('Hide Star Cloud'); } catch(e){} });
      } catch (err) { console.error('Star cloud load failed', err); }
    } else {
      this.starCloud.visible = !this.starCloud.visible;
        this.starCloudControllers.forEach(c => { try { c.name(this.starCloud.visible ? 'Hide Star Cloud' : 'Show Star Cloud'); } catch(e){} });
    }
  }

  static setStarCloudOpacity(val) {
    // Linear scaling 0..1 applied to base near/far opacities
    this.starCloudOpacitySlider = val;
    const factor = Math.max(0, Math.min(1, val));
    const near = this.starCloudBaseOpacity.near * factor;
    const far = this.starCloudBaseOpacity.far * factor;
    this.starCloudMaterials.forEach((mat) => {
      if (mat && mat.uniforms) {
        if (mat.uniforms.uOpacityNear) mat.uniforms.uOpacityNear.value = near;
        if (mat.uniforms.uOpacityFar) mat.uniforms.uOpacityFar.value = far;
      } else if (mat && typeof mat.opacity === 'number') {
        mat.opacity = near;
        mat.needsUpdate = true;
      }
    });
  }

  static async toggleColonyCloud() {
    if (!this.colonyCloud) {
      try {
        const metaRes = await fetch('./colonytargetCloud_meta.json');
        this.colonyMeta = await metaRes.json();
        const gltf = await loadGLTF('./colonytargetCloud.glb');
        this.colonyCloud = gltf.scene;
        this.colonyCloud.traverse((obj) => {
          if (obj.isPoints) obj.material = createStarCloudMaterial(this.camera, { sizeNear: 12, sizeFar: 0.1, opacityNear: 1.0, opacityFar: 0.05, biasPower: 2.0 });
        });
        this.scene.add(this.colonyCloud);
        this.colonyCloud.visible = true;
        setPointSize(this.colonyCloud, 14.0);
        focusCameraOnObject(this.camera, this.controls, this.colonyCloud);
        if (this.colonyCloudController) this.colonyCloudController.name('Hide Colony Targets');
      } catch (err) { console.error('Colony load failed', err); }
    } else {
      this.colonyCloud.visible = !this.colonyCloud.visible;
      setPointSize(this.colonyCloud, this.colonyCloud.visible ? 14.0 : 5.0);
      if (this.colonyCloudController) this.colonyCloudController.name(this.colonyCloud.visible ? 'Hide Colony Targets' : 'Show Colony Targets');
    }
  }

  static toggleColonizedSystems() {
    this.coloniesVisible = !this.coloniesVisible;
    Object.values(this.allegianceGroups).forEach(g => { g.visible = this.coloniesVisible; });
    if (this.coloniesController) {
      try { this.coloniesController.name(this.coloniesVisible ? 'Hide Colonies' : 'Show Colonized Systems'); } catch (e) {}
    }
    // Visible Step slider is commented out - no longer show/hide it
    // Show or hide the Colonies Opacity slider based on colonies visibility
    if (this.coloniesOpacityController && this.coloniesOpacityController.domElement) {
      try { this.coloniesOpacityController.domElement.style.display = this.coloniesVisible ? '' : 'none'; } catch (e) {}
    }
  }

  static setColoniesOpacity(val) {
    this.coloniesOpacity = val;
    Object.values(this.allegianceGroups).forEach(group => {
      group.traverse(obj => {
        if (obj.material) {
          try { obj.material.opacity = val; obj.material.transparent = val < 1.0; } catch (e) {}
        }
      });
    });
    if (this.coloniesOpacityController) {
      try { this.coloniesOpacityController.setValue(val); } catch (e) {}
    }
  }

  static toggleGalacticPlane() {
    if (!this.galacticPlane) {
      const width = 90000; const height = 90000;
      const groundGeometry = new THREE.PlaneGeometry(width, height, 1, 1);
      const textureLoader = new THREE.TextureLoader();
      const groundTexture = textureLoader.load('./galaxyscience/gamegalaxy-4500px.png');
      const groundMaterial = new THREE.MeshBasicMaterial({ map: groundTexture, transparent: true, opacity: this.galacticPlaneState.opacity, side: THREE.DoubleSide });
      this.galacticPlane = new THREE.Mesh(groundGeometry, groundMaterial);
      this.galacticPlane.rotation.x = -Math.PI / 2; this.galacticPlane.rotation.z = -Math.PI / 2;
      this.galacticPlane.position.set(25000, this.galacticPlaneState.y, 0);
      this.scene.add(this.galacticPlane);
        this.galacticPlaneControllers.forEach(c => { try { c.name('Hide Galactic Map'); } catch(e){} });
      // show galactic map controls
      if (this.galacticOpacityControllers) this.galacticOpacityControllers.forEach(ctrl => { try { ctrl.domElement.style.display = ''; } catch (e) {} });
      if (this.galacticYControllers) this.galacticYControllers.forEach(ctrl => { try { ctrl.domElement.style.display = ''; } catch (e) {} });
    } else {
      this.galacticPlane.visible = !this.galacticPlane.visible;
      if (this.galacticPlaneController) this.galacticPlaneController.name(this.galacticPlane.visible ? 'Hide Galactic Plane' : 'Show Galactic Plane');
        this.galacticPlaneControllers.forEach(c => { try { c.name(this.galacticPlane.visible ? 'Hide Galactic Map' : 'Show Galactic Map'); } catch(e){} });
      // toggle galactic map controls visibility
      if (this.galacticOpacityControllers) this.galacticOpacityControllers.forEach(ctrl => { try { ctrl.domElement.style.display = this.galacticPlane.visible ? '' : 'none'; } catch (e) {} });
      if (this.galacticYControllers) this.galacticYControllers.forEach(ctrl => { try { ctrl.domElement.style.display = this.galacticPlane.visible ? '' : 'none'; } catch (e) {} });
    }
  }

  static async toggleHeliumCloud() {
    if (!this.heliumGroup) {
      try {
        // Prevent double-trigger while load is in progress
        if (this.heliumController) {
          try { const btn = this.heliumController.domElement.querySelector('button'); if (btn) { btn.disabled = true; btn.title = 'Loading Helium Levels...'; } } catch (e) {}
        }
        const gltf = await loadGLTF('./galaxyscience/helium_levels.glb');
        const model = gltf.scene;
        const He_groups = [[],[],[],[],[],[],[]];
        // Only load helium meshes (mesh0-mesh6), ignore guardian meshes (mesh7-mesh11)
        model.traverse((child) => {
          if (child.isMesh || child.type === 'Points') {
            switch (child.name) {
              case 'mesh0': He_groups[0].push(child); break;
              case 'mesh1': He_groups[1].push(child); break;
              case 'mesh2': He_groups[2].push(child); break;
              case 'mesh3': He_groups[3].push(child); break;
              case 'mesh4': He_groups[4].push(child); break;
              case 'mesh5': He_groups[5].push(child); break;
              case 'mesh6': He_groups[6].push(child); break;
              // Ignore mesh7-mesh11 (guardian data - now loaded separately)
            }
          }
        });
        this.heliumGroup = new THREE.Group(); this.heliumGroup.name = 'He_mass_group';
        He_groups.forEach(arr => arr.forEach(mesh => this.heliumGroup.add(mesh)));
        this.heliumGroup.traverse(obj => {
          if (obj.isMesh && obj.geometry && obj.geometry.attributes.color) {
            const colors = obj.geometry.attributes.color;
            const orig = new Float32Array(colors.count * 3);
            for (let i = 0; i < colors.count; i++) { orig[i*3] = colors.getX(i); orig[i*3+1] = colors.getY(i); orig[i*3+2] = colors.getZ(i); }
            obj.userData.originalColors = orig;
          }
          if (obj.material) { obj.material.transparent = true; obj.material.opacity = this.heliumState.opacity; obj.material.blending = THREE.AdditiveBlending; obj.material.depthWrite = false; }
        });
        this.scene.add(this.heliumGroup);
        // Update helium UI controller label and re-enable button
        if (this.heliumController) {
          try { this.heliumController.name('Hide Helium Levels'); const btn = this.heliumController.domElement.querySelector('button'); if (btn) { btn.disabled = false; btn.title = ''; } } catch (e) {}
        }
        // Show helium controls (opacity/color) now that helium data is available
        if (this.heliumOpacityController && this.heliumOpacityController.domElement) { try { this.heliumOpacityController.domElement.style.display = ''; } catch (e) {} }
        if (this.heliumColorController && this.heliumColorController.domElement) { try { this.heliumColorController.domElement.style.display = ''; } catch (e) {} }
      } catch (err) { console.error('Helium load failed', err); }
    } else {
      this.heliumGroup.visible = !this.heliumGroup.visible;
      if (this.heliumController) this.heliumController.name(this.heliumGroup.visible ? 'Hide Helium Levels' : 'Show Helium Levels');
      // Also show/hide helium controls
      if (this.heliumOpacityController && this.heliumOpacityController.domElement) { try { this.heliumOpacityController.domElement.style.display = this.heliumGroup.visible ? '' : 'none'; } catch (e) {} }
      if (this.heliumColorController && this.heliumColorController.domElement) { try { this.heliumColorController.domElement.style.display = this.heliumGroup.visible ? '' : 'none'; } catch (e) {} }
    }
  }

  static adjustVertexColors(obj, factor) {
    const colors = obj.geometry.attributes.color;
    const orig = obj.userData.originalColors;
    const t = factor - 1;
    for (let i = 0; i < colors.count; i++) {
      let r = orig[i*3]; let g = orig[i*3+1]; let b = orig[i*3+2];
      if (r > b) { r = THREE.MathUtils.lerp(r, 1.0, t); g = THREE.MathUtils.lerp(g, 0.0, t); b = THREE.MathUtils.lerp(b, 0.0, t); }
      else if (b > r) { r = THREE.MathUtils.lerp(r, 0.0, t); g = THREE.MathUtils.lerp(g, 0.0, t); b = THREE.MathUtils.lerp(b, 1.0, t); }
      colors.setXYZ(i, r, g, b);
    }
    colors.needsUpdate = true;
  }

  static getStarColorFromTemp(temp) {
    // temp: 0-1 mapped to standard H-R diagram color sequence
    // 0 = cool red (M-class, ~2500K) → 1 = hot blue (O-class, ~30000K+)
    // Standard stellar spectral sequence: M(red) → K(orange) → G(yellow) → F(yellow-white) → A(white) → B(blue-white) → O(blue)
    const color = new THREE.Color();
    
    if (temp < 0.2) {
      // M-class: Deep red to red-orange (2500-3500K)
      const t = temp / 0.2;
      color.setHSL(0.0 + t * 0.03, 0.95 - t * 0.15, 0.3 + t * 0.15);
    } else if (temp < 0.35) {
      // K-class: Orange (3500-5000K)
      const t = (temp - 0.2) / 0.15;
      color.setHSL(0.08 + t * 0.04, 0.9 - t * 0.1, 0.45 + t * 0.1);
    } else if (temp < 0.5) {
      // G-class: Yellow (5000-6000K, Sun-like)
      const t = (temp - 0.35) / 0.15;
      color.setHSL(0.14 + t * 0.02, 0.85 - t * 0.25, 0.55 + t * 0.05);
    } else if (temp < 0.65) {
      // F-class: Yellow-white (6000-7500K)
      const t = (temp - 0.5) / 0.15;
      color.setHSL(0.16 - t * 0.04, 0.6 - t * 0.4, 0.6 + t * 0.1);
    } else if (temp < 0.8) {
      // A-class: White (7500-10000K)
      const t = (temp - 0.65) / 0.15;
      color.setHSL(0.12 + t * 0.45, 0.2 - t * 0.15, 0.7 + t * 0.1);
    } else if (temp < 0.92) {
      // B-class: Blue-white (10000-30000K)
      const t = (temp - 0.8) / 0.12;
      color.setHSL(0.58 + t * 0.02, 0.5 + t * 0.3, 0.75 + t * 0.1);
    } else {
      // O-class: Intense blue (30000K+)
      const t = (temp - 0.92) / 0.08;
      color.setHSL(0.6 + t * 0.05, 0.9 + t * 0.1, 0.85 + t * 0.1);
    }
    return color;
  }

  static async toggleGuardianSites() {
    // Master toggle that loads all guardian site types
    if (!this.guardianBeaconsGroup && !this.guardianRuinsGroup && !this.guardianStructuresGroup && !this.guardianConnectionsGroup) {
      // First time - load all guardian GLB files
      if (this.guardianController) {
        try { const btn = this.guardianController.domElement.querySelector('button'); if (btn) { btn.disabled = true; btn.title = 'Loading Guardian Sites...'; } } catch (e) {}
      }
      
      // Load all 4 guardian GLB files in parallel
      const guardianFiles = [
        { name: 'beacons', file: './GuardianGLB/guardian_beacons.glb', stateKey: 'guardianBeaconsGroup', state: this.guardianBeaconsState },
        { name: 'ruins', file: './GuardianGLB/guardian_ruins.glb', stateKey: 'guardianRuinsGroup', state: this.guardianRuinsState },
        { name: 'structures', file: './GuardianGLB/guardian_structures.glb', stateKey: 'guardianStructuresGroup', state: this.guardianStructuresState },
        { name: 'connections', file: './GuardianGLB/guardian_connection_lines.glb', stateKey: 'guardianConnectionsGroup', state: this.guardianConnectionsState }
      ];

      try {
        await Promise.all(guardianFiles.map(async ({ name, file, stateKey, state }) => {
          try {
            const gltf = await loadGLTF(file);
            const group = gltf.scene;
            group.traverse((obj) => {
              if (obj.material) {
                obj.material.transparent = true;
                obj.material.opacity = state.opacity;
                obj.material.depthWrite = false;
              }
            });
            this[stateKey] = group;
            this.scene.add(group);
            group.visible = true;
            console.log(`Loaded guardian ${name}`);
          } catch (err) {
            console.error(`Failed to load guardian ${name}:`, err);
          }
        }));

        // Re-enable button and show individual controls
        if (this.guardianController) {
          try { this.guardianController.name('Hide Guardian Sites'); const btn = this.guardianController.domElement.querySelector('button'); if (btn) { btn.disabled = false; btn.title = ''; } } catch (e) {}
        }
        
        // Show individual guardian controls
        [this.guardianBeaconsController, this.guardianRuinsController, this.guardianStructuresController, this.guardianConnectionsController].forEach(ctrl => {
          if (ctrl && ctrl.domElement) { try { ctrl.domElement.style.display = ''; } catch (e) {} }
        });
        [this.guardianBeaconsOpacityController, this.guardianRuinsOpacityController, this.guardianStructuresOpacityController, this.guardianConnectionsOpacityController].forEach(ctrl => {
          if (ctrl && ctrl.domElement) { try { ctrl.domElement.style.display = ''; } catch (e) {} }
        });
      } catch (err) {
        console.error('Guardian sites load failed', err);
      }
    } else {
      // Toggle visibility of all guardian groups
      const anyVisible = this.guardianBeaconsGroup?.visible || this.guardianRuinsGroup?.visible || this.guardianStructuresGroup?.visible || this.guardianConnectionsGroup?.visible;
      const newVisible = !anyVisible;
      
      if (this.guardianBeaconsGroup) this.guardianBeaconsGroup.visible = newVisible;
      if (this.guardianRuinsGroup) this.guardianRuinsGroup.visible = newVisible;
      if (this.guardianStructuresGroup) this.guardianStructuresGroup.visible = newVisible;
      if (this.guardianConnectionsGroup) this.guardianConnectionsGroup.visible = newVisible;
      
      if (this.guardianController) this.guardianController.name(newVisible ? 'Hide Guardian Sites' : 'Show Guardian Sites');
      
      // Show/hide individual controls
      const display = newVisible ? '' : 'none';
      [this.guardianBeaconsController, this.guardianRuinsController, this.guardianStructuresController, this.guardianConnectionsController].forEach(ctrl => {
        if (ctrl && ctrl.domElement) { try { ctrl.domElement.style.display = display; } catch (e) {} }
      });
      [this.guardianBeaconsOpacityController, this.guardianRuinsOpacityController, this.guardianStructuresOpacityController, this.guardianConnectionsOpacityController].forEach(ctrl => {
        if (ctrl && ctrl.domElement) { try { ctrl.domElement.style.display = display; } catch (e) {} }
      });
    }
  }

  static toggleGuardianBeacons() {
    if (this.guardianBeaconsGroup) {
      this.guardianBeaconsGroup.visible = !this.guardianBeaconsGroup.visible;
      if (this.guardianBeaconsController) this.guardianBeaconsController.name(this.guardianBeaconsGroup.visible ? 'Hide Beacons' : 'Show Beacons');
      if (this.guardianBeaconsOpacityController && this.guardianBeaconsOpacityController.domElement) {
        try { this.guardianBeaconsOpacityController.domElement.style.display = this.guardianBeaconsGroup.visible ? '' : 'none'; } catch (e) {}
      }
    }
  }

  static toggleGuardianRuins() {
    if (this.guardianRuinsGroup) {
      this.guardianRuinsGroup.visible = !this.guardianRuinsGroup.visible;
      if (this.guardianRuinsController) this.guardianRuinsController.name(this.guardianRuinsGroup.visible ? 'Hide Ruins' : 'Show Ruins');
      if (this.guardianRuinsOpacityController && this.guardianRuinsOpacityController.domElement) {
        try { this.guardianRuinsOpacityController.domElement.style.display = this.guardianRuinsGroup.visible ? '' : 'none'; } catch (e) {}
      }
    }
  }

  static toggleGuardianStructures() {
    if (this.guardianStructuresGroup) {
      this.guardianStructuresGroup.visible = !this.guardianStructuresGroup.visible;
      if (this.guardianStructuresController) this.guardianStructuresController.name(this.guardianStructuresGroup.visible ? 'Hide Structures' : 'Show Structures');
      if (this.guardianStructuresOpacityController && this.guardianStructuresOpacityController.domElement) {
        try { this.guardianStructuresOpacityController.domElement.style.display = this.guardianStructuresGroup.visible ? '' : 'none'; } catch (e) {}
      }
    }
  }

  static toggleGuardianConnections() {
    if (this.guardianConnectionsGroup) {
      this.guardianConnectionsGroup.visible = !this.guardianConnectionsGroup.visible;
      if (this.guardianConnectionsController) this.guardianConnectionsController.name(this.guardianConnectionsGroup.visible ? 'Hide Connections' : 'Show Connections');
      if (this.guardianConnectionsOpacityController && this.guardianConnectionsOpacityController.domElement) {
        try { this.guardianConnectionsOpacityController.domElement.style.display = this.guardianConnectionsGroup.visible ? '' : 'none'; } catch (e) {}
      }
    }
  }

  static async toggleHMass() {
    if (!this.hMassGroup) {
      // First-time load
      if (this.hMassController) {
        try { const btn = this.hMassController.domElement.querySelector('button'); if (btn) { btn.disabled = true; btn.title = 'Loading H Mass data...'; } } catch (e) {}
      }
      try {
        const gltf = await loadGLTF('./Star_Type_Glb/mass_code_7.gltf');
        this.hMassGroup = gltf.scene;
        const starColor = this.getStarColorFromTemp(this.hMassState.colorTemp);
        this.hMassGroup.traverse((obj) => {
          if (obj.material) {
            obj.material.transparent = true;
            obj.material.opacity = this.hMassState.opacity;
            obj.material.color = starColor.clone();
            obj.material.emissive = starColor.clone();
            obj.material.emissiveIntensity = 0.5;
            obj.material.depthWrite = false;
          }
        });
        this.scene.add(this.hMassGroup);
        this.hMassGroup.visible = true;
        if (this.hMassController) {
          try { this.hMassController.name('Hide H Mass'); const btn = this.hMassController.domElement.querySelector('button'); if (btn) { btn.disabled = false; btn.title = ''; } } catch (e) {}
        }
        // Show H Mass opacity control
        if (this.hMassOpacityController && this.hMassOpacityController.domElement) {
          try { this.hMassOpacityController.domElement.style.display = ''; } catch (e) {}
        }
        if (this.hMassColorController && this.hMassColorController.domElement) {
          try { this.hMassColorController.domElement.style.display = ''; } catch (e) {}
        }
      } catch (err) {
        console.error('H Mass load failed', err);
        if (this.hMassController) {
          try { const btn = this.hMassController.domElement.querySelector('button'); if (btn) { btn.disabled = false; btn.title = 'Load failed - check console'; } } catch (e) {}
        }
      }
    } else {
      this.hMassGroup.visible = !this.hMassGroup.visible;
      if (this.hMassController) this.hMassController.name(this.hMassGroup.visible ? 'Hide H Mass' : 'Show H Mass');
      // Show/hide H Mass opacity control
      if (this.hMassOpacityController && this.hMassOpacityController.domElement) {
        try { this.hMassOpacityController.domElement.style.display = this.hMassGroup.visible ? '' : 'none'; } catch (e) {}
      }
      if (this.hMassColorController && this.hMassColorController.domElement) {
        try { this.hMassColorController.domElement.style.display = this.hMassGroup.visible ? '' : 'none'; } catch (e) {}
      }
    }
  }

  static async toggleGMass() {
    if (!this.gMassGroup) {
      // First-time load
      if (this.gMassController) {
        try { const btn = this.gMassController.domElement.querySelector('button'); if (btn) { btn.disabled = true; btn.title = 'Loading G Mass data...'; } } catch (e) {}
      }
      try {
        const gltf = await loadGLTF('./Star_Type_Glb/mass_code_6.gltf');
        this.gMassGroup = gltf.scene;
        const starColor = this.getStarColorFromTemp(this.gMassState.colorTemp);
        this.gMassGroup.traverse((obj) => {
          if (obj.material) {
            obj.material.transparent = true;
            obj.material.opacity = this.gMassState.opacity;
            obj.material.color = starColor.clone();
            obj.material.emissive = starColor.clone();
            obj.material.emissiveIntensity = 0.5;
            obj.material.depthWrite = false;
          }
        });
        this.scene.add(this.gMassGroup);
        this.gMassGroup.visible = true;
        if (this.gMassController) {
          try { this.gMassController.name('Hide G Mass'); const btn = this.gMassController.domElement.querySelector('button'); if (btn) { btn.disabled = false; btn.title = ''; } } catch (e) {}
        }
        // Show G Mass opacity control
        if (this.gMassOpacityController && this.gMassOpacityController.domElement) {
          try { this.gMassOpacityController.domElement.style.display = ''; } catch (e) {}
        }
        if (this.gMassColorController && this.gMassColorController.domElement) {
          try { this.gMassColorController.domElement.style.display = ''; } catch (e) {}
        }
      } catch (err) {
        console.error('G Mass load failed', err);
        if (this.gMassController) {
          try { const btn = this.gMassController.domElement.querySelector('button'); if (btn) { btn.disabled = false; btn.title = 'Load failed - check console'; } } catch (e) {}
        }
      }
    } else {
      this.gMassGroup.visible = !this.gMassGroup.visible;
      if (this.gMassController) this.gMassController.name(this.gMassGroup.visible ? 'Hide G Mass' : 'Show G Mass');
      // Show/hide G Mass opacity control
      if (this.gMassOpacityController && this.gMassOpacityController.domElement) {
        try { this.gMassOpacityController.domElement.style.display = this.gMassGroup.visible ? '' : 'none'; } catch (e) {}
      }
      if (this.gMassColorController && this.gMassColorController.domElement) {
        try { this.gMassColorController.domElement.style.display = this.gMassGroup.visible ? '' : 'none'; } catch (e) {}
      }
    }
  }

  static async toggleFMass() {
    if (!this.fMassGroup) {
      // First-time load
      if (this.fMassController) {
        try { const btn = this.fMassController.domElement.querySelector('button'); if (btn) { btn.disabled = true; btn.title = 'Loading F Mass data...'; } } catch (e) {}
      }
      try {
        const gltf = await loadGLTF('./Star_Type_Glb/mass_code_6.gltf');
        this.fMassGroup = gltf.scene;
        const starColor = this.getStarColorFromTemp(this.fMassState.colorTemp);
        this.fMassGroup.traverse((obj) => {
          if (obj.material) {
            obj.material.transparent = true;
            obj.material.opacity = this.fMassState.opacity;
            obj.material.color = starColor.clone();
            obj.material.emissive = starColor.clone();
            obj.material.emissiveIntensity = 0.5;
            obj.material.depthWrite = false;
          }
        });
        this.scene.add(this.fMassGroup);
        this.fMassGroup.visible = true;
        if (this.fMassController) {
          try { this.fMassController.name('Hide F Mass'); const btn = this.fMassController.domElement.querySelector('button'); if (btn) { btn.disabled = false; btn.title = ''; } } catch (e) {}
        }
        // Show F Mass opacity control
        if (this.fMassOpacityController && this.fMassOpacityController.domElement) {
          try { this.fMassOpacityController.domElement.style.display = ''; } catch (e) {}
        }
        if (this.fMassColorController && this.fMassColorController.domElement) {
          try { this.fMassColorController.domElement.style.display = ''; } catch (e) {}
        }
      } catch (err) {
        console.error('F Mass load failed', err);
        if (this.fMassController) {
          try { const btn = this.fMassController.domElement.querySelector('button'); if (btn) { btn.disabled = false; btn.title = 'Load failed - check console'; } } catch (e) {}
        }
      }
    } else {
      this.fMassGroup.visible = !this.fMassGroup.visible;
      if (this.fMassController) this.fMassController.name(this.fMassGroup.visible ? 'Hide F Mass' : 'Show F Mass');
      // Show/hide F Mass opacity control
      if (this.fMassOpacityController && this.fMassOpacityController.domElement) {
        try { this.fMassOpacityController.domElement.style.display = this.fMassGroup.visible ? '' : 'none'; } catch (e) {}
      }
      if (this.fMassColorController && this.fMassColorController.domElement) {
        try { this.fMassColorController.domElement.style.display = this.fMassGroup.visible ? '' : 'none'; } catch (e) {}
      }
    }
  }

  static async toggleEMass() {
    if (!this.eMassGroup) {
      // First-time load
      if (this.eMassController) {
        try { const btn = this.eMassController.domElement.querySelector('button'); if (btn) { btn.disabled = true; btn.title = 'Loading E Mass data...'; } } catch (e) {}
      }
      try {
        const gltf = await loadGLTF('./Star_Type_Glb/mass_code_6.gltf');
        this.eMassGroup = gltf.scene;
        const starColor = this.getStarColorFromTemp(this.eMassState.colorTemp);
        this.eMassGroup.traverse((obj) => {
          if (obj.material) {
            obj.material.transparent = true;
            obj.material.opacity = this.eMassState.opacity;
            obj.material.color = starColor.clone();
            obj.material.emissive = starColor.clone();
            obj.material.emissiveIntensity = 0.5;
            obj.material.depthWrite = false;
          }
        });
        this.scene.add(this.eMassGroup);
        this.eMassGroup.visible = true;
        if (this.eMassController) {
          try { this.eMassController.name('Hide E Mass'); const btn = this.eMassController.domElement.querySelector('button'); if (btn) { btn.disabled = false; btn.title = ''; } } catch (e) {}
        }
        // Show E Mass opacity control
        if (this.eMassOpacityController && this.eMassOpacityController.domElement) {
          try { this.eMassOpacityController.domElement.style.display = ''; } catch (e) {}
        }
        if (this.eMassColorController && this.eMassColorController.domElement) {
          try { this.eMassColorController.domElement.style.display = ''; } catch (e) {}
        }
      } catch (err) {
        console.error('E Mass load failed', err);
        if (this.eMassController) {
          try { const btn = this.eMassController.domElement.querySelector('button'); if (btn) { btn.disabled = false; btn.title = 'Load failed - check console'; } } catch (e) {}
        }
      }
    } else {
      this.eMassGroup.visible = !this.eMassGroup.visible;
      if (this.eMassController) this.eMassController.name(this.eMassGroup.visible ? 'Hide E Mass' : 'Show E Mass');
      // Show/hide E Mass opacity control
      if (this.eMassOpacityController && this.eMassOpacityController.domElement) {
        try { this.eMassOpacityController.domElement.style.display = this.eMassGroup.visible ? '' : 'none'; } catch (e) {}
      }
      if (this.eMassColorController && this.eMassColorController.domElement) {
        try { this.eMassColorController.domElement.style.display = this.eMassGroup.visible ? '' : 'none'; } catch (e) {}
      }
    }
  }

  static async toggleWolfRayet() {
    if (!this.wolfRayetGroup) {
      // First-time load
      if (this.wolfRayetController) {
        try { const btn = this.wolfRayetController.domElement.querySelector('button'); if (btn) { btn.disabled = true; btn.title = 'Loading Wolf Rayet data...'; } } catch (e) {}
      }
      try {
        const gltf = await loadGLTF('./Star_Type_Glb/Wolf-Rayet-stars_pointcloud.glb');
        this.wolfRayetGroup = gltf.scene;
        const starColor = this.getStarColorFromTemp(this.wolfRayetState.colorTemp);
        this.wolfRayetGroup.traverse((obj) => {
          if (obj.material) {
            obj.material.transparent = true;
            obj.material.opacity = this.wolfRayetState.opacity;
            obj.material.color = starColor.clone();
            obj.material.emissive = starColor.clone();
            obj.material.emissiveIntensity = 0.8;
            obj.material.depthWrite = false;
          }
        });
        this.scene.add(this.wolfRayetGroup);
        this.wolfRayetGroup.visible = true;
        if (this.wolfRayetController) {
          try { this.wolfRayetController.name('Hide Wolf Rayet'); const btn = this.wolfRayetController.domElement.querySelector('button'); if (btn) { btn.disabled = false; btn.title = ''; } } catch (e) {}
        }
        // Show Wolf Rayet opacity control
        if (this.wolfRayetOpacityController && this.wolfRayetOpacityController.domElement) {
          try { this.wolfRayetOpacityController.domElement.style.display = ''; } catch (e) {}
        }
        if (this.wolfRayetColorController && this.wolfRayetColorController.domElement) {
          try { this.wolfRayetColorController.domElement.style.display = ''; } catch (e) {}
        }
      } catch (err) {
        console.error('Wolf Rayet load failed', err);
        if (this.wolfRayetController) {
          try { const btn = this.wolfRayetController.domElement.querySelector('button'); if (btn) { btn.disabled = false; btn.title = 'Load failed - check console'; } } catch (e) {}
        }
      }
    } else {
      this.wolfRayetGroup.visible = !this.wolfRayetGroup.visible;
      if (this.wolfRayetController) this.wolfRayetController.name(this.wolfRayetGroup.visible ? 'Hide Wolf Rayet' : 'Show Wolf Rayet');
      // Show/hide Wolf Rayet opacity control
      if (this.wolfRayetOpacityController && this.wolfRayetOpacityController.domElement) {
        try { this.wolfRayetOpacityController.domElement.style.display = this.wolfRayetGroup.visible ? '' : 'none'; } catch (e) {}
      }
      if (this.wolfRayetColorController && this.wolfRayetColorController.domElement) {
        try { this.wolfRayetColorController.domElement.style.display = this.wolfRayetGroup.visible ? '' : 'none'; } catch (e) {}
      }
    }
  }

  static async toggledensityscanCloud() {
    if (!this.densityScanGroup) {
      // first-time load: try to load a density_scans GLB, otherwise create placeholder
      if (this.densityScanController) {
        try { const btn = this.densityScanController.domElement.querySelector('button'); if (btn) { btn.disabled = true; btn.title = 'Loading density scans...'; } } catch (e) {}
      }
      try {
        const gltf = await loadGLTF('./DW3/scans.glb');
        this.densityScanGroup = gltf.scene;
        this.scene.add(this.densityScanGroup);
      } catch (err) {
        console.warn('density_scans GLB not found; creating placeholder.', err);
        const group = new THREE.Group();
        const geom = new THREE.SphereGeometry(5000, 16, 12);
        const mat = new THREE.MeshBasicMaterial({ color: 0x6666ff, wireframe: true, opacity: 0.25, transparent: true });
        const mesh = new THREE.Mesh(geom, mat);
        mesh.name = 'density_placeholder';
        group.add(mesh);
        this.scene.add(group);
        this.densityScanGroup = group;
      } finally {
        if (this.densityScanController) {
          try { this.densityScanController.name('Hide Density Scans'); const btn = this.densityScanController.domElement.querySelector('button'); if (btn) { btn.disabled = false; btn.title = ''; } } catch (e) {}
        }
      }
    } else {
      this.densityScanGroup.visible = !this.densityScanGroup.visible;
      if (this.densityScanController) this.densityScanController.name(this.densityScanGroup.visible ? 'Hide Density Scans' : 'Show Density Scans');
    }
  }

  static toggleIsoGroup() {
    if (!this.isoGroup) {
      // Start loading iso GLBs once; disable the UI button while loading
      if (this.isoController) {
        try { const btn = this.isoController.domElement.querySelector('button'); if (btn) { btn.disabled = true; btn.title = 'Loading IsoLevels...'; } } catch (e) {}
      }
      this.isoGroup = new THREE.Group(); this.scene.add(this.isoGroup);
      this.isoLoadCount = 0;
      this.isoFiles.forEach((iso, idx) => {
        loadGLTF(iso.file).then((gltf) => {
          const mesh = gltf.scene; mesh.visible = false; this.isoGroup.add(mesh); this.isoMeshes[idx] = mesh; this.styleSingleIsoMesh(mesh, idx, this.isoFiles.length);
          // Apply current slider visibility to this newly-loaded mesh
          mesh.visible = (idx < (this.currentIsoSlider || 0));
          this.isoLoadCount++;
          if (this.isoLoadCount === this.isoFiles.length) {
            // All iso levels loaded
            if (this.isoController) {
              try { this.isoController.name('Hide IsoLevels'); const btn = this.isoController.domElement.querySelector('button'); if (btn) { btn.disabled = false; btn.title = ''; } } catch (e) {}
            }
            // Ensure clipping planes are applied if enabled
            if (this.clippingEnabled) this.applyClippingPlanes();
          }
        }).catch((err) => { console.error('Iso load failed', err); });
      });
      // Show the group container (individual meshes will show per slider)
      this.isoGroup.visible = true;
      // show iso slider when iso group is visible
      if (this.isoSliderController && this.isoSliderController.domElement) { try { this.isoSliderController.domElement.style.display = ''; } catch (e) {} }
    } else {
      this.isoGroup.visible = !this.isoGroup.visible;
      if (this.isoController) this.isoController.name(this.isoGroup.visible ? 'Hide IsoLevels' : 'Show IsoLevels');
      if (this.isoSliderController && this.isoSliderController.domElement) { try { this.isoSliderController.domElement.style.display = this.isoGroup.visible ? '' : 'none'; } catch (e) {} }
    }
  }

  static setIsoVisibility(val) {
    this.currentIsoSlider = val;
    this.isoMeshes.forEach((m, i) => { if (m) m.visible = (i < val); });
  }

  static styleSingleIsoMesh(mesh, idx, total) {
    const t = 1 - (idx / (total - 1));
    const opacity = 0.15 + 0.5 * t;
    const hue = 0.6 - 0.6 * t;
    const color = new THREE.Color().setHSL(hue, 1.0, 0.5);
    mesh.traverse(obj => { if (obj.isMesh) { obj.material = new THREE.MeshStandardMaterial({ color: color, transparent: true, opacity: opacity, depthWrite: false, side: THREE.DoubleSide }); } });
  }

  static applyClippingPlanes() {
    if (!this.clippingEnabled) return;
    const { axis, center, thicknessIndex } = this.clipState;
    const thickness = this.thicknessSteps[thicknessIndex] ?? this.thicknessSteps[0];
    const half = thickness / 2;
    let normal = new THREE.Vector3(1,0,0);
    if (axis === 'y') normal.set(0,1,0); else if (axis === 'z') normal.set(0,0,1);
    const minVal = center - half; const maxVal = center + half;
    const planeMin = new THREE.Plane(normal.clone(), -minVal); const planeMax = new THREE.Plane(normal.clone().negate(), maxVal);
    this.clipPlanes = [planeMin, planeMax];
    this.isoMeshes.forEach(m => { if (!m) return; m.traverse(obj => { if (obj.isMesh && obj.material) { obj.material.clippingPlanes = this.clipPlanes; obj.material.clipShadows = true; } }); });
  }

  static toggleClippingSlab() {
    if (!this.clippingEnabled) {
      this.renderer.localClippingEnabled = true; this.clippingEnabled = true; this.applyClippingPlanes(); if (this.clipController) this.clipController.name('Disable Clipping Slab');
      // show clipping child controls
      if (this.centerController && this.centerController.domElement) { try { this.centerController.domElement.style.display = ''; } catch (e) {} }
      if (this.thicknessController && this.thicknessController.domElement) { try { this.thicknessController.domElement.style.display = ''; } catch (e) {} }
      if (this.clipAxisController && this.clipAxisController.domElement) { try { this.clipAxisController.domElement.style.display = ''; } catch (e) {} }
    } else {
      this.renderer.localClippingEnabled = false; this.isoMeshes.forEach(m => { if (!m) return; m.traverse(obj => { if (obj.isMesh && obj.material) obj.material.clippingPlanes = []; }); }); this.clippingEnabled = false; if (this.clipController) this.clipController.name('Enable Clipping Slab');
      // hide clipping child controls
      if (this.centerController && this.centerController.domElement) { try { this.centerController.domElement.style.display = 'none'; } catch (e) {} }
      if (this.thicknessController && this.thicknessController.domElement) { try { this.thicknessController.domElement.style.display = 'none'; } catch (e) {} }
      if (this.clipAxisController && this.clipAxisController.domElement) { try { this.clipAxisController.domElement.style.display = 'none'; } catch (e) {} }
    }
  }

  static switchMode(mode) {
    // Show or hide per-mode GUI folders returned from initGUIs
    if (!this.guiRefs) return;
    const { expeditionGUI, propertiesGUI, densityGUI, galaxyGUI, earthGUI } = this.guiRefs;
    // Hide all first
    try { if (expeditionGUI) expeditionGUI.hide(); } catch (e) {}
    try { if (propertiesGUI) propertiesGUI.hide(); } catch (e) {}
    try { if (densityGUI) densityGUI.hide(); } catch (e) {}
    try { if (galaxyGUI) galaxyGUI.hide(); } catch (e) {}
    try { if (earthGUI) earthGUI.hide(); } catch (e) {}
    if (this.reportGUIMode) this.reportGUIMode(null);

    // Show selected
    if (mode === 'Expedition Waypoints') { if (expeditionGUI) { expeditionGUI.show(); if (this.reportGUIMode) this.reportGUIMode('Expedition Waypoints'); } this.focusCameraOnColonization(); this.loadModeAssets('colonization'); }
    else if (mode === 'Stellar Properties') { if (propertiesGUI) { propertiesGUI.show(); if (this.reportGUIMode) this.reportGUIMode('Stellar Properties'); } this.focusCameraOnIGAU(); this.loadModeAssets('igau'); }
    else if (mode === 'Stellar Density') { if (densityGUI) { densityGUI.show(); if (this.reportGUIMode) this.reportGUIMode('Stellar Density'); } this.focusCameraOnDW3(); this.loadModeAssets('dw3'); }
    else if (mode === 'Galaxy Visuals') { if (galaxyGUI) { galaxyGUI.show(); if (this.reportGUIMode) this.reportGUIMode('Galaxy Visuals'); } this.focusCameraOnScience(); this.loadModeAssets('science'); }
    else if (mode === 'Earth Like Worlds') { if (earthGUI) { earthGUI.show(); if (this.reportGUIMode) this.reportGUIMode('Earth Like Worlds'); } }
  }

  static focusCameraOnColonization() { /* small stub to be implemented further */ }
  static focusCameraOnIGAU() {}
  static focusCameraOnDW3() {}
  static focusCameraOnScience() {}
  static loadModeAssets() {}

}
