import React, { useState } from 'react';
import {
  Modal,
  ModalTrigger,
  ModalBody,
  ModalContent,
  ModalFooter,
} from './AnimatedModal';

export function TableRowModal({ rowData, trigger }) {
  if (!rowData) return null;
  
  const [searchText, setSearchText] = useState('');
  const [selectedDate, setSelectedDate] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  
  // Sample history data
  const historyData = [
    { date: new Date(Date.now() - 86400000), action: 'Updated', user: 'Admin', details: 'Modified route name' },
    { date: new Date(Date.now() - 172800000), action: 'Created', user: 'System', details: 'Route created' },
    { date: new Date(Date.now() - 259200000), action: 'Updated', user: 'Admin', details: 'Changed status to qualified' },
  ];
  
  const filteredFields = Object.entries({
    'code': rowData.code,
    'name': rowData.name,
    'country': rowData.country?.name,
    'representative': rowData.representative?.name,
    'status': rowData.status,
    'balance': rowData.balance,
  }).filter(([key, value]) => {
    if (!searchText) return true;
    return key.toLowerCase().includes(searchText.toLowerCase()) || 
           (value && value.toString().toLowerCase().includes(searchText.toLowerCase()));
  });

  return (
    <Modal>
      {trigger || (
        <ModalTrigger className="!p-2 !text-sm">
          View Details
        </ModalTrigger>
      )}
      
      <ModalBody>
        <ModalContent>
          <div className="space-y-4">
            {/* Header with Icon */}
            <div className="flex items-center gap-4 pb-4 border-b border-gray-200 dark:border-neutral-700">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl">
                {rowData.name?.charAt(0) || 'R'}
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {rowData.name || 'Route Details'}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Code: {rowData.code || 'N/A'}
                </p>
              </div>
            </div>
            
            {/* Control Bar - Search & Date & View History */}
            <div className="flex gap-2 flex-wrap items-center pb-4 border-b border-gray-200 dark:border-neutral-700">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search fields..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-gray-900 dark:text-white text-sm"
                  />
                  <svg className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
              
              <input
                type="date"
                value={selectedDate || ''}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-gray-900 dark:text-white text-sm"
              />
              
              <button
                onClick={() => setShowHistory(!showHistory)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  showHistory
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 dark:bg-neutral-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-neutral-600'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                History
              </button>
            </div>
            
            {/* Display History or Details */}
            {showHistory ? (
              <div className="space-y-2">
                <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
                  📜 View Activity History
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {historyData.map((entry, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 dark:bg-neutral-800 rounded-lg border border-gray-200 dark:border-neutral-700">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white text-sm">{entry.action}</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{entry.details}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">By {entry.user}</p>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap ml-2">
                          {entry.date.toLocaleDateString('ms-MY', { 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-4 py-4">
                  {filteredFields.length > 0 ? (
                    filteredFields.map(([label, value]) => (
                      <DetailItem 
                        key={label}
                        label={label.charAt(0).toUpperCase() + label.slice(1)} 
                        value={value} 
                      />
                    ))
                  ) : (
                    <div className="col-span-2 text-center py-4 text-gray-500 dark:text-gray-400">
                      <p className="text-sm">No matching fields found</p>
                    </div>
                  )}
                </div>

                {/* Map Section if coordinates exist */}
                {(rowData.latitude && rowData.longitude) && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-neutral-700">
                    <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
                      📍 Location
                    </h3>
                    <div className="bg-gray-100 dark:bg-neutral-800 rounded-lg p-4 text-center">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Lat: {rowData.latitude}, Lng: {rowData.longitude}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                        (Map component boleh integrate di sini)
                      </p>
                    </div>
                  </div>
                )}

                {/* Images Section if exists */}
                {rowData.images && rowData.images.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-neutral-700">
                    <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
                      🖼️ Images
                    </h3>
                    <div className="grid grid-cols-3 gap-2">
                      {rowData.images.map((img, idx) => (
                        <img 
                          key={idx}
                          src={img} 
                          alt={`Image ${idx + 1}`}
                          className="rounded-lg w-full h-24 object-cover hover:scale-105 transition-transform cursor-pointer"
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </ModalContent>
        
        <ModalFooter className="gap-3">
          <button className="px-4 py-2 bg-gray-200 dark:bg-neutral-700 text-gray-900 dark:text-white rounded-md hover:bg-gray-300 dark:hover:bg-neutral-600 transition-colors">
            Close
          </button>
          <button className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-md hover:from-blue-600 hover:to-purple-700 transition-all">
            Edit Route
          </button>
        </ModalFooter>
      </ModalBody>
    </Modal>
  );
}

// Helper component untuk display detail items
function DetailItem({ label, value }) {
  if (!value) return null;
  
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
        {label}
      </p>
      <p className="text-sm font-semibold text-gray-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}

// Simple example untuk guna dalam table
export function QuickViewButton({ rowData }) {
  return (
    <TableRowModal 
      rowData={rowData}
      trigger={
        <button className="px-3 py-1.5 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors">
          👁️ View
        </button>
      }
    />
  );
}
