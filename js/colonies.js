/**
 * Colonies Timelapse Manager
 * 
 * Specializes TimelapseManager for colony data:
 * - Baselines: baseline_{allegiance}_systems_pointcloud.glb
 * - Updates: week_{YYYY_MM_DD}_new_systems_pointcloud.glb
 * - Located in: glbdata/{allegiance}/
 * 
 * Features:
 * - Auto-discovers update files from directory
 * - Manages per-allegiance visibility
 * - Applies material settings (opacity, transparency)
 * - Provides UI-friendly state tracking
 */

import * as THREE from './three.module.js';
import { TimelapseManager } from './timelapse.js';
import { applyPointMaterialSettings } from './utils.js';

export class ColoniesTimelapseManager extends TimelapseManager {
  constructor(config) {
    super({
      scene: config.scene,
      basePath: './glbdata/',
      categories: ['Alliance', 'Empire', 'Federation', 'Independent', 'Guardian', 'Thargoid'],
      baselinePattern: 'baseline_{category}_systems_pointcloud.glb',
      updatePattern: 'week_{date}_new_systems_pointcloud.glb',
      loader: config.loader,
      onReady: config.onReady
    });
    
    this.sprite = config.sprite; // reference to THREE texture for point material
    this.coloniesInitialLoadCount = 0;
    this.coloniesExpectedLoadCount = 0;
    
    // Map category names to directory paths (handle case differences)
    this.categoryPathMap = {
      'Alliance': 'Alliance',
      'Empire': 'Empire',
      'Federation': 'Federation',
      'Independent': 'Independent',
      'Guardian': 'guardian', // lowercase directory
      'Thargoid': 'Thargoid'
    };
  }

  /**
   * Get the directory path for a category (handles case differences).
   */
  getCategoryPath(category) {
    return this.categoryPathMap[category] || category;
  }

  /**
   * Override: discover updates by attempting to load files with known date patterns
   * or by parsing a manifest if available.
   * 
   * IMPORTANT: This implementation first tries to load a manifest.json file in each allegiance directory.
   * If no manifest exists, it falls back to a brute-force date-range discovery.
   */
  async discoverUpdatesForCategory(categoryPath, category) {
    const updates = [];
    
    // Strategy 1: Try to load a manifest file first
    try {
      const manifestUrl = categoryPath + 'manifest.json';
      const response = await fetch(manifestUrl);
      
      if (response.ok) {
        const manifest = await response.json();
        if (manifest.updates && Array.isArray(manifest.updates)) {
          // Manifest provides list of update dates
          for (const dateEntry of manifest.updates) {
            const date = typeof dateEntry === 'string' ? dateEntry : dateEntry.date;
            const url = categoryPath + `week_${date}_new_systems_pointcloud.glb`;
            updates.push({ date, url, mesh: null });
          }
          console.log(`Loaded ${updates.length} updates for ${category} from manifest`);
          return updates;
        }
      }
    } catch (err) {
      // Manifest fetch failed or parse error - try fallback
    }
    
    // Strategy 2: Attempt brute-force discovery by trying dates in a range
    console.info(`No manifest found for ${category}. Attempting to discover update files...`);
    const discovered = await this.attemptDateRange(categoryPath, category);
    if (discovered.length > 0) {
      console.log(`Discovered ${discovered.length} updates for ${category} via brute-force`);
      return discovered;
    }
    
    console.warn(`No updates found for ${category}. Place manifest.json in glbdata/${category}/ for faster loading.`);
    return updates;
  }

