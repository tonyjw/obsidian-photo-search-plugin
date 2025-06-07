#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');
const chokidar = require('chokidar');

// Load configuration
function loadConfig() {
    const localConfigPath = path.join(__dirname, 'dev.config.local.js');
    const defaultConfigPath = path.join(__dirname, 'dev.config.js');
    
    if (fs.existsSync(localConfigPath)) {
        return require(localConfigPath);
    } else if (fs.existsSync(defaultConfigPath)) {
        return require(defaultConfigPath);
    } else {
        console.log('❌ No configuration found!');
        console.log('🛠️  Run "npm run dev:setup" to configure your vault path');
        process.exit(1);
    }
}

const config = loadConfig();

// Validate configuration
if (!config.vaultPluginPath) {
    console.log('❌ Vault plugin path not configured!');
    console.log('🛠️  Run "npm run dev:setup" to configure your vault path');
    console.log('💡 Or set the OBSIDIAN_PLUGIN_PATH environment variable');
    process.exit(1);
}

// Fix path expansion for macOS
const VAULT_PLUGIN_PATH = config.vaultPluginPath;
const SOURCE_FILES = config.filesToCopy || ['main.js', 'manifest.json'];

// Ensure target directory exists
if (!fs.existsSync(VAULT_PLUGIN_PATH)) {
    fs.mkdirSync(VAULT_PLUGIN_PATH, { recursive: true });
    console.log(`Created plugin directory: ${VAULT_PLUGIN_PATH}`);
}

// Function to copy files
function copyFiles() {
    SOURCE_FILES.forEach(file => {
        const sourcePath = path.join(__dirname, file);
        const targetPath = path.join(VAULT_PLUGIN_PATH, file);
        
        if (fs.existsSync(sourcePath)) {
            fs.copyFileSync(sourcePath, targetPath);
            console.log(`✅ Copied ${file} to vault`);
        } else {
            console.log(`⚠️  ${file} not found, skipping...`);
        }
    });
}

// Initial copy
console.log('🚀 Starting development file watcher...');
copyFiles();

// Watch for changes
const watcher = chokidar.watch(SOURCE_FILES, {
    ignored: /(^|[\/\\])\../, // ignore dotfiles
    persistent: true
});

watcher
    .on('change', (filePath) => {
        console.log(`📁 File changed: ${filePath}`);
        copyFiles();
    })
    .on('error', error => console.log(`❌ Watcher error: ${error}`));

console.log('👀 Watching for file changes... Press Ctrl+C to stop');
