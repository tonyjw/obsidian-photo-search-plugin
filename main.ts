import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, requestUrl, TFile, normalizePath } from 'obsidian';

interface PhotoSearchSettings {
	pexelsApiKey: string;
	unsplashApiKey: string;
	pixabayApiKey: string;
	saveLocation: string;
	imageSize: string;
	saveMetadata: boolean;
	includeAiImages: boolean;
}

const DEFAULT_SETTINGS: PhotoSearchSettings = {
	pexelsApiKey: '',
	unsplashApiKey: '',
	pixabayApiKey: '',
	saveLocation: 'Images/PhotoSearch',
	imageSize: 'medium',  // options: 'small', 'medium', 'large', 'original'
	saveMetadata: true,
	includeAiImages: false
};

interface Photo {
	id: string;
	url: string;
	previewUrl: string;
	downloadUrl: string;
	photographer: string;
	source: string;
	tags: string[];
	description?: string;
	width: number;
	height: number;
}

export default class PhotoSearchPlugin extends Plugin {
	settings: PhotoSearchSettings;

	async onload() {
		await this.loadSettings();

			// Add CSS styles for photo metadata
		const css = `
			.photo-metadata {
				background-color: rgba(145, 185, 255, 0.1);
				border-radius: 4px;
				padding: 10px;
				margin: 10px 0;
				display: flex;
				gap: 15px;
				align-items: start;
			}
			.photo-thumbnail {
				flex-shrink: 0;
			}
			.photo-thumbnail img {
				border-radius: 4px;
			}
			.photo-info {
				font-size: 0.9em;
				color: var(--text-muted);
				white-space: pre-line;
			}
			.photo-info a {
				color: var(--text-muted);
				text-decoration: underline;
			}
		`;
		const style = document.createElement('style');
		style.textContent = css;
		document.head.appendChild(style);

		// Command to search photos from selected text with improved header and page title detection
		this.addCommand({
			id: 'search-photos-from-selection',
			name: 'Search photos from selected text',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				if (!(view instanceof MarkdownView)) return;
				const searchText = view instanceof MarkdownView ? this.getSelectedTextImproved(editor, view) : null;
				if (searchText) {
					this.openPhotoSearchModal(searchText);
				} else {
					new Notice('No text selected or found under cursor or page title');
				}
			}
		});

		// Command for custom search
		this.addCommand({
			id: 'search-photos-custom',
			name: 'Search photos with custom query',
			callback: () => {
				this.openCustomSearchModal();
			}
		});

		// Add context menu item for photo search
		this.registerEvent(
			this.app.workspace.on('editor-menu', (menu, editor, view) => {
				const text = view instanceof MarkdownView ? this.getSelectedTextImproved(editor, view) : null;
				if (text) {
					menu.addItem((item) => {
						item
							.setTitle(`Search photos for "${text.substring(0, 20)}${text.length > 20 ? '...' : ''}"`)
							.setIcon('image')
							.onClick(() => this.openPhotoSearchModal(text));
					});
				}
			})
		);

