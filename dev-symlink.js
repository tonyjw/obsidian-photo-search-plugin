#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

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

const VAULT_PLUGIN_PATH = config.vaultPluginPath;
const PROJECT_DIR = __dirname;

console.log('🔗 Setting up symlink development environment...\n');

try {
    // Remove existing directory if it exists
    if (fs.existsSync(VAULT_PLUGIN_PATH)) {
        console.log('📁 Removing existing plugin directory...');
        fs.rmSync(VAULT_PLUGIN_PATH, { recursive: true, force: true });
    }

    // Create parent directory if it doesn't exist
    const parentDir = path.dirname(VAULT_PLUGIN_PATH);
    if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
    }

    // Create symlink
    console.log(`🔗 Creating symlink from ${PROJECT_DIR} to ${VAULT_PLUGIN_PATH}`);
    fs.symlinkSync(PROJECT_DIR, VAULT_PLUGIN_PATH, 'dir');
    
    console.log('✅ Symlink created successfully!');
    console.log('\n📝 Now you can:');
    console.log('   1. Run "npm run dev" to start TypeScript compilation in watch mode');
    console.log('   2. Changes will be immediately available in Obsidian');
    console.log('   3. Just reload the plugin in Obsidian to see changes');
    console.log('\n⚠️  Note: To undo this setup, run "npm run dev:unlink"');

} catch (error) {
    console.error('❌ Error setting up symlink:', error.message);
    console.log('\n💡 You may need to run this script with sudo or check permissions.');
    console.log('   Alternative: Use "npm run dev:watch" for file copying instead.');
}
