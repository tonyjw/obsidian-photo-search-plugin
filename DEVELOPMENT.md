# Development Workflow

This plugin provides multiple development workflow options for faster iteration.

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

## Quick Start (Recommended)

For the fastest development experience, use symlinks:

```bash
# One-time setup - creates a symlink to your vault
npm run dev:symlink

# Start development with auto-compilation
npm run dev

# Make changes to main.ts - they'll be automatically compiled
# Just reload the plugin in Obsidian to see changes
```

## Alternative: File Copying

If symlinks don't work on your system:

```bash
# Starts TypeScript compilation AND auto-copies files to vault
npm run dev:watch
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

## Configuration Options

The setup script supports multiple configuration methods:

- **Auto-detected**: Setup script finds vaults in common locations
- **Environment variable**: `OBSIDIAN_PLUGIN_PATH=/path/to/plugins/folder`  
- **Manual config**: Edit `dev.config.local.js`

### Vault Detection

The setup script automatically detects vaults in common locations:
- iCloud: `~/Library/Mobile Documents/iCloud~md~obsidian/Documents/`
- Local Documents: `~/Documents/`
- Dropbox: `~/Dropbox/`
- OneDrive: `~/OneDrive/`
- Google Drive: `~/Google Drive/`

**Important**: The `.obsidian` folder is typically located at the root level of these directories, not inside individual vault folders. For example:
- Correct: `/Users/username/Documents/.obsidian/plugins/photo-search-plugin`
- Incorrect: `/Users/username/Documents/MyVault/.obsidian/plugins/photo-search-plugin`

Or you can specify a custom path during setup.

## Development Process

1. **Setup**: Run `npm run dev:setup` to configure your vault path
2. **Choose workflow**: Run `npm run dev:symlink` (recommended) or `npm run dev:watch`
3. **Code**: Make changes to `main.ts`
4. **Auto-compile**: Files are automatically compiled
5. **Test**: Changes are immediately available in Obsidian
6. **Reload**: Use Cmd+R in Obsidian or manually disable/enable the plugin
7. **Iterate**: Repeat steps 3-6 for rapid development

## Troubleshooting

- **"No configuration found"**: Run `npm run dev:setup`
- **Symlinks not working**: Use `npm run dev:watch` instead
- **Wrong vault**: Re-run `npm run dev:setup` or edit `dev.config.local.js`
- **Plugin not updating**: Reload plugin in Obsidian (Cmd+R or disable/enable)

## Tips

- **Symlink approach** is fastest - changes are immediately reflected
- **Integrated watch** (`dev:watch`) is the best fallback if symlinks don't work
- Both approaches handle TypeScript compilation automatically
- Remember to reload the plugin in Obsidian after making changes
- Check the browser console (Cmd+Option+I) for any plugin errors
