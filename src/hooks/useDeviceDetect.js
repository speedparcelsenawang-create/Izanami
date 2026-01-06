import { useState, useEffect } from 'react';

/**
 * Custom hook to detect device type and screen size
 * Returns device information and screen dimensions
 */
export const useDeviceDetect = () => {
    const [deviceInfo, setDeviceInfo] = useState({
        isMobile: false,
        isTablet: false,
        isDesktop: false,
        screenWidth: window.innerWidth,
        screenHeight: window.innerHeight,
        orientation: window.innerWidth > window.innerHeight ? 'landscape' : 'portrait',
        deviceType: 'desktop',
        touchSupport: false,
        browserInfo: {
            name: '',
            version: ''
        }
    });

    useEffect(() => {
        const detectDevice = () => {
            const width = window.innerWidth;
            const height = window.innerHeight;
            const userAgent = navigator.userAgent.toLowerCase();
            const touchSupport = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

            // Device detection based on screen width
            const isMobile = width < 768;
            const isTablet = width >= 768 && width < 1024;
            const isDesktop = width >= 1024;

            // Determine device type
            let deviceType = 'desktop';
            if (isMobile) {
                deviceType = 'mobile';
            } else if (isTablet) {
                deviceType = 'tablet';
            }

            // Enhanced mobile detection including user agent
            const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
            const isIOS = /iphone|ipad|ipod/.test(userAgent);
            const isAndroid = /android/.test(userAgent);

            // Browser detection
            let browserName = 'Unknown';
            let browserVersion = '';
            
            // Check Chrome first (before Safari since Chrome includes 'safari' in UA)
            if (userAgent.indexOf('edg') > -1) {
                browserName = 'Edge';
                browserVersion = userAgent.match(/edg\/(\d+)/)?.[1] || '';
            } else if (userAgent.indexOf('chrome') > -1 && userAgent.indexOf('safari') > -1) {
                browserName = 'Chrome';
                browserVersion = userAgent.match(/chrome\/(\d+)/)?.[1] || '';
            } else if (userAgent.indexOf('firefox') > -1) {
                browserName = 'Firefox';
                browserVersion = userAgent.match(/firefox\/(\d+)/)?.[1] || '';
            } else if (userAgent.indexOf('safari') > -1) {
                browserName = 'Safari';
                browserVersion = userAgent.match(/version\/(\d+)/)?.[1] || '';
            }

            // Orientation
            const orientation = width > height ? 'landscape' : 'portrait';

            setDeviceInfo({
                isMobile,
                isTablet,
                isDesktop,
                screenWidth: width,
                screenHeight: height,
                orientation,
                deviceType,
                touchSupport,
                isMobileDevice,
                isIOS,
                isAndroid,
                browserInfo: {
                    name: browserName,
                    version: browserVersion
                },
                // UI adjustment values
                dialogWidth: isMobile ? '95vw' : isTablet ? '85vw' : '90vw',
                dialogHeight: isMobile ? '80vh' : isTablet ? '70vh' : '500px',
                tableScrollHeight: isMobile ? '300px' : isTablet ? '350px' : '400px',
                fontSize: isMobile ? 'small' : 'medium',
                buttonSize: isMobile ? 'small' : 'normal',
                columnDisplayMode: isMobile ? 'minimal' : isTablet ? 'standard' : 'full'
            });
        };

        // Initial detection
        detectDevice();

        // Listen for window resize
        const handleResize = () => {
            detectDevice();
        };

        // Listen for orientation change
        const handleOrientationChange = () => {
            setTimeout(detectDevice, 100); // Small delay for accurate measurement
        };

        window.addEventListener('resize', handleResize);
        window.addEventListener('orientationchange', handleOrientationChange);

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('orientationchange', handleOrientationChange);
        };
    }, []);

    return deviceInfo;
};

/**
 * Get responsive styles based on device type
 */
export const getResponsiveStyles = (deviceInfo) => {
    const { isMobile, isTablet, isDesktop } = deviceInfo;

    return {
        // Container styles
        container: {
            padding: isMobile ? '0.5rem' : isTablet ? '1rem' : '1.5rem',
            maxWidth: isDesktop ? '1400px' : '100%',
            margin: '0 auto'
        },

        // Card styles
        card: {
            padding: isMobile ? '0.75rem' : isTablet ? '1rem' : '1.5rem',
            borderRadius: isMobile ? '8px' : '12px'
        },

        // Button styles
        button: {
            fontSize: isMobile ? '0.8rem' : isTablet ? '0.9rem' : '1rem',
            padding: isMobile ? '0.4rem 0.8rem' : isTablet ? '0.5rem 1rem' : '0.6rem 1.2rem'
        },

        // Table styles
        table: {
            fontSize: isMobile ? '0.75rem' : isTablet ? '0.85rem' : '0.95rem'
        },

        // Dialog styles
        dialog: {
            width: isMobile ? '95vw' : isTablet ? '85vw' : '90vw',
            maxHeight: isMobile ? '90vh' : '80vh'
        },

        // Input styles
        input: {
            fontSize: isMobile ? '0.875rem' : '1rem',
            padding: isMobile ? '0.5rem' : '0.75rem'
        },

        // Grid columns
        gridColumns: isMobile ? 1 : isTablet ? 2 : 3,

        // Icon size
        iconSize: isMobile ? '0.875rem' : isTablet ? '1rem' : '1.125rem'
    };
};
