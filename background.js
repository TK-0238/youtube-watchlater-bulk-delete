// YouTube Watch Later Bulk Delete - Background Script (Service Worker)
class BackgroundService {
  constructor() {
    this.state = {
      totalDeleted: 0,
      lastDeletedCount: 0,
      activeTabId: null
    };
    
    this.init();
  }
  
  init() {
    // Handle extension installation/update
    chrome.runtime.onInstalled.addListener((details) => {
      this.handleInstallation(details);
    });
    
    // Handle tab updates
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      this.handleTabUpdate(tabId, changeInfo, tab);
    });
    
    // Handle messages from content scripts
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true; // Keep the message channel open for async response
    });
    
    // Handle action (toolbar button) clicks
    chrome.action.onClicked.addListener((tab) => {
      this.handleActionClick(tab);
    });
    
    // Initialize storage with default settings
    this.initializeStorage();
  }
  
  async handleInstallation(details) {
    if (details.reason === 'install') {
      // First time installation
      console.log('YouTube Watch Later Bulk Delete installed');
      
      // Set up default settings
      await this.setDefaultSettings();
      
      // Set badge color
      chrome.action.setBadgeBackgroundColor({ color: '#cc0000' });
      
      // Open welcome tab (optional)
      // chrome.tabs.create({ url: 'https://github.com/yourusername/youtube-watch-later-bulk-delete' });
    } else if (details.reason === 'update') {
      console.log('Extension updated to version', chrome.runtime.getManifest().version);
    }
  }
  
  async setDefaultSettings() {
    const defaultSettings = {
      isEnabled: false,
      confirmBeforeDelete: true,
      batchSize: 5,
      delayBetweenBatches: 200,
      showNotifications: true,
      statistics: {
        totalDeleted: 0,
        installDate: Date.now(),
        lastUsed: null
      }
    };
    
    await chrome.storage.local.set(defaultSettings);
  }
  
  handleTabUpdate(tabId, changeInfo, tab) {
    // Check if the updated tab is YouTube Watch Later playlist
    if (changeInfo.status === 'complete' && 
        tab.url && 
        tab.url.includes('youtube.com/playlist?list=WL')) {
      
      this.activeTabId = tabId;
      this.updateBadge(tabId);
    }
  }
  
  async handleMessage(request, sender, sendResponse) {
    try {
      console.log('📨 Background received message:', request.type);
      
      switch (request.type) {
        case 'GET_SETTINGS':
          const settings = await chrome.storage.local.get();
          sendResponse(settings);
          break;
          
        case 'UPDATE_SETTINGS':
          await chrome.storage.local.set(request.settings);
          sendResponse({ success: true });
          break;
          
        case 'GET_STATISTICS':
          const statistics = await this.getStatistics();
          console.log('📊 Sending statistics:', statistics);
          sendResponse(statistics);
          break;
          
        case 'GET_STATUS':
          // Forward to content script
          if (sender.tab) {
            chrome.tabs.sendMessage(sender.tab.id, request, sendResponse);
          } else {
            sendResponse({ error: 'No active tab' });
          }
          break;
          
        case 'DELETE_STARTED':
          await this.handleDeleteStarted(request.count);
          sendResponse({ success: true });
          break;
          
        case 'DELETE_PROGRESS':
          this.handleDeleteProgress(request.current, request.total, sender.tab?.id);
          sendResponse({ success: true });
          break;
          
        case 'DELETE_COMPLETED':
          await this.handleDeleteCompleted(request.count);
          sendResponse({ success: true });
          break;
          
        case 'DELETE_CANCELLED':
          await this.handleDeleteCancelled(request.deletedCount);
          sendResponse({ success: true });
          break;
          
        case 'SHOW_NOTIFICATION':
          this.showNotification(request.title, request.message, request.type);
          sendResponse({ success: true });
          break;
          
        default:
          sendResponse({ error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ error: error.message });
    }
  }
  
  async handleActionClick(tab) {
    // Handle extension icon click
    if (tab.url && tab.url.includes('youtube.com/playlist?list=WL')) {
      // We're on the Watch Later page, toggle the bulk delete mode
      try {
        await chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_MODE' });
      } catch (error) {
        console.error('Could not communicate with content script:', error);
      }
    } else {
      // Not on Watch Later page, open it
      chrome.tabs.create({ 
        url: 'https://www.youtube.com/playlist?list=WL'
      });
    }
  }
  
  async updateBadge(tabId) {
    try {
      const response = await chrome.tabs.sendMessage(tabId, { type: 'GET_STATUS' });
      if (response && response.totalVideos > 0) {
        chrome.action.setBadgeText({
          text: response.totalVideos.toString(),
          tabId: tabId
        });
      } else {
        chrome.action.setBadgeText({
          text: '',
          tabId: tabId
        });
      }
    } catch (error) {
      // Content script not ready or page not loaded
      chrome.action.setBadgeText({
        text: '',
        tabId: tabId
      });
    }
  }
  
  async handleDeleteStarted(count) {
    console.log(`Starting deletion of ${count} videos`);
    
    if (this.activeTabId) {
      chrome.action.setBadgeText({
        text: '...',
        tabId: this.activeTabId
      });
    }
    
    // Update last used time
    const settings = await chrome.storage.local.get(['statistics']);
    if (settings.statistics) {
      settings.statistics.lastUsed = Date.now();
      await chrome.storage.local.set({ statistics: settings.statistics });
    }
  }
  
  handleDeleteProgress(current, total, tabId) {
    if (tabId) {
      const percentage = Math.round((current / total) * 100);
      chrome.action.setBadgeText({
        text: `${percentage}%`,
        tabId: tabId
      });
    }
  }
  
  async handleDeleteCompleted(count) {
    console.log(`Completed deletion of ${count} videos`);
    
    // Update statistics
    const settings = await chrome.storage.local.get(['statistics', 'showNotifications']);
    if (settings.statistics) {
      settings.statistics.totalDeleted += count;
      await chrome.storage.local.set({ statistics: settings.statistics });
    }
    
    // Clear badge
    if (this.activeTabId) {
      chrome.action.setBadgeText({
        text: '',
        tabId: this.activeTabId
      });
    }
    
    // Show notification if enabled
    if (settings.showNotifications) {
      this.showNotification(
        chrome.i18n.getMessage('completed'),
        chrome.i18n.getMessage('deleteCompleted', [count.toString()]),
        'success'
      );
    }
    
    this.lastDeletedCount = count;
  }
  
  async handleDeleteCancelled(deletedCount) {
    console.log(`Deletion cancelled. ${deletedCount} videos were deleted.`);
    
    // Update statistics for partial deletion
    if (deletedCount > 0) {
      const settings = await chrome.storage.local.get(['statistics']);
      if (settings.statistics) {
        settings.statistics.totalDeleted += deletedCount;
        await chrome.storage.local.set({ statistics: settings.statistics });
      }
    }
    
    // Clear badge
    if (this.activeTabId) {
      chrome.action.setBadgeText({
        text: '',
        tabId: this.activeTabId
      });
    }
  }
  
  showNotification(title, message, type = 'basic') {
    const iconMap = {
      success: 'icons/icon48.png',
      error: 'icons/icon48.png',
      basic: 'icons/icon48.png'
    };
    
    chrome.notifications.create({
      type: 'basic',
      iconUrl: iconMap[type],
      title: title,
      message: message,
      priority: 1
    });
  }
  
  async initializeStorage() {
    // Check if storage is already initialized
    const result = await chrome.storage.local.get(['statistics']);
    if (!result.statistics) {
      await this.setDefaultSettings();
    }
  }
  
  async getStatistics() {
    const settings = await chrome.storage.local.get(['statistics']);
    const stats = settings.statistics || {
      totalDeleted: 0,
      installDate: Date.now(),
      lastUsed: null
    };
    
    // Calculate days since installation
    const daysSinceInstall = Math.floor(
      (Date.now() - stats.installDate) / (1000 * 60 * 60 * 24)
    );
    
    return {
      ...stats,
      daysSinceInstall,
      averagePerDay: daysSinceInstall > 0 ? 
        Math.round(stats.totalDeleted / daysSinceInstall) : 0
    };
  }
}

// Initialize the background service
const backgroundService = new BackgroundService();

// Handle service worker lifecycle events
self.addEventListener('activate', event => {
  console.log('Background service worker activated');
});

// Cleanup old data periodically
chrome.alarms.create('cleanup', { periodInMinutes: 60 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'cleanup') {
    // Clean up old storage data if needed
    chrome.storage.local.get(null, (items) => {
      // Remove temporary data older than 1 day
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
      const keysToRemove = [];
      
      for (const [key, value] of Object.entries(items)) {
        if (key.startsWith('temp_') && value.timestamp < oneDayAgo) {
          keysToRemove.push(key);
        }
      }
      
      if (keysToRemove.length > 0) {
        chrome.storage.local.remove(keysToRemove);
        console.log('Cleaned up', keysToRemove.length, 'temporary storage items');
      }
    });
  }
});