		// Add settings tab
		this.addSettingTab(new PhotoSearchSettingTab(this.app, this));
	}

	onunload() {
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	// IMPROVED: Enhanced text selection with header and page title support
	getSelectedTextImproved(editor: Editor, view?: MarkdownView): string | null {
		// Get any selected text first
		let selection = editor.getSelection().trim();
		if (selection.length > 0) {
			return this.cleanSearchText(selection);
		}

		// Try to get text from current line (including headers)
		const cursor = editor.getCursor();
		const line = editor.getLine(cursor.line);
		
		// Check if current line is a header
		const headerMatch = line.match(/^(#{1,6})\s*(.+)$/);
		if (headerMatch && headerMatch[2]) {
			return this.cleanSearchText(headerMatch[2].trim());
		}

		// If cursor is on a non-empty line
		if (line.trim().length > 0) {
			return this.cleanSearchText(line.trim());
		}

		// Try to get word under cursor
		const wordUnderCursor = this.getWordUnderCursor(editor);
		if (wordUnderCursor) {
			return this.cleanSearchText(wordUnderCursor);
		}

		// Default fallback: use the page title
		if (view?.file) {
			return this.cleanSearchText(view.file.basename);
		}

		return null;
	}

	// Helper method to get word under cursor
	getWordUnderCursor(editor: Editor): string | null {
		const cursor = editor.getCursor();
		const line = editor.getLine(cursor.line);
		
		// Find word boundaries around cursor
		let start = cursor.ch;
		let end = cursor.ch;
		
		// Expand backwards
		while (start > 0 && /\w/.test(line[start - 1])) {
			start--;
		}
		
		// Expand forwards
		while (end < line.length && /\w/.test(line[end])) {
			end++;
		}
		
		const word = line.substring(start, end).trim();
		return word.length > 0 ? word : null;
	}

	// Clean search text from markdown formatting
	cleanSearchText(text: string): string {
		return text
			.replace(/[*_`~]/g, '') // Remove markdown formatting
			.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Extract text from links
			.replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1') // Extract alt text from images
			.replace(/^#+\s*/, '') // Remove header symbols if any remain
			.trim();
	}

	openPhotoSearchModal(query: string) {
		new PhotoSearchModal(this.app, this, query).open();
	}

	openCustomSearchModal() {
		new CustomSearchModal(this.app, this).open();
	}

	async searchPhotos(query: string): Promise<Photo[]> {
		const results: Photo[] = [];
		
		// Search Pexels
		if (this.settings.pexelsApiKey) {
			try {
				const pexelsResults = await this.searchPexels(query);
				results.push(...pexelsResults);
			} catch (error) {
				console.error('Error searching Pexels:', error);
			}
		}

		// Search Unsplash
		if (this.settings.unsplashApiKey) {
			try {
				const unsplashResults = await this.searchUnsplash(query);
				results.push(...unsplashResults);
			} catch (error) {
				console.error('Error searching Unsplash:', error);
			}
		}

		// Search Pixabay
		if (this.settings.pixabayApiKey) {
			try {
				const pixabayResults = await this.searchPixabay(query);
				results.push(...pixabayResults);
			} catch (error) {
				console.error('Error searching Pixabay:', error);
			}
		}

		return results;
	}

	async searchPexels(query: string): Promise<Photo[]> {
		const response = await requestUrl({
			url: `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=20`,
			headers: {
				'Authorization': this.settings.pexelsApiKey
			}
		});

		return response.json.photos
			.filter((photo: any) => this.settings.includeAiImages || !photo.ai_generated)
			.map((photo: any): Photo => ({
				id: `pexels-${photo.id}`,
				url: photo.url,
				previewUrl: photo.src.medium,
				downloadUrl: this.settings.imageSize === 'original' ? photo.src.original : (photo.src[this.settings.imageSize] || photo.src.medium),
				photographer: photo.photographer,
				source: 'Pexels',
				tags: photo.alt ? photo.alt.split(' ') : [],
				description: photo.alt,
				width: photo.width,
				height: photo.height
			}));
	}

	async searchUnsplash(query: string): Promise<Photo[]> {
		const response = await requestUrl({
			url: `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=20${!this.settings.includeAiImages ? '&content_filter=high' : ''}`,
			headers: {
				'Authorization': `Client-ID ${this.settings.unsplashApiKey}`
			}
		});

		return response.json.results.map((photo: any): Photo => ({
			id: `unsplash-${photo.id}`,
			url: photo.links.html,
			previewUrl: photo.urls.small,
			downloadUrl: this.settings.imageSize === 'original' ? photo.urls.raw : (photo.urls[this.settings.imageSize] || photo.urls.regular),
			photographer: photo.user.name,
			source: 'Unsplash',
			tags: photo.tags ? photo.tags.map((tag: any) => tag.title) : [],
			description: photo.description || photo.alt_description,
			width: photo.width,
			height: photo.height
		}));
	}

	async searchPixabay(query: string): Promise<Photo[]> {
		const response = await requestUrl({
			url: `https://pixabay.com/api/?key=${this.settings.pixabayApiKey}&q=${encodeURIComponent(query)}&image_type=photo&per_page=20${!this.settings.includeAiImages ? '&ai_art=false' : ''}`
		});

		return response.json.hits.map((photo: any): Photo => ({
			id: `pixabay-${photo.id}`,
			url: photo.pageURL,
			previewUrl: photo.previewURL,
			downloadUrl: this.settings.imageSize === 'original' ? photo.largeImageURL : (photo.webformatURL),
			photographer: photo.user,
			source: 'Pixabay',
			tags: photo.tags.split(', '),
			description: photo.tags,
			width: photo.imageWidth,
			height: photo.imageHeight
		}));
	}

	async savePhoto(photo: Photo, searchQuery: string) {
		try {
			const folder = this.settings.saveLocation;
			if (!await this.app.vault.adapter.exists(folder)) {
				await this.app.vault.createFolder(folder);
			}
					// Generate filename first to ensure uniqueness
		// Better extension detection for different sources
		let extension = 'jpg'; // Default fallback
		if (photo.source === 'Unsplash') {
			// Unsplash images are typically JPEG
			extension = 'jpg';
		} else {
			// Try to extract extension from URL, but validate it
			const urlExtension = photo.downloadUrl.split('.').pop()?.split('?')[0];
			if (urlExtension && ['jpg', 'jpeg', 'png', 'webp'].includes(urlExtension.toLowerCase())) {
				extension = urlExtension.toLowerCase();
			}
		}
		
		const sanitizedQuery = searchQuery.replace(/[^a-zA-Z0-9]/g, '_');
		const baseFilename = `${sanitizedQuery}_${photo.id}.${extension}`;
		const basePath = normalizePath(`${folder}/${baseFilename}`);
			
			// Check if file already exists and create unique name if needed
			let finalPath = basePath;
			let finalFilename = baseFilename;
			let counter = 1;
			while (await this.app.vault.adapter.exists(finalPath)) {
				const baseName = baseFilename.replace(/\.[^/.]+$/, "");
				const ext = baseFilename.split('.').pop();
				finalFilename = `${baseName}_${counter}.${ext}`;
				finalPath = normalizePath(`${folder}/${finalFilename}`);
				counter++;
			}

			// Now download the specific image data for this photo
			let imageData: ArrayBuffer;
				if (photo.source === 'Unsplash') {
			try {
				// Simply download the image directly - most Unsplash URLs work this way
				const imageResponse = await requestUrl({
					url: photo.downloadUrl
				});
				
				imageData = imageResponse.arrayBuffer;
				
				// Double-check we got valid image data
				if (!imageData || imageData.byteLength === 0) {
					throw new Error('No image data received from Unsplash');
				}
			} catch (error) {
				// Fallback: try with auth headers
				try {
					const imageResponse = await requestUrl({
						url: photo.downloadUrl,
						headers: {
							'Authorization': `Client-ID ${this.settings.unsplashApiKey}`
						}
					});
					
					imageData = imageResponse.arrayBuffer;
					
					if (!imageData || imageData.byteLength === 0) {
						throw new Error('No image data received from Unsplash with auth');
					}
				} catch (authError) {
					throw authError;
				}
			}
			} else {
				// For Pexels and Pixabay, direct download
				const response = await requestUrl({ 
					url: photo.downloadUrl,
					headers: photo.source === 'Pexels' ? {
						'Authorization': this.settings.pexelsApiKey
					} : {}
				});
				
				imageData = response.arrayBuffer;
			}
			
			// Verify we have valid image data before saving
			if (!imageData || imageData.byteLength === 0) {
				throw new Error('No valid image data received');
			}
		
		// Save the image file using the already calculated finalPath
		await this.app.vault.createBinary(finalPath, imageData);
		
		// Extract the actual filename from the final path for metadata
		const actualFilename = finalPath.split('/').pop() || finalFilename;
		
		// Small delay to ensure file is fully written before creating reference
		await new Promise(resolve => setTimeout(resolve, 100));

		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (activeView) {
			const editor = activeView.editor;
			const cursor = editor.getCursor();

			// Format file size for display
			const fileSizeFormatted = this.formatFileSize(imageData.byteLength);
			
			// Calculate maximum print size at professional quality
			const maxPrintSize = this.calculateMaxPrintSize(photo.width, photo.height);
			
			// Use the actual filename that was saved
			const metadataBlock = `

![[${actualFilename}|300]]

> [!metadata]
> - **Source**: ${photo.source}
> - **Photographer**: ${photo.photographer}
> - **Original**: [View on ${photo.source}](${photo.url})
> - **Search Query**: "${searchQuery}"${photo.description ? `\n> - **Description**: ${photo.description}` : ''}
> - **Dimensions**: ${photo.width} × ${photo.height} pixels
> - **File Size**: ${fileSizeFormatted}
> - **Max Print Size**: ${maxPrintSize}

`;
			editor.replaceRange(metadataBlock, cursor);
		}

		new Notice(`Photo saved: ${actualFilename}`);
		return finalPath;
		} catch (error) {
			console.error('Error saving photo:', error);
			new Notice('Error saving photo. Check console for details.');
		}
	}

	// Helper method to format file size
	formatFileSize(bytes: number): string {
		if (bytes === 0) return '0 Bytes';
		
		const k = 1024;
		const sizes = ['Bytes', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
	}

	// Helper method to calculate maximum print size at 300 DPI
	calculateMaxPrintSize(width: number, height: number): string {
		const targetDPI = 300; // Professional print quality
		
		// Calculate maximum dimensions in inches
		const maxWidthInches = width / targetDPI;
		const maxHeightInches = height / targetDPI;
		
		// Format to reasonable decimal places
		const widthFormatted = maxWidthInches.toFixed(1);
		const heightFormatted = maxHeightInches.toFixed(1);
		
		// Also calculate in centimeters for international users
		const maxWidthCm = (maxWidthInches * 2.54).toFixed(1);
		const maxHeightCm = (maxHeightInches * 2.54).toFixed(1);
		
		return `${widthFormatted}" × ${heightFormatted}" (${maxWidthCm} × ${maxHeightCm} cm) at 300 DPI`;
	}
}

class PhotoSearchModal extends Modal {
	plugin: PhotoSearchPlugin;
	query: string;
	photos: Photo[] = [];
	loading = false;
	searchInput: HTMLInputElement;

	constructor(app: App, plugin: PhotoSearchPlugin, query: string) {
		super(app);
		this.plugin = plugin;
		this.query = query;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		// Add search input field
		const searchContainer = contentEl.createEl('div', { cls: 'search-container' });
		searchContainer.style.marginBottom = '15px';
		searchContainer.style.display = 'flex';
		searchContainer.style.gap = '10px';

		this.searchInput = searchContainer.createEl('input', { 
			type: 'text',
			value: this.query,
			cls: 'search-input'
		});
		this.searchInput.style.flex = '1';

		const searchButton = searchContainer.createEl('button', { text: 'Search' });
		
		const performSearch = () => {
			this.query = this.searchInput.value.trim();
			const resultsContainer = contentEl.querySelector('.results-container') as HTMLElement;
			if (resultsContainer) {
				resultsContainer.empty();
				this.displayLoadingState(resultsContainer);
				this.searchAndDisplayPhotos(resultsContainer);
			}
		};

		searchButton.addEventListener('click', performSearch);
		this.searchInput.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') performSearch();
		});

		// AI toggle control
		const searchControls = contentEl.createEl('div', { cls: 'search-controls' });
		searchControls.style.marginBottom = '15px';
		
		const aiToggle = searchControls.createEl('div', { cls: 'ai-toggle' });
		aiToggle.style.display = 'flex';
		aiToggle.style.alignItems = 'center';
		aiToggle.style.gap = '10px';

		const toggle = aiToggle.createEl('input', { type: 'checkbox' });
		toggle.type = 'checkbox';
		toggle.checked = this.plugin.settings.includeAiImages;
		
		const label = aiToggle.createEl('span', { text: 'Include AI-generated images' });

		const resultsContainer = contentEl.createEl('div', { cls: 'results-container' }) as HTMLElement;
		this.displayLoadingState(resultsContainer);
		this.searchAndDisplayPhotos(resultsContainer);

		toggle.addEventListener('change', async (e) => {
			this.plugin.settings.includeAiImages = toggle.checked;
			await this.plugin.saveSettings();
			resultsContainer.empty();
			this.displayLoadingState(resultsContainer);
			this.searchAndDisplayPhotos(resultsContainer);
		});
	}

	displayLoadingState(container: HTMLElement) {
		container.createEl('div', { text: 'Searching for photos...' });
	}

	async searchAndDisplayPhotos(container: HTMLElement) {
		try {
			// Check if any API keys are configured
			const hasApiKeys = this.plugin.settings.pexelsApiKey || 
							  this.plugin.settings.unsplashApiKey || 
							  this.plugin.settings.pixabayApiKey;
			
			if (!hasApiKeys) {
				container.empty();
				const errorEl = container.createEl('div', { cls: 'api-key-error' });
				errorEl.style.padding = '20px';
				errorEl.style.textAlign = 'center';
				errorEl.style.backgroundColor = '#dc3545';
				errorEl.style.borderRadius = '8px';
				errorEl.style.border = '1px solid #dc3545';
				errorEl.style.color = 'white';
				
				errorEl.createEl('h3', { 
					text: '🔑 API Keys Required',
					attr: { style: 'margin-top: 0; color: white; font-weight: bold; font-size: 1.2em;' }
				});
				
				errorEl.createEl('p', { 
					text: 'To search for photos, you need to configure at least one API key in the plugin settings.',
					attr: { style: 'margin-bottom: 15px; color: white; opacity: 0.9;' }
				});
				
				const buttonEl = errorEl.createEl('button', { 
					text: 'Open Settings',
					attr: { style: 'padding: 10px 20px; background: white; color: #dc3545; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; transition: all 0.2s;' }
				});
				
				buttonEl.addEventListener('mouseenter', () => {
					buttonEl.style.backgroundColor = '#f8f9fa';
					buttonEl.style.transform = 'translateY(-1px)';
				});
				
				buttonEl.addEventListener('mouseleave', () => {
					buttonEl.style.backgroundColor = 'white';
					buttonEl.style.transform = 'translateY(0)';
				});
				
				buttonEl.addEventListener('click', () => {
					this.close();
					// Open plugin settings
					(this.app as any).setting.open();
					(this.app as any).setting.openTabById(this.plugin.manifest.id);
				});
				
				return;
			}
			
			this.photos = await this.plugin.searchPhotos(this.query);
			
			container.empty();
			this.displayPhotos(container);
		} catch (error) {
			console.error('Detailed search error:', error);
			container.empty();
			container.createEl('div', { text: 'Error searching for photos. Please check your API keys and browser console for details.' });
		}
	}

	displayPhotos(container: HTMLElement = this.contentEl) {
		if (this.photos.length === 0) {
			// Check if this is due to no API keys or genuinely no results
			const hasApiKeys = this.plugin.settings.pexelsApiKey || 
							  this.plugin.settings.unsplashApiKey || 
							  this.plugin.settings.pixabayApiKey;
			
			if (hasApiKeys) {
				// API keys are configured but no results found
				container.createEl('p', { 
					text: 'No photos found for this search term. Try different keywords or check if AI-generated images are enabled if needed.',
					attr: { style: 'text-align: center; padding: 20px; color: var(--text-muted);' }
				});
			}
			// If no API keys, the error is already handled in searchAndDisplayPhotos
			return;
		}

		const gridEl = container.createEl('div', { cls: 'photo-grid' });
		gridEl.style.display = 'grid';
		gridEl.style.gridTemplateColumns = 'repeat(auto-fill, minmax(200px, 1fr))';
		gridEl.style.gap = '10px';
		gridEl.style.maxHeight = '400px';
		gridEl.style.overflowY = 'auto';

		this.photos.forEach(photo => {
			const photoEl = gridEl.createEl('div', { cls: 'photo-item' });
			photoEl.style.border = '1px solid var(--background-modifier-border)';
			photoEl.style.borderRadius = '4px';
			photoEl.style.padding = '10px';
			photoEl.style.cursor = 'pointer';

			const imgEl = photoEl.createEl('img');
			imgEl.src = photo.previewUrl;  // Use preview URL for the modal
			imgEl.style.width = '100%';
			imgEl.style.height = '150px';
			imgEl.style.objectFit = 'cover';
			imgEl.style.borderRadius = '4px';

			const infoEl = photoEl.createEl('div');
			infoEl.style.marginTop = '5px';
			infoEl.style.fontSize = '12px';

			infoEl.createEl('div', { text: `By ${photo.photographer}` });
			infoEl.createEl('div', { text: photo.source });

			photoEl.addEventListener('click', () => {
				this.plugin.savePhoto(photo, this.query);
				this.close();
			});
		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class CustomSearchModal extends Modal {
	plugin: PhotoSearchPlugin;

	constructor(app: App, plugin: PhotoSearchPlugin) {
		super(app);
		this.plugin = plugin;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl('h2', { text: 'Search Photos' });

		const inputEl = contentEl.createEl('input', { type: 'text', placeholder: 'Enter search terms...' });
		inputEl.style.width = '100%';
		inputEl.style.marginBottom = '10px';
		inputEl.style.padding = '8px';

		const buttonEl = contentEl.createEl('button', { text: 'Search' });
		buttonEl.style.padding = '8px 16px';

		const searchAction = () => {
			const query = inputEl.value.trim();
			if (query) {
				this.close();
				this.plugin.openPhotoSearchModal(query);
			}
		};

		buttonEl.addEventListener('click', searchAction);
		inputEl.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') {
				searchAction();
			}
		});

		inputEl.focus();
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

		containerEl.createEl('h2', { text: 'Photo Search Settings' });

		// API Keys section
		containerEl.createEl('h3', { text: 'API Keys' });
		containerEl.createEl('p', { text: 'Get free API keys from the photo services:' });

		new Setting(containerEl)
			.setName('Pexels API Key')
			.setDesc('Get your free API key from pexels.com/api (200 requests/hour)')
			.addText(text => text
				.setPlaceholder('Enter your Pexels API key')
				.setValue(this.plugin.settings.pexelsApiKey)
				.onChange(async (value) => {
					this.plugin.settings.pexelsApiKey = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Unsplash API Key')
			.setDesc('Get your free API key from unsplash.com/developers (50 requests/hour)')
			.addText(text => text
				.setPlaceholder('Enter your Unsplash API key')
				.setValue(this.plugin.settings.unsplashApiKey)
				.onChange(async (value) => {
					this.plugin.settings.unsplashApiKey = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Pixabay API Key')
			.setDesc('Get your free API key from pixabay.com/api/docs/ (20,000 requests/month)')
			.addText(text => text
				.setPlaceholder('Enter your Pixabay API key')
				.setValue(this.plugin.settings.pixabayApiKey)
				.onChange(async (value) => {
					this.plugin.settings.pixabayApiKey = value;
					await this.plugin.saveSettings();
				}));

		// Settings section
		containerEl.createEl('h3', { text: 'Download Settings' });

		new Setting(containerEl)
			.setName('Save Location')
			.setDesc('Folder where photos will be saved')
			.addText(text => text
				.setPlaceholder('Images/PhotoSearch')
				.setValue(this.plugin.settings.saveLocation)
				.onChange(async (value) => {
					this.plugin.settings.saveLocation = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Image Size')
			.setDesc('Size of images to download')
			.addDropdown(dropdown => dropdown
				.addOption('small', 'Small')
				.addOption('medium', 'Medium')
				.addOption('large', 'Large')
				.addOption('original', 'Original (Highest Resolution)')
				.setValue(this.plugin.settings.imageSize)
				.onChange(async (value) => {
					this.plugin.settings.imageSize = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Save Metadata')
			.setDesc('Insert photo metadata and attribution information into the note')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.saveMetadata)
				.onChange(async (value) => {
					this.plugin.settings.saveMetadata = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Include AI-Generated Images')
			.setDesc('Allow AI-generated images in search results')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.includeAiImages)
				.onChange(async (value) => {
					this.plugin.settings.includeAiImages = value;
					await this.plugin.saveSettings();
				}));
	}
}