# Photo Search Plugin for Obsidian

Search and download free licensed photos from Pexels, Unsplash, and Pixabay directly within Obsidian by highlighting text or using custom queries.

## Features

- 🔍 **Text Selection Search**: Highlight any text and search for photos instantly
- 🖼️ **Multi-Source Integration**: Searches Pexels, Unsplash, and Pixabay simultaneously
- 🔗 **Direct URL Import**: Paste photo URLs to fetch specific images instead of searching
- 👀 **Click-to-Preview**: Click any photo for a large preview with select/cancel options
- 💾 **Two-Step Selection**: Preview images first, then choose to save or go back
- 🎯 **Flexible Search**: Custom search option for manual queries
- 🤖 **AI Detection**: Visual indicators for AI-generated images with filtering options
- 📊 **Rich Metadata**: Includes dimensions, file size, print size calculations, and AI status

## Why These Photo Providers?

This plugin integrates with **Pexels**, **Unsplash**, and **Pixabay** - three of the most trusted platforms for freely licensed, high-quality photography:

### 🎨 **High Quality Content**
- **Professional Photography**: All three platforms maintain strict quality standards and feature professional photographers
- **Diverse Collections**: Millions of photos covering every topic imaginable - from nature and business to abstract and lifestyle
- **High Resolution**: Most photos are available in high resolution suitable for both digital and print use

### ⚖️ **Copyright & Licensing Respect**
- **Clear Licensing**: All photos come with explicit licensing information and usage rights
- **Attribution Clarity**: Photographer credits and source links are always preserved in metadata
- **Commercial Use**: Most photos are free for commercial use without complex licensing negotiations
- **Legal Safety**: Using established platforms reduces copyright infringement risks compared to general web searches

### 🔧 **Technical Excellence**
- **Reliable APIs**: Well-documented, stable APIs that provide consistent search results and metadata
- **Rich Metadata**: Detailed information including photographer credits, tags, dimensions, and licensing terms
- **Global Coverage**: International photographer communities ensuring diverse perspectives and subjects
- **Regular Updates**: Active platforms with fresh content uploaded daily

### 🌍 **Community & Ethics**
- **Fair Compensation**: Many photographers on these platforms earn revenue through their work
- **Attribution Culture**: Strong emphasis on proper photographer attribution and recognition
- **Community Standards**: Active moderation ensures appropriate content and respect for creators

By focusing on these three established platforms, this plugin ensures you have access to millions of high-quality, legally safe images while supporting the photography community through proper attribution and ethical usage.

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

### Method 3: Direct URL Import 🆕
1. Copy a photo URL from Pexels, Unsplash, or Pixabay
2. Use either command and paste the URL
3. The plugin will automatically detect the URL and fetch that specific photo instead of searching

**Supported URL formats:**
- Pexels: `https://www.pexels.com/photo/photo-name-123456/`
- Unsplash: `https://unsplash.com/photos/abc123xyz` or `https://unsplash.com/@photographer/abc123xyz`
- Pixabay: `https://pixabay.com/photos/photo-name-123456/` or `https://pixabay.com/en/photos/photo-name-123456/`

URLs with parameters (like `?utm_source=...`) are automatically cleaned and will work correctly.

### Tabbed Interface 🆕
Search results are organized in a tabbed interface by provider:
- **Provider Tabs**: Switch between Pexels, Unsplash, and Pixabay results
- **Result Counts**: Each tab shows the number of photos found from that provider  
- **Smart Defaults**: Opens with your configured default provider (set in settings)
- **Disabled States**: Tabs are disabled for providers without API keys configured
- **Individual Results**: Browse results from each provider separately
- **Top Pagination**: Navigation controls appear at the top for easy page browsing without scrolling

**Default Provider Setting**: Configure which provider tab opens by default in Settings → Photo Search Plugin → Default Provider.

