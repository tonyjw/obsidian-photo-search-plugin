import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, requestUrl, TFile } from 'obsidian';

interface PhotoSearchSettings {
	pexelsApiKey: string;
	unsplashApiKey: string;
	pixabayApiKey: string;
	saveLocation: string;
	imageSize: string;
	saveMetadata: boolean;
}

const DEFAULT_SETTINGS: PhotoSearchSettings = {
	pexelsApiKey: '',
	unsplashApiKey: '',
	pixabayApiKey: '',
	saveLocation: 'Images/PhotoSearch',
	imageSize: 'medium',
	saveMetadata: true
};

interface Photo {
	id: string;
	url: string;
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
		let selection = editor.getSelection();
		// If we have a selection, use it
		if (selection && selection.trim().length > 0) {
			return this.cleanSearchText(selection.trim());
		}

		// If no selection, try to get text from current line (including headers)
		const cursor = editor.getCursor();
		const line = editor.getLine(cursor.line);
		// Check if current line is a header and extract header text
		const headerMatch = line.match(/^(#{1,6})\s*(.+)$/);
		if (headerMatch && headerMatch[2]) {
			selection = headerMatch[2].trim(); // Extract text without # symbols
		} else if (line.trim().length > 0) {
			// If not a header but has content, use the whole line
			selection = line.trim();
		} else {
			// Last resort: try to get word under cursor
			selection = this.getWordUnderCursor(editor);
		}

		if (selection && selection.trim().length > 0) {
			return this.cleanSearchText(selection.trim());
		}

		// If still nothing, use the page title (file name without extension)
		if (view && view.file) {
			const fileName = view.file.basename;
			return this.cleanSearchText(fileName);
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

		return response.json.photos.map((photo: any): Photo => ({
			id: `pexels-${photo.id}`,
			url: photo.url,
			downloadUrl: photo.src[this.settings.imageSize] || photo.src.medium,
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
			url: `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=20`,
			headers: {
				'Authorization': `Client-ID ${this.settings.unsplashApiKey}`
			}
		});

		return response.json.results.map((photo: any): Photo => ({
			id: `unsplash-${photo.id}`,
			url: photo.links.html,
			downloadUrl: photo.urls[this.settings.imageSize] || photo.urls.regular,
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
			url: `https://pixabay.com/api/?key=${this.settings.pixabayApiKey}&q=${encodeURIComponent(query)}&image_type=photo&per_page=20`
		});

		return response.json.hits.map((photo: any): Photo => ({
			id: `pixabay-${photo.id}`,
			url: photo.pageURL,
			downloadUrl: photo.webformatURL,
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
			// Create directory if it doesn't exist
			const folder = this.settings.saveLocation;
			if (!await this.app.vault.adapter.exists(folder)) {
				await this.app.vault.createFolder(folder);
			}

			// Download image
			const response = await requestUrl({ url: photo.downloadUrl });
			const imageData = response.arrayBuffer;

			// Generate filename
			const extension = photo.downloadUrl.split('.').pop()?.split('?')[0] || 'jpg';
			const filename = `${searchQuery.replace(/[^a-zA-Z0-9]/g, '_')}_${photo.id}.${extension}`;
			const imagePath = `${folder}/${filename}`;

			// Save image
			await this.app.vault.createBinary(imagePath, imageData);

			// Get active editor
			const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
			if (activeView) {
				const editor = activeView.editor;
				const cursor = editor.getCursor();

				const metadataBlock = `

![[${imagePath}|300]]

> [!metadata]
> - **Source**: ${photo.source}
> - **Photographer**: ${photo.photographer}
> - **Original**: [View on ${photo.source}](${photo.url})
> - **Search Query**: "${searchQuery}"${photo.description ? `\n> - **Description**: ${photo.description}` : ''}
> - **Tags**: ${photo.tags.join(', ')}

`;

				// Insert metadata at cursor position
				editor.replaceRange(metadataBlock, cursor);
			}

			new Notice(`Photo saved and metadata inserted`);
			return imagePath;
		} catch (error) {
			console.error('Error saving photo:', error);
			new Notice('Error saving photo. Check console for details.');
		}
	}
}

class PhotoSearchModal extends Modal {
	plugin: PhotoSearchPlugin;
	query: string;
	photos: Photo[] = [];
	loading = false;

	constructor(app: App, plugin: PhotoSearchPlugin, query: string) {
		super(app);
		this.plugin = plugin;
		this.query = query;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl('h2', { text: `Photo Search: "${this.query}"` });

		const loadingEl = contentEl.createEl('div', { text: 'Searching for photos...' });
		
		this.searchPhotos(loadingEl);
	}

	async searchPhotos(loadingEl: HTMLElement) {
		this.loading = true;
		
		try {
			this.photos = await this.plugin.searchPhotos(this.query);
			loadingEl.remove();
			this.displayPhotos();
		} catch (error) {
			loadingEl.setText('Error searching for photos. Please check your API keys.');
			console.error('Search error:', error);
		}
		
		this.loading = false;
	}

	displayPhotos() {
		const { contentEl } = this;
		
		if (this.photos.length === 0) {
			contentEl.createEl('p', { text: 'No photos found. Try a different search term.' });
			return;
		}

		const gridEl = contentEl.createEl('div', { cls: 'photo-grid' });
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
			imgEl.src = photo.downloadUrl;
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
				.setValue(this.plugin.settings.imageSize)
				.onChange(async (value) => {
					this.plugin.settings.imageSize = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Save Metadata')
			.setDesc('Save photo metadata and attribution information')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.saveMetadata)
				.onChange(async (value) => {
					this.plugin.settings.saveMetadata = value;
					await this.plugin.saveSettings();
				}));
	}
}