import { App, Plugin, PluginSettingTab, Setting, Modal, Notice, TFile, normalizePath } from 'obsidian';

interface PhotoSearchSettings {
	pexelsApiKey: string;
	unsplashApiKey: string;
	pixabayApiKey: string;
	saveLocation: string;
	resultsPerPage: number;
}

const DEFAULT_SETTINGS: PhotoSearchSettings = {
	pexelsApiKey: '',
	unsplashApiKey: '',
	pixabayApiKey: '',
	saveLocation: 'Images/PhotoSearch',
	resultsPerPage: 12
}

interface PhotoResult {
	id: string;
	source: 'pexels' | 'unsplash' | 'pixabay';
	url: string;
	downloadUrl: string;
	photographer: string;
	photographerUrl: string;
	description: string;
	tags: string[];
	width: number;
	height: number;
}

export default class PhotoSearchPlugin extends Plugin {
	settings: PhotoSearchSettings;

	async onload() {
		await this.loadSettings();

		// Add command to search for photos from selected text
		this.addCommand({
			id: 'search-photos-from-selection',
			name: 'Search photos from selected text',
			editorCallback: (editor) => {
				const selection = editor.getSelection();
				if (selection) {
					this.searchPhotos(selection);
				} else {
					new Notice('Please select text to search for photos');
				}
			}
		});

		// Add command to search for photos with custom query
		this.addCommand({
			id: 'search-photos-custom',
			name: 'Search photos with custom query',
			callback: () => {
				this.openCustomSearchModal();
			}
		});

		// Add settings tab
		this.addSettingTab(new PhotoSearchSettingTab(this.app, this));

		// Create save directory if it doesn't exist
		this.createSaveDirectory();
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async createSaveDirectory() {
		const folderPath = normalizePath(this.settings.saveLocation);
		if (!await this.app.vault.adapter.exists(folderPath)) {
			await this.app.vault.createFolder(folderPath);
		}
	}

	openCustomSearchModal() {
		new CustomSearchModal(this.app, (query) => {
			this.searchPhotos(query);
		}).open();
	}

	async searchPhotos(query: string) {
		if (!this.hasValidApiKeys()) {
			new Notice('Please configure API keys in plugin settings');
			return;
		}

		new Notice(`Searching for "${query}"...`);
		
		try {
			const results = await this.fetchPhotos(query);
			if (results.length > 0) {
				new PhotoBrowserModal(this.app, this, results, query).open();
			} else {
				new Notice('No photos found for this search term');
			}
		} catch (error) {
			console.error('Photo search error:', error);
			new Notice('Error searching for photos. Check console for details.');
		}
	}

	hasValidApiKeys(): boolean {
		return !!(this.settings.pexelsApiKey || this.settings.unsplashApiKey || this.settings.pixabayApiKey);
	}

	async fetchPhotos(query: string): Promise<PhotoResult[]> {
		const results: PhotoResult[] = [];
		const promises: Promise<PhotoResult[]>[] = [];

		if (this.settings.pexelsApiKey) {
			promises.push(this.fetchPexelsPhotos(query));
		}
		if (this.settings.unsplashApiKey) {
			promises.push(this.fetchUnsplashPhotos(query));
		}
		if (this.settings.pixabayApiKey) {
			promises.push(this.fetchPixabayPhotos(query));
		}

		const allResults = await Promise.allSettled(promises);
		allResults.forEach(result => {
			if (result.status === 'fulfilled') {
				results.push(...result.value);
			}
		});

		return results.slice(0, this.settings.resultsPerPage);
	}

	async fetchPexelsPhotos(query: string): Promise<PhotoResult[]> {
		const response = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=6`, {
			headers: {
				'Authorization': this.settings.pexelsApiKey
			}
		});

		if (!response.ok) throw new Error(`Pexels API error: ${response.status}`);
		
		const data = await response.json();
		return data.photos.map((photo: any): PhotoResult => ({
			id: photo.id.toString(),
			source: 'pexels',
			url: photo.url,
			downloadUrl: photo.src.large,
			photographer: photo.photographer,
			photographerUrl: photo.photographer_url,
			description: photo.alt || query,
			tags: [query],
			width: photo.width,
			height: photo.height
		}));
	}

	async fetchUnsplashPhotos(query: string): Promise<PhotoResult[]> {
		const response = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=6&client_id=${this.settings.unsplashApiKey}`);
		
		if (!response.ok) throw new Error(`Unsplash API error: ${response.status}`);
		
		const data = await response.json();
		return data.results.map((photo: any): PhotoResult => ({
			id: photo.id,
			source: 'unsplash',
			url: photo.links.html,
			downloadUrl: photo.urls.regular,
			photographer: photo.user.name,
			photographerUrl: photo.user.links.html,
			description: photo.description || photo.alt_description || query,
			tags: photo.tags?.map((tag: any) => tag.title) || [query],
			width: photo.width,
			height: photo.height
		}));
	}

