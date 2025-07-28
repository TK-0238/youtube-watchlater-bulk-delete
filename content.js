// YouTube Watch Later Bulk Delete - Content Script
class WatchLaterBulkDelete {
  constructor() {
    this.isEnabled = false;
    this.selectedVideos = new Set();
    this.isDeleting = false;
    this.deleteProgress = 0;
    this.totalToDelete = 0;
    this.ui = null;
    this.debugMode = true; // Enable debug mode by default
    
    this.init();
  }
  
  init() {
    console.log('');
    console.log('🚀 ========================================');
    console.log('🚀 === INITIALIZING BULK DELETE EXTENSION ===');
    console.log('🚀 ========================================');
    console.log('');
    
    console.log('🔍 Extension state on init:');
    console.log(`  - URL: ${window.location.href}`);
    console.log(`  - Document ready state: ${document.readyState}`);
    console.log(`  - isEnabled: ${this.isEnabled}`);
    console.log(`  - selectedVideos.size: ${this.selectedVideos.size}`);
    
    this.waitForPageLoad().then(() => {
      console.log('✅ Page load completed, proceeding with initialization...');
      
      this.createUI();
      console.log('✅ UI creation completed');
      
      this.setupEventListeners();
      console.log('✅ Event listeners setup completed');
      
      this.restoreState();
      console.log('✅ State restoration completed');
      
      console.log('');
      console.log('🎉 ========================================');
      console.log('🎉 === BULK DELETE EXTENSION READY ===');
      console.log('🎉 ========================================');
      console.log('');
      
    }).catch(error => {
      console.error('❌ Initialization failed:', error);
    });
  }
  
  waitForPageLoad() {
    return new Promise((resolve) => {
      console.log('⏳ Waiting for YouTube page to load...');
      let attempts = 0;
      const maxAttempts = 20;
      
      const checkLoaded = () => {
        attempts++;
        console.log(`🔍 Check attempt ${attempts}/${maxAttempts}`);
        
        const playlistPage = document.querySelector('ytd-browse[page-subtype="playlist"]') ||
                           document.querySelector('ytd-playlist-header-renderer') ||
                           document.querySelector('[role="main"] ytd-playlist-video-list-renderer');
        
        if (playlistPage) {
          console.log('✅ YouTube page loaded successfully');
          resolve();
        } else if (attempts >= maxAttempts) {
          console.warn('⚠️ Page load timeout - proceeding anyway');
          resolve();
        } else {
          setTimeout(checkLoaded, 500);
        }
      };
      checkLoaded();
    });
  }
  
  createUI() {
    console.log('');
    console.log('🎨 ========================================');
    console.log('🎨 === CREATING BULK DELETE UI ===');
    console.log('🎨 ========================================');
    console.log('');
    
    // Remove existing UI if any
    const existingUI = document.getElementById('bulk-delete-ui');
    if (existingUI) {
      console.log('🧹 Removing existing UI');
      existingUI.remove();
    } else {
      console.log('ℹ️ No existing UI found');
    }
    
    // Create main UI container
    this.ui = document.createElement('div');
    this.ui.id = 'bulk-delete-ui';
    this.ui.className = 'bulk-delete-container';
    
    console.log('🔧 Creating UI HTML structure...');
    
    this.ui.innerHTML = `
      <div class="bulk-delete-header">
        <h3>🗑️ YouTube後で見る 一括削除</h3>
        <button id="toggle-bulk-delete" class="toggle-button" data-enabled="false" 
                onclick="window.bulkDeleteExtension?.toggleBulkDeleteMode?.(); console.log('🔄 Toggle onclick fired');">
          一括削除モードを有効化
        </button>
      </div>
      
      <div id="bulk-delete-controls" class="bulk-delete-controls" style="display: none;">
        <div class="control-buttons">
          <button id="select-all" class="control-btn" 
                  onclick="window.bulkDeleteExtension?.selectAllVideos?.(); console.log('✅ Select all onclick fired');">
            ✅ すべて選択
          </button>
          <button id="deselect-all" class="control-btn" 
                  onclick="window.bulkDeleteExtension?.deselectAllVideos?.(); console.log('❌ Deselect all onclick fired');">
            ❌ 選択解除
          </button>
          <button id="delete-selected" class="delete-btn" disabled
                  onclick="window.bulkDeleteExtension?.deleteSelectedVideos?.(); console.log('🗑️ Delete selected onclick fired');">
            動画を選択してください
          </button>
          <button id="delete-all" class="delete-btn delete-all-btn"
                  onclick="window.bulkDeleteExtension?.deleteAllVideos?.(); console.log('🗑️ Delete all onclick fired');">
            🗑️ すべて削除
          </button>
        </div>
        
        <div class="filter-section">
          <input 
            type="text" 
            id="title-filter" 
            class="filter-input" 
            placeholder="🔍 タイトルで絞り込み..."
            oninput="window.bulkDeleteExtension?.filterVideos?.(this.value); console.log('🔍 Filter oninput fired:', this.value);"
          >
        </div>
      </div>
      
      <div id="progress-section" class="progress-section" style="display: none;">
        <div class="progress-info">
          <span>🗑️ 削除中...</span>
          <span id="progress-text">0 / 0</span>
        </div>
        <div class="progress-bar">
          <div id="progress-fill" class="progress-fill" style="width: 0%"></div>
        </div>
        <button id="cancel-delete" class="cancel-btn"
                onclick="window.bulkDeleteExtension?.cancelDeletion?.(); console.log('⏹️ Cancel onclick fired');">
          ❌ キャンセル
        </button>
      </div>
    `;
    
    console.log('✅ UI HTML structure created');
    console.log(`🔍 UI element created: ${!!this.ui}`);
    console.log(`🔍 UI innerHTML length: ${this.ui.innerHTML.length}`);
    
    this.insertUI();
  }
  
  insertUI() {
    console.log('');
    console.log('📍 ========================================');
    console.log('📍 === INSERTING UI INTO DOM ===');
    console.log('📍 ========================================');
    console.log('');
    
    const insertionTargets = [
      'ytd-browse[page-subtype="playlist"] ytd-playlist-header-renderer',
      'ytd-browse[page-subtype="playlist"] #header',
      '[role="main"]',
      '#primary',
      'body'  // Fallback to body
    ];
    
    console.log('🔍 Trying insertion targets...');
    
    for (let i = 0; i < insertionTargets.length; i++) {
      const selector = insertionTargets[i];
      console.log(`🎯 Trying selector ${i + 1}/${insertionTargets.length}: ${selector}`);
      
      const target = document.querySelector(selector);
      if (target) {
        console.log(`✅ Target found: ${selector}`);
        console.log(`🔍 Target element:`, target);
        
        try {
          if (selector === 'body') {
            // For body, append as child
            target.appendChild(this.ui);
          } else {
            // For other elements, insert after
            target.parentNode.insertBefore(this.ui, target.nextSibling);
          }
          
          // Verify insertion
          const insertedUI = document.getElementById('bulk-delete-ui');
          if (insertedUI) {
            console.log('✅ UI successfully inserted into DOM');
            console.log(`🔍 UI parent:`, insertedUI.parentNode);
            
            // Verify buttons exist
            const toggleBtn = document.getElementById('toggle-bulk-delete');
            const selectAllBtn = document.getElementById('select-all');
            
            console.log(`🔍 Toggle button in DOM: ${!!toggleBtn}`);
            console.log(`🔍 Select all button in DOM: ${!!selectAllBtn}`);
            
            if (toggleBtn && selectAllBtn) {
              console.log('✅ All required buttons found in DOM');
            } else {
              console.error('❌ Some buttons missing from DOM');
            }
            
          } else {
            console.error('❌ UI insertion failed - element not found in DOM');
          }
          
          return;
          
        } catch (error) {
          console.error(`❌ Error inserting UI with selector ${selector}:`, error);
          continue;
        }
        
      } else {
        console.log(`❌ Target not found: ${selector}`);
      }
    }
    
    console.error('❌ Could not find any suitable insertion point for UI');
    console.log('🔍 Available body children:');
    const body = document.body;
    if (body) {
      for (let i = 0; i < body.children.length; i++) {
        const child = body.children[i];
        console.log(`  ${i + 1}. ${child.tagName} ${child.id ? '#' + child.id : ''} ${child.className ? '.' + child.className.split(' ').join('.') : ''}`);
      }
    }
  }
  
