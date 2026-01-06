/**
 * ImageUploadService.js
 * Handles image upload to ImgBB and manages image URLs
 */

const IMGBB_API_KEY = import.meta.env.VITE_IMGBB_API_KEY;
const IMGBB_API_URL = 'https://api.imgbb.com/1/upload';

/**
 * Upload image to ImgBB
 * @param {File|Blob} file - The image file to upload
 * @param {string} fileName - Optional custom file name
 * @returns {Promise<{url: string, deleteUrl: string, error?: string}>}
 */
export async function uploadImageToImgBB(file, fileName = null) {
    try {
        if (!IMGBB_API_KEY) {
            throw new Error('ImgBB API Key is not configured');
        }

        if (!file) {
            throw new Error('No file provided');
        }

        // Validate file is an image
        if (!file.type.startsWith('image/')) {
            throw new Error('File must be an image');
        }

        // Limit file size to 32MB (ImgBB limit)
        const MAX_SIZE = 32 * 1024 * 1024;
        if (file.size > MAX_SIZE) {
            throw new Error('File size exceeds 32MB limit');
        }

        // Create FormData
        const formData = new FormData();
        formData.append('image', file);
        
        if (fileName) {
            formData.append('name', fileName);
        }

        // Make request to ImgBB
        const response = await fetch(`${IMGBB_API_URL}?key=${IMGBB_API_KEY}`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`ImgBB API error: ${response.status}`);
        }

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error?.message || 'Upload failed');
        }

        return {
            url: data.data.image.url,
            deleteUrl: data.data.delete_url,
            displayUrl: data.data.display_url,
            title: data.data.title
        };

    } catch (error) {
        console.error('Image upload error:', error);
        return {
            url: null,
            error: error.message
        };
    }
}

/**
 * Upload multiple images to ImgBB
 * @param {File[]|Blob[]} files - Array of image files
 * @returns {Promise<Array>} - Array of upload results
 */
export async function uploadMultipleImagesToImgBB(files) {
    if (!Array.isArray(files)) {
        return [];
    }

    const uploadPromises = files.map((file, index) => {
        return uploadImageToImgBB(file, `image-${Date.now()}-${index}`);
    });

    return Promise.all(uploadPromises);
}

/**
 * Handle file input change event and upload
 * @param {Event} event - File input change event
 * @returns {Promise<{urls: string[], errors: string[]}>}
 */
export async function handleFileInputChange(event) {
    const files = Array.from(event.target.files || []);
    
    if (files.length === 0) {
        return { urls: [], errors: [] };
    }

    const results = await uploadMultipleImagesToImgBB(files);
    
    const urls = results
        .filter(result => result.url)
        .map(result => result.url);
    
    const errors = results
        .filter(result => result.error)
        .map(result => result.error);

    return { urls, errors };
}

export default {
    uploadImageToImgBB,
    uploadMultipleImagesToImgBB,
    handleFileInputChange
};
