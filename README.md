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