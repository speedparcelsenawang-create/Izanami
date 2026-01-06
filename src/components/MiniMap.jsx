import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, LayersControl, ZoomControl } from 'react-leaflet';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const { BaseLayer } = LayersControl;

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [15, 25],        // Smaller size (reduced from 20x33)
    iconAnchor: [7, 25],       // Point of the icon which will correspond to marker's location
    popupAnchor: [0, -25],     // Point from which the popup should open relative to the iconAnchor
    shadowSize: [25, 25]       // Smaller shadow size
});

// Function to create custom colored marker icon
const createColoredMarkerIcon = (color = '#dc3545') => {
    return L.divIcon({
        className: 'custom-marker-icon',
        html: `
            <div style="position: relative;">
                <svg width="24" height="32" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg">
                    <path d="M15 0C8.925 0 4 4.925 4 11c0 8.25 11 29 11 29s11-20.75 11-29c0-6.075-4.925-11-11-11z" 
                          fill="${color}" 
                          stroke="white" 
                          stroke-width="2"/>
                    <circle cx="15" cy="11" r="4" fill="white"/>
                </svg>
            </div>
        `,
        iconSize: [24, 32],
        iconAnchor: [12, 32],
        popupAnchor: [0, -32]
    });
};

// Component to update map view when coordinates change
function MapUpdater({ center, zoom }) {
    const map = useMap();
    
    useEffect(() => {
        if (center) {
            map.setView(center, zoom);
        }
    }, [center, zoom, map]);
    
    return null;
}