  setupEventListeners() {
    console.log('');
    console.log('🎧 ========================================');
    console.log('🎧 === SETTING UP EVENT LISTENERS (NEW METHOD) ===');
    console.log('🎧 ========================================');
    console.log('');
    
    // Remove any existing event listeners to prevent duplicates
    this.removeEventListeners();
    
    // Use event delegation on document body to catch all clicks
    this.mainEventListener = (e) => {
      console.log('👆 Document click detected:', e.target.id, e.target.className);
      
      // Handle toggle button
      if (e.target.id === 'toggle-bulk-delete') {
        console.log('🔄 === TOGGLE BUTTON CLICKED (DELEGATED) ===');
        e.preventDefault();
        e.stopPropagation();
        this.toggleBulkDeleteMode();
        return;
      }
      
      // Handle select all button
      if (e.target.id === 'select-all') {
        console.log('');
        console.log('✅ ========================================');
        console.log('✅ === SELECT ALL BUTTON CLICKED (DELEGATED) ===');
        console.log('✅ ========================================');
        console.log('');
        e.preventDefault();
        e.stopPropagation();
        this.selectAllVideos();
        return;
      }
      
      // Handle deselect all button
      if (e.target.id === 'deselect-all') {
        console.log('❌ === DESELECT ALL BUTTON CLICKED (DELEGATED) ===');
        e.preventDefault();
        e.stopPropagation();
        this.deselectAllVideos();
        return;
      }
      
      // Handle delete selected button
      if (e.target.id === 'delete-selected') {
        console.log('🗑️ === DELETE SELECTED BUTTON CLICKED (DELEGATED) ===');
        e.preventDefault();
        e.stopPropagation();
        this.deleteSelectedVideos();
        return;
      }
      
      // Handle delete all button
      if (e.target.id === 'delete-all') {
        console.log('🗑️ === DELETE ALL BUTTON CLICKED (DELEGATED) ===');
        e.preventDefault();
        e.stopPropagation();
        this.deleteAllVideos();
        return;
      }
      
      // Handle cancel button
      if (e.target.id === 'cancel-delete') {
        console.log('⏹️ === CANCEL BUTTON CLICKED (DELEGATED) ===');
        e.preventDefault();
        e.stopPropagation();
        this.cancelDeletion();
        return;
      }
    };
    
    // Add main click listener to document
    document.addEventListener('click', this.mainEventListener, true);
    console.log('✅ Main click event listener added to document');
    
    // Handle filter input separately (not a click event)
    this.filterEventListener = (e) => {
      if (e.target.id === 'title-filter') {
        console.log('🔍 Filter input changed:', e.target.value);
        this.filterVideos(e.target.value);
      }
    };
    
    document.addEventListener('input', this.filterEventListener, true);
    console.log('✅ Filter input event listener added to document');
    
    // Listen for messages from background script
    if (!this.messageListenerAdded) {
      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        this.handleMessage(request, sender, sendResponse);
      });
      this.messageListenerAdded = true;
      console.log('✅ Message listener added');
    }
    
    // Add direct button listeners as backup
    setTimeout(() => {
      this.addDirectListeners();
    }, 100);
    
    console.log('🎧 Event listeners setup completed (with delegation)');
  }
  
  addDirectListeners() {
    console.log('🔗 === ADDING DIRECT BUTTON LISTENERS AS BACKUP ===');
    
    const buttons = [
      { id: 'toggle-bulk-delete', handler: () => this.toggleBulkDeleteMode() },
      { id: 'select-all', handler: () => {
        console.log('✅ === SELECT ALL DIRECT LISTENER TRIGGERED ===');
        this.selectAllVideos();
      }},
      { id: 'deselect-all', handler: () => this.deselectAllVideos() },
      { id: 'delete-selected', handler: () => this.deleteSelectedVideos() },
      { id: 'delete-all', handler: () => this.deleteAllVideos() },
      { id: 'cancel-delete', handler: () => this.cancelDeletion() }
    ];
    
    buttons.forEach(({ id, handler }) => {
      const btn = document.getElementById(id);
      if (btn) {
        // Remove existing listeners
        btn.removeEventListener('click', handler);
        // Add new listener
        btn.addEventListener('click', (e) => {
          console.log(`🎯 Direct listener for ${id} triggered`);
          e.preventDefault();
          e.stopPropagation();
          handler();
        });
        console.log(`✅ Direct listener added for ${id}`);
      } else {
        console.warn(`⚠️ Button ${id} not found for direct listener`);
      }
    });
    
    // Filter input
    const filterInput = document.getElementById('title-filter');
    if (filterInput) {
      filterInput.addEventListener('input', (e) => {
        console.log('🔍 Direct filter input changed:', e.target.value);
        this.filterVideos(e.target.value);
      });
      console.log('✅ Direct listener added for title-filter');
    }
  }
  
  removeEventListeners() {
    if (this.mainEventListener) {
      document.removeEventListener('click', this.mainEventListener, true);
      console.log('🧹 Removed main click event listener');
    }
    
    if (this.filterEventListener) {
      document.removeEventListener('input', this.filterEventListener, true);
      console.log('🧹 Removed filter event listener');
    }
  }
  
  toggleBulkDeleteMode() {
    console.log('');
    console.log('🔄 ========================================');
    console.log('🔄 === TOGGLE BULK DELETE MODE CALLED ===');
    console.log('🔄 ========================================');
    console.log('');
    
    const previousState = this.isEnabled;
    this.isEnabled = !this.isEnabled;
    
    console.log(`🔄 Mode changed: ${previousState} → ${this.isEnabled}`);
    
    const toggleBtn = document.getElementById('toggle-bulk-delete');
    const controls = document.getElementById('bulk-delete-controls');
    
    console.log(`🔍 Toggle button exists: ${!!toggleBtn}`);
    console.log(`🔍 Controls exist: ${!!controls}`);
    
    if (this.isEnabled) {
      console.log('✅ Enabling bulk delete mode...');
      
      if (toggleBtn) {
        toggleBtn.textContent = '❌ 一括削除モードを無効化';
        toggleBtn.dataset.enabled = 'true';
        console.log('✅ Toggle button text updated');
      }
      
      if (controls) {
        controls.style.display = 'block';
        console.log('✅ Controls made visible');
      }
      
      console.log('🔧 Adding checkboxes to videos...');
      this.addCheckboxesToVideos();
      
      this.showNotification('✅ 一括削除モードが有効になりました');
      
    } else {
      console.log('❌ Disabling bulk delete mode...');
      
      if (toggleBtn) {
        toggleBtn.textContent = '✅ 一括削除モードを有効化';
        toggleBtn.dataset.enabled = 'false';
        console.log('❌ Toggle button text updated');
      }
      
      if (controls) {
        controls.style.display = 'none';
        console.log('❌ Controls hidden');
      }
      
      console.log('🧹 Removing checkboxes from videos...');
      this.removeCheckboxesFromVideos();
      
      this.selectedVideos.clear();
      console.log('🧹 Selected videos cleared');
      
      this.showNotification('❌ 一括削除モードが無効になりました');
    }
    
    this.updateSelectedCount();
    this.saveState();
    
    console.log('🔄 Toggle bulk delete mode completed');
    console.log(`🔍 Final state: isEnabled=${this.isEnabled}, selectedVideos.size=${this.selectedVideos.size}`);
  }
  
  addCheckboxesToVideos() {
    console.log('☑️ === ADDING CHECKBOXES TO VIDEOS ===');
    const videos = this.getVideoElements();
    console.log(`📺 Found ${videos.length} video elements`);
    
    if (videos.length === 0) {
      console.warn('⚠️ No video elements found to add checkboxes to');
      return;
    }
    
    let addedCount = 0;
    let skippedCount = 0;
    
    videos.forEach((video, index) => {
      // Check if checkbox already exists
      if (video.querySelector('.bulk-delete-checkbox')) {
        skippedCount++;
        console.log(`⏭️ Video ${index + 1} already has checkbox, skipping`);
        return;
      }
      
      // Get video ID
      const videoId = this.getVideoId(video);
      console.log(`📋 Adding checkbox to video ${index + 1}, ID: ${videoId}`);
      
      // Create checkbox element
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'bulk-delete-checkbox';
      checkbox.dataset.videoId = videoId;
      
      // Prevent click event from bubbling to video link
      checkbox.addEventListener('click', (e) => {
        e.stopPropagation();
        console.log(`👆 Checkbox clicked: ${videoId}`);
      });
      
      // Handle checkbox change
      checkbox.addEventListener('change', (e) => {
        e.stopPropagation();
        console.log(`☑️ Checkbox changed: ${e.target.checked} for video ${e.target.dataset.videoId}`);
        this.handleCheckboxChange(e.target);
      });
      
      // Find thumbnail container
      const thumbnail = video.querySelector('ytd-thumbnail');
      if (thumbnail) {
        // Create container for checkbox
        const checkboxContainer = document.createElement('div');
        checkboxContainer.className = 'checkbox-container';
        checkboxContainer.appendChild(checkbox);
        
        // Prevent container clicks from triggering video navigation
        checkboxContainer.addEventListener('click', (e) => {
          e.stopPropagation();
          console.log(`📦 Container clicked for video: ${videoId}`);
          if (e.target !== checkbox) {
            e.preventDefault();
            // Focus on checkbox for better accessibility
            checkbox.click();
          }
        });
        
        // Add to thumbnail
        thumbnail.appendChild(checkboxContainer);
        addedCount++;
        console.log(`✅ Successfully added checkbox to video ${index + 1}`);
        
      } else {
        console.warn(`⚠️ No thumbnail found for video ${index + 1}, cannot add checkbox`);
      }
    });
    
    console.log(`📊 Checkbox addition summary: ${addedCount} added, ${skippedCount} skipped`);
    
    // Verify checkboxes were added
    const totalCheckboxes = document.querySelectorAll('.bulk-delete-checkbox').length;
    console.log(`🔍 Total checkboxes in DOM after addition: ${totalCheckboxes}`);
    
    if (addedCount > 0) {
      this.showNotification(`✅ ${addedCount}個の動画にチェックボックスを追加しました`);
    }
  }
  
  removeCheckboxesFromVideos() {
    const checkboxes = document.querySelectorAll('.bulk-delete-checkbox');
    checkboxes.forEach(checkbox => {
      checkbox.parentElement.remove();
    });
  }
  
  getVideoElements() {
    const selectors = [
      'ytd-playlist-video-renderer',
      'ytd-playlist-panel-video-renderer'
    ];
    
    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        console.log(`✅ Found ${elements.length} videos with selector: ${selector}`);
        return Array.from(elements);
      }
    }
    
    console.log('❌ No video elements found');
    return [];
  }
  
  getVideoId(videoElement) {
    const link = videoElement.querySelector('#video-title, h3 a[href*="/watch"], a[href*="/watch"]');
    if (link && link.href) {
      const match = link.href.match(/[?&]v=([^&]+)/);
      if (match) {
        return match[1];
      }
    }
    
    const dataId = videoElement.getAttribute('data-video-id') || 
                  videoElement.getAttribute('data-ytid');
    if (dataId) {
      return dataId;
    }
    
    return `video-${Date.now()}-${Math.random()}`;
  }
  
  handleCheckboxChange(checkbox) {
    const videoId = checkbox.dataset.videoId;
    
    if (checkbox.checked) {
      this.selectedVideos.add(videoId);
      console.log(`✅ Added video ${videoId} to selection`);
      checkbox.parentElement.style.backgroundColor = 'rgba(204, 0, 0, 0.9)';
    } else {
      this.selectedVideos.delete(videoId);
      console.log(`❌ Removed video ${videoId} from selection`);
      checkbox.parentElement.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    }
    
    this.updateSelectedCount();
    this.saveState();
  }
  
  updateSelectedCount() {
    const count = this.selectedVideos.size;
    const countElement = document.getElementById('selected-count');
    const deleteButton = document.getElementById('delete-selected');
    
    console.log(`📊 Updating selected count to: ${count}`);
    
    if (countElement) {
      countElement.textContent = count;
    }
    
    if (deleteButton) {
      deleteButton.disabled = count === 0;
      
      if (count === 0) {
        deleteButton.textContent = '動画を選択してください';
      } else {
        deleteButton.textContent = `選択した${count}個の動画を削除`;
      }
    }
  }
  
  selectAllVideos() {
    console.log('');
    console.log('✅ ========================================');
    console.log('✅ === SELECT ALL VIDEOS (SIMPLIFIED) ===');
    console.log('✅ ========================================');
    console.log('');
    
    try {
      // Step 1: Ensure bulk delete mode is enabled
      if (!this.isEnabled) {
        console.log('🔄 Enabling bulk delete mode first...');
        this.toggleBulkDeleteMode();
        
        // Wait and retry
        setTimeout(() => {
          console.log('🔄 Retrying select all after enabling mode...');
          this.selectAllVideos();
        }, 500);
        return;
      }
      
      // Step 2: Get video elements
      const videos = this.getVideoElements();
      console.log(`📺 Found ${videos.length} video elements`);
      
      if (videos.length === 0) {
        this.showNotification('⚠️ 動画が見つかりません');
        return;
      }
      
      // Step 3: Ensure checkboxes exist
      let checkboxes = document.querySelectorAll('.bulk-delete-checkbox');
      console.log(`☑️ Found ${checkboxes.length} existing checkboxes`);
      
      if (checkboxes.length === 0) {
        console.log('🔧 No checkboxes found, adding them...');
        this.addCheckboxesToVideos();
        
        // Wait for checkboxes to be added
        setTimeout(() => {
          checkboxes = document.querySelectorAll('.bulk-delete-checkbox');
          console.log(`☑️ After adding: Found ${checkboxes.length} checkboxes`);
          this.performSelectAll(checkboxes);
        }, 200);
        return;
      }
      
      // Step 4: Select all immediately
      this.performSelectAll(checkboxes);
      
    } catch (error) {
      console.error('❌ Error in selectAllVideos:', error);
      this.showNotification('❌ 選択処理でエラーが発生しました');
    }
  }
  
  performSelectAll(checkboxes) {
    console.log('');
    console.log('⚡ === PERFORMING SELECT ALL ===');
    console.log('');
    
    if (!checkboxes || checkboxes.length === 0) {
      console.error('❌ No checkboxes provided to performSelectAll');
      this.showNotification('❌ チェックボックスが見つかりません');
      return;
    }
    
    let selectedCount = 0;
    let alreadySelected = 0;
    
    // Clear current selection
    this.selectedVideos.clear();
    
    // Process each checkbox
    Array.from(checkboxes).forEach((checkbox, index) => {
      try {
        const videoId = checkbox.dataset.videoId;
        console.log(`📋 Processing checkbox ${index + 1}: videoId=${videoId}`);
        
        if (!videoId) {
          console.warn(`⚠️ Checkbox ${index + 1} has no videoId`);
          return;
        }
        
        // Check if already selected
        if (checkbox.checked) {
          alreadySelected++;
          console.log(`ℹ️ Checkbox ${index + 1} already selected`);
        } else {
          selectedCount++;
          console.log(`✅ Selecting checkbox ${index + 1}`);
        }
        
        // Select checkbox
        checkbox.checked = true;
        
        // Add to selection set
        this.selectedVideos.add(videoId);
        
        // Update visual style
        const container = checkbox.parentElement;
        if (container && container.classList.contains('checkbox-container')) {
          container.style.backgroundColor = 'rgba(204, 0, 0, 0.9)';
          container.style.borderColor = 'rgba(255, 255, 255, 0.8)';
        }
        
        // Trigger change event
        const changeEvent = new Event('change', { bubbles: false });
        checkbox.dispatchEvent(changeEvent);
        
      } catch (error) {
        console.error(`❌ Error processing checkbox ${index + 1}:`, error);
      }
    });
    
    console.log('');
    console.log('📊 Selection Results:');
    console.log(`  - Newly selected: ${selectedCount}`);
    console.log(`  - Already selected: ${alreadySelected}`);
    console.log(`  - Total in selection set: ${this.selectedVideos.size}`);
    console.log(`  - Total checkboxes: ${checkboxes.length}`);
    console.log('');
    
    // Force UI update
    this.updateSelectedCount();
    this.saveState();
    
    // Show notification
    if (selectedCount > 0) {
      this.showNotification(`✅ ${selectedCount}個の動画を新たに選択しました（合計: ${this.selectedVideos.size}個）`);
    } else if (alreadySelected > 0) {
      this.showNotification(`ℹ️ すべての動画（${alreadySelected}個）はすでに選択されています`);
    } else {
      this.showNotification('⚠️ 選択できる動画が見つかりません');
    }
    
    // Debug verification
    const finalCheckboxes = document.querySelectorAll('.bulk-delete-checkbox:checked');
    console.log(`✅ Final verification: ${finalCheckboxes.length} checkboxes are now checked`);
  }
  
  
  deselectAllVideos() {
    console.log('❌ === DESELECT ALL VIDEOS FUNCTION CALLED ===');
    
    const checkboxes = document.querySelectorAll('.bulk-delete-checkbox');
    console.log(`🔍 Found ${checkboxes.length} checkboxes to deselect`);
    
    if (checkboxes.length === 0) {
      this.showNotification('⚠️ 選択解除する動画が見つかりません');
      return;
    }
    
    let deselectedCount = 0;
    let alreadyDeselected = 0;
    
    checkboxes.forEach((checkbox, index) => {
      console.log(`📋 Processing checkbox ${index + 1}: videoId=${checkbox.dataset.videoId}, checked=${checkbox.checked}`);
      
      if (checkbox.checked) {
        // Uncheck checkbox
        checkbox.checked = false;
        
        // Update visual style
        const container = checkbox.parentElement;
        if (container && container.classList.contains('checkbox-container')) {
          container.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
          container.style.borderColor = 'rgba(255, 255, 255, 0.3)';
        }
        
        deselectedCount++;
        
        // Trigger change event
        const changeEvent = new Event('change', { bubbles: false });
        checkbox.dispatchEvent(changeEvent);
        
      } else {
        alreadyDeselected++;
        console.log(`ℹ️ Checkbox ${index + 1} was already deselected`);
      }
    });
    
    console.log(`📊 Deselection summary: ${deselectedCount} deselected, ${alreadyDeselected} already deselected`);
    
    // Clear all selected videos
    this.selectedVideos.clear();
    console.log(`📊 Cleared selected videos set, size: ${this.selectedVideos.size}`);
    
    // Force update UI
    this.updateSelectedCount();
    this.saveState();
    
    // Show appropriate notification
    if (deselectedCount > 0) {
      this.showNotification(`❌ ${deselectedCount}個の動画の選択を解除しました`);
    } else {
      this.showNotification('ℹ️ すでにすべての動画の選択が解除されています');
    }
  }
  
  async deleteSelectedVideos() {
    if (this.selectedVideos.size === 0) {
      this.showNotification('⚠️ 削除する動画が選択されていません');
      return;
    }
    
    const selectedCount = this.selectedVideos.size;
    console.log(`🗑️ Starting deletion of ${selectedCount} selected videos`);
    
    const confirmed = await this.showConfirmDialog(
      `${selectedCount}個の動画を削除しますか？\\n\\nこの操作は元に戻せません。`
    );
    
    if (!confirmed) {
      console.log('❌ User cancelled deletion');
      this.showNotification('❌ 削除がキャンセルされました');
      return;
    }
    
    const allVideos = this.getVideoElements();
    const videosToDelete = allVideos.filter(video => {
      const videoId = this.getVideoId(video);
      return this.selectedVideos.has(videoId);
    });
    
    console.log(`📺 Found ${videosToDelete.length} videos to delete from ${allVideos.length} total videos`);
    
    if (videosToDelete.length === 0) {
      console.error('❌ No matching videos found for deletion');
      this.showNotification('❌ 削除する動画が見つかりません');
      return;
    }
    
    this.startDeletion(videosToDelete);
  }
  
  async deleteAllVideos() {
    console.log('🗑️ Starting deletion of all videos');
    const videos = this.getVideoElements();
    
    if (videos.length === 0) {
      this.showNotification('⚠️ 削除する動画が見つかりません');
      return;
    }
    
    console.log(`📺 Found ${videos.length} videos to delete`);
    
    const confirmed = await this.showConfirmDialog(
      `すべての動画（${videos.length}個）を「後で見る」から削除しますか？\\n\\n⚠️ この操作は元に戻せません！`
    );
    
    if (!confirmed) {
      console.log('❌ User cancelled deletion');
      this.showNotification('❌ 削除がキャンセルされました');
      return;
    }
    
    this.startDeletion(videos);
  }
  
  startDeletion(videos) {
    this.isDeleting = true;
    this.totalToDelete = videos.length;
    this.deleteProgress = 0;
    
    // Show progress UI
    document.getElementById('bulk-delete-controls').style.display = 'none';
    document.getElementById('progress-section').style.display = 'block';
    
    this.showNotification(`🗑️ ${videos.length}個の動画の削除を開始します...`);
    
    this.processDeletionQueue(videos);
  }
  
  async processDeletionQueue(videos) {
    console.log(`🗑️ Starting deletion of ${videos.length} videos`);
    
    for (let i = 0; i < videos.length && this.isDeleting; i++) {
      const video = videos[i];
      console.log(`🗑️ Deleting video ${i + 1}/${videos.length}`);
      
      const success = await this.deleteVideo(video);
      
      if (success) {
        this.deleteProgress++;
        console.log(`✅ Successfully deleted video ${i + 1}`);
      } else {
        console.log(`❌ Failed to delete video ${i + 1}`);
      }
      
      this.updateProgress();
      await this.delay(1500); // Wait between deletions
    }
    
    if (this.isDeleting) {
      this.completeDeletion();
    }
  }
  
  async deleteVideo(videoElement) {
    try {
      console.log('🗑️ === STARTING ROBUST DELETE PROCESS ===');
      console.log('📺 Video element:', videoElement);
      
      // Get video title for debugging
      const titleElement = videoElement.querySelector('#video-title, h3 a, a[href*="/watch"]');
      const videoTitle = titleElement ? titleElement.textContent.trim() : 'Unknown';
      console.log(`📺 Deleting video: "${videoTitle}"`);
      
      // Step 1: Find menu button with enhanced detection
      const menuButtonSelectors = [
        'button[aria-label*="その他"]',
        'button[aria-label*="More"]', 
        'button[aria-label*="アクション"]',
        'button[aria-label*="Action"]',
        'ytd-menu-renderer button',
        'yt-icon-button[aria-label*="その他"]',
        'yt-icon-button[aria-label*="More"]',
        '[role="button"][aria-label*="その他"]',
        '[role="button"][aria-label*="More"]'
      ];
      
      let menuButton = null;
      for (const selector of menuButtonSelectors) {
        menuButton = videoElement.querySelector(selector);
        if (menuButton) {
          console.log(`✅ Found menu button with selector: ${selector}`);
          break;
        }
      }
      
      if (!menuButton) {
        console.error('❌ Menu button not found with any selector');
        console.log('🔍 Available buttons in video element:');
        const allButtons = videoElement.querySelectorAll('button');
        allButtons.forEach((btn, i) => {
          console.log(`  ${i + 1}. ${btn.outerHTML.substring(0, 100)}...`);
        });
        return false;
      }
      
      // Step 2: Click menu button with enhanced reliability
      console.log('🖱️ Clicking menu button...');
      
      // Ensure element is visible and scrolled into view
      menuButton.scrollIntoView({ behavior: 'instant', block: 'center' });
      await this.delay(500);
      
      // Try multiple click methods
      try {
        menuButton.focus();
        await this.delay(100);
        menuButton.click();
        console.log('✅ Menu button clicked successfully');
      } catch (e) {
        console.log('⚠️ Standard click failed, trying dispatchEvent');
        menuButton.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      }
      
      // Wait for menu to appear with verification
      console.log('⏳ Waiting for menu to appear...');
      let menuAppeared = false;
      for (let i = 0; i < 20; i++) {
        const menuElements = document.querySelectorAll('ytd-menu-service-item-renderer, [role="menuitem"], tp-yt-paper-item');
        if (menuElements.length > 0) {
          console.log(`✅ Menu appeared with ${menuElements.length} items (after ${i * 100}ms)`);
          menuAppeared = true;
          break;
        }
        await this.delay(100);
      }
      
      if (!menuAppeared) {
        console.error('❌ Menu did not appear after clicking');
        return false;
      }
      
      // Step 3: Enhanced menu item detection and deletion
      let deleteClicked = false;
      
      for (let attempt = 0; attempt < 10; attempt++) {
        console.log(`🔍 Attempt ${attempt + 1} to find delete option...`);
        
        // Try multiple menu item selectors
        const menuItemSelectors = [
          'ytd-menu-service-item-renderer',
          '[role="menuitem"]',
          'tp-yt-paper-item',
          'ytd-menu-navigation-item-renderer',
          '.ytd-menu-service-item-renderer'
        ];
        
        let menuItems = [];
        for (const selector of menuItemSelectors) {
          const items = document.querySelectorAll(selector);
          if (items.length > 0) {
            menuItems = Array.from(items);
            console.log(`✅ Found ${items.length} menu items with selector: ${selector}`);
            break;
          }
        }
        
        if (menuItems.length === 0) {
          console.log('⚠️ No menu items found, waiting...');
          await this.delay(200);
          continue;
        }
        
        // Enhanced text pattern matching for delete options
        const deletePatterns = [
          '後で見るから削除',
          'remove from watch later',
          'リストから削除', 
          'remove from list',
          '削除',
          'remove',
          'delete',
          '「後で見る」から削除',
          'watch later から削除'
        ];
        
        for (const item of menuItems) {
          const fullText = item.textContent;
          const lowerText = fullText.toLowerCase();
          
          console.log(`📝 Menu item text: "${fullText}"`);
          
          // Check if any delete pattern matches
          const matchedPattern = deletePatterns.find(pattern => 
            lowerText.includes(pattern.toLowerCase())
          );
          
          if (matchedPattern) {
            console.log(`✅ Found delete option with pattern "${matchedPattern}": "${fullText}"`);
            
            // Enhanced clicking with multiple methods
            try {
              item.scrollIntoView({ behavior: 'instant', block: 'center' });
              await this.delay(200);
              
              // Try focusing first
              if (item.focus) item.focus();
              await this.delay(100);
              
              // Try standard click
              item.click();
              console.log('✅ Delete option clicked successfully');
              deleteClicked = true;
              break;
              
            } catch (clickError) {
              console.log('⚠️ Standard click failed, trying dispatchEvent');
              try {
                item.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
                deleteClicked = true;
                break;
              } catch (e) {
                console.error('❌ All click methods failed:', e);
              }
            }
          }
        }
        
        if (deleteClicked) break;
        await this.delay(300);
      }
      
      if (!deleteClicked) {
        console.error('❌ Could not find or click delete option');
        console.log('🔍 Available menu items were:');
        const allMenuItems = document.querySelectorAll('ytd-menu-service-item-renderer, [role="menuitem"], tp-yt-paper-item');
        allMenuItems.forEach((item, i) => {
          console.log(`  ${i + 1}. "${item.textContent}"`);
        });
        
        // Close menu
        document.body.click();
        await this.delay(300);
        return false;
      }
      
      // Step 4: Enhanced confirmation dialog handling
      console.log('⏳ Waiting for potential confirmation dialog...');
      await this.delay(800);
      
      let confirmationHandled = false;
      for (let i = 0; i < 20; i++) {
        // Look for confirmation buttons with enhanced selectors
        const confirmSelectors = [
          'button[aria-label*="削除"]',
          'button[aria-label*="Delete"]',
          'button[aria-label*="確認"]', 
          'button[aria-label*="Confirm"]',
          'button[aria-label*="OK"]',
          'button[aria-label*="はい"]',
          'button[aria-label*="Yes"]',
          '[role="button"][aria-label*="削除"]',
          'ytd-button-renderer button[aria-label*="削除"]',
          'tp-yt-paper-button[aria-label*="削除"]'
        ];
        
        let confirmBtn = null;
        for (const selector of confirmSelectors) {
          confirmBtn = document.querySelector(selector);
          if (confirmBtn) {
            console.log(`✅ Found confirmation button with selector: ${selector}`);
            break;
          }
        }
        
        if (confirmBtn) {
          console.log('🖱️ Clicking confirmation button...');
          try {
            confirmBtn.focus();
            await this.delay(100);
            confirmBtn.click();
            console.log('✅ Confirmation button clicked');
            confirmationHandled = true;
            break;
          } catch (e) {
            console.log('⚠️ Trying dispatchEvent for confirmation');
            confirmBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
            confirmationHandled = true;
            break;
          }
        }
        
        await this.delay(100);
      }
      
      if (!confirmationHandled) {
        console.log('ℹ️ No confirmation dialog found (this may be normal)');
      }
      
      // Final wait and verification
      await this.delay(1000);
      
      console.log('✅ === DELETE PROCESS COMPLETED ===');
      return true;
      
    } catch (error) {
      console.error('❌ === DELETE PROCESS FAILED ===');
      console.error('Error details:', error);
      console.error('Error stack:', error.stack);
      return false;
    }
  }
  
  updateProgress() {
    const percentage = (this.deleteProgress / this.totalToDelete) * 100;
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');
    
    if (progressFill) {
      progressFill.style.width = `${percentage}%`;
    }
    
    if (progressText) {
      progressText.textContent = `${this.deleteProgress} / ${this.totalToDelete}`;
    }
  }
  
  completeDeletion() {
    console.log('🏁 Completing deletion process...');
    this.isDeleting = false;
    
    // Hide progress UI
    const progressSection = document.getElementById('progress-section');
    const controlsSection = document.getElementById('bulk-delete-controls');
    
    if (progressSection) {
      progressSection.style.display = 'none';
    }
    
    if (controlsSection) {
      controlsSection.style.display = 'block';
    }
    
    // CRITICAL: Clear selected videos and reset UI
    console.log(`📊 Before reset - selected videos: ${this.selectedVideos.size}`);
    this.selectedVideos.clear();
    console.log(`📊 After reset - selected videos: ${this.selectedVideos.size}`);
    
    // Reset all checkboxes to unchecked
    const checkboxes = document.querySelectorAll('.bulk-delete-checkbox');
    console.log(`📊 Found ${checkboxes.length} checkboxes to reset`);
    
    checkboxes.forEach((checkbox, index) => {
      checkbox.checked = false;
      if (checkbox.parentElement) {
        checkbox.parentElement.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
      }
      console.log(`📊 Reset checkbox ${index + 1}`);
    });
    
    // Force update the selection count display
    this.updateSelectedCount();
    
    // Show completion message
    const completedCount = this.deleteProgress;
    if (completedCount > 0) {
      this.showNotification(`✅ ${completedCount}個の動画を削除しました！選択がリセットされました。`);
    } else {
      this.showNotification(`❌ 動画の削除に失敗しました`);
    }
    
    console.log(`✅ Deletion completed. Final selected count: ${this.selectedVideos.size}`);
    
    // Save state
    this.saveState();
  }
  
  cancelDeletion() {
    this.isDeleting = false;
    
    // Hide progress UI
    document.getElementById('progress-section').style.display = 'none';
    document.getElementById('bulk-delete-controls').style.display = 'block';
    
    // Show cancellation message
    this.showNotification(
      `❌ 削除が中止されました（${this.deleteProgress}個の動画を削除済み）`
    );
  }
  
  filterVideos(searchTerm) {
    console.log(`🔍 Filtering videos with term: "${searchTerm}"`);
    const videos = this.getVideoElements();
    const term = searchTerm.toLowerCase();
    
    videos.forEach((video, index) => {
      const titleElement = video.querySelector('#video-title, h3 a[href*="/watch"], a[href*="/watch"]');
      if (titleElement) {
        const titleText = titleElement.textContent.toLowerCase();
        const matches = titleText.includes(term);
        video.style.display = matches ? '' : 'none';
      }
    });
  }
  
  showConfirmDialog(message) {
    return new Promise((resolve) => {
      const confirmed = confirm(message);
      resolve(confirmed);
    });
  }
  
  showNotification(message, duration = 4000) {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.bulk-delete-notification');
    existingNotifications.forEach(notif => notif.remove());
    
    // Create a new notification
    const notification = document.createElement('div');
    notification.className = 'bulk-delete-notification';
    notification.innerHTML = message;
    
    // Add appropriate styling based on message type
    if (message.includes('✅')) {
      notification.style.borderLeft = '4px solid #4caf50';
      notification.style.backgroundColor = 'rgba(76, 175, 80, 0.1)';
    } else if (message.includes('❌')) {
      notification.style.borderLeft = '4px solid #f44336';
      notification.style.backgroundColor = 'rgba(244, 67, 54, 0.1)';
    } else if (message.includes('⚠️')) {
      notification.style.borderLeft = '4px solid #ff9800';
      notification.style.backgroundColor = 'rgba(255, 152, 0, 0.1)';
    }
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, duration);
  }
  
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  saveState() {
    try {
      chrome.storage.local.set({
        isEnabled: this.isEnabled,
        selectedVideos: Array.from(this.selectedVideos)
      });
    } catch (error) {
      console.error('Error saving state:', error);
    }
  }
  
  async restoreState() {
    try {
      const result = await chrome.storage.local.get(['isEnabled', 'selectedVideos']);
      
      if (result.isEnabled) {
        this.isEnabled = true;
        this.toggleBulkDeleteMode();
      }
      
      if (result.selectedVideos) {
        this.selectedVideos = new Set(result.selectedVideos);
        this.updateSelectedCount();
      }
    } catch (error) {
      console.error('Error restoring state:', error);
    }
  }
  
  handleMessage(request, sender, sendResponse) {
    console.log('📨 Content script received message:', request.type);
    
    switch (request.type) {
      case 'GET_STATUS':
        const videoElements = this.getVideoElements();
        const status = {
          isEnabled: this.isEnabled,
          selectedCount: this.selectedVideos.size,
          totalVideos: videoElements.length,
          isDeleting: this.isDeleting,
          pageLoaded: document.readyState === 'complete',
          uiExists: !!document.getElementById('bulk-delete-ui')
        };
        console.log('📊 Sending status:', status);
        sendResponse(status);
        break;
        
      case 'TOGGLE_MODE':
        console.log('🔄 Toggling bulk delete mode');
        this.toggleBulkDeleteMode();
        sendResponse({ success: true });
        break;
        
      case 'TEST_DELETE_SINGLE':
        console.log('🧪 Testing single video deletion');
        this.testSingleDeletion();
        sendResponse({ success: true });
        break;
        
      case 'SIMPLE_DELETE_TEST':
        console.log('🧪 Simple delete test');
        this.simpleDeleteTest();
        sendResponse({ success: true });
        break;
        
      case 'TEST_ACTUAL_DELETE':
        console.log('🗑️ Testing actual delete');
        this.testActualDelete();
        sendResponse({ success: true });
        break;
        
      case 'DEBUG_DELETE_PROCESS':
        console.log('🔎 Starting comprehensive debug process');
        this.debugDeleteProcess();
        sendResponse({ success: true });
        break;
        
      default:
        console.log('❓ Unknown message type:', request.type);
        sendResponse({ error: 'Unknown message type' });
    }
  }
  
  // Test functions
  async testSingleDeletion() {
    console.log('🧪 === SINGLE DELETION TEST ===');
    const videos = this.getVideoElements();
    
    if (videos.length === 0) {
      console.error('❌ No videos found');
      return;
    }
    
    const firstVideo = videos[0];
    console.log('📺 Testing deletion on first video');
    
    const success = await this.deleteVideo(firstVideo);
    console.log(`🧪 Test result: ${success ? '✅ SUCCESS' : '❌ FAILED'}`);
  }
  
  async simpleDeleteTest() {
    console.log('🧪 === CHECKING DELETE FUNCTION ===');
    
    const videos = this.getVideoElements();
    if (videos.length === 0) {
      this.showNotification('❌ テスト用の動画が見つかりません');
      return;
    }
    
    const testVideo = videos[0];
    console.log('📺 Testing menu on first video');
    
    const menuBtn = testVideo.querySelector('button[aria-label*="その他"], button[aria-label*="More"]');
    if (!menuBtn) {
      this.showNotification('❌ メニューボタンが見つかりません');
      return;
    }
    
    console.log('✅ Menu button found, clicking...');
    menuBtn.click();
    
    setTimeout(() => {
      const menuItems = document.querySelectorAll('ytd-menu-service-item-renderer');
      console.log(`Found ${menuItems.length} menu items`);
      
      let deleteFound = false;
      menuItems.forEach((item, index) => {
        const text = item.textContent.toLowerCase();
        console.log(`  ${index + 1}. "${text}"`);
        if (text.includes('削除') || text.includes('remove') || text.includes('後で見る')) {
          console.log(`    ✅ DELETE OPTION FOUND!`);
          deleteFound = true;
        }
      });
      
      if (deleteFound) {
        this.showNotification('✅ 削除機能が使用できます');
      } else {
        this.showNotification('❌ 削除オプションが見つかりません');
      }
      
      document.body.click(); // Close menu
    }, 1000);
  }
  
  async testActualDelete() {
    console.log('🗑️ === TESTING ACTUAL DELETE ===');
    
    const videos = this.getVideoElements();
    if (videos.length === 0) {
      this.showNotification('❌ テスト用の動画が見つかりません');
      return;
    }
    
    const testVideo = videos[0];
    console.log('📺 Testing delete on first video');
    
    const success = await this.deleteVideo(testVideo);
    
    if (success) {
      this.showNotification('✅ テスト削除成功！');
    } else {
      this.showNotification('❌ テスト削除失敗');
    }
  }
  
  async debugDeleteProcess() {
    console.log('🔎 === COMPREHENSIVE DELETE DEBUG ===');
    
    const videos = this.getVideoElements();
    if (videos.length === 0) {
      this.showNotification('❌ デバッグ用の動画が見つかりません');
      return;
    }
    
    const testVideo = videos[0];
    console.log('📺 Debugging first video element:');
    console.log(testVideo);
    
    // Debug 1: Check video title
    const titleElement = testVideo.querySelector('#video-title, h3 a, a[href*="/watch"]');
    const videoTitle = titleElement ? titleElement.textContent.trim() : 'Unknown';
    console.log(`📺 Video title: "${videoTitle}"`);
    
    // Debug 2: Check all buttons in video element
    console.log('🔍 All buttons in video element:');
    const allButtons = testVideo.querySelectorAll('button');
    allButtons.forEach((btn, i) => {
      const ariaLabel = btn.getAttribute('aria-label') || 'No aria-label';
      const text = btn.textContent.trim() || 'No text';
      console.log(`  ${i + 1}. aria-label: "${ariaLabel}", text: "${text}"`);
      console.log(`     HTML: ${btn.outerHTML.substring(0, 150)}...`);
    });
    
    // Debug 3: Try to find menu button with multiple selectors
    console.log('🔍 Testing menu button selectors:');
    const menuButtonSelectors = [
      'button[aria-label*="その他"]',
      'button[aria-label*="More"]', 
      'button[aria-label*="アクション"]',
      'button[aria-label*="Action"]',
      'ytd-menu-renderer button',
      'yt-icon-button[aria-label*="その他"]',
      'yt-icon-button[aria-label*="More"]'
    ];
    
    let foundMenuButton = null;
    menuButtonSelectors.forEach((selector, i) => {
      const btn = testVideo.querySelector(selector);
      if (btn) {
        console.log(`  ✅ Selector ${i + 1} FOUND: ${selector}`);
        console.log(`     Button: ${btn.outerHTML.substring(0, 150)}...`);
        if (!foundMenuButton) foundMenuButton = btn;
      } else {
        console.log(`  ❌ Selector ${i + 1} not found: ${selector}`);
      }
    });
    
    if (!foundMenuButton) {
      this.showNotification('❌ デバッグ: メニューボタンが見つかりません');
      return;
    }
    
    // Debug 4: Click menu button and analyze menu
    console.log('🖱️ Clicking menu button for debug analysis...');
    foundMenuButton.scrollIntoView({ behavior: 'instant', block: 'center' });
    await this.delay(300);
    foundMenuButton.click();
    
    // Wait and analyze menu items
    await this.delay(1500);
    
    console.log('🔍 Analyzing menu items:');
    const menuItemSelectors = [
      'ytd-menu-service-item-renderer',
      '[role="menuitem"]',
      'tp-yt-paper-item',
      'ytd-menu-navigation-item-renderer'
    ];
    
    let foundMenuItems = [];
    menuItemSelectors.forEach((selector, i) => {
      const items = document.querySelectorAll(selector);
      if (items.length > 0) {
        console.log(`  ✅ Menu selector ${i + 1} found ${items.length} items: ${selector}`);
        if (foundMenuItems.length === 0) {
          foundMenuItems = Array.from(items);
        }
      } else {
        console.log(`  ❌ Menu selector ${i + 1} found 0 items: ${selector}`);
      }
    });
    
    console.log(`📝 Analyzing ${foundMenuItems.length} menu items:`);
    foundMenuItems.forEach((item, i) => {
      const text = item.textContent.trim();
      const lowerText = text.toLowerCase();
      console.log(`  ${i + 1}. Text: "${text}"`);
      
      // Check if it matches delete patterns
      const deletePatterns = [
        '後で見るから削除',
        'remove from watch later',
        'リストから削除',
        'remove from list',
        '削除',
        'remove',
        'delete'
      ];
      
      const matchedPattern = deletePatterns.find(pattern => 
        lowerText.includes(pattern.toLowerCase())
      );
      
      if (matchedPattern) {
        console.log(`    ✅ MATCHES DELETE PATTERN: "${matchedPattern}"`);
      } else {
        console.log(`    ❌ No delete pattern match`);
      }
      
      console.log(`    HTML: ${item.outerHTML.substring(0, 100)}...`);
    });
    
    // Close menu
    document.body.click();
    await this.delay(300);
    
    this.showNotification('🔎 デバッグ情報をコンソールで確認してください');
    console.log('🔎 === DEBUG ANALYSIS COMPLETE ===');
  }
}

