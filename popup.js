// YouTube Watch Later Bulk Delete - Popup Script
class PopupController {
  constructor() {
    this.currentTab = null;
    this.isWatchLaterPage = false;
    this.status = null;
    this.statistics = null;
    
    this.init();
  }
  
  async init() {
    try {
      console.log('🚀 Popup initialization started');
      
      // Show loading state
      this.showSection('loading-section');
      
      // Initialize i18n
      this.initializeI18n();
      console.log('✅ i18n initialized');
      
      // Get current tab
      await this.getCurrentTab();
      console.log('✅ Current tab:', this.currentTab?.url);
      
      // Check if we're on Watch Later page
      this.checkWatchLaterPage();
      console.log('✅ Watch Later page check:', this.isWatchLaterPage);
      
      // Get extension status and statistics
      await this.loadData();
      console.log('✅ Data loaded');
      
      // Set up event listeners
      this.setupEventListeners();
      console.log('✅ Event listeners set up');
      
      // Show main content
      this.showSection('main-content');
      
      // Update UI
      this.updateUI();
      console.log('✅ Popup initialization completed');
      
    } catch (error) {
      console.error('❌ Error initializing popup:', error);
      this.showError(error.message);
    }
  }
  
  initializeI18n() {
    // Replace i18n placeholders with actual messages
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(element => {
      const key = element.getAttribute('data-i18n');
      const message = chrome.i18n.getMessage(key);
      if (message) {
        element.textContent = message;
      }
    });
  }
  