### Click-to-Preview Interface 🆕
Enhanced photo selection with a two-step process:
- **Click to Preview**: Click any photo thumbnail to see a large preview
- **Action Buttons**: Choose "Select Image" to save or "Close" to go back
- **Keyboard Shortcuts**: Press Escape to close the preview
- **Background Click**: Click outside the preview to close without selecting
- **Enhanced Info**: Preview shows photographer, dimensions, and source details

This prevents accidental photo insertion and gives you time to evaluate images before saving them to your vault.

## Recent Fixes ✅

**v1.0.2** - Enhanced Click-to-Preview Interface
- ✅ **New Two-Step Selection Process**: Click photos to preview first, then choose to save or cancel
- ✅ **Enhanced Preview Overlay**: Large preview with action buttons (Close/Select Image)
- ✅ **Multiple Exit Options**: Escape key, background click, or close button to cancel
- ✅ **Improved User Experience**: No more accidental photo insertion - preview before deciding
- ✅ Fixed default provider setting - now properly opens with your configured default provider
- ✅ Enhanced tab switching logic with proper active states
- ✅ Better memory management with proper cleanup on modal close
- ✅ Improved DOM manipulation using standard APIs for better reliability

## Attribution

All photos are automatically saved with metadata files containing:
- Photographer attribution
- Original source links
- License information
- Search terms used

## Development

### Quick Setup for Fast Development

For the fastest development experience, use the symlink approach:

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/obsidian-photo-search-plugin.git
cd obsidian-photo-search-plugin

# Install dependencies
npm install

# Configure your vault path (one-time setup)
npm run dev:setup

# Create symlink to your Obsidian vault
npm run dev:symlink

# Start development with auto-compilation
npm run dev
```

The setup script will automatically detect your Obsidian vaults or allow you to enter a custom path. Now when you make changes to `main.ts`, they'll be automatically compiled and available in Obsidian. Just reload the plugin (Cmd+R or disable/enable) to see changes.

### Alternative: File Copying Workflow

If symlinks don't work on your system:

```bash
# Install dependencies
npm install

# Configure your vault path (if not done already)
npm run dev:setup

# Start integrated development (builds + copies files automatically)
npm run dev:watch
```

### Manual Development Options

```bash
# Configure vault path (first time only)
npm run dev:setup

# Just compile TypeScript in watch mode
npm run dev

# Just copy existing files to vault and watch for changes
npm run dev:copy

# Build for production
npm run build

# Remove symlink setup
npm run dev:unlink
```

### Development Process

1. **Setup**: Run `npm run dev:setup` to configure your vault path
2. **Choose workflow**: Run `npm run dev:symlink` (recommended) or `npm run dev:watch`
3. **Code**: Make changes to `main.ts`
4. **Auto-compile**: Files are automatically compiled
5. **Test**: Changes are immediately available in Obsidian
6. **Reload**: Use Cmd+R in Obsidian or manually disable/enable the plugin
7. **Iterate**: Repeat steps 3-6 for rapid development

### Configuration Options

The setup script supports multiple configuration methods:

- **Interactive setup**: `npm run dev:setup` (detects vaults automatically)
- **Environment variable**: Set `OBSIDIAN_PLUGIN_PATH=/path/to/vault/.obsidian/plugins/photo-search-plugin`
- **Manual config**: Edit `dev.config.local.js` after running setup

### Vault Location

The setup script will automatically detect vaults in common locations:
- iCloud: `~/Library/Mobile Documents/iCloud~md~obsidian/Documents/`
- Local Documents: `~/Documents/`
- Dropbox: `~/Dropbox/`
- OneDrive: `~/OneDrive/`
- Google Drive: `~/Google Drive/`

Or you can specify a custom path during setup.

### Tips

- **Symlink approach** is fastest - changes are immediately reflected
- **Integrated watch** (`dev:watch`) is the best fallback if symlinks don't work
- Both approaches handle TypeScript compilation automatically
- Remember to reload the plugin in Obsidian after making changes
- Check the browser console (Cmd+Option+I) for any plugin errors