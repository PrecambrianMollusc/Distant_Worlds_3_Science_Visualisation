/**
 * Generic Timelapse Manager
 * 
 * A reusable module for managing timelapse-based visualizations where:
 * - A baseline file represents the starting state
 * - Weekly (or periodic) update files represent incremental changes
 * - A slider controls which updates are visible
 * 
 * This module is designed to be configured and instantiated for different
 * timelapse datasets (e.g., colonies, stars, earth-like worlds).
 * 
 * Usage:
 *   const timelapse = new TimelapseManager({
 *     scene: app.scene,
 *     basePath: './glbdata/',
 *     categories: ['Alliance', 'Empire', 'Federation'],
 *     baselinePattern: 'baseline_{category}_systems_pointcloud.glb',
 *     updatePattern: 'week_{date}_new_systems_pointcloud.glb',
 *     loader: loadGLTF,
 *     onReady: callback
 *   });
 */

import * as THREE from './three.module.js';

export class TimelapseManager {
  constructor(config) {
    this.scene = config.scene;
    this.basePath = config.basePath;
    this.categories = config.categories;
    this.baselinePattern = config.baselinePattern;
    this.updatePattern = config.updatePattern;
    this.loader = config.loader; // loadGLTF function
    this.onReady = config.onReady; // callback when loading complete
    
    // State tracking
    this.categoryGroups = {}; // categoryName -> master group with baseline + updates as children
    this.categoryState = {}; // categoryName -> { visible, opacity, timelinePosition }
    this.updateDates = []; // sorted array of unique update dates across all categories
    this.categoryUpdates = {}; // categoryName -> [{ date, url, mesh }]
    
    this.masterOpacity = 0.15;
    this.timelinePosition = 0; // 0 = baseline only, 1+ = baseline + updates 1..N
  }

  /**
   * Scan a directory for update files matching the update pattern.
   * Returns array of { date: 'YYYY_MM_DD', url: '' } sorted by date.
   */
  async discoverUpdates(categoryName) {
    // This is a placeholder: in a real implementation, we'd need a server endpoint
    // or manifest file that provides the list of update files.
    // For now, we'll return an empty array and expect the caller to provide manifests.
    return [];
  }

  /**
   * Initialize: load all baselines + updates for configured categories.
   * Discovers update files and creates the mesh hierarchy.
   */
  async init() {
    try {
      // First, discover all update dates across all categories
      const dateSet = new Set();
      
      for (const category of this.categories) {
        this.categoryState[category] = {
          visible: true,
          opacity: this.masterOpacity,
          timelinePosition: this.timelinePosition
        };
        
        const categoryPath = `${this.basePath}${category}/`;
        
        // Load baseline
        const baselineUrl = categoryPath + this.baselinePattern.replace('{category}', category);
        console.log(`Loading baseline: ${baselineUrl}`);
        const baselineGltf = await this.loader(baselineUrl);
        
        // Create master group for this category
        const masterGroup = new THREE.Group();
        masterGroup.name = `timelapse_${category}`;
        masterGroup.userData.category = category;
        masterGroup.userData.baseline = baselineGltf.scene;
        masterGroup.add(baselineGltf.scene);
        
        this.scene.add(masterGroup);
        this.categoryGroups[category] = masterGroup;
        
        // Discover and load updates for this category
        const updates = await this.discoverUpdatesForCategory(categoryPath, category);
        this.categoryUpdates[category] = updates;
        
        // Collect all unique dates
        updates.forEach(u => dateSet.add(u.date));
      }
      
      // Sort all unique dates
      this.updateDates = Array.from(dateSet).sort();
      
      // Initialize all category states with baseline only (timeline position 0)
      this.setTimelinePosition(0);
      
      // Call the ready callback
      if (this.onReady) this.onReady();
    } catch (err) {
      console.error('TimelapseManager init failed:', err);
    }
  }

  /**
   * Discover updates for a specific category by checking for files.
   * This attempts to load update files and collects those that exist.
   */
  async discoverUpdatesForCategory(categoryPath, category) {
    const updates = [];
    
    // Common date range: scan from a known start date
    // For now, we'll attempt to load files with common date patterns
    // In production, this would be replaced with a manifest or directory listing API
    
    // Placeholder: return empty array for now
    // The real implementation will need a backend service or manifest file
    return updates;
  }

  /**
   * Set timeline position (0 = baseline only, N = baseline + updates 1..N).
   * All visible categories will show the same updates.
   */
  setTimelinePosition(position) {
    this.timelinePosition = Math.max(0, Math.min(position, Math.max(0, this.updateDates.length)));
    
    Object.entries(this.categoryGroups).forEach(([category, group]) => {
      if (!this.categoryState[category].visible) return;
      
      const updates = this.categoryUpdates[category] || [];
      
      // Show baseline (always visible)
      if (group.userData.baseline) {
        group.userData.baseline.visible = true;
      }
      
      // Show/hide updates based on timeline position and apply opacity
      updates.forEach((update, idx) => {
        if (update.mesh) {
          const shouldBeVisible = (idx < this.timelinePosition);
          update.mesh.visible = shouldBeVisible;
          
          // Apply master opacity to update meshes
          update.mesh.traverse(obj => {
            if (obj.material) {
              try {
                obj.material.opacity = shouldBeVisible ? this.masterOpacity : 0;
                obj.material.transparent = true;
              } catch (e) {
                // Ignore material update errors
              }
            }
          });
        }
      });
    });
  }

  /**
   * Get the date of the current timeline position (for UI display).
   * Returns a date string like 'YYYY_MM_DD' or '' if at baseline only.
   */
  getCurrentDate() {
    if (this.timelinePosition === 0) return '';
    const idx = Math.min(this.timelinePosition - 1, this.updateDates.length - 1);
    return this.updateDates[idx] || '';
  }

  /**
   * Set visibility for a category (allegiance).
   */
  setCategoryVisible(category, visible) {
    if (!this.categoryState[category]) return;
    this.categoryState[category].visible = visible;
    
    const group = this.categoryGroups[category];
    if (group) {
      group.visible = visible;
      // Also reapply the current timeline position to ensure consistency
      this.setTimelinePosition(this.timelinePosition);
    }
  }

  /**
   * Check if a category is visible.
   */
  isCategoryVisible(category) {
    return this.categoryState[category]?.visible ?? false;
  }

  /**
   * Set opacity for all visible categories.
   */
  setMasterOpacity(opacity) {
    this.masterOpacity = opacity;
    
    Object.entries(this.categoryGroups).forEach(([category, group]) => {
      if (!this.categoryState[category].visible) return;
      
      group.traverse(obj => {
        if (obj.material) {
          try {
            obj.material.opacity = opacity;
            obj.material.transparent = opacity < 1.0;
          } catch (e) {
            console.warn('Failed to set opacity on material:', e);
          }
        }
      });
    });
  }

  /**
   * Get sorted list of all discovered update dates.
   */
  getUpdateDates() {
    return this.updateDates;
  }

  /**
   * Get number of timeline ticks (baseline + updates).
   */
  getTimelineLength() {
    return this.updateDates.length + 1; // +1 for baseline
  }

  /**
   * Get all category names.
   */
  getCategories() {
    return this.categories;
  }
}

export default TimelapseManager;