	async fetchPixabayPhotos(query: string): Promise<PhotoResult[]> {
		const response = await fetch(`https://pixabay.com/api/?key=${this.settings.pixabayApiKey}&q=${encodeURIComponent(query)}&image_type=photo&per_page=6`);
		
		if (!response.ok) throw new Error(`Pixabay API error: ${response.status}`);
		
		const data = await response.json();
		return data.hits.map((photo: any): PhotoResult => ({
			id: photo.id.toString(),
			source: 'pixabay',
			url: photo.pageURL,
			downloadUrl: photo.largeImageURL,
			photographer: photo.user,
			photographerUrl: `https://pixabay.com/users/${photo.user}-${photo.user_id}/`,
			description: photo.tags,
			tags: photo.tags.split(', '),
			width: photo.imageWidth,
			height: photo.imageHeight
		}));
	}

	async savePhoto(photo: PhotoResult, searchQuery: string): Promise<string> {
		try {
			// Download image
			const response = await fetch(photo.downloadUrl);
			if (!response.ok) throw new Error(`Failed to download image: ${response.status}`);
			
			const arrayBuffer = await response.arrayBuffer();
			const buffer = new Uint8Array(arrayBuffer);
			
			// Generate filename
			const extension = photo.downloadUrl.split('.').pop()?.split('?')[0] || 'jpg';
			const sanitizedQuery = searchQuery.replace(/[^a-zA-Z0-9]/g, '_');
			const filename = `${sanitizedQuery}_${photo.source}_${photo.id}.${extension}`;
			const filepath = normalizePath(`${this.settings.saveLocation}/${filename}`);
			
			// Save file
			await this.app.vault.adapter.writeBinary(filepath, buffer);
			
			// Create metadata note
			const metadataContent = this.generateMetadata(photo, searchQuery, filename);
			const metadataPath = normalizePath(`${this.settings.saveLocation}/${sanitizedQuery}_${photo.source}_${photo.id}_metadata.md`);
			await this.app.vault.adapter.write(metadataPath, metadataContent);
			
			return filepath;
		} catch (error) {
			console.error('Error saving photo:', error);
			throw error;
		}
	}

	generateMetadata(photo: PhotoResult, searchQuery: string, filename: string): string {
		return `# Photo Metadata

## Image Details
- **File**: ${filename}
- **Source**: ${photo.source.charAt(0).toUpperCase() + photo.source.slice(1)}
- **Search Query**: ${searchQuery}
- **Dimensions**: ${photo.width} × ${photo.height}
- **Description**: ${photo.description}

## Attribution
- **Photographer**: [${photo.photographer}](${photo.photographerUrl})
- **Source URL**: [View Original](${photo.url})
- **Tags**: ${photo.tags.join(', ')}

## License Information
This image is from ${photo.source} and is available under their respective licensing terms. Please verify current licensing requirements before commercial use.

---
*Downloaded on ${new Date().toISOString().split('T')[0]} via Photo Search Plugin*
`;
	}
}

