import React, { useState } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { ColorPicker } from 'primereact/colorpicker';

export default function MarkerColorPicker({ visible, onHide, currentColor, onColorChange, locationName }) {
    const [selectedColor, setSelectedColor] = useState(currentColor || 'dc3545');
    
    // Preset colors for quick selection
    const presetColors = [
        { name: 'Red', value: '#dc3545' },
        { name: 'Blue', value: '#007bff' },
        { name: 'Green', value: '#28a745' },
        { name: 'Yellow', value: '#ffc107' },
        { name: 'Orange', value: '#fd7e14' },
        { name: 'Purple', value: '#6f42c1' },
        { name: 'Pink', value: '#e83e8c' },
        { name: 'Teal', value: '#20c997' },
        { name: 'Cyan', value: '#17a2b8' },
        { name: 'Indigo', value: '#6610f2' },
        { name: 'Dark', value: '#343a40' },
        { name: 'Gray', value: '#6c757d' }
    ];

    const handleSave = () => {
        onColorChange(selectedColor.startsWith('#') ? selectedColor : `#${selectedColor}`);
        onHide();
    };

    const handlePresetClick = (color) => {
        setSelectedColor(color.replace('#', ''));
    };

    return (
        <Dialog
            header={
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="pi pi-palette" style={{ fontSize: '1.2rem' }}></i>
                    <span>Choose Marker Color {locationName ? `for ${locationName}` : ''}</span>
                </div>
            }
            visible={visible}
            style={{ width: '450px' }}
            modal
            onHide={onHide}
            footer={
                <div>
                    <Button 
                        label="Cancel" 
                        icon="pi pi-times" 
                        onClick={onHide} 
                        className="p-button-text" 
                    />
                    <Button 
                        label="Apply Color" 
                        icon="pi pi-check" 
                        onClick={handleSave} 
                        autoFocus 
                    />
                </div>
            }
        >
            <div style={{ padding: '20px 0' }}>
                {/* Color Picker */}
                <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    gap: '20px',
                    marginBottom: '30px'
                }}>
                    <div style={{ textAlign: 'center' }}>
                        <label style={{ 
                            display: 'block', 
                            marginBottom: '10px', 
                            fontWeight: 'bold',
                            color: '#495057'
                        }}>
                            Custom Color
                        </label>
                        <ColorPicker 
                            value={selectedColor} 
                            onChange={(e) => setSelectedColor(e.value)}
                            inline
                        />
                    </div>
                    
                    {/* Preview */}
                    <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '15px',
                        padding: '15px',
                        backgroundColor: '#f8f9fa',
                        borderRadius: '8px',
                        border: '1px solid #dee2e6'
                    }}>
                        <span style={{ fontWeight: 'bold', color: '#495057' }}>Preview:</span>
                        <svg width="30" height="40" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg">
                            <path 
                                d="M15 0C8.925 0 4 4.925 4 11c0 8.25 11 29 11 29s11-20.75 11-29c0-6.075-4.925-11-11-11z" 
                                fill={`#${selectedColor}`}
                                stroke="white" 
                                strokeWidth="2"
                            />
                            <circle cx="15" cy="11" r="4" fill="white"/>
                        </svg>
                        <code style={{ 
                            padding: '5px 10px', 
                            backgroundColor: 'white', 
                            border: '1px solid #dee2e6',
                            borderRadius: '4px',
                            fontFamily: 'monospace'
                        }}>
                            #{selectedColor}
                        </code>
                    </div>
                </div>

                {/* Preset Colors */}
                <div>
                    <label style={{ 
                        display: 'block', 
                        marginBottom: '12px', 
                        fontWeight: 'bold',
                        color: '#495057'
                    }}>
                        Quick Select
                    </label>
                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(6, 1fr)', 
                        gap: '10px'
                    }}>
                        {presetColors.map((color, index) => (
                            <button
                                key={index}
                                onClick={() => handlePresetClick(color.value)}
                                style={{
                                    width: '100%',
                                    aspectRatio: '1',
                                    backgroundColor: color.value,
                                    border: selectedColor === color.value.replace('#', '') 
                                        ? '3px solid #007bff' 
                                        : '2px solid #dee2e6',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    boxShadow: selectedColor === color.value.replace('#', '')
                                        ? '0 0 0 3px rgba(0, 123, 255, 0.2)'
                                        : 'none',
                                    position: 'relative'
                                }}
                                title={color.name}
                                onMouseEnter={(e) => {
                                    if (selectedColor !== color.value.replace('#', '')) {
                                        e.currentTarget.style.transform = 'scale(1.1)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'scale(1)';
                                }}
                            >
                                {selectedColor === color.value.replace('#', '') && (
                                    <i className="pi pi-check" style={{ 
                                        color: 'white', 
                                        fontSize: '1.2rem',
                                        position: 'absolute',
                                        top: '50%',
                                        left: '50%',
                                        transform: 'translate(-50%, -50%)',
                                        textShadow: '0 0 3px rgba(0,0,0,0.5)'
                                    }}></i>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </Dialog>
    );
}
