const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
// DISABLED: localStorage for data - All data is now public/shared via API
// Only user preferences (pin, order, columns) remain in localStorage
const USE_LOCALSTORAGE = false;

// Enhanced in-memory cache with expiration and versioning
const cache = {
    routes: { data: null, timestamp: null, etag: null },
    locations: { data: null, timestamp: null, etag: null },
    routeLocations: {} // Cache locations per route: { routeId: { data, timestamp, etag } }
};

// Different cache durations for different data types
const CACHE_DURATION = {
    routes: 10 * 60 * 1000,      // 10 minutes - routes change less frequently
    locations: 5 * 60 * 1000,     // 5 minutes - locations change more often
    routeLocations: 8 * 60 * 1000 // 8 minutes - per-route data
};

// Request deduplication - prevent multiple simultaneous requests
const pendingRequests = new Map();

// Cache helper functions
const isCacheValid = (cacheEntry, type = 'locations') => {
    if (!cacheEntry || !cacheEntry.data || !cacheEntry.timestamp) return false;
    const duration = CACHE_DURATION[type] || CACHE_DURATION.locations;
    return (Date.now() - cacheEntry.timestamp) < duration;
};

const setCache = (key, data, etag = null) => {
    if (key.startsWith('route-')) {
        // Cache per-route locations
        cache.routeLocations[key] = { data, timestamp: Date.now(), etag };
    } else {
        cache[key] = { data, timestamp: Date.now(), etag };
    }
};

const getCache = (key, type = 'locations') => {
    if (key.startsWith('route-')) {
        const entry = cache.routeLocations[key];
        return isCacheValid(entry, 'routeLocations') ? entry.data : null;
    }
    return isCacheValid(cache[key], type) ? cache[key].data : null;
};

const clearCache = (key = null) => {
    if (key) {
        if (key.startsWith('route-')) {
            delete cache.routeLocations[key];
        } else {
            cache[key] = { data: null, timestamp: null, etag: null };
        }
    } else {
        // Clear all caches
        cache.routes = { data: null, timestamp: null, etag: null };
        cache.locations = { data: null, timestamp: null, etag: null };
        cache.routeLocations = {};
    }
};

// Preload cache in background
const preloadCache = async () => {
    try {
        if (!USE_LOCALSTORAGE) {
            // Preload routes and locations in parallel
            const [routes, locations] = await Promise.all([
                fetch(`${API_BASE_URL}/routes`).then(r => r.ok ? r.json() : null),
                fetch(`${API_BASE_URL}/locations`).then(r => r.ok ? r.json() : null)
            ]);
            if (routes) setCache('routes', routes);
            if (locations) setCache('locations', locations);
            console.log('⚡ Cache preloaded successfully');
        }
    } catch (error) {
        console.log('⚠️ Cache preload failed (non-critical):', error.message);
    }
};

// Request deduplication helper
const dedupedFetch = async (url, key) => {
    // If there's already a pending request for this key, return that promise
    if (pendingRequests.has(key)) {
        console.log('🔄 Reusing pending request for:', key);
        return pendingRequests.get(key);
    }

    // Create new request
    const requestPromise = fetch(url)
        .then(response => {
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response.json();
        })
        .finally(() => {
            // Clean up pending request
            pendingRequests.delete(key);
        });

    // Store pending request
    pendingRequests.set(key, requestPromise);
    return requestPromise;
};

