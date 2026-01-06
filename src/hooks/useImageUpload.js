import { useState, useCallback } from 'react';
import { uploadImageToImgBB, uploadMultipleImagesToImgBB } from '../service/ImageUploadService';
import { CustomerService } from '../service/CustomerService';

/**
 * Hook for handling image uploads to ImgBB and saving to database
 * @returns {Object} - { uploadImage, uploadMultiple, isLoading, error, progress }
 */
export function useImageUpload() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [progress, setProgress] = useState(0);

    /**
     * Upload single image to ImgBB and save URL to location
     * @param {File} file - Image file to upload
     * @param {number} locationId - Location ID to attach image to
     * @returns {Promise<{success: boolean, url?: string, error?: string}>}
     */
    const uploadImage = useCallback(async (file, locationId) => {
        setIsLoading(true);
        setError(null);
        setProgress(0);

        try {
            // Upload to ImgBB
            const uploadResult = await uploadImageToImgBB(file);
            
            if (!uploadResult.url) {
                throw new Error(uploadResult.error || 'Upload failed');
            }

            setProgress(50);

            // Save image URL to database
            const saveResult = await CustomerService.addImageToLocation(
                locationId,
                uploadResult.url
            );

            setProgress(100);

            if (saveResult.success) {
                return {
                    success: true,
                    url: uploadResult.url,
                    displayUrl: uploadResult.displayUrl
                };
            } else {
                throw new Error(saveResult.error || 'Failed to save image to database');
            }
        } catch (err) {
            const errorMsg = err.message || 'Upload failed';
            setError(errorMsg);
            return { success: false, error: errorMsg };
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * Upload multiple images to ImgBB and save URLs to location
     * @param {File[]} files - Image files to upload
     * @param {number} locationId - Location ID to attach images to
     * @returns {Promise<{success: boolean, urls?: string[], errors?: string[]}>}
     */
    const uploadMultiple = useCallback(async (files, locationId) => {
        setIsLoading(true);
        setError(null);
        setProgress(0);

        try {
            // Upload all images to ImgBB
            const uploadResults = await uploadMultipleImagesToImgBB(files);
            
            const urls = uploadResults
                .filter(result => result.url)
                .map(result => result.url);
            
            const uploadErrors = uploadResults
                .filter(result => result.error)
                .map(result => result.error);

            if (urls.length === 0) {
                throw new Error('No images uploaded successfully');
            }

            setProgress(50);

            // Save image URLs to database
            const saveResult = await CustomerService.addImageToLocation(
                locationId,
                urls
            );

            setProgress(100);

            if (saveResult.success) {
                return {
                    success: true,
                    urls: urls,
                    errors: uploadErrors,
                    totalUploaded: urls.length
                };
            } else {
                throw new Error(saveResult.error || 'Failed to save images to database');
            }
        } catch (err) {
            const errorMsg = err.message || 'Upload failed';
            setError(errorMsg);
            return { success: false, error: errorMsg };
        } finally {
            setIsLoading(false);
        }
    }, []);

    return {
        uploadImage,
        uploadMultiple,
        isLoading,
        error,
        progress
    };
}

export default useImageUpload;
