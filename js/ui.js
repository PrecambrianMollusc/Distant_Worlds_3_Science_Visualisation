import GUI from './lil-gui.esm.js';

export function initGUIs(app) {
  // app is expected to expose required methods/state used below
  const modes = {
    current: null,
    options: ['Galaxy Visuals', 'Colonisation', 'Stellar Density', 'Stellar Properties', 'IGAU Eishoqs', 'Earth Like Worlds']
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
    
    // Galaxy Map Y Position (directly below Galaxy Map Opacity) - slider with coarse steps
    const yPositionSteps = [-5000, -4000, -3000, -2000, -1500, -1000, -800, -600, -400, -200, 0, 200, 400, 600, 800, 1000, 1500, 2000, 3000, 4000, 5000];
    const gpYCtrl = gui.add(app.galacticPlaneState, 'y', -5000, 5000, 1)
      .name('Galaxy Map Y Position')
      .onChange((val) => {
        // Snap to nearest predefined step
        const nearest = yPositionSteps.reduce((prev, curr) => 
          Math.abs(curr - val) < Math.abs(prev - val) ? curr : prev
        );
        app.galacticPlaneState.y = nearest;
        if (app.galacticPlane) app.galacticPlane.position.y = nearest;
        gpYCtrl.updateDisplay();
      });
    
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
    text: `Spansh - Data!
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
        'Colonisation': colonisationGUI,
        'Stellar Density': densityGUI,
        'Stellar Properties': propertiesGUI,
        'IGAU Eishoqs': igauEishoqsGUI,
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

  // Colonisation GUI
  console.log('%c[GUI Init] Initializing colonisationGUI...', 'color: #2196f3; font-weight: bold;');
  const colonisationGUI = new GUI({ width: 300 });
  colonisationGUI.domElement.style.position = 'absolute';
  colonisationGUI.domElement.style.top = subGuiTop;
  colonisationGUI.domElement.style.left = subGuiLeft;
  const colonisationHeader = document.createElement('div');
  colonisationHeader.innerText = 'Colonisation Controls';
  colonisationHeader.style.fontWeight = 'bold';
  colonisationHeader.style.fontSize = '14px';
  colonisationHeader.style.color = '#2196f3';
  colonisationHeader.style.margin = '6px 0';
  // Add a close button and make the header toggle the visibility of the panel
  colonisationHeader.style.display = 'flex';
  colonisationHeader.style.justifyContent = 'space-between';
  colonisationHeader.style.alignItems = 'center';
  colonisationHeader.style.cursor = 'pointer';
  const colonisationClose = document.createElement('button');
  colonisationClose.innerText = '✕';
  colonisationClose.title = 'Hide Colonisation Controls';
  colonisationClose.style.border = 'none';
  colonisationClose.style.background = 'transparent';
  colonisationClose.style.color = '#888';
  colonisationClose.style.cursor = 'pointer';

// MERGED CLOSE BUTTON LISTENERS WITH DEBUGGING
colonisationClose.addEventListener('click', (e) => { 
  e.stopPropagation(); 
  console.log('[Click] Close button ("X") clicked.');
  
  colonisationGUI.hide(); 
  console.log(' -> GUI hidden.');

  if (app.coloniesDateDisplay) {
    app.coloniesDateDisplay.style.display = 'none'; 
    console.log(' -> app.coloniesDateDisplay hidden.');
  }

  if (modes.current === 'Colonisation') {
    modes.current = null; 
    console.log(' -> modes.current set to null.');
  }

  updateRadioHighlight(); 
  console.log(' -> updateRadioHighlight() executed.');
});
colonisationHeader.appendChild(colonisationClose);

// HEADER TOGGLE WITH DEBUGGING
colonisationHeader.addEventListener('click', (e) => {
  console.log('[Click] Header area clicked. Target element:', e.target);

  // If they click the text, handle it. If they click inside the panel, ignore it.
  if (e.target !== colonisationHeader) {
    console.log(' -> Click was on a child element (like the "X" button). Main header toggle bypassed.');
    return;
  }

  const isHidden = colonisationGUI.domElement.style.display === 'none';
  console.log(` -> GUI current display style: "${colonisationGUI.domElement.style.display}" (isHidden evaluated to: ${isHidden})`);

  if (isHidden) { 
    console.log(' -> Attempting to SHOW GUI...');
    colonisationGUI.show(); 
    
    if (app.coloniesDateDisplay && app.coloniesVisible) {
      app.coloniesDateDisplay.style.display = ''; 
      console.log('   -> app.coloniesDateDisplay shown.');
    } else {
      console.log('   -> Skip display change. Condition failed:', { hasDisplay: !!app.coloniesDateDisplay, visibleFlag: app.coloniesVisible });
    }
    
    modes.current = 'Colonisation'; 
    console.log('   -> modes.current set to "Colonisation".');
  } else { 
    console.log(' -> Attempting to HIDE GUI...');
    colonisationGUI.hide(); 
    
    if (app.coloniesDateDisplay) app.coloniesDateDisplay.style.display = 'none'; 
    if (modes.current === 'Colonisation') modes.current = null; 
    console.log('   -> GUI and states hidden/cleared.');
  }
  
  updateRadioHighlight();
  console.log(' -> updateRadioHighlight() executed.');
});

colonisationGUI.domElement.prepend(colonisationHeader);
colonisationGUI.hide();
console.log('[GUI Init] Initial state set to hidden.');

// Add shared controls
console.log('[GUI Init] Adding shared controls...');
addSharedControls(colonisationGUI);
console.log('[GUI Init] Setup complete.');

  // colonisationClose.addEventListener('click', (e) => { e.stopPropagation(); if (modes.current === 'Colonisation') modes.current = null; updateRadioHighlight(); });
  // colonisationHeader.addEventListener('click', () => {
  //   if (colonisationGUI.domElement.style.display === 'none') 
  //     { colonisationGUI.show(); if (app.coloniesDateDisplay && app.coloniesVisible) app.coloniesDateDisplay.style.display = ''; modes.current = 'Colonisation'; }
  //   else { colonisationGUI.hide(); if (app.coloniesDateDisplay) app.coloniesDateDisplay.style.display = 'none'; if (modes.current === 'Colonisation') modes.current = null; }
  //   updateRadioHighlight();
  // });

  // colonisationGUI.domElement.prepend(colonisationHeader);

  // colonisationGUI.hide();
  // // Removed 'Selection Results' UI (not needed for this application)
  //   addSharedControls(colonisationGUI);
  // // Add shared controls (place at top of expedition GUI)

  // Waypoints controls  - removed for now replacing section with colonisation 
  // const waypointsController = expeditionGUI
  //   .add({ toggleWaypoints: () => app.toggleWaypoints() }, 'toggleWaypoints')
  //   .name('Show Waypoints');
  // app.waypointsController = waypointsController;

  // const waypointsOpacityCtrl = expeditionGUI.add(app.waypointsState, 'opacity', 0, 1, 0.01)
  //   .name('Waypoints Opacity')
  //   .onChange((val) => {
  //     if (app.waypointsGroup) {
  //       app.waypointsGroup.traverse(obj => {
  //         if (obj.material) {
  //           obj.material.opacity = val;
  //           obj.material.transparent = true;
  //         }
  //       });
  //     }
  //   });
  // app.waypointsOpacityController = waypointsOpacityCtrl;
  // try { if (!app.waypointsGroup) waypointsOpacityCtrl.domElement.style.display = 'none'; } catch (e) {}

  // Colonies controls 
  const coloniesController = colonisationGUI
    .add({ toggleColonies: () => app.toggleColonizedSystems() }, 'toggleColonies')
    .name('Show Colonized Systems');
  app.coloniesController = coloniesController;

  // Allegiance checkboxes folder
  const allegiances = app.getColoniesAllegiances && app.getColoniesAllegiances() || [];
  if (allegiances.length > 0) {
    const allegiancesFolder = colonisationGUI.addFolder('Allegiances');
    app.coloniesAllegiancesFolder = allegiancesFolder;
    app.coloniesCheckboxes = [];
    
    allegiances.forEach((allegiance) => {
      const checkboxState = { visible: true };
      const checkboxCtrl = allegiancesFolder
        .add(checkboxState, 'visible')
        .name(allegiance)
        .onChange((val) => {
          if (app.setColonyAllegianceVisible) app.setColonyAllegianceVisible(allegiance, val);
        });
      app.coloniesCheckboxes.push(checkboxCtrl);
      
      // Show/hide based on initial coloniesVisible state
      try { checkboxCtrl.domElement.style.display = app.coloniesVisible ? '' : 'none'; } catch (e) {}
    });
    
    // Show/hide folder based on initial coloniesVisible state
    try { allegiancesFolder.domElement.style.display = app.coloniesVisible ? '' : 'none'; } catch (e) {}
  }

  // Timelapse slider (will appear when colonies are shown)
  const timelineLength = app.getColoniesTimelineLength ? app.getColoniesTimelineLength() : 1;
  const timelineState = { position: 0 };
  const coloniesTimelineCtrl = colonisationGUI
    .add(timelineState, 'position', 0, Math.max(1, timelineLength - 1), 1)
    .name('Colonies Timeline')
    .onChange((val) => {
      if (app.setColoniesTimelinePosition) app.setColoniesTimelinePosition(val);
    });
  app.coloniesTimelineController = coloniesTimelineCtrl;
  // Show/hide based on initial coloniesVisible state
  try { coloniesTimelineCtrl.domElement.style.display = app.coloniesVisible ? '' : 'none'; } catch (e) {}

  // Date display element (created outside of lil-gui)
  const coloniesDateDisplay = document.createElement('div');
  coloniesDateDisplay.id = 'colonies-date-display';
  coloniesDateDisplay.style.display = app.coloniesVisible ? '' : 'none';
  coloniesDateDisplay.style.position = 'absolute';
  coloniesDateDisplay.style.left = '330px'; // Next to GUI
  coloniesDateDisplay.style.top = '790px'; // Align with timeline slider
  coloniesDateDisplay.style.fontSize = '12px';
  coloniesDateDisplay.style.color = '#888';
  coloniesDateDisplay.style.fontFamily = 'monospace';
  coloniesDateDisplay.style.pointerEvents = 'none';
  coloniesDateDisplay.textContent = 'Baseline';
  document.body.appendChild(coloniesDateDisplay);
  app.coloniesDateDisplay = coloniesDateDisplay;

 
  // Colonies opacity slider (applies to all allegiance groups / colony meshes)
  const coloniesOpacityCtrl = colonisationGUI.add(app, 'coloniesOpacity', 0, 1, 0.01)
    .name('Colonies Opacity')
    .onChange((val) => { if (app.setColoniesOpacity) app.setColoniesOpacity(val); });
  app.coloniesOpacityController = coloniesOpacityCtrl;
  // Hide the Colonies Opacity control if colonies are initially hidden
  try { if (!app.coloniesVisible) coloniesOpacityCtrl.domElement.style.display = 'none'; } catch (e) {}



  // Stellar Properties GUI
  
  console.log('%c[GUI Init] Initializing stellar properties GUI...', 'color: #2196f3; font-weight: bold;');
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

  // // Wolf Rayet controls
  // const wolfRayetController = propertiesGUI
  //   .add({ toggleWolfRayet: () => app.toggleWolfRayet() }, 'toggleWolfRayet')
  //   .name('Show Wolf Rayet');
  // app.wolfRayetController = wolfRayetController;

  // const wolfRayetOpacityCtrl = propertiesGUI.add(app.wolfRayetState, 'opacity', 0, 1, 0.01)
  //   .name('Wolf Rayet Opacity')
  //   .onChange((val) => {
  //     if (app.wolfRayetGroup) {
  //       app.wolfRayetGroup.traverse(obj => {
  //         if (obj.material) {
  //           obj.material.opacity = val;
  //           obj.material.transparent = true;
  //         }
  //       });
  //     }
  //   });
  // app.wolfRayetOpacityController = wolfRayetOpacityCtrl;
  // try { if (!app.wolfRayetGroup) wolfRayetOpacityCtrl.domElement.style.display = 'none'; } catch (e) {}

  // const wolfRayetColorCtrl = propertiesGUI.add(app.wolfRayetState, 'colorTemp', 0, 1, 0.01)
  //   .name('Wolf Rayet Color Temp')
  //   .onChange((val) => {
  //     if (app.wolfRayetGroup) {
  //       const starColor = app.getStarColorFromTemp(val);
  //       app.wolfRayetGroup.traverse(obj => {
  //         if (obj.material) {
  //           obj.material.color = starColor.clone();
  //           obj.material.emissive = starColor.clone();
  //         }
  //       });
  //     }
  //   });
  // app.wolfRayetColorController = wolfRayetColorCtrl;
  // try { if (!app.wolfRayetGroup) wolfRayetColorCtrl.domElement.style.display = 'none'; } catch (e) {}
    
  // Iso and clipping controls
  
  const systemMassController = propertiesGUI
    .add({ togglesystemMassGroup: () => app.togglesystemMassGroup() }, 'togglesystemMassGroup')
    .name('Show System Mass Codes ');
  app.systemMassController = systemMassController;

  const systemMassState = { slider: 0 };
  const systemMassSliderCtrl = propertiesGUI.
    add(systemMassState, 'slider', 0, app.systemMassFiles.length, 1)
    .name('System Mass Code Slider')
    .onChange((val) => { if (app.setsystemMassVisibility) app.setsystemMassVisibility(val); else app.systemMassMeshes.forEach((m, i) => { if (m) m.visible = (i === val); }); });
  app.systemMassSliderCtrl = systemMassSliderCtrl;
  
  // Hide system mass slider until system mass groups are loaded / visible
  try { if (!app.systemMassGroup) systemMassSliderCtrl.domElement.style.display = 'none'; } catch (e) {};

  const systemMassclipController = propertiesGUI
    .add({ toggleSystemMassClippingSlab: () => app.toggleSystemMassClippingSlab() }, 'toggleSystemMassClippingSlab')
    .name('Enable Clipping Slab');
  app.systemMassclipController = systemMassclipController;

  // Clip center/thickness
  const systemMasscenterController = propertiesGUI.add(app.systemMassclipState, 'systemMasscenter', app.systemMassaxisRanges.y.min, app.systemMassaxisRanges.y.max, 1280).name('Slice Center').onChange(() => app.applySystemMassClippingPlanes());
  const systemMassthicknessController = propertiesGUI.add(app.systemMassclipState, 'systemMassthicknessIndex', 0, app.systemMassthicknessSteps.length - 1, 1).name('Slice Thickness').onChange(() => { app.applySystemMassClippingPlanes(); systemMassupdateThicknessLabel(); });
  console.info(`y min: ${app.systemMassaxisRanges.y.min}    y max: ${app.systemMassaxisRanges.y.max}`);
  app.systemMasscenterController = systemMasscenterController;
  app.systemMassthicknessController = systemMassthicknessController;
  // Hide clipping child controls until clipping is enabled
  try { if (!app.systemMassClippingEnabled) { systemMasscenterController.domElement.style.display = 'none'; systemMassthicknessController.domElement.style.display = 'none'; } } catch (e) {};

  function systemMassupdateThicknessLabel() {
    const idx = Math.max(0, Math.min(app.systemMassclipState.systemMassthicknessIndex, app.systemMassthicknessSteps.length - 1));
    const val = app.systemMassthicknessSteps[idx];
    systemMassthicknessController.name(`Slice Thickness: ${val}`);
  }
  systemMassupdateThicknessLabel();

  const systemMassaxisController = propertiesGUI.add(app.systemMassclipState, 'systemMassaxis', ['x','y','z']).name('Clip Axis').onChange((axis) => {
    const systemMass_r = app.systemMassaxisRanges[axis];
    app.systemMassclipState.systemMasscenter = (systemMass_r.min + systemMass_r.max) / 2;
    systemMasscenterController.min(systemMass_r.min).max(systemMass_r.max).setValue(app.systemMassclipState.systemMasscenter);
    app.systemMassclipState.systemMassthicknessIndex = 1;
    systemMassthicknessController.setValue(app.systemMassclipState.systemMassthicknessIndex);
    systemMassupdateThicknessLabel();
    app.applySystemMassClippingPlanes();
      // --- REFRESH ALL UI VISUALS AT THE VERY END ---
    systemMasscenterController.updateDisplay();
    systemMassthicknessController.updateDisplay();
  });
  app.systemMassclipAxisController = systemMassaxisController;
  try { if (!app.systemMassClippingEnabled) systemMassaxisController.domElement.style.display = 'none'; } catch (e) {};


  // IGAU Eishoqs GUI (duplicate of Stellar Properties)
  const igauEishoqsGUI = new GUI({ width: 300 });
  igauEishoqsGUI.domElement.style.top = subGuiTop;
  igauEishoqsGUI.domElement.style.left = subGuiLeft;
  igauEishoqsGUI.domElement.style.maxHeight = 'calc(100vh - 20px)';
  igauEishoqsGUI.domElement.style.overflowY = 'auto';
  igauEishoqsGUI.domElement.style.bottom = '10px';
  const igauEishoqsHeader = document.createElement('div');
  igauEishoqsHeader.innerText = 'IGAU Eishoqs Controls';
  igauEishoqsHeader.style.fontWeight = 'bold';
  igauEishoqsHeader.style.fontSize = '14px';
  igauEishoqsHeader.style.color = '#2196f3';
  igauEishoqsHeader.style.margin = '6px 0';
  igauEishoqsGUI.domElement.prepend(igauEishoqsHeader);
  igauEishoqsGUI.hide();
  
  // Go To Eishoqs button
  igauEishoqsGUI.add({ goToEishoqs: () => app.focusCameraOnEishoqs() }, 'goToEishoqs').name('Go To Eishoqs');
  
  // Sector Boundary Box Controls
  app.sectorBoundaryController = igauEishoqsGUI.add({ showSectorBoundary: () => app.toggleSectorBoundary() }, 'showSectorBoundary').name('Show Sector Boundary');
  app.sectorBoundaryOpacityController = igauEishoqsGUI.add(app.sectorBoundaryState, 'opacity', 0, 1, 0.01).name('Boundary Opacity').onChange(() => {
    if (app.sectorBoundaryBox && app.sectorBoundaryBox.material) {
      app.sectorBoundaryBox.material.opacity = app.sectorBoundaryState.opacity;
    }
  });
  app.sectorBoundaryOpacityController.domElement.style.display = 'none';
  
  app.sectorBoundaryColorController = igauEishoqsGUI.add(app.sectorBoundaryState, 'colorTemp', 0, 1, 0.01).name('Boundary Color Temp').onChange(() => {
    if (app.sectorBoundaryBox && app.sectorBoundaryBox.material) {
      const starColor = app.getStarColorFromTemp(app.sectorBoundaryState.colorTemp);
      app.sectorBoundaryBox.material.color = starColor;
    }
  });
  app.sectorBoundaryColorController.domElement.style.display = 'none';
  
  addSharedControls(igauEishoqsGUI);

  // H Mass controls
  const igauHMassController = igauEishoqsGUI
    .add({ toggleIgauHMass: () => app.toggleIgauHMass() }, 'toggleIgauHMass')
    .name('Show H Mass');
  app.igauHMassController = igauHMassController;

  const igauHMassOpacityCtrl = igauEishoqsGUI.add(app.igauHMassState, 'opacity', 0, 1, 0.01)
    .name('H Mass Opacity')
    .onChange((val) => {
      if (app.igauHMassGroup) {
        app.igauHMassGroup.traverse(obj => {
          if (obj.material) {
            obj.material.opacity = val;
            obj.material.transparent = true;
          }
        });
      }
    });
  app.igauHMassOpacityController = igauHMassOpacityCtrl;
  try { if (!app.igauHMassGroup) igauHMassOpacityCtrl.domElement.style.display = 'none'; } catch (e) {}

  const igauHMassColorCtrl = igauEishoqsGUI.add(app.igauHMassState, 'colorTemp', 0, 1, 0.01)
    .name('H Mass Color Temp')
    .onChange((val) => {
      if (app.igauHMassGroup) {
        const starColor = app.getStarColorFromTemp(val);
        app.igauHMassGroup.traverse(obj => {
          if (obj.material) {
            obj.material.color = starColor.clone();
            obj.material.emissive = starColor.clone();
          }
        });
      }
    });
  app.igauHMassColorController = igauHMassColorCtrl;
  try { if (!app.igauHMassGroup) igauHMassColorCtrl.domElement.style.display = 'none'; } catch (e) {}

  // G Mass controls
  const igauGMassController = igauEishoqsGUI
    .add({ toggleIgauGMass: () => app.toggleIgauGMass() }, 'toggleIgauGMass')
    .name('Show G Mass');
  app.igauGMassController = igauGMassController;

  const igauGMassOpacityCtrl = igauEishoqsGUI.add(app.igauGMassState, 'opacity', 0, 1, 0.01)
    .name('G Mass Opacity')
    .onChange((val) => {
      if (app.igauGMassGroup) {
        app.igauGMassGroup.traverse(obj => {
          if (obj.material) {
            obj.material.opacity = val;
            obj.material.transparent = true;
          }
        });
      }
    });
  app.igauGMassOpacityController = igauGMassOpacityCtrl;
  try { if (!app.igauGMassGroup) igauGMassOpacityCtrl.domElement.style.display = 'none'; } catch (e) {}

  const igauGMassColorCtrl = igauEishoqsGUI.add(app.igauGMassState, 'colorTemp', 0, 1, 0.01)
    .name('G Mass Color Temp')
    .onChange((val) => {
      if (app.igauGMassGroup) {
        const starColor = app.getStarColorFromTemp(val);
        app.igauGMassGroup.traverse(obj => {
          if (obj.material) {
            obj.material.color = starColor.clone();
            obj.material.emissive = starColor.clone();
          }
        });
      }
    });
  app.igauGMassColorController = igauGMassColorCtrl;
  try { if (!app.igauGMassGroup) igauGMassColorCtrl.domElement.style.display = 'none'; } catch (e) {}

  // F Mass controls
  const igauFMassController = igauEishoqsGUI
    .add({ toggleIgauFMass: () => app.toggleIgauFMass() }, 'toggleIgauFMass')
    .name('Show F Mass');
  app.igauFMassController = igauFMassController;

  const igauFMassOpacityCtrl = igauEishoqsGUI.add(app.igauFMassState, 'opacity', 0, 1, 0.01)
    .name('F Mass Opacity')
    .onChange((val) => {
      if (app.igauFMassGroup) {
        app.igauFMassGroup.traverse(obj => {
          if (obj.material) {
            obj.material.opacity = val;
            obj.material.transparent = true;
          }
        });
      }
    });
  app.igauFMassOpacityController = igauFMassOpacityCtrl;
  try { if (!app.igauFMassGroup) igauFMassOpacityCtrl.domElement.style.display = 'none'; } catch (e) {}

  const igauFMassColorCtrl = igauEishoqsGUI.add(app.igauFMassState, 'colorTemp', 0, 1, 0.01)
    .name('F Mass Color Temp')
    .onChange((val) => {
      if (app.igauFMassGroup) {
        const starColor = app.getStarColorFromTemp(val);
        app.igauFMassGroup.traverse(obj => {
          if (obj.material) {
            obj.material.color = starColor.clone();
            obj.material.emissive = starColor.clone();
          }
        });
      }
    });
  app.igauFMassColorController = igauFMassColorCtrl;
  try { if (!app.igauFMassGroup) igauFMassColorCtrl.domElement.style.display = 'none'; } catch (e) {}

  // E Mass controls
  const igauEMassController = igauEishoqsGUI
    .add({ toggleIgauEMass: () => app.toggleIgauEMass() }, 'toggleIgauEMass')
    .name('Show E Mass');
  app.igauEMassController = igauEMassController;

  const igauEMassOpacityCtrl = igauEishoqsGUI.add(app.igauEMassState, 'opacity', 0, 1, 0.01)
    .name('E Mass Opacity')
    .onChange((val) => {
      if (app.igauEMassGroup) {
        app.igauEMassGroup.traverse(obj => {
          if (obj.material) {
            obj.material.opacity = val;
            obj.material.transparent = true;
          }
        });
      }
    });
  app.igauEMassOpacityController = igauEMassOpacityCtrl;
  try { if (!app.igauEMassGroup) igauEMassOpacityCtrl.domElement.style.display = 'none'; } catch (e) {}

  const igauEMassColorCtrl = igauEishoqsGUI.add(app.igauEMassState, 'colorTemp', 0, 1, 0.01)
    .name('E Mass Color Temp')
    .onChange((val) => {
      if (app.igauEMassGroup) {
        const starColor = app.getStarColorFromTemp(val);
        app.igauEMassGroup.traverse(obj => {
          if (obj.material) {
            obj.material.color = starColor.clone();
            obj.material.emissive = starColor.clone();
          }
        });
      }
    });
  app.igauEMassColorController = igauEMassColorCtrl;
  try { if (!app.igauEMassGroup) igauEMassColorCtrl.domElement.style.display = 'none'; } catch (e) {}

  // D Mass controls
  const igauDMassController = igauEishoqsGUI
    .add({ toggleIgauDMass: () => app.toggleIgauDMass() }, 'toggleIgauDMass')
    .name('Show D Mass');
  app.igauDMassController = igauDMassController;

  const igauDMassOpacityCtrl = igauEishoqsGUI.add(app.igauDMassState, 'opacity', 0, 1, 0.01)
    .name('D Mass Opacity')
    .onChange((val) => {
      if (app.igauDMassGroup) {
        app.igauDMassGroup.traverse(obj => {
          if (obj.material) {
            obj.material.opacity = val;
            obj.material.transparent = true;
          }
        });
      }
    });
  app.igauDMassOpacityController = igauDMassOpacityCtrl;
  try { if (!app.igauDMassGroup) igauDMassOpacityCtrl.domElement.style.display = 'none'; } catch (e) {}

  const igauDMassColorCtrl = igauEishoqsGUI.add(app.igauDMassState, 'colorTemp', 0, 1, 0.01)
    .name('D Mass Color Temp')
    .onChange((val) => {
      if (app.igauDMassGroup) {
        const starColor = app.getStarColorFromTemp(val);
        app.igauDMassGroup.traverse(obj => {
          if (obj.material) {
            obj.material.color = starColor.clone();
            obj.material.emissive = starColor.clone();
          }
        });
      }
    });
  app.igauDMassColorController = igauDMassColorCtrl;
  try { if (!app.igauDMassGroup) igauDMassColorCtrl.domElement.style.display = 'none'; } catch (e) {}

  // C Mass controls
  const igauCMassController = igauEishoqsGUI
    .add({ toggleIgauCMass: () => app.toggleIgauCMass() }, 'toggleIgauCMass')
    .name('Show C Mass');
  app.igauCMassController = igauCMassController;

  const igauCMassOpacityCtrl = igauEishoqsGUI.add(app.igauCMassState, 'opacity', 0, 1, 0.01)
    .name('C Mass Opacity')
    .onChange((val) => {
      if (app.igauCMassGroup) {
        app.igauCMassGroup.traverse(obj => {
          if (obj.material) {
            obj.material.opacity = val;
            obj.material.transparent = true;
          }
        });
      }
    });
  app.igauCMassOpacityController = igauCMassOpacityCtrl;
  try { if (!app.igauCMassGroup) igauCMassOpacityCtrl.domElement.style.display = 'none'; } catch (e) {}

  const igauCMassColorCtrl = igauEishoqsGUI.add(app.igauCMassState, 'colorTemp', 0, 1, 0.01)
    .name('C Mass Color Temp')
    .onChange((val) => {
      if (app.igauCMassGroup) {
        const starColor = app.getStarColorFromTemp(val);
        app.igauCMassGroup.traverse(obj => {
          if (obj.material) {
            obj.material.color = starColor.clone();
            obj.material.emissive = starColor.clone();
          }
        });
      }
    });
  app.igauCMassColorController = igauCMassColorCtrl;
  try { if (!app.igauCMassGroup) igauCMassColorCtrl.domElement.style.display = 'none'; } catch (e) {}

  // B Mass controls
  const igauBMassController = igauEishoqsGUI
    .add({ toggleIgauBMass: () => app.toggleIgauBMass() }, 'toggleIgauBMass')
    .name('Show B Mass');
  app.igauBMassController = igauBMassController;

  const igauBMassOpacityCtrl = igauEishoqsGUI.add(app.igauBMassState, 'opacity', 0, 1, 0.01)
    .name('B Mass Opacity')
    .onChange((val) => {
      if (app.igauBMassGroup) {
        app.igauBMassGroup.traverse(obj => {
          if (obj.material) {
            obj.material.opacity = val;
            obj.material.transparent = true;
          }
        });
      }
    });
  app.igauBMassOpacityController = igauBMassOpacityCtrl;
  try { if (!app.igauBMassGroup) igauBMassOpacityCtrl.domElement.style.display = 'none'; } catch (e) {}

  const igauBMassColorCtrl = igauEishoqsGUI.add(app.igauBMassState, 'colorTemp', 0, 1, 0.01)
    .name('B Mass Color Temp')
    .onChange((val) => {
      if (app.igauBMassGroup) {
        const starColor = app.getStarColorFromTemp(val);
        app.igauBMassGroup.traverse(obj => {
          if (obj.material) {
            obj.material.color = starColor.clone();
            obj.material.emissive = starColor.clone();
          }
        });
      }
    });
  app.igauBMassColorController = igauBMassColorCtrl;
  try { if (!app.igauBMassGroup) igauBMassColorCtrl.domElement.style.display = 'none'; } catch (e) {}

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
    app.clipState.thicknessIndex = 5;
    thicknessController.setValue(app.clipState.thicknessIndex);
    updateThicknessLabel();
    app.applyClippingPlanes();
  });
  app.clipAxisController = axisController;
    // --- REFRESH ALL UI VISUALS AT THE VERY END ---
    centerController.updateDisplay();
    thicknessController.updateDisplay();
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
  galaxyClose.addEventListener('click', (e) => { 
    e.stopPropagation(); 
    galaxyGUI.hide(); 
    if (app.coloniesDateDisplay) app.coloniesDateDisplay.style.display = 'none';
  });
  galaxyHeader.appendChild(galaxyClose);
  galaxyClose.addEventListener('click', (e) => { e.stopPropagation(); if (modes.current === 'Galaxy Visuals') modes.current = null; updateRadioHighlight(); });
  galaxyHeader.addEventListener('click', () => {
    if (galaxyGUI.domElement.style.display === 'none') { 
      galaxyGUI.show(); 
      if (app.coloniesDateDisplay && app.coloniesVisible) app.coloniesDateDisplay.style.display = '';
      modes.current = 'Galaxy Visuals'; 
    }
    else { 
      galaxyGUI.hide(); 
      if (app.coloniesDateDisplay) app.coloniesDateDisplay.style.display = 'none';
      if (modes.current === 'Galaxy Visuals') modes.current = null; 
    }
    updateRadioHighlight();
  });
  galaxyGUI.domElement.prepend(galaxyHeader);

  // Shared galactic map + star cloud
  addSharedControls(galaxyGUI);


  const heliumController = galaxyGUI.add({ toggleHeliumCloud: () => app.toggleHeliumCloud() }, 'toggleHeliumCloud').name('Show Helium Levels');
  app.heliumController = heliumController;
  const heliumOpacityCtrl = galaxyGUI.add(app.heliumState, 'opacity', 0, 1, 0.01).name('Helium Opacity').onChange((val) => { if (app.heliumGroup) { app.heliumGroup.traverse(obj => { if (obj.material) { obj.material.opacity = val; obj.material.transparent = true; } }); } });
  app.heliumState.colorIntensity = 1.0;
  const heliumColorCtrl = galaxyGUI.add(app.heliumState, 'colorIntensity', 1.0, 2.0, 0.01).name('Helium Color Intensity').onChange((val) => { if (app.heliumGroup) { app.heliumGroup.traverse(obj => { if (obj.geometry && obj.geometry.attributes.color && obj.userData.originalColors) { app.adjustVertexColors(obj, val); } }); } });
  // keep refs so we can show/hide helium controls until loaded
  app.heliumOpacityController = heliumOpacityCtrl;
  app.heliumColorController = heliumColorCtrl;
  try { if (!app.heliumGroup) { heliumOpacityCtrl.domElement.style.display = 'none'; heliumColorCtrl.domElement.style.display = 'none'; } } catch (e) {};

  // Exclusion Zone controls
  const exclusionZoneController = galaxyGUI
    .add({ toggleexclusionZone: () => app.toggleexclusionZone() }, 'toggleexclusionZone')
    .name('Show Permit Locked Zones');
  app.exclusionZoneController = exclusionZoneController;

  const exclusionZoneOpacityCtrl = galaxyGUI
     .add(app.exclusionZoneState, 'opacity', 0, 1, 0.01)
     .name('Exclusion Zone Opacity')
     .onChange((val) => { if (!app.exclusionZoneGroup) {return;}  app.exclusionZoneGroup.traverse(obj => { if (obj.material) { obj.material.opacity = val; obj.material.transparent = true; } }); } );
   app.exclusionZoneOpacityController = exclusionZoneOpacityCtrl;
  try {  if (!app.exclusionZoneGroup) exclusionZoneOpacityCtrl.domElement.style.display = 'none';  } catch (e) {}
  
  const exclusionZoneColorCtrl = galaxyGUI.add(app.exclusionZoneState, 'colorTemp', 0, 1, 0.01)
    .name('Exclusion Zone Color Temp')
    .onChange((val) => {
      if (app.exclusionZoneGroup) {
        const starColor = app.getStarColorFromTemp(val);
        app.exclusionZoneGroup.traverse(obj => {
          if (obj.material) {
            obj.material.color = starColor.clone();
            obj.material.emissive = starColor.clone();
          }
        });
      }
    });
  app.exclusionZoneColorController = exclusionZoneColorCtrl;
  try { if (!app.exclusionZoneGroup) exclusionZoneColorCtrl.domElement.style.display = 'none'; } catch (e) {}

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

  
  earthGUI.hide();


  // Keep sub-GUIs positioned below the Mode Selection panel on layout changes
  function updateSubGuiTop() {
    try {
      const rect = modeGUI.domElement.getBoundingClientRect();
      const topPx = rect.top + rect.height + 10;
      const t = `${topPx}px`;
      [expeditionGUI, propertiesGUI, igauEishoqsGUI, densityGUI, galaxyGUI, earthGUI].forEach(g => { if (g && g.domElement) g.domElement.style.top = t; });
    } catch (e) {}
  }
  // Run after layout and on resize
  setTimeout(updateSubGuiTop, 0);
  window.addEventListener('resize', updateSubGuiTop);

  // Allow app to report mode changes programmatically so the selection UI stays in sync
  app.reportGUIMode = (mode) => { modes.current = mode; updateRadioHighlight(); };

  // When modeGUI visibility toggles, also toggle any open mode GUI
  const allModeGUIs = [colonisationGUI, propertiesGUI, igauEishoqsGUI, densityGUI, galaxyGUI, earthGUI];
  let modeGUIPreviouslyVisible = true;
  let visibleModeGUIsBeforeHide = new Set();
  
  const modeGUIMutationObserver = new MutationObserver(() => {
    const modeGUIVisible = modeGUI.domElement.style.display !== 'none';
    
    if (!modeGUIPreviouslyVisible && modeGUIVisible) {
      // modeGUI was hidden, now showing: restore previously visible mode GUIs
      visibleModeGUIsBeforeHide.forEach(gui => {
        if (gui && gui.domElement) gui.show();
      });
      visibleModeGUIsBeforeHide.clear();
    } else if (modeGUIPreviouslyVisible && !modeGUIVisible) {
      // modeGUI was visible, now hiding: save and hide all visible mode GUIs
      visibleModeGUIsBeforeHide.clear();
      allModeGUIs.forEach(gui => {
        if (gui && gui.domElement && gui.domElement.style.display !== 'none') {
          visibleModeGUIsBeforeHide.add(gui);
          gui.hide();
        }
      });
    }
    
    modeGUIPreviouslyVisible = modeGUIVisible;
  });
  
  modeGUIMutationObserver.observe(modeGUI.domElement, {
    attributes: true,
    attributeFilter: ['style'],
    attributeOldValue: true
  });

  return { modeGUI, colonisationGUI, propertiesGUI, igauEishoqsGUI, densityGUI, galaxyGUI, earthGUI };
}
