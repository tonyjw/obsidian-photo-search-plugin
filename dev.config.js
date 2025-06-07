// Development configuration
// Copy this file to dev.config.local.js and customize for your setup

module.exports = {
    // Path to your Obsidian plugin directory
    // Note: The .obsidian folder is typically at the root level, not inside individual vaults
    // Examples:
    // - Local: '/Users/username/Documents/.obsidian/plugins/photo-search-plugin'
    // - iCloud: '/Users/username/Library/Mobile Documents/iCloud~md~obsidian/Documents/.obsidian/plugins/photo-search-plugin'
    // - Dropbox: '/Users/username/Dropbox/.obsidian/plugins/photo-search-plugin'
    
    vaultPluginPath: process.env.OBSIDIAN_PLUGIN_PATH || null,
    
    // Files to copy during development
    filesToCopy: ['main.js', 'manifest.json', 'styles.css'],
    
    // Plugin folder name (change if you want a different name in your vault)
    pluginFolderName: 'photo-search-plugin'
};
