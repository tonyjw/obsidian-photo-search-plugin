#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');

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
    process.exit(1);
}

const VAULT_PLUGIN_PATH = config.vaultPluginPath;

console.log('🔗 Removing symlink development environment...\n');

try {
    if (fs.existsSync(VAULT_PLUGIN_PATH)) {
        const stats = fs.lstatSync(VAULT_PLUGIN_PATH);
        
        if (stats.isSymbolicLink()) {
            fs.unlinkSync(VAULT_PLUGIN_PATH);
            console.log('✅ Symlink removed successfully!');
        } else {
            console.log('📁 Directory exists but is not a symlink. Use "npm run dev:watch" instead.');
        }
    } else {
        console.log('ℹ️  No symlink found to remove.');
    }
} catch (error) {
    console.error('❌ Error removing symlink:', error.message);
}
