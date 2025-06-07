import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, requestUrl, TFile, normalizePath } from 'obsidian';

interface PhotoSearchSettings {
	pexelsApiKey: string;
	unsplashApiKey: string;
	pixabayApiKey: string;
	saveLocation: string;
	imageSize: string;
	saveMetadata: boolean;
	includeAiImages: boolean;
	defaultProvider: string;
}

const DEFAULT_SETTINGS: PhotoSearchSettings = {
	pexelsApiKey: '',
	unsplashApiKey: '',
	pixabayApiKey: '',
	saveLocation: 'Images/PhotoSearch',
	imageSize: 'medium',  // options: 'small', 'medium', 'large', 'original'
	saveMetadata: true,
	includeAiImages: false,
	defaultProvider: 'unsplash'
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
	isAiGenerated?: boolean;
}

export default class PhotoSearchPlugin extends Plugin {
	settings: PhotoSearchSettings;

	async onload() {
		await this.loadSettings();

			// Add CSS styles for enhanced photo browsing experience
		const css = `
			/* Modal sizing for better image browsing */
			.modal.photo-search-modal {
				max-width: 90vw !important;
				max-height: 90vh !important;
				width: 1200px !important;
			}
			.modal.photo-search-modal .modal-content {
				max-height: 85vh !important;
				overflow-y: auto;
			}
			
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
			
			/* Enhanced photo grid for better browsing */
			.photo-grid {
				display: grid !important;
				grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)) !important;
				gap: 15px !important;
				max-height: 70vh !important;
				overflow-y: auto !important;
				padding: 10px !important;
			}
			
			.photo-item {
				position: relative;
				border: 2px solid transparent !important;
				border-radius: 8px !important;
				padding: 12px !important;
				cursor: pointer !important;
				transition: all 0.3s ease !important;
				background: var(--background-secondary) !important;
				overflow: hidden;
			}
			
			.photo-item:hover {
				border-color: var(--interactive-accent) !important;
				transform: translateY(-2px) !important;
				box-shadow: 0 8px 25px rgba(0,0,0,0.15) !important;
				background: var(--background-primary) !important;
			}
			
			.photo-item img {
				width: 100% !important;
				height: 200px !important;
				object-fit: cover !important;
				border-radius: 6px !important;
				transition: transform 0.3s ease !important;
			}
			
			.photo-item:hover img {
				transform: scale(1.02) !important;
			}
			
			/* Large preview overlay with improved interaction */
			.photo-preview-overlay {
				position: fixed;
				top: 0;
				left: 0;
				width: 100vw;
				height: 100vh;
				background: rgba(0, 0, 0, 0.85);
				z-index: 1000;
				display: flex;
				align-items: center;
				justify-content: center;
				opacity: 0;
				transition: opacity 0.3s ease;
				pointer-events: none;
				cursor: pointer;
			}
			
			.photo-preview-overlay.show {
				opacity: 1;
				pointer-events: all;
			}
			
			.photo-preview-container {
				position: relative;
				display: flex;
				flex-direction: column;
				align-items: center;
				max-width: 90vw;
				max-height: 90vh;
				cursor: default;
			}
			
			.photo-preview-image {
				max-width: 80vw;
				max-height: 70vh;
				border-radius: 12px;
				box-shadow: 0 20px 60px rgba(0, 0, 0, 0.7);
				transition: transform 0.3s ease;
				transform: scale(0.9);
				margin-bottom: 20px;
			}
			
			.photo-preview-overlay.show .photo-preview-image {
				transform: scale(1);
			}
			
			.photo-preview-info {
				display: flex;
				gap: 20px;
				margin-bottom: 20px;
				color: white;
				font-size: 14px;
				text-align: center;
			}
			
			.preview-photographer {
				font-weight: 500;
			}
			
			.preview-dimensions, .preview-source {
				opacity: 0.8;
			}
			
			.photo-preview-actions {
				display: flex;
				gap: 15px;
			}
			
			.photo-preview-btn {
				padding: 12px 24px;
				border: none;
				border-radius: 8px;
				font-size: 14px;
				font-weight: 500;
				cursor: pointer;
				transition: all 0.2s ease;
				text-transform: uppercase;
				letter-spacing: 0.5px;
			}
			
			.close-btn {
				background: rgba(255, 255, 255, 0.15);
				color: white;
				border: 1px solid rgba(255, 255, 255, 0.3);
			}
			
			.close-btn:hover {
				background: rgba(255, 255, 255, 0.25);
				transform: translateY(-1px);
			}
			
			.select-btn {
				background: linear-gradient(135deg, #4caf50, #66bb6a);
				color: white;
				box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3);
			}
			
			.select-btn:hover {
				background: linear-gradient(135deg, #45a049, #5cb85c);
				transform: translateY(-1px);
				box-shadow: 0 6px 20px rgba(76, 175, 80, 0.4);
			}
			
			/* Enhanced AI badges with better tooltips */
			.ai-badge {
				position: absolute;
				top: 12px;
				right: 12px;
				background: linear-gradient(135deg, #ff6b6b, #ff8e8e);
				color: white;
				padding: 4px 8px;
				border-radius: 12px;
				font-size: 11px;
				font-weight: bold;
				text-shadow: 0 1px 2px rgba(0,0,0,0.3);
				box-shadow: 0 3px 8px rgba(0,0,0,0.25);
				z-index: 15;
				cursor: help;
				transition: all 0.2s ease;
			}
			
			.ai-badge:hover {
				transform: scale(1.1);
				box-shadow: 0 4px 12px rgba(0,0,0,0.3);
			}
			
			.ai-badge.unknown {
				background: linear-gradient(135deg, #ffa726, #ffb74d);
			}
			
			.ai-badge.no-ai {
				background: linear-gradient(135deg, #4caf50, #66bb6a);
			}
			
			/* Smooth scrollbar styling */
			.photo-grid::-webkit-scrollbar {
				width: 8px;
			}
			.photo-grid::-webkit-scrollbar-track {
				background: var(--background-modifier-border);
				border-radius: 4px;
			}
			.photo-grid::-webkit-scrollbar-thumb {
				background: var(--text-muted);
				border-radius: 4px;
			}
			.photo-grid::-webkit-scrollbar-thumb:hover {
				background: var(--text-normal);
			}
			
			/* Loading state styling */
			.loading-state {
				text-align: center;
				padding: 40px;
				color: var(--text-muted);
				font-style: italic;
			}
			
			/* Responsive adjustments */
			@media (max-width: 768px) {
				.modal.photo-search-modal {
					width: 95vw !important;
					max-width: 95vw !important;
				}
				.photo-grid {
					grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)) !important;
				}
			}
			.provider-tabs {
				display: flex;
				border-bottom: 1px solid var(--background-modifier-border);
				margin-bottom: 15px;
				gap: 2px;
			}
			.provider-tab {
				padding: 8px 16px;
				cursor: pointer;
				border: 1px solid var(--background-modifier-border);
				border-bottom: none;
				background: var(--background-secondary);
				color: var(--text-muted);
				font-size: 13px;
				font-weight: 500;
				border-radius: 6px 6px 0 0;
				transition: all 0.2s;
				position: relative;
			}
			.provider-tab:hover {
				background: var(--background-modifier-hover);
				color: var(--text-normal);
			}
			.provider-tab.active {
				background: var(--background-primary);
				color: var(--text-normal);
				border-bottom: 1px solid var(--background-primary);
				margin-bottom: -1px;
				z-index: 1;
			}
			.provider-tab.disabled {
				opacity: 0.5;
				cursor: not-allowed;
				color: var(--text-faint);
			}
			.provider-tab.disabled:hover {
				background: var(--background-secondary);
				color: var(--text-faint);
			}
			.provider-tab-count {
				margin-left: 6px;
				padding: 2px 6px;
				background: var(--background-modifier-border);
				border-radius: 10px;
				font-size: 11px;
				font-weight: bold;
			}
			.provider-tab.active .provider-tab-count {
				background: var(--interactive-accent);
				color: white;
			}
			.tab-content {
				display: none;
			}
			.tab-content.active {
				display: block;
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

	// URL detection methods
	detectPhotoURL(input: string): { provider: string; id: string } | null {
		const trimmedInput = input.trim();
		
		// Remove common URL artifacts and parameters
		const cleanedInput = trimmedInput.split('?')[0].split('#')[0];
		
		// Pexels URL patterns
		// https://www.pexels.com/photo/photo-name-123456/
		// https://www.pexels.com/photo/photo-name-123456
		const pexelsMatch = cleanedInput.match(/pexels\.com\/photo\/[^\/]+-(\d+)\/?$/);
		if (pexelsMatch) {
			return { provider: 'pexels', id: pexelsMatch[1] };
		}

		// Unsplash URL patterns
		// https://unsplash.com/photos/abc123xyz
		// https://unsplash.com/photos/photo-name-abc123xyz
		// https://unsplash.com/@photographer/abc123xyz
		const unsplashMatch = cleanedInput.match(/unsplash\.com\/(?:photos\/(?:[^\/]+-)?|@[^\/]+\/)([a-zA-Z0-9_-]+)\/?$/);
		if (unsplashMatch) {
			return { provider: 'unsplash', id: unsplashMatch[1] };
		}

		// Pixabay URL patterns
		// https://pixabay.com/photos/photo-name-123456/
		// https://pixabay.com/en/photos/photo-name-123456/
		// https://pixabay.com/photos/photo-name-123456
		const pixabayMatch = cleanedInput.match(/pixabay\.com\/(?:[a-z]{2}\/)?photos\/[^\/]+-(\d+)\/?$/);
		if (pixabayMatch) {
			return { provider: 'pixabay', id: pixabayMatch[1] };
		}

		return null;
	}

	async fetchPhotoByURL(provider: string, id: string): Promise<Photo | null> {
		try {
			switch (provider) {
				case 'pexels':
					return await this.fetchPexelsPhoto(id);
				case 'unsplash':
					return await this.fetchUnsplashPhoto(id);
				case 'pixabay':
					return await this.fetchPixabayPhoto(id);
				default:
					return null;
			}
		} catch (error) {
			console.error(`Error fetching ${provider} photo ${id}:`, error);
			return null;
		}
	}

	async fetchPexelsPhoto(id: string): Promise<Photo | null> {
		if (!this.settings.pexelsApiKey) {
			throw new Error('Pexels API key not configured');
		}

		const response = await requestUrl({
			url: `https://api.pexels.com/v1/photos/${id}`,
			headers: {
				'Authorization': this.settings.pexelsApiKey
			}
		});

		const photo = response.json;
		return {
			id: `pexels-${photo.id}`,
			url: photo.url,
			previewUrl: photo.src.medium,
			downloadUrl: this.settings.imageSize === 'original' ? photo.src.original : (photo.src[this.settings.imageSize] || photo.src.medium),
			photographer: photo.photographer,
			source: 'Pexels',
			tags: photo.alt ? photo.alt.split(' ') : [],
			description: photo.alt,
			width: photo.width,
			height: photo.height,
			isAiGenerated: photo.ai_generated || false
		};
	}

	async fetchUnsplashPhoto(id: string): Promise<Photo | null> {
		if (!this.settings.unsplashApiKey) {
			throw new Error('Unsplash API key not configured');
		}

		const response = await requestUrl({
			url: `https://api.unsplash.com/photos/${id}`,
			headers: {
				'Authorization': `Client-ID ${this.settings.unsplashApiKey}`
			}
		});

		const photo = response.json;
		return {
			id: `unsplash-${photo.id}`,
			url: photo.links.html,
			previewUrl: photo.urls.small,
			downloadUrl: this.settings.imageSize === 'original' ? photo.urls.raw : (photo.urls[this.settings.imageSize] || photo.urls.regular),
			photographer: photo.user.name,
			source: 'Unsplash',
			tags: photo.tags ? photo.tags.map((tag: any) => tag.title) : [],
			description: photo.description || photo.alt_description,
			width: photo.width,
			height: photo.height,
			isAiGenerated: undefined  // Unsplash doesn't provide explicit AI generation status
		};
	}

	async fetchPixabayPhoto(id: string): Promise<Photo | null> {
		if (!this.settings.pixabayApiKey) {
			throw new Error('Pixabay API key not configured');
		}

		const response = await requestUrl({
			url: `https://pixabay.com/api/?key=${this.settings.pixabayApiKey}&id=${id}`
		});

		const photos = response.json.hits;
		if (photos.length === 0) {
			return null;
		}

		const photo = photos[0];
		return {
			id: `pixabay-${photo.id}`,
			url: photo.pageURL,
			previewUrl: photo.previewURL,
			downloadUrl: this.settings.imageSize === 'original' ? photo.largeImageURL : (photo.webformatURL),
			photographer: photo.user,
			source: 'Pixabay',
			tags: photo.tags.split(', '),
			description: photo.tags,
			width: photo.imageWidth,
			height: photo.imageHeight,
			isAiGenerated: undefined  // Pixabay uses filtering but doesn't provide explicit status in response
		};
	}

	async searchPhotos(query: string): Promise<Photo[]> {
		// Check if the query is a URL from one of our supported providers
		const urlInfo = this.detectPhotoURL(query);
		if (urlInfo) {
			const photo = await this.fetchPhotoByURL(urlInfo.provider, urlInfo.id);
			return photo ? [photo] : [];
		}

		// Regular search across all providers
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
				height: photo.height,
				isAiGenerated: photo.ai_generated || false
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
			height: photo.height,
			isAiGenerated: undefined  // Unsplash doesn't provide explicit AI generation status
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
			height: photo.imageHeight,
			isAiGenerated: undefined  // Pixabay uses filtering but doesn't provide explicit status in response
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
			
			// Format AI generation status for display
			const aiStatus = this.formatAiStatus(photo.isAiGenerated, photo.source);
			
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
> - **AI Generated**: ${aiStatus}

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

	// Helper method to format AI generation status
	formatAiStatus(isAiGenerated: boolean | undefined, source: string): string {
		if (isAiGenerated === true) {
			return 'Yes';
		} else if (isAiGenerated === false) {
			return 'No';
		} else {
			// For sources that don't provide explicit AI status
			if (source === 'Unsplash' && !this.settings.includeAiImages) {
				return 'No (filtered)';
			} else if (source === 'Pixabay' && !this.settings.includeAiImages) {
				return 'No (filtered)';
			} else {
				return 'Unknown';
			}
		}
	}
}

