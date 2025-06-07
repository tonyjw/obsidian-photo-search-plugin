// Quick test for URL detection patterns
const urlPatterns = {
    detectPhotoURL: function(input) {
        const trimmedInput = input.trim();
        
        // Remove common URL artifacts and parameters
        const cleanedInput = trimmedInput.split('?')[0].split('#')[0];
        
        // Pexels URL patterns
        const pexelsMatch = cleanedInput.match(/pexels\.com\/photo\/[^\/]+-(\d+)\/?$/);
        if (pexelsMatch) {
            return { provider: 'pexels', id: pexelsMatch[1] };
        }

        // Unsplash URL patterns
        const unsplashMatch = cleanedInput.match(/unsplash\.com\/(?:photos\/(?:[^\/]+-)?|@[^\/]+\/)([a-zA-Z0-9_-]+)\/?$/);
        if (unsplashMatch) {
            return { provider: 'unsplash', id: unsplashMatch[1] };
        }

        // Pixabay URL patterns
        const pixabayMatch = cleanedInput.match(/pixabay\.com\/(?:[a-z]{2}\/)?photos\/[^\/]+-(\d+)\/?$/);
        if (pixabayMatch) {
            return { provider: 'pixabay', id: pixabayMatch[1] };
        }

        return null;
    }
};

// Test URLs
const testUrls = [
    'https://www.pexels.com/photo/beautiful-sunset-123456/',
    'https://www.pexels.com/photo/mountain-lake-789012',
    'https://www.pexels.com/photo/sunset-mountains-123456/?utm_source=test',
    'https://unsplash.com/photos/abc123xyz',
    'https://unsplash.com/photos/mountain-sunset-abc123xyz',
    'https://unsplash.com/@photographer/def456ghi',
    'https://unsplash.com/photos/abc123xyz?utm_source=test&utm_medium=referral',
    'https://pixabay.com/photos/sunset-mountains-123456/',
    'https://pixabay.com/en/photos/lake-reflection-789012/',
    'https://pixabay.com/photos/nature-landscape-456789',
    'https://pixabay.com/photos/beautiful-sunset-123456/?utm_source=test',
    'random search text',
    'mountains sunset',
    'https://example.com/not-a-photo-url'
];

const fs = require('fs');

console.log('Testing URL detection patterns:\n');

let output = 'Testing URL detection patterns:\n\n';

testUrls.forEach(url => {
    const result = urlPatterns.detectPhotoURL(url);
    const line = `URL: ${url}\nResult: ${result ? `${result.provider} - ${result.id}` : 'No match'}\n---\n`;
    console.log(line);
    output += line;
});

fs.writeFileSync('test-results.txt', output);