  async getCurrentTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    this.currentTab = tab;
  }
  
  checkWatchLaterPage() {
    this.isWatchLaterPage = this.currentTab?.url?.includes('youtube.com/playlist?list=WL') || false;
  }
  
  async loadData() {
    try {
      console.log('📊 Loading statistics...');
      // Get statistics from background script with timeout
      this.statistics = await this.sendMessageWithTimeout(
        { type: 'GET_STATISTICS' }, 
        3000
      );
      console.log('✅ Statistics loaded:', this.statistics);
      
      if (this.isWatchLaterPage) {
        console.log('📺 Loading YouTube page status...');
        // Get status from content script with timeout
        this.status = await this.sendMessageToTabWithTimeout(
          { type: 'GET_STATUS' }, 
          5000
        );
        console.log('✅ YouTube status loaded:', this.status);
      }
    } catch (error) {
      console.error('❌ Error loading data:', error);
      // Create default data to prevent UI issues
      this.statistics = {
        totalDeleted: 0,
        daysSinceInstall: 0,
        lastUsed: null
      };
      
      if (this.isWatchLaterPage) {
        this.status = {
          isEnabled: false,
          selectedCount: 0,
          totalVideos: 0,
          isDeleting: false
        };
      }
    }
  }
  
  setupEventListeners() {
    // Open Watch Later page button
    document.getElementById('open-watch-later').addEventListener('click', () => {
      chrome.tabs.create({ url: 'https://www.youtube.com/playlist?list=WL' });
      window.close();
    });
    
    // Toggle bulk delete mode
    document.getElementById('toggle-mode').addEventListener('click', async () => {
      try {
        await this.sendMessageToTab({ type: 'TOGGLE_MODE' });
        // Reload data and update UI
        await this.loadData();
        this.updateUI();
      } catch (error) {
        console.error('Error toggling mode:', error);
      }
    });
    
    // Delete selected videos
    document.getElementById('delete-selected').addEventListener('click', async () => {
      if (this.status?.selectedCount > 0) {
        window.close(); // Close popup to avoid interference
      }
    });
    
    // Delete all videos
    document.getElementById('delete-all').addEventListener('click', async () => {
      window.close(); // Close popup to avoid interference
    });
    
    // Retry button
    document.getElementById('retry-btn').addEventListener('click', () => {
      this.init();
    });
    
    // Help and feedback links
    document.getElementById('help-link').addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.create({ 
        url: 'https://github.com/TK-0238/youtube-watchlater-bulk-delete/wiki'
      });
    });
    
    document.getElementById('feedback-link').addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.create({ 
        url: 'https://github.com/TK-0238/youtube-watchlater-bulk-delete/issues'
      });
    });
    
    // Debug buttons
    document.getElementById('debug-analyze').addEventListener('click', async () => {
      try {
        await this.sendMessageToTab({ type: 'DEBUG_DELETE_PROCESS' });
        alert('🔎 デバッグ情報をコンソールで確認してください。\n(F12 → Console)');
      } catch (error) {
        console.error('Debug analyze error:', error);
        alert('❌ デバッグに失敗しました: ' + error.message);
      }
    });
    
    document.getElementById('debug-test-delete').addEventListener('click', async () => {
      try {
        await this.sendMessageToTab({ type: 'TEST_ACTUAL_DELETE' });
        alert('🧪 テスト削除を実行しました。\n結果をコンソールで確認してください。');
      } catch (error) {
        console.error('Debug test delete error:', error);
        alert('❌ テスト削除に失敗しました: ' + error.message);
      }
    });
    
    document.getElementById('debug-simple-test').addEventListener('click', async () => {
      try {
        await this.sendMessageToTab({ type: 'SIMPLE_DELETE_TEST' });
        alert('⚙️ シンプルテストを実行しました。\n結果をコンソールで確認してください。');
      } catch (error) {
        console.error('Debug simple test error:', error);
        alert('❌ シンプルテストに失敗しました: ' + error.message);
      }
    });
  }
  
  updateUI() {
    if (this.isWatchLaterPage && this.status) {
      this.updateWatchLaterPageUI();
    } else {
      this.updateGeneralPageUI();
    }
    
    this.updateStatistics();
  }
  
  updateWatchLaterPageUI() {
    const { isEnabled, selectedCount, totalVideos, isDeleting } = this.status;
    
    // Show toggle button
    document.getElementById('toggle-mode').style.display = 'block';
    
    // Update status
    const statusIndicator = document.getElementById('status-indicator');
    const statusText = document.getElementById('status-text');
    const toggleText = document.getElementById('toggle-text');
    
    if (isEnabled) {
      statusIndicator.className = 'status-indicator enabled';
      statusText.textContent = chrome.i18n.getMessage('enabled');
      toggleText.textContent = chrome.i18n.getMessage('disable');
      
      // Show selected count
      document.getElementById('selected-status').style.display = 'block';
      document.getElementById('selected-count').textContent = selectedCount || 0;
      
      // Show delete buttons
      document.getElementById('delete-buttons').style.display = 'block';
      
      // Show debug section
      document.getElementById('debug-section').style.display = 'block';
      
      // Update delete selected button
      const deleteSelectedBtn = document.getElementById('delete-selected');
      const selectedCountBtn = document.getElementById('selected-count-btn');
      selectedCountBtn.textContent = selectedCount || 0;
      deleteSelectedBtn.disabled = !selectedCount || selectedCount === 0;
      
    } else {
      statusIndicator.className = 'status-indicator disabled';
      statusText.textContent = chrome.i18n.getMessage('disabled');
      toggleText.textContent = chrome.i18n.getMessage('enable');
      
      // Hide selected count, delete buttons, and debug section
      document.getElementById('selected-status').style.display = 'none';
      document.getElementById('delete-buttons').style.display = 'none';
      document.getElementById('debug-section').style.display = 'none';
    }
    
    // Update video count
    document.getElementById('video-count').textContent = totalVideos || 0;
    
    // Show progress if deleting
    if (isDeleting) {
      document.getElementById('progress-card').style.display = 'block';
      // Progress updates would come from content script
    } else {
      document.getElementById('progress-card').style.display = 'none';
    }
  }
  
  updateGeneralPageUI() {
    // Show "Open Watch Later" button
    document.getElementById('open-watch-later').style.display = 'block';
    
    // Update status to show we're not on the right page
    const statusIndicator = document.getElementById('status-indicator');
    const statusText = document.getElementById('status-text');
    
    statusIndicator.className = 'status-indicator disabled';
    statusText.textContent = '待機中';
    
    // Hide other controls
    document.getElementById('selected-status').style.display = 'none';
    document.getElementById('toggle-mode').style.display = 'none';
    document.getElementById('delete-buttons').style.display = 'none';
    document.getElementById('debug-section').style.display = 'none';
    document.getElementById('video-count').textContent = '-';
  }
  
  updateStatistics() {
    if (this.statistics) {
      const { totalDeleted, daysSinceInstall, lastUsed } = this.statistics;
      
      document.getElementById('total-deleted').textContent = totalDeleted || 0;
      document.getElementById('days-used').textContent = daysSinceInstall || 0;
      
      const lastUsedText = lastUsed ? 
        new Date(lastUsed).toLocaleDateString('ja-JP') : 
        '未使用';
      document.getElementById('last-used').textContent = lastUsedText;
    }
  }
  
  showSection(sectionId) {
    // Hide all sections
    const sections = ['loading-section', 'main-content', 'error-section'];
    sections.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        element.style.display = 'none';
      }
    });
    
    // Show requested section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
      targetSection.style.display = 'block';
    }
  }
  
  showError(message = null) {
    this.showSection('error-section');
    if (message) {
      const errorElement = document.querySelector('.error-message');
      if (errorElement) {
        errorElement.textContent = `エラー: ${message}`;
      }
    }
  }
  
  async sendMessage(message) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (response && response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });
    });
  }
  
  async sendMessageWithTimeout(message, timeoutMs = 5000) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Message timeout after ${timeoutMs}ms`));
      }, timeoutMs);
      
      chrome.runtime.sendMessage(message, (response) => {
        clearTimeout(timeout);
        
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (response && response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });
    });
  }

  async sendMessageToTab(message) {
    if (!this.currentTab) {
      throw new Error('No active tab');
    }
    
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(this.currentTab.id, message, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (response && response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });
    });
  }

  async sendMessageToTabWithTimeout(message, timeoutMs = 10000) {
    if (!this.currentTab) {
      throw new Error('No active tab');
    }
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Tab message timeout after ${timeoutMs}ms - Content script may not be loaded`));
      }, timeoutMs);
      
      chrome.tabs.sendMessage(this.currentTab.id, message, (response) => {
        clearTimeout(timeout);
        
        if (chrome.runtime.lastError) {
          reject(new Error(`Content script error: ${chrome.runtime.lastError.message}`));
        } else if (response && response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });
    });
  }
}

// Simple i18n helper for elements that need dynamic updates
function updateI18nText(elementId, messageKey, substitutions = []) {
  const element = document.getElementById(elementId);
  if (element) {
    const message = chrome.i18n.getMessage(messageKey, substitutions);
    if (message) {
      element.textContent = message;
    }
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new PopupController();
});

// Handle popup visibility changes
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    // Popup became visible, refresh data
    if (window.popupController) {
      window.popupController.loadData().then(() => {
        window.popupController.updateUI();
      });
    }
  }
});

// Handle messages from background script (for real-time updates)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'STATUS_UPDATE' && window.popupController) {
    window.popupController.status = request.status;
    window.popupController.updateUI();
  }
  
  if (request.type === 'PROGRESS_UPDATE' && window.popupController) {
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');
    
    if (progressFill && progressText) {
      const percentage = (request.current / request.total) * 100;
      progressFill.style.width = `${percentage}%`;
      progressText.textContent = `${request.current} / ${request.total}`;
    }
  }
  
  sendResponse({ received: true });
});