// Initialize the extension when the page loads
console.log('');
console.log('🌟 ========================================');
console.log('🌟 === YOUTUBE BULK DELETE CONTENT SCRIPT LOADED ===');
console.log('🌟 ========================================');
console.log('');

console.log('🔍 Page information:');
console.log(`  - URL: ${window.location.href}`);
console.log(`  - Document ready state: ${document.readyState}`);
console.log(`  - Is Watch Later page: ${window.location.href.includes('youtube.com/playlist?list=WL')}`);

if (document.readyState === 'loading') {
  console.log('⏳ Document still loading, waiting for DOMContentLoaded...');
  document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ DOMContentLoaded fired, initializing extension...');
    window.bulkDeleteExtension = new WatchLaterBulkDelete();
  });
} else {
  console.log('✅ Document already loaded, initializing extension immediately...');
  window.bulkDeleteExtension = new WatchLaterBulkDelete();
}

// Also initialize on navigation changes (for SPA behavior)
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    console.log('🔄 URL changed, checking if re-initialization needed...');
    console.log(`  - New URL: ${url}`);
    
    if (url.includes('youtube.com/playlist?list=WL')) {
      console.log('✅ Navigated to Watch Later page, re-initializing...');
      
      // Small delay to let YouTube update the DOM
      setTimeout(() => {
        if (window.bulkDeleteExtension) {
          console.log('🔄 Re-creating UI for new page...');
          window.bulkDeleteExtension.createUI();
          window.bulkDeleteExtension.setupEventListeners();
        }
      }, 1000);
    }
  }
}).observe(document, { subtree: true, childList: true });

