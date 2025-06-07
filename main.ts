import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, requestUrl } from 'obsidian';

// Interface definitions
interface PhotoSearchSettings {
	pexelsApiKey: string;
	unsplashApiKey: string;
	pixabayApiKey: string;
	savePath: string;
	thumbnailSize: number;
	maxResults: number;
}

interface PhotoResult {
	id: string;
	url: string;
	downloadUrl: string;
	photographer: string;
	photographerUrl?: string;
	source: 'pexels' | 'unsplash' | 'pixabay';
	alt?: string;
	originalUrl: string;
	license: string;
	searchTerms?: string;
	width: number;
	height: number;
}

interface PexelsResponse {
	photos: Array<{
		id: number;
		url: string;
		src: {
			original: string;
			large: string;
			medium: string;
		};
		photographer: string;
		photographer_url: string;
		alt: string;
	}>;
}

interface UnsplashResponse {
	results: Array<{
		id: string;
		urls: {
			raw: string;
			full: string;
			regular: string;
		};
		user: {
			name: string;
			links: {
				html: string;
			};
		};
		alt_description: string;
		links: {
			html: string;
		};
		width: number;
		height: number;
	}>;
}

interface PixabayResponse {
	hits: Array<{
		id: number;
		webformatURL: string;
		largeImageURL: string;
		user: string;
		pageURL: string;
		tags: string;
		imageWidth: number;
		imageHeight: number;
	}>;
}

const DEFAULT_SETTINGS: PhotoSearchSettings = {
	pexelsApiKey: '',
	unsplashApiKey: '',
	pixabayApiKey: '',
	savePath: 'Images/PhotoSearch',
	thumbnailSize: 200,
	maxResults: 20
};

export default class PhotoSearchPlugin extends Plugin {
	settings: PhotoSearchSettings;

	async onload() {
		await this.loadSettings();

		// Add ribbon icon
		this.addRibbonIcon('image', 'Search Photos', () => {
			const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
			if (activeView) {
				this.openCustomSearchModal(activeView);
			} else {
				new Notice('Please open a markdown file first');
			}
		});

		// Add commands
		this.addCommand({
			id: 'search-photos-selected-text',
			name: 'Search photos from selected text',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				const selectedText = editor.getSelection();
				if (selectedText.trim()) {
					this.openPhotoSearchModal(selectedText.trim(), view);
				} else {
					new Notice('Please select some text first');
				}
			}
		});