class CustomSearchModal extends Modal {
	onSubmit: (query: string) => void;
	query: string = '';

	constructor(app: App, onSubmit: (query: string) => void) {
		super(app);
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl('h2', { text: 'Search for Photos' });

		const inputEl = contentEl.createEl('input', {
			type: 'text',
			placeholder: 'Enter search terms (e.g., "sunset mountains")'
		});
		inputEl.style.width = '100%';
		inputEl.style.marginBottom = '16px';
		inputEl.style.padding = '8px';

		inputEl.addEventListener('input', (e) => {
			this.query = (e.target as HTMLInputElement).value;
		});

		inputEl.addEventListener('keypress', (e) => {
			if (e.key === 'Enter') {
				this.submit();
			}
		});

		const buttonEl = contentEl.createEl('button', { text: 'Search' });
		buttonEl.style.marginRight = '8px';
		buttonEl.addEventListener('click', () => this.submit());

		const cancelEl = contentEl.createEl('button', { text: 'Cancel' });
		cancelEl.addEventListener('click', () => this.close());

		inputEl.focus();
	}

	submit() {
		if (this.query.trim()) {
			this.onSubmit(this.query.trim());
			this.close();
		}
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class PhotoBrowserModal extends Modal {
	plugin: PhotoSearchPlugin;
	photos: PhotoResult[];
	searchQuery: string;
	currentIndex: number = 0;

	constructor(app: App, plugin: PhotoSearchPlugin, photos: PhotoResult[], searchQuery: string) {
		super(app);
		this.plugin = plugin;
		this.photos = photos;
		this.searchQuery = searchQuery;
	}

	onOpen() {
		const { contentEl } = this;
		this.renderPhotoBrowser();
	}

	renderPhotoBrowser() {
		const { contentEl } = this;
		contentEl.empty();

		// Header
		const headerEl = contentEl.createDiv({ cls: 'photo-browser-header' });
		headerEl.createEl('h2', { text: `Photos for "${this.searchQuery}"` });
		headerEl.createEl('p', { text: `${this.photos.length} results` });

		// Grid container
		const gridEl = contentEl.createDiv({ cls: 'photo-grid' });
		gridEl.style.display = 'grid';
		gridEl.style.gridTemplateColumns = 'repeat(auto-fit, minmax(200px, 1fr))';
		gridEl.style.gap = '16px';
		gridEl.style.marginBottom = '20px';
		gridEl.style.maxHeight = '60vh';
		gridEl.style.overflowY = 'auto';

		this.photos.forEach((photo, index) => {
			const photoEl = gridEl.createDiv({ cls: 'photo-item' });
			photoEl.style.border = '1px solid var(--background-modifier-border)';
			photoEl.style.borderRadius = '8px';
			photoEl.style.padding = '8px';
			photoEl.style.cursor = 'pointer';
			photoEl.style.transition = 'transform 0.2s';

			photoEl.addEventListener('mouseenter', () => {
				photoEl.style.transform = 'scale(1.02)';
			});

			photoEl.addEventListener('mouseleave', () => {
				photoEl.style.transform = 'scale(1)';
			});

			// Image
			const imgEl = photoEl.createEl('img');
			imgEl.src = photo.downloadUrl;
			imgEl.style.width = '100%';
			imgEl.style.height = '150px';
			imgEl.style.objectFit = 'cover';
			imgEl.style.borderRadius = '4px';

			// Info
			const infoEl = photoEl.createDiv();
			infoEl.style.marginTop = '8px';
			infoEl.style.fontSize = '12px';

			infoEl.createEl('div', { 
				text: `By ${photo.photographer}`,
				cls: 'photo-photographer'
			});

			infoEl.createEl('div', { 
				text: `${photo.source.toUpperCase()} • ${photo.width}×${photo.height}`,
				cls: 'photo-source'
			});

			// Save button
			const saveBtn = photoEl.createEl('button', { text: 'Save Photo' });
			saveBtn.style.width = '100%';
			saveBtn.style.marginTop = '8px';
			saveBtn.style.padding = '4px';
			saveBtn.style.fontSize = '12px';

			saveBtn.addEventListener('click', async (e) => {
				e.stopPropagation();
				saveBtn.disabled = true;
				saveBtn.textContent = 'Saving...';

				try {
					await this.plugin.savePhoto(photo, this.searchQuery);
					new Notice(`Photo saved successfully!`);
					saveBtn.textContent = 'Saved ✓';
					saveBtn.style.backgroundColor = 'var(--interactive-success)';
				} catch (error) {
					new Notice('Error saving photo');
					saveBtn.textContent = 'Save Photo';
					saveBtn.disabled = false;
				}
			});
		});

		// Close button
		const closeBtn = contentEl.createEl('button', { text: 'Close' });
		closeBtn.style.marginTop = '16px';
		closeBtn.addEventListener('click', () => this.close());
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class PhotoSearchSettingTab extends PluginSettingTab {
	plugin: PhotoSearchPlugin;

	constructor(app: App, plugin: PhotoSearchPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h2', { text: 'Photo Search Plugin Settings' });

		// API Keys section
		containerEl.createEl('h3', { text: 'API Keys' });
		containerEl.createEl('p', { 
			text: 'Get free API keys from the respective services. You need at least one to use the plugin.'
		});

		new Setting(containerEl)
			.setName('Pexels API Key')
			.setDesc('Get your free API key at pexels.com/api')
			.addText(text => text
				.setPlaceholder('Enter your Pexels API key')
				.setValue(this.plugin.settings.pexelsApiKey)
				.onChange(async (value) => {
					this.plugin.settings.pexelsApiKey = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Unsplash Access Key')
			.setDesc('Get your free Access Key at unsplash.com/developers')
			.addText(text => text
				.setPlaceholder('Enter your Unsplash Access Key')
				.setValue(this.plugin.settings.unsplashApiKey)
				.onChange(async (value) => {
					this.plugin.settings.unsplashApiKey = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Pixabay API Key')
			.setDesc('Get your free API key at pixabay.com/api/docs/')
			.addText(text => text
				.setPlaceholder('Enter your Pixabay API key')
				.setValue(this.plugin.settings.pixabayApiKey)
				.onChange(async (value) => {
					this.plugin.settings.pixabayApiKey = value;
					await this.plugin.saveSettings();
				}));

		// Settings section
		containerEl.createEl('h3', { text: 'Plugin Settings' });

		new Setting(containerEl)
			.setName('Save Location')
			.setDesc('Folder where downloaded photos will be saved')
			.addText(text => text
				.setPlaceholder('Images/PhotoSearch')
				.setValue(this.plugin.settings.saveLocation)
				.onChange(async (value) => {
					this.plugin.settings.saveLocation = value || 'Images/PhotoSearch';
					await this.plugin.saveSettings();
					await this.plugin.createSaveDirectory();
				}));

		new Setting(containerEl)
			.setName('Results Per Search')
			.setDesc('Maximum number of photos to show per search (6-20)')
			.addSlider(slider => slider
				.setLimits(6, 20, 2)
				.setValue(this.plugin.settings.resultsPerPage)
				.setDynamicTooltip()
				.onChange(async (value) => {
					this.plugin.settings.resultsPerPage = value;
					await this.plugin.saveSettings();
				}));

		// Instructions section
		containerEl.createEl('h3', { text: 'How to Use' });
		const instructionsEl = containerEl.createEl('div');
		instructionsEl.innerHTML = `
			<ol>
				<li>Get free API keys from one or more photo services above</li>
				<li>Configure your API keys in the settings</li>
				<li>Select text in your note and use the command "Search photos from selected text"</li>
				<li>Or use "Search photos with custom query" to enter search terms manually</li>
				<li>Browse results and click "Save Photo" to download with metadata</li>
			</ol>
		`;
	}
}