export const CustomerService = {
    // Initialize localStorage with dummy data if not exists
    initLocalStorage() {
        if (!localStorage.getItem('routes')) {
            localStorage.setItem('routes', JSON.stringify(this.getDummyRoutes()));
        }
        if (!localStorage.getItem('locations')) {
            localStorage.setItem('locations', JSON.stringify(this.getDummyLocations()));
        }
    },

    // Get routes from API or localStorage with caching
    async getRoutes(forceRefresh = false) {
        // Check in-memory cache first (unless force refresh)
        if (!forceRefresh) {
            const cachedData = getCache('routes', 'routes');
            if (cachedData) {
                console.log('⚡ Using cached routes from memory');
                return cachedData;
            }
        }

        if (USE_LOCALSTORAGE) {
            this.initLocalStorage();
            const routes = JSON.parse(localStorage.getItem('routes') || '[]');
            console.log('📦 Loading routes from localStorage:', routes);
            setCache('routes', routes);
            return routes;
        }

        try {
            const routes = await dedupedFetch(`${API_BASE_URL}/routes`, 'routes');
            setCache('routes', routes);
            console.log('✅ Routes fetched from API');
            return routes;
        } catch (error) {
            console.error('❌ Error fetching routes:', error);
            // Try to return stale cache if available
            const staleCache = cache.routes?.data;
            if (staleCache) {
                console.log('⚠️ Using stale cache due to error');
                return staleCache;
            }
            const dummyRoutes = this.getDummyRoutes();
            setCache('routes', dummyRoutes);
            return dummyRoutes;
        }
    },

    // Get detail locations from API or localStorage with caching
    async getDetailData(routeId = null, forceRefresh = false) {
        const cacheKey = routeId ? `route-${routeId}` : 'locations';
        
        // Check in-memory cache first (unless force refresh)
        if (!forceRefresh) {
            const cachedData = getCache(cacheKey, routeId ? 'routeLocations' : 'locations');
            if (cachedData) {
                console.log(`⚡ Using cached locations from memory (${cacheKey})`);
                return cachedData;
            }
        }

        if (USE_LOCALSTORAGE) {
            this.initLocalStorage();
            const locations = JSON.parse(localStorage.getItem('locations') || '[]');
            console.log('📦 Loading locations from localStorage (all):', locations.length, 'locations');
            // Filter by routeId if provided
            const filteredLocations = routeId ? locations.filter(loc => loc.routeId === routeId) : locations;
            console.log(`📦 Filtered locations for routeId ${routeId}:`, filteredLocations.length, 'locations');
            console.log('📍 Sample location data:', filteredLocations[0]);
            setCache(cacheKey, filteredLocations);
            return filteredLocations;
        }

        try {
            const url = routeId ? `${API_BASE_URL}/locations?routeId=${routeId}` : `${API_BASE_URL}/locations`;
            const locations = await dedupedFetch(url, cacheKey);
            setCache(cacheKey, locations);
            console.log(`✅ Locations fetched from API (${cacheKey})`);
            return locations;
        } catch (error) {
            console.error('❌ Error fetching locations:', error);
            // Try to return stale cache if available
            const staleCache = routeId ? cache.routeLocations[cacheKey]?.data : cache.locations?.data;
            if (staleCache) {
                console.log('⚠️ Using stale cache due to error');
                return staleCache;
            }
            // Fallback to dummy data and filter by routeId
            const dummyLocations = this.getDummyLocations();
            const filteredLocations = routeId ? dummyLocations.filter(loc => loc.routeId === routeId) : dummyLocations;
            setCache(cacheKey, filteredLocations);
            return filteredLocations;
        }
    },

    // Save routes to API or localStorage
    async saveRoutes(routes) {
        if (USE_LOCALSTORAGE) {
            localStorage.setItem('routes', JSON.stringify(routes));
            console.log('💾 Routes saved to localStorage:', routes);
            clearCache('routes'); // Clear cache after save
            return { success: true, message: 'Routes saved to localStorage', count: routes.length };
        }

        try {
            console.log('💾 Saving routes to database:', routes);
            
            // Get existing routes from database
            const existingResponse = await fetch(`${API_BASE_URL}/routes`);
            const existingRoutes = existingResponse.ok ? await existingResponse.json() : [];
            const existingIds = new Set(existingRoutes.map(r => r.id));

            // Separate new routes (to CREATE) from existing routes (to UPDATE)
            // Date.now() returns ~13 digits (e.g., 1734953400000)
            const newRoutes = routes.filter(route => route.id > 1000000000000); // timestamp IDs > 13 digits
            const updatedRoutes = routes.filter(route => route.id <= 1000000000000 && existingIds.has(route.id));
            
            console.log('➕ New routes to create:', newRoutes.length, newRoutes);
            console.log('✏️ Existing routes to update:', updatedRoutes.length, updatedRoutes);

            // Create new routes - validate required fields
            const createPromises = newRoutes.map(route => {
                // Validate required fields before sending
                if (!route.route || !route.shift || !route.warehouse) {
                    console.error('❌ Missing required fields for route:', route);
                    return Promise.reject(new Error(`Missing required fields: route="${route.route}", shift="${route.shift}", warehouse="${route.warehouse}"`));
                }
                
                return fetch(`${API_BASE_URL}/routes`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        route: route.route.trim(), 
                        shift: route.shift.trim(), 
                        warehouse: route.warehouse.trim(),
                        description: route.description || null
                    }),
                })
                .then(response => {
                    if (!response.ok) {
                        return response.json().then(err => {
                            throw new Error(`Failed to create route: ${err.error || response.statusText}`);
                        });
                    }
                    return response;
                });
            });

            // Update existing routes
            let updatePromise = Promise.resolve({ ok: true });
            if (updatedRoutes.length > 0) {
                updatePromise = fetch(`${API_BASE_URL}/routes`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ routes: updatedRoutes }),
                });
            }

            // Execute all saves
            const results = await Promise.all([...createPromises, updatePromise]);
            
            // Check if all successful
            const allSuccessful = results.every(r => r.ok);
            if (!allSuccessful) {
                const failedResults = results.filter(r => !r.ok);
                console.error('❌ Failed to save some routes:', failedResults);
                throw new Error(`Failed to save ${failedResults.length} route(s)`);
            }
            
            clearCache('routes'); // Clear cache after successful save
            console.log('✅ Routes saved successfully to database');
            
            return { 
                success: true, 
                message: 'Routes saved successfully', 
                count: routes.length,
                created: newRoutes.length,
                updated: updatedRoutes.length
            };
        } catch (error) {
            console.error('❌ Error saving routes:', error);
            throw error;
        }
    },

    // Save locations to API or localStorage
    async saveLocations(locations, originalLocations = []) {
        if (USE_LOCALSTORAGE) {
            localStorage.setItem('locations', JSON.stringify(locations));
            console.log('💾 Locations saved to localStorage:', locations);
            clearCache('locations'); // Clear cache after save
            return { success: true, message: 'Locations saved to localStorage', count: locations.length };
        }

        try {
            console.log('💾 Saving locations to database:', locations);
            
            // Separate locations into categories for smart saving
            const newLocations = [];      // New rows with isNew=true or temp IDs
            const existingLocations = []; // Existing rows that might have changed
            
            locations.forEach(loc => {
                // Detect new locations (temp ID > 1000000000000 or isNew flag)
                if (loc.isNew === true || (loc.id && loc.id > 1000000000000)) {
                    // Skip the id for new locations - let DB generate it
                    const { id, isNew, ...newLoc } = loc;
                    newLocations.push(newLoc);
                    console.log('➕ New location to create:', newLoc);
                } else {
                    existingLocations.push(loc);
                    console.log('✏️ Existing location to update:', loc.id);
                }
            });
            
            console.log(`📊 Split: ${newLocations.length} new, ${existingLocations.length} existing`);
            
            // Step 1: Create new locations - validate required fields
            const createPromises = newLocations.map(newLoc => {
                // Validate required fields
                if (!newLoc.routeId || !newLoc.location) {
                    console.error('❌ Missing required fields for location:', newLoc);
                    return Promise.reject(new Error(`Missing required fields: routeId="${newLoc.routeId}", location="${newLoc.location}"`));
                }
                
                // Validate routeId is not a temp ID
                if (newLoc.routeId > 1000000000000) {
                    console.error('❌ Invalid routeId (temp ID):', newLoc.routeId);
                    return Promise.reject(new Error(`Cannot save location with unsaved route. Please save the route first.`));
                }
                
                return fetch(`${API_BASE_URL}/locations`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newLoc),
                })
                .then(r => {
                    if (!r.ok) {
                        return r.json().then(err => {
                            throw new Error(`Failed to create location: ${err.error || r.statusText}`);
                        });
                    }
                    return r.json();
                });
            });
            
            const createdResults = await Promise.all(createPromises);
            const createdCount = createdResults.filter(r => r && r.id).length;
            console.log(`✅ Created ${createdCount} new locations`);
            
            // Step 2: Update existing locations (batch)
            let updatedCount = 0;
            if (existingLocations.length > 0) {
                const updateResponse = await fetch(`${API_BASE_URL}/locations`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ locations: existingLocations }),
                });
                
                if (!updateResponse.ok) {
                    const errorText = await updateResponse.text();
                    console.error('❌ Failed to update locations:', updateResponse.status, errorText);
                    // Don't throw - we successfully created new rows
                    console.warn('⚠️ Some locations failed to update, but new locations were created');
                } else {
                    const updateResult = await updateResponse.json();
                    updatedCount = updateResult.updated || existingLocations.length;
                    console.log(`✅ Updated ${updatedCount} existing locations`);
                }
            }
            
            clearCache('locations'); // Clear all location caches
            clearCache('routes'); // Clear routes cache too (locationCount might change)
            cache.routeLocations = {}; // Clear per-route caches
            
            const result = {
                created: createdCount,
                updated: updatedCount,
                total: createdCount + updatedCount
            };
            
            console.log('✅ Locations saved successfully to database:', result);
            return result;
        } catch (error) {
            console.error('❌ Error saving locations:', error);
            throw error;
        }
    },

    // Delete location
    async deleteLocation(id) {
        if (USE_LOCALSTORAGE) {
            const locations = JSON.parse(localStorage.getItem('locations') || '[]');
            const filtered = locations.filter(loc => loc.id !== id);
            localStorage.setItem('locations', JSON.stringify(filtered));
            console.log('🗑️ Location deleted from localStorage:', id);
            clearCache('locations'); // Clear cache after delete
            return { success: true, message: 'Location deleted from localStorage' };
        }

        try {
            const response = await fetch(`${API_BASE_URL}/locations`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ id }),
            });
            
            if (!response.ok) {
                throw new Error('Failed to delete location');
            }
            
            clearCache('locations'); // Clear cache after successful delete
            
            return await response.json();
        } catch (error) {
            console.error('Error deleting location:', error);
            throw error;
        }
    },

    // Delete route
    async deleteRoute(id) {
        if (USE_LOCALSTORAGE) {
            const routes = JSON.parse(localStorage.getItem('routes') || '[]');
            const locations = JSON.parse(localStorage.getItem('locations') || '[]');
            
            // Delete route and its locations
            const filteredRoutes = routes.filter(route => route.id !== id);
            const filteredLocations = locations.filter(loc => loc.routeId !== id);
            
            localStorage.setItem('routes', JSON.stringify(filteredRoutes));
            localStorage.setItem('locations', JSON.stringify(filteredLocations));
            
            console.log('🗑️ Route and its locations deleted from localStorage:', id);
            clearCache('routes');
            clearCache('locations');
            return { success: true, message: 'Route deleted from localStorage' };
        }

        try {
            const response = await fetch(`${API_BASE_URL}/routes`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ id }),
            });
            
            if (!response.ok) {
                throw new Error('Failed to delete route');
            }
            
            clearCache('routes');
            clearCache('locations');
            
            return await response.json();
        } catch (error) {
            console.error('Error deleting route:', error);
            throw error;
        }
    },

    // Add images to location
    async addImageToLocation(locationId, imageUrls) {
        if (USE_LOCALSTORAGE) {
            const locations = JSON.parse(localStorage.getItem('locations') || '[]');
            const location = locations.find(loc => loc.id === locationId);
            if (location) {
                // Ensure images array exists
                if (!location.images) {
                    location.images = [];
                }
                // Add new images (avoid duplicates)
                const newImages = Array.isArray(imageUrls) ? imageUrls : [imageUrls];
                location.images = [...new Set([...location.images, ...newImages])];
                localStorage.setItem('locations', JSON.stringify(locations));
                console.log('🖼️ Images added to location in localStorage:', locationId, location.images);
                clearCache('locations');
                return { success: true, images: location.images };
            }
            return { success: false, error: 'Location not found' };
        }

        try {
            const imageArray = Array.isArray(imageUrls) ? imageUrls : [imageUrls];
            const response = await fetch(`${API_BASE_URL}/locations/${locationId}/images`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ images: imageArray }),
            });
            
            if (!response.ok) {
                throw new Error('Failed to add images to location');
            }
            
            clearCache('locations');
            const result = await response.json();
            console.log('✅ Images added to location:', locationId, result);
            return result;
        } catch (error) {
            console.error('Error adding images to location:', error);
            throw error;
        }
    },

    // Remove image from location
    async removeImageFromLocation(locationId, imageUrl) {
        if (USE_LOCALSTORAGE) {
            const locations = JSON.parse(localStorage.getItem('locations') || '[]');
            const location = locations.find(loc => loc.id === locationId);
            if (location && location.images) {
                location.images = location.images.filter(img => img !== imageUrl);
                localStorage.setItem('locations', JSON.stringify(locations));
                console.log('🗑️ Image removed from location in localStorage:', locationId, imageUrl);
                clearCache('locations');
                return { success: true, images: location.images };
            }
            return { success: false, error: 'Location not found' };
        }

        try {
            const response = await fetch(`${API_BASE_URL}/locations/${locationId}/images`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ imageUrl }),
            });
            
            if (!response.ok) {
                throw new Error('Failed to remove image from location');
            }
            
            clearCache('locations');
            const result = await response.json();
            console.log('✅ Image removed from location:', locationId, result);
            return result;
        } catch (error) {
            console.error('Error removing image from location:', error);
            throw error;
        }
    },

    // Update route with description
    async updateRoute(routeId, routeData) {
        if (USE_LOCALSTORAGE) {
            const routes = JSON.parse(localStorage.getItem('routes') || '[]');
            const route = routes.find(r => r.id === routeId);
            if (route) {
                Object.assign(route, routeData);
                localStorage.setItem('routes', JSON.stringify(routes));
                clearCache('routes');
                console.log('✅ Route updated in localStorage:', routeId, route);
                return route;
            }
            return null;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/routes/${routeId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(routeData),
            });
            
            if (!response.ok) {
                throw new Error('Failed to update route');
            }
            
            clearCache('routes');
            const result = await response.json();
            console.log('✅ Route updated:', routeId, result);
            return result;
        } catch (error) {
            console.error('Error updating route:', error);
            throw error;
        }
    },

    // Update location with description
    async updateLocation(locationId, locationData) {
        if (USE_LOCALSTORAGE) {
            const locations = JSON.parse(localStorage.getItem('locations') || '[]');
            const location = locations.find(l => l.id === locationId);
            if (location) {
                Object.assign(location, locationData);
                localStorage.setItem('locations', JSON.stringify(locations));
                clearCache('locations');
                console.log('✅ Location updated in localStorage:', locationId, location);
                return location;
            }
            return null;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/locations/${locationId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(locationData),
            });
            
            if (!response.ok) {
                throw new Error('Failed to update location');
            }
            
            clearCache('locations');
            const result = await response.json();
            console.log('✅ Location updated:', locationId, result);
            return result;
        } catch (error) {
            console.error('Error updating location:', error);
            throw error;
        }
    },

    // Dummy data fallbacks
    getDummyRoutes() {
        return [
            { id: 1, route: 'KL 7', shift: 'PM', warehouse: '3AVK04', description: '' },
            { id: 2, route: 'KL 8', shift: 'AM', warehouse: '3AVK05', description: '' },
            { id: 3, route: 'SG 1', shift: 'PM', warehouse: '2BVK01', description: '' }
        ];
    },

    getDummyLocations() {
        return [
            // Route 1 (KL 7) locations - routeId: 1
            { id: 1, no: 1, code: '34', location: 'Wisma Cimb', delivery: 'Daily', images: [], powerMode: 'Daily', routeId: 1, qrCodeImageUrl: '', qrCodeDestinationUrl: '', latitude: null, longitude: null, address: '' },
            { id: 2, no: 2, code: '42', location: 'Plaza Rakyat', delivery: 'Weekly', images: [], powerMode: 'Alt 1', routeId: 1, qrCodeImageUrl: '', qrCodeDestinationUrl: '', latitude: null, longitude: null, address: '' },
            { id: 3, no: 3, code: '51', location: 'KLCC Tower', delivery: 'Daily', images: [], powerMode: 'Alt 2', routeId: 1, qrCodeImageUrl: '', qrCodeDestinationUrl: '', latitude: null, longitude: null, address: '' },
            // Route 2 (KL 8) locations - routeId: 2
            { id: 4, no: 1, code: '67', location: 'Menara TM', delivery: 'Monthly', images: [], powerMode: 'Weekday', routeId: 2, qrCodeImageUrl: '', qrCodeDestinationUrl: '', latitude: null, longitude: null, address: '' },
            { id: 5, no: 2, code: '89', location: 'Pavilion KL', delivery: 'Daily', images: [], powerMode: 'Daily', routeId: 2, qrCodeImageUrl: '', qrCodeDestinationUrl: '', latitude: null, longitude: null, address: '' },
            { id: 6, no: 3, code: '23', location: 'Suria KLCC', delivery: 'Weekly', images: [], powerMode: 'Alt 1', routeId: 2, qrCodeImageUrl: '', qrCodeDestinationUrl: '', latitude: null, longitude: null, address: '' },
            // Route 3 (SG 1) locations - routeId: 3
            { id: 7, no: 1, code: '76', location: 'Mid Valley', delivery: 'Daily', images: [], powerMode: 'Alt 2', routeId: 3, qrCodeImageUrl: '', qrCodeDestinationUrl: '', latitude: null, longitude: null, address: '' },
            { id: 8, no: 2, code: '94', location: 'Bangsar Village', delivery: 'Weekly', images: [], powerMode: 'Weekday', routeId: 3, qrCodeImageUrl: '', qrCodeDestinationUrl: '', latitude: null, longitude: null, address: '' },
            { id: 9, no: 3, code: '31', location: 'Nu Sentral', delivery: 'Daily', images: [], powerMode: 'Daily', routeId: 3, qrCodeImageUrl: '', qrCodeDestinationUrl: '', latitude: null, longitude: null, address: '' },
            { id: 10, no: 4, code: '58', location: 'One Utama', delivery: 'Monthly', images: [], powerMode: 'Alt 1', routeId: 3, qrCodeImageUrl: '', qrCodeDestinationUrl: '', latitude: null, longitude: null, address: '' },
            // QL Kitchen location - routeId: 1
            { id: 11, no: 4, code: 'QL01', location: 'QL Kitchen', delivery: 'Daily', images: [], powerMode: 'Daily', routeId: 1, qrCodeImageUrl: '', qrCodeDestinationUrl: '', latitude: 3.0695500, longitude: 101.5469179, address: 'QL Kitchen' }
        ];
    },

    getData() {
        return this.getDummyRoutes();
    },

    getCustomersMedium() {
        return Promise.resolve(this.getDummyRoutes());
    },
    
    // Cache management functions
    preloadCache() {
        return preloadCache();
    },
    
    clearAllCache() {
        clearCache();
        console.log('🗑️ All caches cleared');
    },
    
    getCacheStats() {
        const stats = {
            routes: {
                cached: !!cache.routes?.data,
                age: cache.routes?.timestamp ? Date.now() - cache.routes.timestamp : null,
                valid: isCacheValid(cache.routes, 'routes')
            },
            locations: {
                cached: !!cache.locations?.data,
                age: cache.locations?.timestamp ? Date.now() - cache.locations.timestamp : null,
                valid: isCacheValid(cache.locations, 'locations')
            },
            routeLocations: {
                count: Object.keys(cache.routeLocations).length,
                keys: Object.keys(cache.routeLocations)
            },
            pendingRequests: pendingRequests.size
        };
        return stats;
    }
};