		this.addCommand({
			id: 'search-photos-custom-query',
			name: 'Search photos with custom query',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.openCustomSearchModal(view);
			}
		});

		// Add settings tab
		this.addSettingTab(new PhotoSearchSettingTab(this.app, this));
	}

	onunload() {
		// Cleanup if needed
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	openCustomSearchModal(view: MarkdownView) {
		new CustomSearchModal(this.app, (query) => {
			this.openPhotoSearchModal(query, view);
		}).open();
	}

	openPhotoSearchModal(query: string, view: MarkdownView) {
		new PhotoSearchModal(this.app, this, query, view).open();
	}

	async searchPhotos(query: string): Promise<PhotoResult[]> {
		const results: PhotoResult[] = [];
		const searchPromises: Promise<void>[] = [];

		// Search Pexels
		if (this.settings.pexelsApiKey) {
			searchPromises.push(this.searchPexels(query, results));
		}

		// Search Unsplash
		if (this.settings.unsplashApiKey) {
			searchPromises.push(this.searchUnsplash(query, results));
		}

		// Search Pixabay
		if (this.settings.pixabayApiKey) {
			searchPromises.push(this.searchPixabay(query, results));
		}

		if (searchPromises.length === 0) {
			new Notice('Please configure at least one API key in settings');
			return [];
		}

		await Promise.allSettled(searchPromises);
		
		// Shuffle and limit results
		const shuffled = results.sort(() => 0.5 - Math.random());
		return shuffled.slice(0, this.settings.maxResults);
	}

	async searchPexels(query: string, results: PhotoResult[]) {
		try {
			const response = await requestUrl({
				url: `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=15`,
				headers: {
					'Authorization': this.settings.pexelsApiKey
				}
			});

			const data: PexelsResponse = response.json;
			
			data.photos.forEach(photo => {
				results.push({
					id: photo.id.toString(),
					url: photo.src.medium,
					downloadUrl: photo.src.large,
					photographer: photo.photographer,
					photographerUrl: photo.photographer_url,
					source: 'pexels',
					alt: photo.alt,
					originalUrl: photo.url,
					license: 'Free to use',
					searchTerms: query,
					width: 0,
					height: 0
				});
			});
		} catch (error) {
			console.error('Pexels search error:', error);
		}
	}

	async searchUnsplash(query: string, results: PhotoResult[]) {
		try {
			const response = await requestUrl({
				url: `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=15`,
				headers: {
					'Authorization': `Client-ID ${this.settings.unsplashApiKey}`
				}
			});

			const data: UnsplashResponse = response.json;
			
			data.results.forEach(photo => {
				results.push({
					id: photo.id,
					url: photo.urls.regular,
					downloadUrl: photo.urls.full,
					photographer: photo.user.name,
					photographerUrl: photo.user.links.html,
					source: 'unsplash',
					alt: photo.alt_description,
					originalUrl: photo.links.html,
					license: 'Unsplash License',
					searchTerms: query,
					width: photo.width,
					height: photo.height
				});
			});
		} catch (error) {
			console.error('Unsplash search error:', error);
		}
	}

	async searchPixabay(query: string, results: PhotoResult[]) {
		try {
			const response = await requestUrl({
				url: `https://pixabay.com/api/?key=${this.settings.pixabayApiKey}&q=${encodeURIComponent(query)}&image_type=photo&per_page=15`
			});

			const data: PixabayResponse = response.json;
			
			data.hits.forEach(photo => {
				results.push({
					id: photo.id.toString(),
					url: photo.webformatURL,
					downloadUrl: photo.largeImageURL,
					photographer: photo.user,
					source: 'pixabay',
					alt: photo.tags,
					originalUrl: photo.pageURL,
					license: 'Pixabay License',
					searchTerms: query,
					width: photo.imageWidth,
					height: photo.imageHeight
				});
			});
		} catch (error) {
			console.error('Pixabay search error:', error);
		}
	}

	async savePhoto(photoData: PhotoResult, activeView: MarkdownView) {
		try {
			// Ensure save directory exists
			const saveDir = this.settings.savePath;
			if (!await this.app.vault.adapter.exists(saveDir)) {
				await this.app.vault.createFolder(saveDir);
			}

			// Download the image
			const response = await requestUrl({
				url: photoData.downloadUrl,
				method: 'GET'
			});

			// Generate filename
			const cleanPhotographer = photoData.photographer.replace(/[^a-zA-Z0-9]/g, '_');
			const timestamp = Date.now();
			const extension = photoData.downloadUrl.includes('.jpg') ? 'jpg' : 'png';
			const filename = `${cleanPhotographer}_${timestamp}.${extension}`;
			const imagePath = `${saveDir}/${filename}`;

			// Save image to vault
			await this.app.vault.createBinary(imagePath, response.arrayBuffer);

			// Get current editor and cursor position
			const editor = activeView.editor;
			const cursor = editor.getCursor();
			
			// Create the content to insert
			const insertContent = this.createInsertContent(photoData, imagePath);
			
			// Find the end of the current line
			const currentLine = cursor.line;
			const lineContent = editor.getLine(currentLine);
			
			// Insert content after current line
			const insertPosition = {
				line: currentLine + 1,
				ch: 0
			};
			
			// Add proper spacing
			let contentToInsert = insertContent;
			if (lineContent.trim() !== '') {
				contentToInsert = '\n' + insertContent;
			}
			
			editor.setCursor(currentLine, lineContent.length);
			editor.replaceSelection(contentToInsert);
			
			// Position cursor after inserted content
			const newLines = insertContent.split('\n').length;
			editor.setCursor(currentLine + newLines + 1, 0);
			
			new Notice('Photo inserted successfully!');
			
		} catch (error) {
			console.error('Error saving photo:', error);
			new Notice('Failed to save photo: ' + error.message);
		}
	}

	createInsertContent(photoData: PhotoResult, imagePath: string): string {
		const thumbnailSize = this.settings.thumbnailSize;
		
		// Create thumbnail with link to original file
		const thumbnailMarkdown = `[![${photoData.alt || 'Photo'}|${thumbnailSize}](${imagePath})](${imagePath})`;
		
		// Create attribution link
		const attributionLink = photoData.photographerUrl 
			? `[${photoData.photographer}](${photoData.photographerUrl})`
			: photoData.photographer;
		
		// Create source link
		const sourceText = photoData.source.charAt(0).toUpperCase() + photoData.source.slice(1);
		const sourceLink = `[${sourceText}](${photoData.originalUrl})`;
		
		// Create metadata block using callout format
		const metadataBlock = `> [!info] Photo Details
> - **Photographer:** ${attributionLink}
> - **Source:** ${sourceLink}
> - **License:** ${photoData.license}
> - **Downloaded:** ${new Date().toISOString().split('T')[0]}
> - **Search Terms:** ${photoData.searchTerms || 'N/A'}`;

		return `${thumbnailMarkdown}\n\n${metadataBlock}\n`;
	}
}

// Custom Search Modal for entering search terms
class CustomSearchModal extends Modal {
	onSubmit: (query: string) => void;

