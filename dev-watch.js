#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

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

// Configuration
const VAULT_PLUGIN_PATH = config.vaultPluginPath;
const FILES_TO_COPY = config.filesToCopy || ['main.js', 'manifest.json', 'styles.css'];

console.log('🚀 Starting Obsidian Plugin Development Mode...\n');

// Ensure target directory exists
if (!fs.existsSync(VAULT_PLUGIN_PATH)) {
    fs.mkdirSync(VAULT_PLUGIN_PATH, { recursive: true });
    console.log(`📁 Created plugin directory: ${VAULT_PLUGIN_PATH}`);
}

// Function to copy files to vault
function copyFiles() {
    let copiedCount = 0;
    FILES_TO_COPY.forEach(file => {
        const sourcePath = path.join(__dirname, file);
        const targetPath = path.join(VAULT_PLUGIN_PATH, file);
        
        if (fs.existsSync(sourcePath)) {
            try {
                fs.copyFileSync(sourcePath, targetPath);
                console.log(`✅ Copied ${file} to vault`);
                copiedCount++;
            } catch (error) {
                console.log(`❌ Error copying ${file}: ${error.message}`);
            }
        }
    });
    
    if (copiedCount > 0) {
        console.log(`📦 ${copiedCount} files copied at ${new Date().toLocaleTimeString()}\n`);
    }
}

// Initial copy
copyFiles();

// Start esbuild in watch mode
console.log('🔧 Starting TypeScript compilation in watch mode...');
const esbuildProcess = spawn('node', ['esbuild.config.mjs'], {
    stdio: 'inherit',
    cwd: __dirname
});

// Watch for changes in built files
const chokidar = require('chokidar');
const watcher = chokidar.watch(FILES_TO_COPY, {
    ignored: /(^|[\/\\])\../, // ignore dotfiles
    persistent: true,
    ignoreInitial: true // Don't trigger on startup
});

watcher
    .on('change', (filePath) => {
        console.log(`📝 File changed: ${filePath}`);
        copyFiles();
    })
    .on('error', error => console.log(`❌ Watcher error: ${error}`));

// Handle process termination
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down development server...');
    watcher.close();
    esbuildProcess.kill();
    process.exit(0);
});

console.log('👀 Watching for changes... Press Ctrl+C to stop');
console.log(`📍 Plugin will be copied to: ${VAULT_PLUGIN_PATH}`);
