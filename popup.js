const toggle = document.getElementById('preserveZipToggle');
const STORAGE_KEY = 'preserveZipOnMultipleSTL';

function saveSettings(value) {
  chrome.storage.sync.set({ [STORAGE_KEY]: value });
}

function loadSettings() {
  chrome.storage.sync.get({ [STORAGE_KEY]: false }, (items) => {
    toggle.checked = Boolean(items[STORAGE_KEY]);
  });
}

toggle.addEventListener('change', () => {
  saveSettings(toggle.checked);
});

loadSettings();