// Global debug functions for manual testing
window.debugBulkDelete = {
  testSelectAll: () => {
    console.log('🧪 === MANUAL SELECT ALL TEST ===');
    if (window.bulkDeleteExtension) {
      window.bulkDeleteExtension.selectAllVideos();
    } else {
      console.error('❌ Extension not initialized');
    }
  },
  
  testToggleMode: () => {
    console.log('🧪 === MANUAL TOGGLE MODE TEST ===');
    if (window.bulkDeleteExtension) {
      window.bulkDeleteExtension.toggleBulkDeleteMode();
    } else {
      console.error('❌ Extension not initialized');
    }
  },
  
  checkState: () => {
    console.log('🧪 === EXTENSION STATE CHECK ===');
    if (window.bulkDeleteExtension) {
      const ext = window.bulkDeleteExtension;
      console.log(`  - isEnabled: ${ext.isEnabled}`);
      console.log(`  - selectedVideos.size: ${ext.selectedVideos.size}`);
      console.log(`  - UI exists: ${!!document.getElementById('bulk-delete-ui')}`);
      console.log(`  - Toggle button exists: ${!!document.getElementById('toggle-bulk-delete')}`);
      console.log(`  - Select all button exists: ${!!document.getElementById('select-all')}`);
      console.log(`  - Checkboxes count: ${document.querySelectorAll('.bulk-delete-checkbox').length}`);
      console.log(`  - Video elements count: ${ext.getVideoElements().length}`);
    } else {
      console.error('❌ Extension not initialized');
    }
  },
  
  forceSelectAll: () => {
    console.log('🧪 === FORCE SELECT ALL (BYPASS CHECKS) ===');
    const checkboxes = document.querySelectorAll('.bulk-delete-checkbox');
    console.log(`Found ${checkboxes.length} checkboxes`);
    
    if (checkboxes.length === 0) {
      console.log('⚠️ No checkboxes found, trying to add them...');
      if (window.bulkDeleteExtension) {
        window.bulkDeleteExtension.addCheckboxesToVideos();
        setTimeout(() => {
          const newCheckboxes = document.querySelectorAll('.bulk-delete-checkbox');
          console.log(`Found ${newCheckboxes.length} checkboxes after adding`);
          newCheckboxes.forEach((cb, i) => {
            cb.checked = true;
            console.log(`✅ Checkbox ${i + 1} checked`);
          });
        }, 200);
      }
    } else {
      checkboxes.forEach((cb, i) => {
        cb.checked = true;
        console.log(`✅ Checkbox ${i + 1} checked`);
      });
    }
  },
  
  performSelectAll: () => {
    console.log('🧪 === PERFORM SELECT ALL (USE EXTENSION METHOD) ===');
    if (window.bulkDeleteExtension) {
      const checkboxes = document.querySelectorAll('.bulk-delete-checkbox');
      if (checkboxes.length > 0) {
        window.bulkDeleteExtension.performSelectAll(checkboxes);
      } else {
        console.log('⚠️ No checkboxes found, calling selectAllVideos instead');
        window.bulkDeleteExtension.selectAllVideos();
      }
    } else {
      console.error('❌ Extension not initialized');
    }
  },
  
  clickSelectAllButton: () => {
    console.log('🧪 === MANUALLY CLICKING SELECT ALL BUTTON ===');
    const selectAllBtn = document.getElementById('select-all');
    if (selectAllBtn) {
      console.log('✅ Select all button found, clicking it...');
      selectAllBtn.click();
    } else {
      console.error('❌ Select all button not found');
    }
  },
  
  testButtonExists: () => {
    console.log('🧪 === TESTING BUTTON EXISTENCE ===');
    const ui = document.getElementById('bulk-delete-ui');
    const controls = document.getElementById('bulk-delete-controls');
    const selectAllBtn = document.getElementById('select-all');
    
    console.log(`UI exists: ${!!ui}`);
    console.log(`Controls exist: ${!!controls}`);
    console.log(`Select all button exists: ${!!selectAllBtn}`);
    
    if (selectAllBtn) {
      console.log(`Select all button visible: ${selectAllBtn.offsetParent !== null}`);
      console.log(`Select all button onclick: ${selectAllBtn.onclick ? 'exists' : 'missing'}`);
      console.log(`Select all button innerHTML: ${selectAllBtn.innerHTML}`);
    }
  }
};

console.log('');
console.log('🔧 Debug functions available:');
console.log('  - debugBulkDelete.testSelectAll() - Test select all function');
console.log('  - debugBulkDelete.testToggleMode() - Test toggle mode');
console.log('  - debugBulkDelete.checkState() - Check extension state');
console.log('  - debugBulkDelete.forceSelectAll() - Force check all boxes');
console.log('  - debugBulkDelete.performSelectAll() - Use extension method');
console.log('  - debugBulkDelete.clickSelectAllButton() - Manually click button');
console.log('  - debugBulkDelete.testButtonExists() - Test button existence');
console.log('');