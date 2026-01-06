import { useRef, useState, useEffect } from "react";

// Add keyframes for spin animation
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `;
  if (!document.querySelector('style[data-image-lightbox-styles]')) {
    style.setAttribute('data-image-lightbox-styles', 'true');
    document.head.appendChild(style);
  }
}

// Global variable to track current open gallery
let currentOpenGallery = null;

/**
 * ImageLightbox Component
 * A modern lightbox gallery using LightGallery library
 * Features: thumbnails, zoom, fullscreen, lazy loading
 */
export function ImageLightbox({ images, rowId }) {
  const galleryRef = useRef(null);
  const containerRef = useRef(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const isInitialized = useRef(false);

  // Debug logging
  console.log('ImageLightbox render:', { rowId, images, imageCount: images?.length });

  const handleImageClick = async (e) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent event bubbling
    
    console.log('Image clicked, opening gallery...');
    
    // Close any currently open gallery
    if (currentOpenGallery && currentOpenGallery !== galleryRef.current) {
      try {
        currentOpenGallery.destroy();
        currentOpenGallery = null;
      } catch (err) {
        console.warn("Error closing previous gallery:", err);
      }
    }

    // Initialize gallery if not already done
    if (!isInitialized.current && containerRef.current) {
      try {
        // Dynamically import lightgallery
        const { default: lightGallery } = await import("lightgallery");
        const lgThumbnail = await import("lightgallery/plugins/thumbnail");
        const lgZoom = await import("lightgallery/plugins/zoom");
        const lgFullscreen = await import("lightgallery/plugins/fullscreen");

        // Import CSS
        await import("lightgallery/css/lightgallery.css");
        await import("lightgallery/css/lg-thumbnail.css");
        await import("lightgallery/css/lg-zoom.css");
        await import("lightgallery/css/lg-fullscreen.css");

        // Initialize gallery
        const gallery = lightGallery(containerRef.current, {
          licenseKey: "GPLv3",
          plugins: [lgThumbnail.default, lgZoom.default, lgFullscreen.default],
          speed: 500,
          download: false,
          dynamic: true,
          dynamicEl: images.map((img, idx) => ({
            src: typeof img === 'object' ? img.url : img,
            thumb: typeof img === 'object' ? img.url : img,
            subHtml: typeof img === 'object' && img.caption 
              ? `<h4>${img.caption}</h4>${img.description ? `<p>${img.description}</p>` : ''}` 
              : `<p>Image ${idx + 1}</p>`
          })),
          thumbnail: true,
          animateThumb: true,
          thumbWidth: 100,
          thumbHeight: "80px",
          thumbMargin: 5,
          showThumbByDefault: true,
          mode: "lg-fade",
          closable: true,
          closeOnTap: true,
        });

        galleryRef.current = gallery;
        currentOpenGallery = gallery;
        isInitialized.current = true;

        // Add close listener to cleanup
        gallery.outer.addEventListener('lgAfterClose', () => {
          if (currentOpenGallery === gallery) {
            currentOpenGallery = null;
          }
        });

        // Open gallery immediately
        setTimeout(() => gallery.openGallery(0), 100);
      } catch (error) {
        console.error("Failed to load LightGallery:", error);
      }
    } else if (galleryRef.current) {
      // Gallery already initialized, just open it
      currentOpenGallery = galleryRef.current;
      galleryRef.current.openGallery(0);
    }
  };

  if (images.length === 0) {
    console.log('No images to display for rowId:', rowId);
    return (
      <div className="flex items-center justify-center mx-auto">
        <div className="flex items-center justify-center w-10 h-8 rounded-lg border border-gray-200 bg-gray-50">
          <span className="text-xs text-gray-400">No Image</span>
        </div>
      </div>
    );
  }

  const firstImage = typeof images[0] === 'object' ? images[0].url : images[0];
  console.log('First image URL:', firstImage);

  return (
    <div ref={containerRef} style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center',
      width: '100%',
      height: '100%'
    }}>
      {/* Clickable image preview */}
      <div
        onClick={handleImageClick}
        onTouchEnd={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleImageClick(e);
        }}
        style={{ 
          position: 'relative', 
          width: '50px', 
          height: '40px',
          cursor: 'pointer',
          backgroundColor: imageError ? '#fee2e2' : 'transparent',
          userSelect: 'none',
          WebkitTapHighlightColor: 'transparent'
        }}
      >
        {!imageLoaded && !imageError && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f3f4f6',
            borderRadius: '4px'
          }}>
            <div style={{
              width: '16px',
              height: '16px',
              border: '2px solid #3b82f6',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
          </div>
        )}
        {imageError && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#fee2e2',
            borderRadius: '4px',
            border: '1px solid #fca5a5'
          }}>
            <i className="pi pi-exclamation-triangle" style={{ 
              fontSize: '1rem', 
              color: '#dc2626'
            }}></i>
          </div>
        )}
        <img
          src={firstImage}
          alt={typeof images[0] === 'object' && images[0].caption ? images[0].caption : "Image"}
          style={{ 
            width: '100%', 
            height: '100%',
            objectFit: 'cover',
            borderRadius: '4px',
            border: '1px solid #e5e7eb',
            display: imageError ? 'none' : 'block',
            opacity: imageLoaded ? 1 : 0,
            transition: 'opacity 0.3s',
            pointerEvents: 'none' // Prevent image from blocking clicks
          }}
          loading="lazy"
          onLoad={() => {
            console.log('Image loaded successfully:', firstImage);
            setImageLoaded(true);
          }}
          onError={(e) => {
            console.error('Image failed to load:', firstImage, e);
            setImageError(true);
            setImageLoaded(true);
          }}
        />
        
        {/* Count badge inside image */}
        {images.length > 1 && (
          <span style={{
            position: 'absolute',
            bottom: '3px',
            right: '3px',
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            color: 'white',
            fontSize: '9px',
            fontWeight: '600',
            padding: '2px 5px',
            borderRadius: '3px',
            lineHeight: '1',
            pointerEvents: 'none',
            zIndex: 1
          }}>
            +{images.length - 1}
          </span>
        )}
      </div>
    </div>
  );
}

export default ImageLightbox;
