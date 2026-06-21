# MakerWorld Zip Bypass

I got pissed off with makerworld downloading stl's in .zip files even if there is only one .zip file so made a simple Chrome extension that intercepts MakerWorld `.zip` downloads, extracts `.stl` files in memory, and downloads only the STL files.

## Features

- intercepts MakerWorld ZIP downloads
- extracts `.stl` files from the archive without saving the ZIP
- downloads STL files individually as raw files
- toggle setting to preserve the original ZIP when multiple STLs exist
- popup-based settings UI

## Installation

1. Open `chrome://extensions/` in Chrome.
2. Enable `Developer mode`.
3. Click `Load unpacked`.
4. Select this project folder.

## Usage

- Click the extension icon next to the address bar.
- Toggle the setting to preserve ZIP downloads when an archive contains multiple STL files.
- Download a MakerWorld model archive as usual.

## Files

- `manifest.json` — Chrome extension manifest
- `background.js` — service worker logic for download interception and extraction
- `popup.html` / `popup.js` — settings popup UI
- `jszip.min.js` — ZIP parsing dependency

## Notes

- The extension uses `declarativeNetRequest` to remove the `Origin` header for MakerWorld archive requests.
- The original ZIP download is canceled and erased from history when STL extraction succeeds.

## License

This project is released under the GNU GPL V3 License.

## AI Usage

Please note this project was partialy generated with AI.
