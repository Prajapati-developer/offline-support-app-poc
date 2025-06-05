import React, { useState, useEffect } from 'react';
import { set, get, del, keys } from 'idb-keyval';

function StatusCheck() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      await syncDataWithBackend();
    };

    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cleanup event listeners on component unmount
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const saveDataOffline = async (key: string, data: any) => {
    try {
      await set(key, data);
      console.log(`Data saved offline with key: ${key}`);
    } catch (error) {
      console.error('Error saving data offline:', error);
    }
  };

  const syncDataWithBackend = async () => {
    try {
      const storedKeys = await keys();
      for (const key of storedKeys) {
        const data = await get(key);
        // await del(key); // Remove data from IndexedDB after syncing

        if (data) {
          // Replace with your backend API call
          await fetch('/api/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key, data }),
          });
          console.log(`Data synced for key: ${key}`);
          await del(key); // Remove data from IndexedDB after syncing
        }
      }
    } catch (error) {
      console.error('Error syncing data with backend:', error);
    }
  };

  return (
    <div>
      <h1>Network Status</h1>
      <p>{isOnline ? 'Online' : 'Offline'}</p>
      {/* Example buttons to simulate saving and syncing data */}
      <button
        onClick={() =>
          saveDataOffline('exampleKey', { type: 'pdf', content: 'Sample PDF Data' })
        }
      >
        Save PDF Offline
      </button>
      <button
        onClick={() =>
          saveDataOffline('exampleImageKey', { type: 'image', content: 'Sample Image Data' })
        }
      >
        Save Image Offline
      </button>
    </div>
  );
}

export default StatusCheck;