  /**
   * Attempt to load update files by trying a range of dates.
   * Discovers which files actually exist by attempting to fetch them.
   */
  async attemptDateRange(categoryPath, category) {
    const updates = [];
    
    // Try to discover files by attempting fetch with common date patterns
    // Start from a known date and try forward
    const startDate = new Date(2025, 1, 21); // February 21, 2025
    const today = new Date();
    
    // Try every 3 days as a sampling strategy
    for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 3)) {
      const dateStr = d.toISOString().split('T')[0]; // YYYY-MM-DD format
      const url = categoryPath + `week_${dateStr}_new_systems_pointcloud.glb`;
      
      try {
        // Try a HEAD request first (more efficient)
        const response = await fetch(url, { method: 'HEAD' });
        if (response.ok) {
          updates.push({ date: dateStr, url, mesh: null });
        }
      } catch (err) {
        // File doesn't exist or can't be fetched - skip it
      }
    }
    
    return updates;
  }

  /**
   * Override init to add material settings and per-allegiance loading tracking.
   * Uses parallel loading for better performance.
   */
  async init() {
    try {
      this.coloniesExpectedLoadCount = this.categories.length;
      
      // Phase 1: Discover and load all baselines in parallel
      console.log('Phase 1: Loading baselines...');
      const baselinePromises = this.categories.map(async (category) => {
        this.categoryState[category] = {
          visible: true,
          opacity: this.masterOpacity,
          timelinePosition: this.timelinePosition
        };
        
        const dirPath = this.getCategoryPath(category);
        const categoryPath = `${this.basePath}${dirPath}/`;
        
        try {
          const baselineUrl = categoryPath + this.baselinePattern.replace('{category}', category);
          console.log(`Loading baseline: ${baselineUrl}`);
          const baselineGltf = await this.loader(baselineUrl);
          
          const masterGroup = new THREE.Group();
          masterGroup.name = `colonies_${category}`;
          masterGroup.userData.category = category;
          masterGroup.userData.baseline = baselineGltf.scene;
          masterGroup.add(baselineGltf.scene);
          
          if (this.sprite) {
            applyPointMaterialSettings(masterGroup, this.sprite);
          }
          
          this.scene.add(masterGroup);
          this.categoryGroups[category] = masterGroup;
          
          return { category, categoryPath };
        } catch (err) {
          console.error(`Failed to load baseline for ${category}:`, err);
          this.coloniesInitialLoadCount++;
          return null;
        }
      });
      
      const baselineResults = await Promise.all(baselinePromises);
      console.log('Phase 1 complete: all baselines loaded');
      
      // Phase 2: Discover all updates and prepare load list
      console.log('Phase 2: Discovering updates...');
      const updatePromises = [];
      
      for (const result of baselineResults) {
        if (!result) continue;
        const { category, categoryPath } = result;
        
        try {
          const updates = await this.discoverUpdatesForCategory(categoryPath, category);
          this.categoryUpdates[category] = updates;
          
          // Add all updates to load queue
          updates.forEach(update => {
            updatePromises.push({
              category,
              update,
              categoryPath
            });
          });
          
          // Collect unique dates
          updates.forEach(u => {
            if (!this.updateDates.includes(u.date)) {
              this.updateDates.push(u.date);
            }
          });
        } catch (err) {
          console.error(`Failed to discover updates for ${category}:`, err);
        }
      }
      
      console.log(`Phase 2 complete: discovered ${updatePromises.length} updates`);
      
      // Phase 3: Load all updates in parallel (with concurrency limit)
      console.log('Phase 3: Loading updates (parallel)...');
      const concurrencyLimit = 10; // Load max 10 files at once
      const updateLoaders = [];
      
      for (let i = 0; i < updatePromises.length; i += concurrencyLimit) {
        const batch = updatePromises.slice(i, i + concurrencyLimit);
        const batchPromises = batch.map(({ category, update }) => 
          this.loadUpdateMesh(category, update)
        );
        
        await Promise.all(batchPromises);
        console.log(`Loaded batch: ${Math.min(i + concurrencyLimit, updatePromises.length)}/${updatePromises.length}`);
      }
      
      console.log('Phase 3 complete: all updates loaded');
      
      // Sort dates and finalize
      this.updateDates.sort();
      this.setTimelinePosition(0);
      
      console.log('Colonies initialization complete');
      if (this.onReady) this.onReady();
    } catch (err) {
      console.error('ColoniesTimelapseManager init failed:', err);
    }
  }

  /**
   * Load a single update mesh (helper for parallel loading).
   */
  async loadUpdateMesh(category, update) {
    try {
      const updateGltf = await this.loader(update.url);
      const updateScene = updateGltf.scene;
      
      if (this.sprite) {
        applyPointMaterialSettings(updateScene, this.sprite);
      }
      
      // Set initial opacity to 0
      updateScene.traverse(obj => {
        if (obj.material) {
          obj.material.opacity = 0;
          obj.material.transparent = true;
        }
      });
      
      updateScene.visible = false;
      const masterGroup = this.categoryGroups[category];
      if (masterGroup) {
        masterGroup.add(updateScene);
        update.mesh = updateScene;
      }
    } catch (err) {
      console.warn(`Failed to load update ${update.url}:`, err);
    }
  }

  /**
   * Get formatted date string for display (e.g., '2026-01-15' from '2026_01_15').
   */
  formatDateForDisplay(dateStr) {
    if (!dateStr) return 'Baseline';
    const formatted = dateStr.replace(/_/g, '-');
    // Add 1286 years for Elite Dangerous in-game date (3312 era)
    const parts = formatted.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const inGameYear = year + 1286;
      return `${inGameYear}-${parts[1]}-${parts[2]}`;
    }
    return formatted;
  }

  /**
   * Get the current date formatted for UI display.
   */
  getCurrentDateForDisplay() {
    const date = this.getCurrentDate();
    return this.formatDateForDisplay(date);
  }
}

export default ColoniesTimelapseManager;