	constructor(app: App, onSubmit: (query: string) => void) {
		super(app);
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl('h2', { text: 'Search Photos' });

		const inputEl = contentEl.createEl('input', {
			type: 'text',
			placeholder: 'Enter search terms (e.g., "sunset mountains")'
		});
		
		inputEl.style.width = '100%';
		inputEl.style.padding = '8px';
		inputEl.style.marginBottom = '16px';
		
		const buttonEl = contentEl.createEl('button', { text: 'Search' });
		buttonEl.style.padding = '8px 16px';
		
		const submitSearch = () => {
			const query = inputEl.value.trim();
			if (query) {
				this.onSubmit(query);
				this.close();
			} else {
				new Notice('Please enter search terms');
			}
		};
		
		buttonEl.addEventListener('click', submitSearch);
		inputEl.addEventListener('keypress', (e) => {
			if (e.key === 'Enter') {
				submitSearch();
			}
		});
		
		inputEl.focus();
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

// Photo Search Results Modal
class PhotoSearchModal extends Modal {
	plugin: PhotoSearchPlugin;
	query: string;
	activeView: MarkdownView;
	photos: PhotoResult[] = [];

	constructor(app: App, plugin: PhotoSearchPlugin, query: string, activeView: MarkdownView) {
		super(app);
		this.plugin = plugin;
		this.query = query;
		this.activeView = activeView;
	}

	async onOpen() {
		const { contentEl } = this;
		contentEl.createEl('h2', { text: `Photo Search: "${this.query}"` });
		
		const loadingEl = contentEl.createEl('div', { text: 'Searching...' });
		
		try {
			this.photos = await this.plugin.searchPhotos(this.query);
			loadingEl.remove();
			
			if (this.photos.length === 0) {
				contentEl.createEl('div', { text: 'No photos found. Try different search terms.' });
				return;
			}
			
			this.displayPhotos();
		} catch (error) {
			loadingEl.textContent = 'Error searching photos: ' + error.message;
		}
	}

	displayPhotos() {
		const { contentEl } = this;
		
		const gridEl = contentEl.createEl('div');
		gridEl.style.display = 'grid';
		gridEl.style.gridTemplateColumns = 'repeat(auto-fill, minmax(200px, 1fr))';
		gridEl.style.gap = '16px';
		gridEl.style.maxHeight = '500px';
		gridEl.style.overflowY = 'auto';
		gridEl.style.padding = '16px 0';
		
		this.photos.forEach(photo => {
			const photoEl = gridEl.createEl('div');
			photoEl.style.border = '1px solid var(--background-modifier-border)';
			photoEl.style.borderRadius = '8px';
			photoEl.style.overflow = 'hidden';
			photoEl.style.cursor = 'pointer';
			photoEl.style.transition = 'transform 0.2s';
			
			photoEl.addEventListener('mouseenter', () => {
				photoEl.style.transform = 'scale(1.02)';
			});
			
			photoEl.addEventListener('mouseleave', () => {
				photoEl.style.transform = 'scale(1)';
			});
			
			const imgEl = photoEl.createEl('img');
			imgEl.src = photo.url;
			imgEl.style.width = '100%';
			imgEl.style.height = '150px';
			imgEl.style.objectFit = 'cover';
			
			const infoEl = photoEl.createEl('div');
			infoEl.style.padding = '8px';
			
			const photographerEl = infoEl.createEl('div');
			photographerEl.textContent = `By: ${photo.photographer}`;
			photographerEl.style.fontSize = '12px';
			photographerEl.style.marginBottom = '4px';
			
			const sourceEl = infoEl.createEl('div');
			sourceEl.textContent = photo.source.toUpperCase();
			sourceEl.style.fontSize = '10px';
			sourceEl.style.color = 'var(--text-muted)';
			
			photoEl.addEventListener('click', () => {
				this.plugin.savePhoto(photo, this.activeView);
				this.close();
			});
		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

// Settings Tab
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

		// API Keys Section
		containerEl.createEl('h3', { text: 'API Keys' });
		containerEl.createEl('p', { 
			text: 'Get free API keys from the respective services. You need at least one API key to search for photos.'
		});

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
				.setPlaceholder('Enter your Unsplash Access Key')
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

		// Download Settings Section
		containerEl.createEl('h3', { text: 'Download Settings' });

		new Setting(containerEl)
			.setName('Save Location')
			.setDesc('Folder where downloaded photos will be saved')
			.addText(text => text
				.setPlaceholder('Images/PhotoSearch')
				.setValue(this.plugin.settings.savePath)
				.onChange(async (value) => {
					this.plugin.settings.savePath = value || 'Images/PhotoSearch';
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Thumbnail Size')
			.setDesc('Size of the thumbnail image inserted (in pixels, 50-800)')
			.addText(text => text
				.setPlaceholder('200')
				.setValue(String(this.plugin.settings.thumbnailSize))
				.onChange(async (value) => {
					const size = parseInt(value) || 200;
					this.plugin.settings.thumbnailSize = Math.max(50, Math.min(800, size));
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Max Results')
			.setDesc('Maximum number of photos to show in search results')
			.addText(text => text
				.setPlaceholder('20')
				.setValue(String(this.plugin.settings.maxResults))
				.onChange(async (value) => {
					const max = parseInt(value) || 20;
					this.plugin.settings.maxResults = Math.max(5, Math.min(50, max));
					await this.plugin.saveSettings();
				}));
	}
}