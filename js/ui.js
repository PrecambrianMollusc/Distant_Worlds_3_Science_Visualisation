import GUI from './lil-gui.esm.js';

export function initGUIs(app) {
  // app is expected to expose required methods/state used below
  const modes = {
    current: null,
    options: ['Galaxy Visuals', 'Expedition Waypoints', 'Stellar Density', 'Stellar Properties', 'Earth Like Worlds']
  };

  // Helper to add shared controls to each sub-GUI
  function addSharedControls(gui, titlePrefix) {
    // Show Galactic Map
    const gpCtrl = gui.add({ toggleGalacticPlane: () => app.toggleGalacticPlane() }, 'toggleGalacticPlane').name('Show Galactic Map');
    if (!app.galacticPlaneControllers) app.galacticPlaneControllers = [];
    app.galacticPlaneControllers.push(gpCtrl);
    
    // Galaxy Map Opacity (directly below Show Galactic Map)
    const gpOpacityCtrl = gui.add(app.galacticPlaneState, 'opacity', 0, 1, 0.01)
      .name('Galaxy Map Opacity')
      .onChange((val) => { if (app.galacticPlane) { app.galacticPlane.material.opacity = val; app.galacticPlane.material.transparent = true; } });
    
    // Galaxy Map Y Position (directly below Galaxy Map Opacity)
    const gpYCtrl = gui.add(app.galacticPlaneState, 'y', -20000, 20000, 20)
      .name('Galaxy Map Y Position')
      .onChange((val) => { if (app.galacticPlane) app.galacticPlane.position.y = val; });
    
    // Track controllers so we can show/hide them with the galactic plane toggle
    if (!app.galacticOpacityControllers) app.galacticOpacityControllers = [];
    if (!app.galacticYControllers) app.galacticYControllers = [];
    app.galacticOpacityControllers.push(gpOpacityCtrl);
    app.galacticYControllers.push(gpYCtrl);
    try { if (!app.galacticPlane || !app.galacticPlane.visible) { gpOpacityCtrl.domElement.style.display = 'none'; gpYCtrl.domElement.style.display = 'none'; } } catch (e) {};
    
    // Show Star Cloud (after all Galactic Map controls)
    const scCtrl = gui.add({ toggleStarCloud: () => app.toggleStarCloud() }, 'toggleStarCloud').name('Show Star Cloud');
    if (!app.starCloudControllers) app.starCloudControllers = [];
    app.starCloudControllers.push(scCtrl);
    
    // Star Cloud Opacity (directly below Show Star Cloud)
    const scOpacityState = { value: app.starCloudOpacitySlider ?? 0.4 };
    const scOpacityCtrl = gui.add(scOpacityState, 'value', 0, 1, 0.01)
      .name('Star Cloud Opacity')
      .onChange((val) => {
        if (app.setStarCloudOpacity) app.setStarCloudOpacity(val);
        app.starCloudOpacitySlider = val;
      });
    if (!app.starCloudOpacityControllers) app.starCloudOpacityControllers = [];
    app.starCloudOpacityControllers.push(scOpacityCtrl);
  }

  const modeGUI = new GUI({ width: 300 });
  modeGUI.domElement.style.position = 'absolute';
  modeGUI.domElement.style.top = '10px';
  modeGUI.domElement.style.left = '10px';

  const creditsFolder = modeGUI.addFolder('Credits');
  const creditsState = {
    text: `https://distantworlds3.space/
Spansh - Data!
EDgalaxydata.space - time lapse data
Edastro/orvidius _galaxy map overlay + data
Everyone who develops and maintains the Elite Data networks
Everyone who contributes data`
  };
  // Add the credits text control without an extra label (folder already titled 'Credits')
  const creditsController = creditsFolder.add(creditsState, 'text').name('');
  // Replace the input with a multi-line textarea for readability and full width
  try {
    const inputEl = creditsController.domElement.querySelector('input');
    const textarea = document.createElement('textarea');
    textarea.style.width = '100%';
    textarea.style.boxSizing = 'border-box';
    textarea.style.height = '140px';
    textarea.style.whiteSpace = 'pre';
    textarea.style.fontFamily = 'monospace';
    // Make the textarea read-only and non-focusable so users cannot edit it
    textarea.readOnly = true;
    textarea.tabIndex = -1;
    // Visually muted/disabled appearance while staying selectable for copy
    textarea.style.backgroundColor = '#f6f6f6';
    textarea.style.border = '1px solid #e0e0e0';
    textarea.style.borderRadius = '6px';
    textarea.style.padding = '8px';
    textarea.style.color = '#444';
    textarea.style.opacity = '0.95';
    textarea.style.cursor = 'default';
    textarea.style.resize = 'vertical';
    textarea.style.outline = 'none';
    textarea.style.userSelect = 'text';
    inputEl.parentNode.replaceChild(textarea, inputEl);
    creditsController.__textarea = textarea;
    creditsController.updateDisplay = function () { textarea.value = creditsState.text; };
    creditsController.updateDisplay();
    // Make the controller take full width and remove the small property label
    try {
      const ctrlEl = creditsController.domElement;
      ctrlEl.style.display = 'flex';
      ctrlEl.style.flexDirection = 'column';
      ctrlEl.style.alignItems = 'stretch';
      const label = ctrlEl.querySelector('.name, .property-name');
      if (label) label.style.display = 'none';
      // Plain text only (no clickable link) to avoid lil-gui intercept issues
      // Ensure textarea uses all available space
      textarea.style.width = '100%';
      textarea.style.margin = '0 0 6px 0';
    } catch (e) {}
  } catch (e) { /* ignore if DOM not as expected */ }
  creditsFolder.open();

  const modeFolder = modeGUI.addFolder('Mode Selection');
  modes.options.forEach((label) => {
    modeFolder.add({ select: () => {
      // Toggle behavior: hide if currently selected and visible
      const guiMap = {
        'Galaxy Visuals': galaxyGUI,
        'Expedition Waypoints': expeditionGUI,
        'Stellar Density': densityGUI,
        'Stellar Properties': propertiesGUI,
        'Earth Like Worlds': earthGUI
      };
      const target = guiMap[label];
      const already = modes.current === label && target && target.domElement.style.display !== 'none';
      if (already) {
        // hide the currently active panel
        if (target) target.hide();
        modes.current = null;
      } else {
        modes.current = label;
        app.switchMode(label);
      }
      updateRadioHighlight();
    }}, 'select').name(label);
  });

  function updateRadioHighlight() {
    const controllers = modeFolder && modeFolder.__controllers;
    if (!controllers || !controllers.forEach) return;

    controllers.forEach((controller) => {
      const label = controller.name;
      const isActive = label === modes.current;
      const container = controller.domElement;
      const funcDiv = container && container.querySelector && container.querySelector('.function');
      if (funcDiv) {
        funcDiv.style.background = isActive ? '#4caf50' : '';
        funcDiv.style.color = isActive ? '#fff' : '';
        funcDiv.style.fontWeight = isActive ? 'bold' : '';
        funcDiv.style.borderRadius = '4px';
        funcDiv.style.padding = '4px 8px';
        funcDiv.style.marginBottom = '4px';
        funcDiv.style.textAlign = 'center';
        funcDiv.style.cursor = 'pointer';
        funcDiv.style.transition = 'background 0.3s ease';
      }
    });
  }

  setTimeout(updateRadioHighlight, 0);

  // Create sub-GUIs used by the app
  const subGuiLeft = '10px';
  // Compute sub-GUI top to sit below the Mode Selection panel (fallback to 270px)
  let subGuiTop = '270px';
  try {
    const rect = modeGUI.domElement.getBoundingClientRect();
    const topPx = rect.top + rect.height + 10;
    if (topPx && !isNaN(topPx)) subGuiTop = `${topPx}px`;
  } catch (e) {}

  // Colonization GUI
  const expeditionGUI = new GUI({ width: 300 });
  expeditionGUI.domElement.style.position = 'absolute';
  expeditionGUI.domElement.style.top = subGuiTop;
  expeditionGUI.domElement.style.left = subGuiLeft;
  const expeditionHeader = document.createElement('div');
  expeditionHeader.innerText = 'Expedition Waypoints Controls';
  expeditionHeader.style.fontWeight = 'bold';
  expeditionHeader.style.fontSize = '14px';
  expeditionHeader.style.color = '#2196f3';
  expeditionHeader.style.margin = '6px 0';
  // Add a close button and make the header toggle the visibility of the panel
  expeditionHeader.style.display = 'flex';
  expeditionHeader.style.justifyContent = 'space-between';
  expeditionHeader.style.alignItems = 'center';
  expeditionHeader.style.cursor = 'pointer';
  const expeditionClose = document.createElement('button');
  expeditionClose.innerText = '✕';
  expeditionClose.title = 'Hide Expedition Controls';
  expeditionClose.style.border = 'none';
  expeditionClose.style.background = 'transparent';
  expeditionClose.style.color = '#888';
  expeditionClose.style.cursor = 'pointer';
  expeditionClose.addEventListener('click', (e) => { e.stopPropagation(); expeditionGUI.hide(); });
  expeditionHeader.appendChild(expeditionClose);
  expeditionClose.addEventListener('click', (e) => { e.stopPropagation(); if (modes.current === 'Expedition Waypoints') modes.current = null; updateRadioHighlight(); });
  expeditionHeader.addEventListener('click', () => {
    if (expeditionGUI.domElement.style.display === 'none') { expeditionGUI.show(); modes.current = 'Expedition Waypoints'; }
    else { expeditionGUI.hide(); if (modes.current === 'Expedition Waypoints') modes.current = null; }
    updateRadioHighlight();
  });
  expeditionGUI.domElement.prepend(expeditionHeader);




  expeditionGUI.hide();
  // Removed 'Selection Results' UI (not needed for this application)

  // Add shared controls (place at top of expedition GUI)
  addSharedControls(expeditionGUI);



  // Stellar Properties GUI
  const propertiesGUI = new GUI({ width: 300 });
  propertiesGUI.domElement.style.top = subGuiTop;
  propertiesGUI.domElement.style.left = subGuiLeft;
  const propertiesHeader = document.createElement('div');
  propertiesHeader.innerText = 'Stellar Properties Controls';
  propertiesHeader.style.fontWeight = 'bold';
  propertiesHeader.style.fontSize = '14px';
  propertiesHeader.style.color = '#2196f3';
  propertiesHeader.style.margin = '6px 0';
  propertiesGUI.domElement.prepend(propertiesHeader);
  propertiesGUI.hide();
  addSharedControls(propertiesGUI);

  // H Mass controls
  const hMassController = propertiesGUI
    .add({ toggleHMass: () => app.toggleHMass() }, 'toggleHMass')
    .name('Show H Mass');
  app.hMassController = hMassController;

  const hMassOpacityCtrl = propertiesGUI.add(app.hMassState, 'opacity', 0, 1, 0.01)
    .name('H Mass Opacity')
    .onChange((val) => {
      if (app.hMassGroup) {
        app.hMassGroup.traverse(obj => {
          if (obj.material) {
            obj.material.opacity = val;
            obj.material.transparent = true;
          }
        });
      }
    });
  app.hMassOpacityController = hMassOpacityCtrl;
  try { if (!app.hMassGroup) hMassOpacityCtrl.domElement.style.display = 'none'; } catch (e) {}

  const hMassColorCtrl = propertiesGUI.add(app.hMassState, 'colorTemp', 0, 1, 0.01)
    .name('H Mass Color Temp')
    .onChange((val) => {
      if (app.hMassGroup) {
        const starColor = app.getStarColorFromTemp(val);
        app.hMassGroup.traverse(obj => {
          if (obj.material) {
            obj.material.color = starColor.clone();
            obj.material.emissive = starColor.clone();
          }
        });
      }
    });
  app.hMassColorController = hMassColorCtrl;
  try { if (!app.hMassGroup) hMassColorCtrl.domElement.style.display = 'none'; } catch (e) {}

  // G Mass controls
  const gMassController = propertiesGUI
    .add({ toggleGMass: () => app.toggleGMass() }, 'toggleGMass')
    .name('Show G Mass');
  app.gMassController = gMassController;

  const gMassOpacityCtrl = propertiesGUI.add(app.gMassState, 'opacity', 0, 1, 0.01)
    .name('G Mass Opacity')
    .onChange((val) => {
      if (app.gMassGroup) {
        app.gMassGroup.traverse(obj => {
          if (obj.material) {
            obj.material.opacity = val;
            obj.material.transparent = true;
          }
        });
      }
    });
  app.gMassOpacityController = gMassOpacityCtrl;
  try { if (!app.gMassGroup) gMassOpacityCtrl.domElement.style.display = 'none'; } catch (e) {}

  const gMassColorCtrl = propertiesGUI.add(app.gMassState, 'colorTemp', 0, 1, 0.01)
    .name('G Mass Color Temp')
    .onChange((val) => {
      if (app.gMassGroup) {
        const starColor = app.getStarColorFromTemp(val);
        app.gMassGroup.traverse(obj => {
          if (obj.material) {
            obj.material.color = starColor.clone();
            obj.material.emissive = starColor.clone();
          }
        });
      }
    });
  app.gMassColorController = gMassColorCtrl;
  try { if (!app.gMassGroup) gMassColorCtrl.domElement.style.display = 'none'; } catch (e) {}

  // F Mass controls
  const fMassController = propertiesGUI
    .add({ toggleFMass: () => app.toggleFMass() }, 'toggleFMass')
    .name('Show F Mass');
  app.fMassController = fMassController;

  const fMassOpacityCtrl = propertiesGUI.add(app.fMassState, 'opacity', 0, 1, 0.01)
    .name('F Mass Opacity')
    .onChange((val) => {
      if (app.fMassGroup) {
        app.fMassGroup.traverse(obj => {
          if (obj.material) {
            obj.material.opacity = val;
            obj.material.transparent = true;
          }
        });
      }
    });
  app.fMassOpacityController = fMassOpacityCtrl;
  try { if (!app.fMassGroup) fMassOpacityCtrl.domElement.style.display = 'none'; } catch (e) {}

  const fMassColorCtrl = propertiesGUI.add(app.fMassState, 'colorTemp', 0, 1, 0.01)
    .name('F Mass Color Temp')
    .onChange((val) => {
      if (app.fMassGroup) {
        const starColor = app.getStarColorFromTemp(val);
        app.fMassGroup.traverse(obj => {
          if (obj.material) {
            obj.material.color = starColor.clone();
            obj.material.emissive = starColor.clone();
          }
        });
      }
    });
  app.fMassColorController = fMassColorCtrl;
  try { if (!app.fMassGroup) fMassColorCtrl.domElement.style.display = 'none'; } catch (e) {}

  // E Mass controls
  const eMassController = propertiesGUI
    .add({ toggleEMass: () => app.toggleEMass() }, 'toggleEMass')
    .name('Show E Mass');
  app.eMassController = eMassController;

  const eMassOpacityCtrl = propertiesGUI.add(app.eMassState, 'opacity', 0, 1, 0.01)
    .name('E Mass Opacity')
    .onChange((val) => {
      if (app.eMassGroup) {
        app.eMassGroup.traverse(obj => {
          if (obj.material) {
            obj.material.opacity = val;
            obj.material.transparent = true;
          }
        });
      }
    });
  app.eMassOpacityController = eMassOpacityCtrl;
  try { if (!app.eMassGroup) eMassOpacityCtrl.domElement.style.display = 'none'; } catch (e) {}

  const eMassColorCtrl = propertiesGUI.add(app.eMassState, 'colorTemp', 0, 1, 0.01)
    .name('E Mass Color Temp')
    .onChange((val) => {
      if (app.eMassGroup) {
        const starColor = app.getStarColorFromTemp(val);
        app.eMassGroup.traverse(obj => {
          if (obj.material) {
            obj.material.color = starColor.clone();
            obj.material.emissive = starColor.clone();
          }
        });
      }
    });
  app.eMassColorController = eMassColorCtrl;
  try { if (!app.eMassGroup) eMassColorCtrl.domElement.style.display = 'none'; } catch (e) {}

  // Wolf Rayet controls
  const wolfRayetController = propertiesGUI
    .add({ toggleWolfRayet: () => app.toggleWolfRayet() }, 'toggleWolfRayet')
    .name('Show Wolf Rayet');
  app.wolfRayetController = wolfRayetController;

  const wolfRayetOpacityCtrl = propertiesGUI.add(app.wolfRayetState, 'opacity', 0, 1, 0.01)
    .name('Wolf Rayet Opacity')
    .onChange((val) => {
      if (app.wolfRayetGroup) {
        app.wolfRayetGroup.traverse(obj => {
          if (obj.material) {
            obj.material.opacity = val;
            obj.material.transparent = true;
          }
        });
      }
    });
  app.wolfRayetOpacityController = wolfRayetOpacityCtrl;
  try { if (!app.wolfRayetGroup) wolfRayetOpacityCtrl.domElement.style.display = 'none'; } catch (e) {}

  const wolfRayetColorCtrl = propertiesGUI.add(app.wolfRayetState, 'colorTemp', 0, 1, 0.01)
    .name('Wolf Rayet Color Temp')
    .onChange((val) => {
      if (app.wolfRayetGroup) {
        const starColor = app.getStarColorFromTemp(val);
        app.wolfRayetGroup.traverse(obj => {
          if (obj.material) {
            obj.material.color = starColor.clone();
            obj.material.emissive = starColor.clone();
          }
        });
      }
    });
  app.wolfRayetColorController = wolfRayetColorCtrl;
  try { if (!app.wolfRayetGroup) wolfRayetColorCtrl.domElement.style.display = 'none'; } catch (e) {}

  // Stellar Density GUI
  const densityGUI = new GUI({ width: 300 });
  densityGUI.domElement.style.top = subGuiTop;
  densityGUI.domElement.style.left = subGuiLeft;
  const densityHeader = document.createElement('div');
  densityHeader.innerText = 'Stellar Density Controls';
  densityHeader.style.fontWeight = 'bold';
  densityHeader.style.fontSize = '14px';
  densityHeader.style.color = '#2196f3';
  densityHeader.style.margin = '6px 0';
  densityHeader.style.display = 'flex';
  densityHeader.style.justifyContent = 'space-between';
  densityHeader.style.alignItems = 'center';
  densityHeader.style.cursor = 'pointer';
  const densityClose = document.createElement('button');
  densityClose.innerText = '✕';
  densityClose.title = 'Hide Stellar Density Controls';
  densityClose.style.border = 'none';
  densityClose.style.background = 'transparent';
  densityClose.style.color = '#888';
  densityClose.style.cursor = 'pointer';
  densityClose.addEventListener('click', (e) => { e.stopPropagation(); densityGUI.hide(); });
  densityHeader.appendChild(densityClose);
  densityClose.addEventListener('click', (e) => { e.stopPropagation(); if (modes.current === 'Stellar Density') modes.current = null; updateRadioHighlight(); });
  densityHeader.addEventListener('click', () => {
    if (densityGUI.domElement.style.display === 'none') { densityGUI.show(); modes.current = 'Stellar Density'; }
    else { densityGUI.hide(); if (modes.current === 'Stellar Density') modes.current = null; }
    updateRadioHighlight();
  });
  densityGUI.domElement.prepend(densityHeader);

  // Add shared controls (galactic map, star cloud) - place at top
  addSharedControls(densityGUI);

  const densityscanController = densityGUI
    .add({ toggledensityscanCloud: () => app.toggledensityscanCloud() }, 'toggledensityscanCloud')
    .name('Show Density Scans');
  app.densityScanController = densityscanController;

  // Iso and clipping controls
  const isoController = densityGUI
    .add({ toggleIsoGroup: () => app.toggleIsoGroup() }, 'toggleIsoGroup')
    .name('Show IsoLevels');
  app.isoController = isoController;

  const isoState = { slider: 0 };
  const isoSliderCtrl = densityGUI.add(isoState, 'slider', 0, app.isoFiles.length, 1)
    .name('IsoLevel Slider')
    .onChange((val) => { if (app.setIsoVisibility) app.setIsoVisibility(val); else app.isoMeshes.forEach((m, i) => { if (m) m.visible = (i < val); }); });
  app.isoSliderController = isoSliderCtrl;
  // Hide iso slider until iso groups are loaded / visible
  try { if (!app.isoGroup) isoSliderCtrl.domElement.style.display = 'none'; } catch (e) {};


  const clipController = densityGUI
    .add({ toggleClippingSlab: () => app.toggleClippingSlab() }, 'toggleClippingSlab')
    .name('Enable Clipping Slab');
  app.clipController = clipController;

  // Clip center/thickness
  const centerController = densityGUI.add(app.clipState, 'center', app.axisRanges.x.min, app.axisRanges.x.max, 100).name('Slice Center').onChange(() => app.applyClippingPlanes());
  const thicknessController = densityGUI.add(app.clipState, 'thicknessIndex', 0, app.thicknessSteps.length - 1, 1).name('Slice Thickness').onChange(() => { app.applyClippingPlanes(); updateThicknessLabel(); });
  app.centerController = centerController;
  app.thicknessController = thicknessController;
  // Hide clipping child controls until clipping is enabled
  try { if (!app.clippingEnabled) { centerController.domElement.style.display = 'none'; thicknessController.domElement.style.display = 'none'; } } catch (e) {};

  function updateThicknessLabel() {
    const idx = Math.max(0, Math.min(app.clipState.thicknessIndex, app.thicknessSteps.length - 1));
    const val = app.thicknessSteps[idx];
    thicknessController.name(`Slice Thickness: ${val}`);
  }
  updateThicknessLabel();

  const axisController = densityGUI.add(app.clipState, 'axis', ['x','y','z']).name('Clip Axis').onChange((axis) => {
    const r = app.axisRanges[axis];
    app.clipState.center = (r.min + r.max) / 2;
    centerController.min(r.min).max(r.max).setValue(app.clipState.center);
    app.clipState.thicknessIndex = 0;
    thicknessController.setValue(app.clipState.thicknessIndex);
    updateThicknessLabel();
    app.applyClippingPlanes();
  });
  app.clipAxisController = axisController;
  try { if (!app.clippingEnabled) axisController.domElement.style.display = 'none'; } catch (e) {};

  densityGUI.hide();

  // Galaxy Visuals GUI
  const galaxyGUI = new GUI({ width: 300 });
  galaxyGUI.domElement.style.top = subGuiTop;
  galaxyGUI.domElement.style.left = subGuiLeft;
  const galaxyHeader = document.createElement('div');
  galaxyHeader.innerText = 'Galaxy Visuals Controls';
  galaxyHeader.style.fontWeight = 'bold';
  galaxyHeader.style.fontSize = '14px';
  galaxyHeader.style.color = '#2196f3';
  galaxyHeader.style.margin = '6px 0';
  galaxyHeader.style.display = 'flex';
  galaxyHeader.style.justifyContent = 'space-between';
  galaxyHeader.style.alignItems = 'center';
  galaxyHeader.style.cursor = 'pointer';
  const galaxyClose = document.createElement('button');
  galaxyClose.innerText = '✕';
  galaxyClose.title = 'Hide Galaxy Controls';
  galaxyClose.style.border = 'none';
  galaxyClose.style.background = 'transparent';
  galaxyClose.style.color = '#888';
  galaxyClose.style.cursor = 'pointer';
  galaxyClose.addEventListener('click', (e) => { e.stopPropagation(); galaxyGUI.hide(); });
  galaxyHeader.appendChild(galaxyClose);
  galaxyClose.addEventListener('click', (e) => { e.stopPropagation(); if (modes.current === 'Galaxy Visuals') modes.current = null; updateRadioHighlight(); });
  galaxyHeader.addEventListener('click', () => {
    if (galaxyGUI.domElement.style.display === 'none') { galaxyGUI.show(); modes.current = 'Galaxy Visuals'; }
    else { galaxyGUI.hide(); if (modes.current === 'Galaxy Visuals') modes.current = null; }
    updateRadioHighlight();
  });
  galaxyGUI.domElement.prepend(galaxyHeader);

  // Shared galactic map + star cloud
  addSharedControls(galaxyGUI);

  // Simple colonies toggle (replaces previous per-allegiance toggles)
  const coloniesController = galaxyGUI
    .add({ toggleColonies: () => app.toggleColonizedSystems() }, 'toggleColonies')
    .name('Show Colonized Systems');
  app.coloniesController = coloniesController;

  // Legacy: function to create per-allegiance toggles if needed later (not invoked)
  function createLegacyAllegianceControls(parent) {
    const legacy = parent.addFolder('Allegiances (Legacy)');
    legacy.add({ allVisible: true }, 'allVisible')
      .name('Show All')
      .onChange((val) => { Object.values(app.allegianceGroups).forEach(g => { g.visible = val; }); });
    Object.keys(app.allegianceGroups).forEach((name) => {
      const group = app.allegianceGroups[name];
      legacy.add(group, 'visible').name(name);
    });
    legacy.hide();
    return legacy;
  }

  // Visible Step slider - COMMENTED OUT - time-based aspect lost in GLTF creation
  // const state = { step: 44 };
  // const visibleStepController = galaxyGUI.add(state, 'step', 0, 44, 1)
  //   .name('Visible Step')
  //   .onChange((val) => {
  //     Object.values(app.allegianceGroups).forEach((group) => {
  //       if (!group.visible) return;
  //       const meshes = [];
  //       group.traverse((obj) => { if (obj.isPoints) meshes.push(obj); });
  //       meshes.sort((a, b) => a.name.localeCompare(b.name));
  //       meshes.forEach((m, i) => { m.visible = (i === 0) || (i <= val); });
  //     });
  //   });
  // app.visibleStepController = visibleStepController;
  // // Hide the Visible Step control if colonies are initially hidden
  // try { if (!app.coloniesVisible) visibleStepController.domElement.style.display = 'none'; } catch (e) {}


  // Colonies opacity slider (applies to all allegiance groups / colony meshes)
  const coloniesOpacityCtrl = galaxyGUI.add(app, 'coloniesOpacity', 0, 1, 0.01)
    .name('Colonies Opacity')
    .onChange((val) => { if (app.setColoniesOpacity) app.setColoniesOpacity(val); });
  app.coloniesOpacityController = coloniesOpacityCtrl;
  // Hide the Colonies Opacity control if colonies are initially hidden
  try { if (!app.coloniesVisible) coloniesOpacityCtrl.domElement.style.display = 'none'; } catch (e) {}

  const heliumController = galaxyGUI.add({ toggleHeliumCloud: () => app.toggleHeliumCloud() }, 'toggleHeliumCloud').name('Show Helium Levels');
  app.heliumController = heliumController;
  const heliumOpacityCtrl = galaxyGUI.add(app.heliumState, 'opacity', 0, 1, 0.01).name('Helium Opacity').onChange((val) => { if (app.heliumGroup) { app.heliumGroup.traverse(obj => { if (obj.material) { obj.material.opacity = val; obj.material.transparent = true; } }); } });
  app.heliumState.colorIntensity = 1.0;
  const heliumColorCtrl = galaxyGUI.add(app.heliumState, 'colorIntensity', 1.0, 2.0, 0.01).name('Helium Color Intensity').onChange((val) => { if (app.heliumGroup) { app.heliumGroup.traverse(obj => { if (obj.geometry && obj.geometry.attributes.color && obj.userData.originalColors) { app.adjustVertexColors(obj, val); } }); } });
  // keep refs so we can show/hide helium controls until loaded
  app.heliumOpacityController = heliumOpacityCtrl;
  app.heliumColorController = heliumColorCtrl;
  try { if (!app.heliumGroup) { heliumOpacityCtrl.domElement.style.display = 'none'; heliumColorCtrl.domElement.style.display = 'none'; } } catch (e) {};
  
  // Guardian Sites - Master toggle
  const guardianController = galaxyGUI.add({ toggleGuardianSites: () => app.toggleGuardianSites() }, 'toggleGuardianSites').name('Show Guardian Sites');
  app.guardianController = guardianController;
  
  // Guardian Beacons
  const guardianBeaconsController = galaxyGUI.add({ toggleGuardianBeacons: () => app.toggleGuardianBeacons() }, 'toggleGuardianBeacons').name('Show Beacons');
  app.guardianBeaconsController = guardianBeaconsController;
  const guardianBeaconsOpacityCtrl = galaxyGUI.add(app.guardianBeaconsState, 'opacity', 0, 1, 0.01).name('Beacons Opacity').onChange((val) => { if (app.guardianBeaconsGroup) { app.guardianBeaconsGroup.traverse(obj => { if (obj.material) { obj.material.opacity = val; obj.material.transparent = true; } }); } });
  app.guardianBeaconsOpacityController = guardianBeaconsOpacityCtrl;
  try { guardianBeaconsController.domElement.style.display = 'none'; guardianBeaconsOpacityCtrl.domElement.style.display = 'none'; } catch (e) {}
  
  // Guardian Ruins
  const guardianRuinsController = galaxyGUI.add({ toggleGuardianRuins: () => app.toggleGuardianRuins() }, 'toggleGuardianRuins').name('Show Ruins');
  app.guardianRuinsController = guardianRuinsController;
  const guardianRuinsOpacityCtrl = galaxyGUI.add(app.guardianRuinsState, 'opacity', 0, 1, 0.01).name('Ruins Opacity').onChange((val) => { if (app.guardianRuinsGroup) { app.guardianRuinsGroup.traverse(obj => { if (obj.material) { obj.material.opacity = val; obj.material.transparent = true; } }); } });
  app.guardianRuinsOpacityController = guardianRuinsOpacityCtrl;
  try { guardianRuinsController.domElement.style.display = 'none'; guardianRuinsOpacityCtrl.domElement.style.display = 'none'; } catch (e) {}
  
  // Guardian Structures
  const guardianStructuresController = galaxyGUI.add({ toggleGuardianStructures: () => app.toggleGuardianStructures() }, 'toggleGuardianStructures').name('Show Structures');
  app.guardianStructuresController = guardianStructuresController;
  const guardianStructuresOpacityCtrl = galaxyGUI.add(app.guardianStructuresState, 'opacity', 0, 1, 0.01).name('Structures Opacity').onChange((val) => { if (app.guardianStructuresGroup) { app.guardianStructuresGroup.traverse(obj => { if (obj.material) { obj.material.opacity = val; obj.material.transparent = true; } }); } });
  app.guardianStructuresOpacityController = guardianStructuresOpacityCtrl;
  try { guardianStructuresController.domElement.style.display = 'none'; guardianStructuresOpacityCtrl.domElement.style.display = 'none'; } catch (e) {}
  
  // Guardian Connections
  const guardianConnectionsController = galaxyGUI.add({ toggleGuardianConnections: () => app.toggleGuardianConnections() }, 'toggleGuardianConnections').name('Show Connections');
  app.guardianConnectionsController = guardianConnectionsController;
  const guardianConnectionsOpacityCtrl = galaxyGUI.add(app.guardianConnectionsState, 'opacity', 0, 1, 0.01).name('Connections Opacity').onChange((val) => { if (app.guardianConnectionsGroup) { app.guardianConnectionsGroup.traverse(obj => { if (obj.material) { obj.material.opacity = val; obj.material.transparent = true; } }); } });
  app.guardianConnectionsOpacityController = guardianConnectionsOpacityCtrl;
  try { guardianConnectionsController.domElement.style.display = 'none'; guardianConnectionsOpacityCtrl.domElement.style.display = 'none'; } catch (e) {}
  
  galaxyGUI.hide();

  // Earth Like Worlds GUI (placeholder)
  const earthGUI = new GUI({ width: 300 });
  earthGUI.domElement.style.top = subGuiTop;
  earthGUI.domElement.style.left = subGuiLeft;
  const earthHeader = document.createElement('div');
  earthHeader.innerText = 'Earth Like Worlds Controls';
  earthHeader.style.fontWeight = 'bold';
  earthHeader.style.fontSize = '14px';
  earthHeader.style.color = '#2196f3';
  earthHeader.style.margin = '6px 0';
  earthGUI.domElement.prepend(earthHeader);
  earthGUI.hide();
  addSharedControls(earthGUI);

  // Keep sub-GUIs positioned below the Mode Selection panel on layout changes
  function updateSubGuiTop() {
    try {
      const rect = modeGUI.domElement.getBoundingClientRect();
      const topPx = rect.top + rect.height + 10;
      const t = `${topPx}px`;
      [expeditionGUI, propertiesGUI, densityGUI, galaxyGUI, earthGUI].forEach(g => { if (g && g.domElement) g.domElement.style.top = t; });
    } catch (e) {}
  }
  // Run after layout and on resize
  setTimeout(updateSubGuiTop, 0);
  window.addEventListener('resize', updateSubGuiTop);

  // Allow app to report mode changes programmatically so the selection UI stays in sync
  app.reportGUIMode = (mode) => { modes.current = mode; updateRadioHighlight(); };

  return { modeGUI, expeditionGUI, propertiesGUI, densityGUI, galaxyGUI, earthGUI };
}
