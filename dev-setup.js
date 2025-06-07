#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');

// Common Obsidian vault locations
const COMMON_LOCATIONS = [
    // iCloud
    path.join(os.homedir(), 'Library/Mobile Documents/iCloud~md~obsidian/Documents'),
    // Local Documents
    path.join(os.homedir(), 'Documents'),
    // Desktop
    path.join(os.homedir(), 'Desktop'),
    // Dropbox
    path.join(os.homedir(), 'Dropbox'),
    // OneDrive
    path.join(os.homedir(), 'OneDrive'),
    // Google Drive
    path.join(os.homedir(), 'Google Drive')
];

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, resolve);
    });
}

async function findObsidianVaults() {
    console.log('🔍 Scanning for Obsidian vaults...\n');
    const vaults = [];
    
    for (const location of COMMON_LOCATIONS) {
        if (fs.existsSync(location)) {
            try {
                // Check if there's a .obsidian folder at the root of this location
                const obsidianPath = path.join(location, '.obsidian');
                if (fs.existsSync(obsidianPath)) {
                    // This location has an .obsidian folder, so it's the Obsidian data directory
                    const pluginsPath = path.join(obsidianPath, 'plugins');
                    if (fs.existsSync(pluginsPath)) {
                        vaults.push({
                            name: path.basename(location),
                            path: location,
                            pluginPath: path.join(pluginsPath, 'photo-search-plugin')
                        });
                    }
                }
            } catch (error) {
                // Skip locations we can't read
            }
        }
    }
    
    return vaults;
}

async function setupDevelopment() {
    console.log('🛠️  Obsidian Plugin Development Setup\n');
    
    // Check if config already exists
    const configPath = path.join(__dirname, 'dev.config.local.js');
    if (fs.existsSync(configPath)) {
        const useExisting = await question('📋 dev.config.local.js already exists. Use existing config? (y/n): ');
        if (useExisting.toLowerCase() === 'y' || useExisting.toLowerCase() === 'yes') {
            console.log('✅ Using existing configuration');
            rl.close();
            return;
        }
    }
    
    const vaults = await findObsidianVaults();
    
    if (vaults.length > 0) {
        console.log('📂 Found Obsidian vaults:');
        vaults.forEach((vault, index) => {
            console.log(`  ${index + 1}. ${vault.name} (${vault.path})`);
        });
        console.log(`  ${vaults.length + 1}. Enter custom path`);
        console.log('  0. Skip setup (configure manually later)\n');
        
        const choice = await question('Select a vault (enter number): ');
        const choiceNum = parseInt(choice);
        
        if (choiceNum === 0) {
            console.log('⏭️  Skipping setup. Create dev.config.local.js manually.');
            rl.close();
            return;
        } else if (choiceNum > 0 && choiceNum <= vaults.length) {
            const selectedVault = vaults[choiceNum - 1];
            await createConfig(selectedVault.pluginPath);
        } else if (choiceNum === vaults.length + 1) {
            await setupCustomPath();
        } else {
            console.log('❌ Invalid selection');
        }
    } else {
        console.log('❌ No Obsidian vaults found in common locations.\n');
        await setupCustomPath();
    }
    
    rl.close();
}

async function setupCustomPath() {
    console.log('\n📁 Enter the path to your Obsidian vault (the folder containing .obsidian):');
    console.log('   Example: /Users/username/Documents/MyVault\n');
    
    const vaultPath = await question('Vault path: ');
    
    if (!vaultPath.trim()) {
        console.log('❌ No path entered');
        return;
    }
    
    const obsidianPath = path.join(vaultPath.trim(), '.obsidian');
    if (!fs.existsSync(obsidianPath)) {
        console.log('⚠️  Warning: .obsidian folder not found in the specified path');
        const proceed = await question('Continue anyway? (y/n): ');
        if (proceed.toLowerCase() !== 'y' && proceed.toLowerCase() !== 'yes') {
            return;
        }
    }
    
    const pluginPath = path.join(obsidianPath, 'plugins', 'photo-search-plugin');
    await createConfig(pluginPath);
}

async function createConfig(pluginPath) {
    const configContent = `// Development configuration for this project
// This file is ignored by git - customize for your local setup

module.exports = {
    // Path to your Obsidian plugin directory
    vaultPluginPath: '${pluginPath}',
    
    // Files to copy during development
    filesToCopy: ['main.js', 'manifest.json', 'styles.css'],
    
    // Plugin folder name
    pluginFolderName: 'photo-search-plugin'
};`;
    
    const configPath = path.join(__dirname, 'dev.config.local.js');
    fs.writeFileSync(configPath, configContent);
    
    console.log('\n✅ Configuration created!');
    console.log(`📁 Plugin will be deployed to: ${pluginPath}`);
    console.log('\n🚀 Next steps:');
    console.log('   1. Run "npm run dev:symlink" or "npm run dev:watch"');
    console.log('   2. Start coding!');
    console.log('\n💡 To change the path later, edit dev.config.local.js');
}

setupDevelopment().catch(console.error);
