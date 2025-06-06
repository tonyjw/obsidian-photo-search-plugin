# Photo Search Plugin for Obsidian

Search and download free licensed photos from Pexels, Unsplash, and Pixabay directly within Obsidian by highlighting text or using custom queries.

## Features

- 🔍 **Text Selection Search**: Highlight any text and search for photos instantly
- 🖼️ **Multi-Source Integration**: Searches Pexels, Unsplash, and Pixabay simultaneously
- 👀 **Visual Browser**: Grid view to browse and preview photos
- 💾 **One-Click Save**: Downloads photos with proper attribution metadata
- 🎯 **Flexible Search**: Custom search option for manual queries

## Installation

### From GitHub (Manual)

1. Download the latest release from the [Releases page](https://github.com/YOUR_USERNAME/obsidian-photo-search-plugin/releases)
2. Extract the files to `YourVault/.obsidian/plugins/photo-search-plugin/`
3. Enable the plugin in Obsidian Settings → Community Plugins

### For Development

1. Clone this repository
2. Run `npm install` to install dependencies
3. Run `npm run build` to compile
4. Copy `main.js`, `manifest.json` to your vault's plugin folder

## Setup

1. **Get Free API Keys**:
   - **Pexels**: [pexels.com/api](https://www.pexels.com/api/) (200 requests/hour)
   - **Unsplash**: [unsplash.com/developers](https://unsplash.com/developers) (50 requests/hour)  
   - **Pixabay**: [pixabay.com/api/docs/](https://pixabay.com/api/docs/) (20,000 requests/month)

2. **Configure Plugin**:
   - Go to Settings → Photo Search Plugin
   - Add your API key(s)
   - Set save location (default: `Images/PhotoSearch`)

## Usage

### Method 1: Text Selection
1. Highlight text in your note (e.g., "sunset mountains")
2. Command Palette (Ctrl+P) → "Search photos from selected text"
3. Browse results and click "Save Photo"

### Method 2: Custom Search
1. Command Palette (Ctrl+P) → "Search photos with custom query"
2. Enter search terms
3. Browse and save photos

## Attribution

All photos are automatically saved with metadata files containing:
- Photographer attribution
- Original source links
- License information
- Search terms used

## Development

```bash
# Install dependencies
npm install

# Build for development (with file watching)
npm run dev

# Build for production
npm run build