export default function MiniMap({ latitude, longitude, address, locations = [], style = {}, onMarkerColorChange }) {
    const [fullscreenVisible, setFullscreenVisible] = useState(false);
    const [addressExpanded, setAddressExpanded] = useState(false);
    
    // Default marker color
    const defaultMarkerColor = '#dc3545';
    
    // Default coordinates (Kuala Lumpur) if no coordinates provided
    const defaultLat = 3.139;
    const defaultLng = 101.6869;
    
    // Malaysia bounds to restrict map area (reduce lag)
    // Southwest: [0.8, 99.6], Northeast: [7.4, 119.3]
    const malaysiaBounds = [
        [0.8, 99.6],    // Southwest corner (Johor area)
        [7.4, 119.3]     // Northeast corner (Sabah/Sarawak area)
    ];
    
    // If locations array is provided (multiple markers mode)
    const isMultipleMarkers = locations && locations.length > 0;
    
    let center, zoom, hasValidCoordinates;
    
    if (isMultipleMarkers) {
        // Filter locations with valid coordinates
        const validLocations = locations.filter(loc => 
            loc.latitude !== null && loc.latitude !== undefined &&
            loc.longitude !== null && loc.longitude !== undefined
        );
        
        if (validLocations.length > 0) {
            // Calculate center from all valid locations
            const avgLat = validLocations.reduce((sum, loc) => sum + loc.latitude, 0) / validLocations.length;
            const avgLng = validLocations.reduce((sum, loc) => sum + loc.longitude, 0) / validLocations.length;
            center = [avgLat, avgLng];
            zoom = validLocations.length === 1 ? 15 : 12;
            hasValidCoordinates = true;
        } else {
            center = [defaultLat, defaultLng];
            zoom = 11;
            hasValidCoordinates = false;
        }
    } else {
        // Single marker mode
        const lat = latitude !== null && latitude !== undefined ? latitude : defaultLat;
        const lng = longitude !== null && longitude !== undefined ? longitude : defaultLng;
        center = [lat, lng];
        zoom = latitude !== null && latitude !== undefined && 
               longitude !== null && longitude !== undefined ? 15 : 11;
        hasValidCoordinates = latitude !== null && latitude !== undefined && 
                            longitude !== null && longitude !== undefined;
    }

    return (
        <>
            {/* Mini Map Container */}
            <div style={{ position: 'relative', ...style }}>
                <MapContainer
                    center={center}
                    zoom={zoom}
                    style={{ 
                        height: '250px', 
                        width: '100%', 
                        borderRadius: '12px',
                        border: '2px solid rgba(0,0,0,0.1)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                    className="mini-map-container"
                    scrollWheelZoom={false}
                    dragging={false}
                    doubleClickZoom={false}
                    zoomControl={false}
                    touchZoom={false}
                    maxBounds={malaysiaBounds}
                    maxBoundsViscosity={1.0}
                    minZoom={6}
                    maxZoom={18}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    {isMultipleMarkers ? (
                        // Multiple markers
                        locations
                            .filter(loc => loc.latitude !== null && loc.latitude !== undefined &&
                                         loc.longitude !== null && loc.longitude !== undefined)
                            .map((loc, index) => (
                                <Marker 
                                    key={index} 
                                    position={[loc.latitude, loc.longitude]}
                                    icon={createColoredMarkerIcon(loc.markerColor || defaultMarkerColor)}
                                >
                                    <Popup>
                                        <strong>{loc.location || `Location ${index + 1}`}</strong>
                                        {loc.code && <><br />Code: {loc.code}</>}
                                        {loc.address && <><br />{loc.address}</>}
                                    </Popup>
                                </Marker>
                            ))
                    ) : (
                        // Single marker
                        hasValidCoordinates && (
                            <Marker 
                                position={center}
                                icon={createColoredMarkerIcon(locations[0]?.markerColor || defaultMarkerColor)}
                            >
                                <Popup>
                                    {address || 'Location'}
                                </Popup>
                            </Marker>
                        )
                    )}
                </MapContainer>
                
                {/* Fullscreen Button */}
                <Button
                    icon="pi pi-window-maximize"
                    className="p-button-rounded p-button-info"
                    style={{
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        zIndex: 1000,
                        width: '40px',
                        height: '40px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                    }}
                    onClick={() => setFullscreenVisible(true)}
                    tooltip="Open Fullscreen Map"
                    tooltipOptions={{ position: 'left' }}
                />
                
                {/* Address Caption */}
                {!isMultipleMarkers && address && (
                    <div 
                        className="map-address-caption"
                        style={{
                            marginTop: '10px',
                            padding: '6px 8px',
                            backgroundColor: 'transparent',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontFamily: "'Open Sans', sans-serif",
                            color: 'var(--text-color)',
                            textAlign: 'center',
                            cursor: 'pointer',
                            userSelect: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            transition: 'all 0.2s ease'
                        }}
                        onClick={() => setAddressExpanded(!addressExpanded)}
                    >
                        <i 
                            className={`pi ${addressExpanded ? 'pi-chevron-up' : 'pi-chevron-down'}`} 
                            style={{ 
                                fontSize: '8px',
                                color: '#dc3545',
                                transition: 'transform 0.2s ease'
                            }}
                        ></i>
                        <span style={{
                            overflow: addressExpanded ? 'visible' : 'hidden',
                            textOverflow: addressExpanded ? 'clip' : 'ellipsis',
                            whiteSpace: addressExpanded ? 'normal' : 'nowrap',
                            maxWidth: addressExpanded ? 'none' : '100%',
                            display: addressExpanded ? 'block' : 'inline'
                        }}>
                            {address}
                        </span>
                    </div>
                )}
                

                
                {!hasValidCoordinates && (
                    <div className="map-info-box map-info-warning" style={{
                        marginTop: '10px',
                        padding: '10px',
                        backgroundColor: '#fff3cd',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: '#856404',
                        textAlign: 'center',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}>
                        <i className="pi pi-info-circle" style={{ marginRight: '5px', fontSize: '14px' }}></i>
                        {isMultipleMarkers ? 'No locations with coordinates found.' : 'No coordinates set. Showing default location (KL).'}
                    </div>
                )}
            </div>
            
            {/* Fullscreen Dialog */}
            <Dialog
                header={
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <i className="pi pi-map" style={{ fontSize: '1.3rem', color: '#06b6d4' }}></i>
                        <span style={{ fontSize: '1.1rem', fontWeight: '600' }}>
                            {isMultipleMarkers ? 'Route Map View' : 'Map View'}
                        </span>
                    </div>
                }
                visible={fullscreenVisible}
                style={{ width: '95vw', height: '95vh' }}
                maximizable
                modal
                onHide={() => setFullscreenVisible(false)}
                contentStyle={{ height: 'calc(100% - 60px)', padding: 0, overflow: 'hidden' }}
                className="fullscreen-map-dialog"
            >
                <MapContainer
                    center={center}
                    zoom={zoom + 1}
                    style={{ height: '100%', width: '100%' }}
                    scrollWheelZoom={true}
                    zoomControl={false}
                    maxBounds={malaysiaBounds}
                    maxBoundsViscosity={1.0}
                    minZoom={6}
                    maxZoom={19}
                >
                    <LayersControl position="topright">
                        <BaseLayer checked name="Street Map">
                            <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                        </BaseLayer>
                        <BaseLayer name="Satellite View">
                            <TileLayer
                                attribution='&copy; <a href="https://www.esri.com">Esri</a>'
                                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                            />
                        </BaseLayer>
                        <BaseLayer name="Topographic">
                            <TileLayer
                                attribution='&copy; <a href="https://opentopomap.org">OpenTopoMap</a> contributors'
                                url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
                            />
                        </BaseLayer>
                    </LayersControl>
                    <ZoomControl position="bottomright" />
                    <MapUpdater center={center} zoom={zoom + 1} />
                    {isMultipleMarkers ? (
                        // Multiple markers
                        locations
                            .filter(loc => loc.latitude !== null && loc.latitude !== undefined &&
                                         loc.longitude !== null && loc.longitude !== undefined)
                            .map((loc, index) => (
                                <Marker 
                                    key={index} 
                                    position={[loc.latitude, loc.longitude]}
                                    icon={createColoredMarkerIcon(loc.markerColor || defaultMarkerColor)}
                                >
                                    <Popup>
                                        <strong>{loc.location || `Location ${index + 1}`}</strong>
                                        {loc.code && <><br />Code: {loc.code}</>}
                                        {loc.address && <><br />{loc.address}</>}
                                        <br />
                                        Lat: {loc.latitude.toFixed(6)}
                                        <br />
                                        Lng: {loc.longitude.toFixed(6)}
                                    </Popup>
                                </Marker>
                            ))
                    ) : (
                        // Single marker
                        hasValidCoordinates && (
                            <Marker 
                                position={center}
                                icon={createColoredMarkerIcon(locations[0]?.markerColor || defaultMarkerColor)}
                            >
                                <Popup>
                                    <strong>{address || 'Location'}</strong>
                                    <br />
                                    Lat: {center[0].toFixed(6)}
                                    <br />
                                    Lng: {center[1].toFixed(6)}
                                </Popup>
                            </Marker>
                        )
                    )}
                </MapContainer>
                
                {!isMultipleMarkers && address && (
                    <div className="fullscreen-map-badge" style={{
                        position: 'absolute',
                        bottom: '30px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        padding: '12px 24px',
                        borderRadius: '12px',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                        zIndex: 1000,
                        maxWidth: '85%',
                        textAlign: 'center',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(0,0,0,0.1)'
                    }}>
                        <i className="pi pi-map-marker" style={{ marginRight: '10px', color: '#dc3545', fontSize: '16px' }}></i>
                        <strong style={{ fontSize: '14px' }}>{address}</strong>
                    </div>
                )}
                
                {isMultipleMarkers && (
                    <div className="fullscreen-map-badge" style={{
                        position: 'absolute',
                        bottom: '30px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        padding: '12px 24px',
                        borderRadius: '12px',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                        zIndex: 1000,
                        maxWidth: '85%',
                        textAlign: 'center',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(0,0,0,0.1)'
                    }}>
                        <i className="pi pi-map-marker" style={{ marginRight: '10px', color: '#06b6d4', fontSize: '16px' }}></i>
                        <strong style={{ fontSize: '14px' }}>{locations.filter(loc => loc.latitude && loc.longitude).length} Locations on Map</strong>
                    </div>
                )}
            </Dialog>
        </>
    );
}
