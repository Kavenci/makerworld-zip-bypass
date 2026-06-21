importScripts('jszip.min.js');

// Keeps track of IDs we are actively processing to prevent infinite loops
const processedDownloads = new Set();
const STORAGE_KEY = 'preserveZipOnMultipleSTL';
const canceledZipDownloads = new Set();
const DNR_RULE_IDS = [1, 2];

function installHeaderRemovalRules() {
  const rules = [
    {
      id: 1,
      priority: 1,
      action: {
        type: 'modifyHeaders',
        requestHeaders: [
          { operation: 'remove', header: 'Origin' }
        ]
      },
      condition: {
        urlFilter: '||makerworld.com/*',
        resourceTypes: ['xmlhttprequest', 'other']
      }
    },
    {
      id: 2,
      priority: 1,
      action: {
        type: 'modifyHeaders',
        requestHeaders: [
          { operation: 'remove', header: 'Origin' }
        ]
      },
      condition: {
        urlFilter: '||bblmw.com/*',
        resourceTypes: ['xmlhttprequest', 'other']
      }
    }
  ];

  chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: DNR_RULE_IDS,
    addRules: rules
  }, () => {
    if (chrome.runtime.lastError) {
      console.warn('Failed to install declarativeNetRequest rules:', chrome.runtime.lastError.message);
    }
  });
}

chrome.runtime.onInstalled.addListener(installHeaderRemovalRules);
chrome.runtime.onStartup.addListener(installHeaderRemovalRules);

chrome.downloads.onChanged.addListener((delta) => {
  if (!delta.state || delta.state.current !== 'interrupted') {
    return;
  }

  const downloadId = delta.id;
  if (!canceledZipDownloads.has(downloadId)) {
    return;
  }

  chrome.downloads.erase({ id: downloadId }, () => {
    if (chrome.runtime.lastError) {
      console.warn('Failed to erase canceled ZIP download on state change:', chrome.runtime.lastError.message);
    } else {
      console.log('Erased canceled ZIP download from history on state change', downloadId);
      canceledZipDownloads.delete(downloadId);
    }
  });
});

function getPreserveZipSetting() {
  return new Promise((resolve) => {
    chrome.storage.sync.get({ [STORAGE_KEY]: false }, (items) => {
      resolve(Boolean(items[STORAGE_KEY]));
    });
  });
}

chrome.downloads.onCreated.addListener(async (downloadItem) => {
  const isMakerworldSource = (
    downloadItem.url.includes("makerworld.com") ||
    downloadItem.referrer?.includes("makerworld.com")
  );
  const isZipFile = /\.zip(?:[?#]|$)/i.test(downloadItem.url || "") || /\.zip(?:[?#]|$)/i.test(downloadItem.filename || "");

  if (!isMakerworldSource || !isZipFile || processedDownloads.has(downloadItem.id)) {
    return;
  }

  try {
    const response = await fetch(downloadItem.url);
    if (!response.ok) {
      throw new Error(`Failed to fetch archive payload: ${response.status} ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);

    const preserveZipOnMultiple = await getPreserveZipSetting();

    const stlEntries = Object.entries(zip.files).filter(
      ([relativePath, file]) => relativePath.toLowerCase().endsWith('.stl') && !file.dir
    );

    if (stlEntries.length === 0) {
      console.warn("MakerWorld ZIP contained no STL files; allowing normal download.", downloadItem.url);
      return;
    }

    if (preserveZipOnMultiple && stlEntries.length > 1) {
      console.log("Multiple STL files found; preserving original ZIP download.", { count: stlEntries.length });
      return;
    }

    chrome.downloads.cancel(downloadItem.id, () => {
      if (chrome.runtime.lastError) {
        console.warn("Failed to cancel native zip download:", chrome.runtime.lastError.message);
      } else {
        canceledZipDownloads.add(downloadItem.id);
      }
    });

    for (const [relativePath, file] of stlEntries) {
      const base64Data = await file.async("base64");
      const dataUrl = `data:model/stl;base64,${base64Data}`;
      const cleanFilename = relativePath.split('/').pop();

      chrome.downloads.download({
        url: dataUrl,
        filename: cleanFilename,
        conflictAction: "uniquify",
        saveAs: false
      }, (newDownloadId) => {
        if (newDownloadId) {
          processedDownloads.add(newDownloadId);
        }
      });
    }
  } catch (error) {
    console.error("Error processing MakerWorld ZIP:", error);
  }
});