class PhotoSearchModal extends Modal {
	plugin: PhotoSearchPlugin;
	query: string;
	photos: Photo[] = [];
	photosByProvider: { [key: string]: Photo[] } = {};
	loading = false;
	searchInput: HTMLInputElement;
	activeTab: string = 'unsplash';
	currentPreviewOverlay: HTMLElement | null = null;

	constructor(app: App, plugin: PhotoSearchPlugin, query: string) {
		super(app);
		this.plugin = plugin;
		this.query = query;
		this.activeTab = plugin.settings.defaultProvider;
		this.modalEl.addClass('photo-search-modal');
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
		const loadingEl = container.createEl('div', { 
			cls: 'loading-state',
			text: '🔍 Searching for photos...' 
		});
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
			
			// Check if the query is a URL
			const urlInfo = this.plugin.detectPhotoURL(this.query);
			if (urlInfo) {
				// Show URL detection feedback
				container.empty();
				const urlFeedback = container.createEl('div', { cls: 'url-detection-feedback' });
				urlFeedback.style.padding = '15px';
				urlFeedback.style.marginBottom = '15px';
				urlFeedback.style.backgroundColor = 'rgba(76, 175, 80, 0.1)';
				urlFeedback.style.border = '1px solid rgba(76, 175, 80, 0.3)';
				urlFeedback.style.borderRadius = '6px';
				urlFeedback.style.textAlign = 'center';
				
				urlFeedback.createEl('div', { 
					text: `🔗 ${urlInfo.provider.charAt(0).toUpperCase() + urlInfo.provider.slice(1)} URL detected`,
					attr: { style: 'font-weight: bold; color: #4CAF50; margin-bottom: 5px;' }
				});
				urlFeedback.createEl('div', { 
					text: `Fetching specific photo instead of searching...`,
					attr: { style: 'font-size: 0.9em; color: var(--text-muted);' }
				});
			}
			
			this.photos = await this.plugin.searchPhotos(this.query);
			
			// Group photos by provider
			this.photosByProvider = {
				'pexels': this.photos.filter(p => p.source === 'Pexels'),
				'unsplash': this.photos.filter(p => p.source === 'Unsplash'),
				'pixabay': this.photos.filter(p => p.source === 'Pixabay')
			};
			
			// Only clear container if we didn't show URL feedback
			if (!urlInfo) {
				container.empty();
			} else {
				// Remove only the loading state, keep the URL feedback
				const loadingEl = container.querySelector('.loading-state');
				if (loadingEl) loadingEl.remove();
			}
			this.displayPhotos(container);
		} catch (error) {
			console.error('Detailed search error:', error);
			container.empty();
			container.createEl('div', { text: 'Error searching for photos. Please check your API keys and browser console for details.' });
		}
	}

	displayPhotos(container: HTMLElement = this.contentEl) {
		if (this.photos.length === 0) {
			// Check if this was a URL query that failed
			const urlInfo = this.plugin.detectPhotoURL(this.query);
			
			if (urlInfo) {
				// URL was detected but photo not found
				container.createEl('div', { 
					text: `❌ Photo not found at the ${urlInfo.provider.charAt(0).toUpperCase() + urlInfo.provider.slice(1)} URL`,
					attr: { style: 'text-align: center; padding: 20px; color: #f44336; font-weight: bold;' }
				});
				container.createEl('p', { 
					text: 'The photo may have been removed, the URL might be incorrect, or you may need to configure the appropriate API key.',
					attr: { style: 'text-align: center; padding: 0 20px 20px; color: var(--text-muted); font-size: 0.9em;' }
				});
				return;
			}
			
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

		// Create provider tabs
		const tabsContainer = container.createEl('div', { cls: 'provider-tabs' });
		
		const providers = [
			{ key: 'pexels', name: 'Pexels', apiKey: this.plugin.settings.pexelsApiKey },
			{ key: 'unsplash', name: 'Unsplash', apiKey: this.plugin.settings.unsplashApiKey },
			{ key: 'pixabay', name: 'Pixabay', apiKey: this.plugin.settings.pixabayApiKey }
		];

		providers.forEach(provider => {
			const tab = tabsContainer.createEl('div', { 
				cls: 'provider-tab',
				text: provider.name
			});
			
			// Add data attribute to identify the provider
			tab.setAttribute('data-provider', provider.key);
			
			const count = this.photosByProvider[provider.key]?.length || 0;
			if (count > 0) {
				tab.createEl('span', { cls: 'provider-tab-count', text: count.toString() });
			}
			
			// Mark tab as disabled if no API key configured
			if (!provider.apiKey) {
				tab.addClass('disabled');
				tab.title = `Configure ${provider.name} API key in settings to use this provider`;
			} else {
				tab.addEventListener('click', () => {
					this.activeTab = provider.key;
					this.showTabContent(container);
				});
			}
			
			// Set active tab
			if (this.activeTab === provider.key) {
				tab.addClass('active');
			}
		});

		// Create tab content containers
		const contentContainer = container.createEl('div', { cls: 'tab-contents' });
		
		providers.forEach(provider => {
			const tabContent = contentContainer.createEl('div', { 
				cls: 'tab-content',
				attr: { 'data-provider': provider.key }
			});
			
			if (this.activeTab === provider.key) {
				tabContent.addClass('active');
			}
			
			this.renderPhotosGrid(tabContent, this.photosByProvider[provider.key] || []);
		});
	}

	showTabContent(container: HTMLElement) {
		// Update tab active states
		const tabs = container.querySelectorAll('.provider-tab');
		tabs.forEach(tab => {
			tab.classList.remove('active');
			if (tab.getAttribute('data-provider') === this.activeTab) {
				tab.classList.add('active');
			}
		});
		
		// Update content active states
		const contents = container.querySelectorAll('.tab-content');
		contents.forEach(content => {
			content.classList.remove('active');
			if (content.getAttribute('data-provider') === this.activeTab) {
				content.classList.add('active');
			}
		});
	}

	renderPhotosGrid(container: HTMLElement, photos: Photo[]) {
		if (photos.length === 0) {
			container.createEl('p', { 
				text: 'No photos found from this provider.',
				attr: { style: 'text-align: center; padding: 20px; color: var(--text-muted);' }
			});
			return;
		}

		const gridEl = container.createEl('div', { cls: 'photo-grid' });

		photos.forEach(photo => {
			const photoEl = gridEl.createEl('div', { cls: 'photo-item' });

			const imgEl = photoEl.createEl('img');
			imgEl.src = photo.previewUrl;
			imgEl.alt = photo.description || `Photo by ${photo.photographer}`;

			// Enhanced AI generation indicators - only show when we have definitive information
			if (photo.isAiGenerated === true) {
				const aiBadge = photoEl.createEl('div', { cls: 'ai-badge', text: 'AI' });
				aiBadge.title = '🤖 AI Generated Image\nThis image was created using artificial intelligence';
			} else if (photo.isAiGenerated === false) {
				const aiBadge = photoEl.createEl('div', { cls: 'ai-badge no-ai', text: '📷' });
				aiBadge.title = '📷 Human Photographer\nThis image was taken by a human photographer';
			}
			// Note: No badge for unknown AI status - don't overwhelm users with warnings

			const infoEl = photoEl.createEl('div');
			infoEl.style.marginTop = '8px';
			infoEl.style.fontSize = '13px';
			infoEl.style.color = 'var(--text-muted)';

			infoEl.createEl('div', { 
				text: `📸 ${photo.photographer}`,
				attr: { style: 'font-weight: 500; margin-bottom: 2px;' }
			});
			infoEl.createEl('div', { 
				text: `📦 ${photo.source}`,
				attr: { style: 'font-size: 11px; opacity: 0.8;' }
			});
			
			// Add dimensions info for better browsing
			if (photo.width && photo.height) {
				infoEl.createEl('div', { 
					text: `📐 ${photo.width}×${photo.height}`,
					attr: { style: 'font-size: 11px; opacity: 0.6; margin-top: 2px;' }
				});
			}

			// Add click to preview functionality (two-step process)
			photoEl.addEventListener('click', () => {
				this.showImagePreview(photo.downloadUrl, photo.photographer, photo);
			});
		});
	}

	showImagePreview(imageUrl: string, photographer: string, photo: Photo) {
		// Remove any existing preview
		this.hideImagePreview();

		const overlay = document.createElement('div');
		overlay.className = 'photo-preview-overlay';
		
		// Create preview container
		const previewContainer = document.createElement('div');
		previewContainer.className = 'photo-preview-container';
		
		const img = document.createElement('img');
		img.className = 'photo-preview-image';
		img.src = imageUrl;
		img.alt = `Photo by ${photographer}`;
		
		// Create action buttons container
		const actionsContainer = document.createElement('div');
		actionsContainer.className = 'photo-preview-actions';
		
		// Close button
		const closeButton = document.createElement('button');
		closeButton.className = 'photo-preview-btn close-btn';
		closeButton.textContent = 'Close';
		closeButton.addEventListener('click', (e) => {
			e.stopPropagation();
			this.hideImagePreview();
		});
		
		// Select button
		const selectButton = document.createElement('button');
		selectButton.className = 'photo-preview-btn select-btn';
		selectButton.textContent = 'Select Image';
		selectButton.addEventListener('click', (e) => {
			e.stopPropagation();
			this.plugin.savePhoto(photo, this.query);
			this.close();
		});
		
		// Photo info
		const infoContainer = document.createElement('div');
		infoContainer.className = 'photo-preview-info';
		infoContainer.innerHTML = `
			<div class="preview-photographer">📸 ${photographer}</div>
			<div class="preview-dimensions">${photo.width && photo.height ? `📐 ${photo.width}×${photo.height}` : ''}</div>
			<div class="preview-source">📦 ${photo.source}</div>
		`;
		
		actionsContainer.appendChild(closeButton);
		actionsContainer.appendChild(selectButton);
		
		previewContainer.appendChild(img);
		previewContainer.appendChild(infoContainer);
		previewContainer.appendChild(actionsContainer);
		
		overlay.appendChild(previewContainer);
		document.body.appendChild(overlay);
		
		// Store reference for cleanup
		this.currentPreviewOverlay = overlay;
		
		// Close on overlay background click (not on container)
		overlay.addEventListener('click', (e) => {
			if (e.target === overlay) {
				this.hideImagePreview();
			}
		});
		
		// Close on Escape key
		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				this.hideImagePreview();
				document.removeEventListener('keydown', handleEscape);
			}
		};
		document.addEventListener('keydown', handleEscape);
		
		// Trigger animation
		requestAnimationFrame(() => {
			overlay.classList.add('show');
		});
	}

	hideImagePreview() {
		if (this.currentPreviewOverlay) {
			this.currentPreviewOverlay.classList.remove('show');
			setTimeout(() => {
				if (this.currentPreviewOverlay && this.currentPreviewOverlay.parentNode) {
					this.currentPreviewOverlay.parentNode.removeChild(this.currentPreviewOverlay);
					this.currentPreviewOverlay = null;
				}
			}, 300); // Match CSS transition duration
		}
	}

	onClose() {
		// Clean up any lingering preview overlay
		this.hideImagePreview();
		
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

		new Setting(containerEl)
			.setName('Default Provider')
			.setDesc('Default photo provider to show when opening search results')
			.addDropdown(dropdown => dropdown
				.addOption('unsplash', 'Unsplash')
				.addOption('pexels', 'Pexels')
				.addOption('pixabay', 'Pixabay')
				.setValue(this.plugin.settings.defaultProvider)
				.onChange(async (value) => {
					this.plugin.settings.defaultProvider = value;
					await this.plugin.saveSettings();
				}));
	}
}