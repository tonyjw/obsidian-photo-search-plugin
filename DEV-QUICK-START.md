# Quick Development Reference

## First Time Setup

```bash
# 1. Clone and install
git clone <repo-url>
cd obsidian-photo-search-plugin
npm install

# 2. Configure your vault path
npm run dev:setup

# 3. Choose development mode
npm run dev:symlink  # Fastest (recommended)
# OR
npm run dev:watch    # Fallback if symlinks don't work
```

## Daily Development

```bash
# Start development server
npm run dev

# Make changes to main.ts
# Files auto-compile and sync to Obsidian
# Reload plugin in Obsidian to see changes
```

## Available Commands

| Command | Description |
|---------|-------------|
| `npm run dev:setup` | Interactive vault path configuration |
| `npm run dev:symlink` | Create symlink for fastest development |
| `npm run dev:watch` | Build + copy files automatically |
| `npm run dev:copy` | Copy files only (no build) |
| `npm run dev:unlink` | Remove symlink setup |
| `npm run dev` | Start TypeScript compilation in watch mode |
| `npm run build` | Production build |

## Configuration

- **Auto-detected**: Setup script finds vaults in common locations
- **Environment variable**: `OBSIDIAN_PLUGIN_PATH=/path/to/plugins/folder`
- **Manual config**: Edit `dev.config.local.js`

## Troubleshooting

- **"No configuration found"**: Run `npm run dev:setup`
- **Symlinks not working**: Use `npm run dev:watch` instead
- **Wrong vault**: Re-run `npm run dev:setup` or edit `dev.config.local.js`
- **Plugin not updating**: Reload plugin in Obsidian (Cmd+R or disable/enable)

## Features Overview

This plugin provides an enhanced photo browsing experience:
- **Large Modal**: Takes up 90% of screen space for better photo viewing
- **Hover Previews**: Large preview appears when hovering over thumbnails
- **Smart AI Detection**: Clear tooltips explain AI status with visual indicators
- **Tabbed Interface**: Results organized by provider (Pexels, Unsplash, Pixabay)
- **Responsive Design**: Adapts to different screen sizes
- **Enhanced Metadata**: Shows photographer, dimensions, and source information
