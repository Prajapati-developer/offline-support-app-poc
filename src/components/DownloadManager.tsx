// typescriptreact
import React, { useState, useEffect } from 'react';
import { addDownload, getUnsyncedDownloads, deleteSyncedDownloads } from '../utils/indexedDB';
import { isOnline } from '../utils/networkStatus'; // Ensure this import is correct
import { offOnline } from '../utils/networkStatus'; // Import offOnline
interface DownloadItem {
  id: string;
  type: 'pdf' | 'image';
  fileName: string;
  timestamp: number;
  data: Blob;
  synced: boolean;
  metadata?: any;
}

const DownloadManager: React.FC = () => {
  const [online, setOnline] = useState(isOnline());
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
 const onlineStatusHandler = () => {
    // Listen for online/offline status changes

 setOnline(isOnline()); // Update online status based on current state
      if (isOnline) {
        setMessage('App is online. Attempting to sync...');
        syncDownloads();
      } else {
        setMessage('App is offline. Downloads will be stored locally.');
      }
 };

    // Attempt to sync on mount if online
    if (isOnline()) {
      syncDownloads();
    }

    // Clean up the event listener on component unmount
    return () => {
 offOnline(onlineStatusHandler); // Use offOnline to remove the specific handler
    };
  }, []); // Empty dependency array ensures this runs only once on mount

  const simulateDownload = async (type: 'pdf' | 'image') => {
    const id = Date.now().toString(); // Simple unique ID
    const fileName = `${type}_${id}.${type === 'pdf' ? 'pdf' : 'png'}`;
    const dummyData = new Blob([`Dummy ${type} content for ${fileName}`], { type: type === 'pdf' ? 'application/pdf' : 'image/png' });

    const newItem: DownloadItem = {
      id,
      type,
      fileName,
      timestamp: Date.now(),
      data: dummyData,
      synced: false,
    };

    try {
      await addDownload(newItem);
      setMessage(`${fileName} downloaded. ${online ? 'Attempting to sync...' : 'Stored locally.'}`);
      if (online) {
        syncDownloads();
      }
    } catch (error) {
      console.error('Error adding download to IndexedDB:', error);
      setMessage(`Failed to download ${fileName}.`);
    }
  };

  const syncDownloads = async () => {
    if (syncing || !online) {
      return; // Prevent multiple sync processes or syncing when offline
    }

    setSyncing(true);
    setMessage('Syncing data with backend...');

    try {
      const unsyncedItems = await getUnsyncedDownloads();

      if (unsyncedItems.length === 0) {
        setMessage('No unsynced data to sync.');
        setSyncing(false);
        return;
      }

      console.log('Unsynced items:', unsyncedItems);


        // Mark items as synced or delete them from IndexedDB
        for (const item of unsyncedItems) {
          await deleteSyncedDownloads([item.id]); // Use the new function and pass an array of ids
        }
        setMessage(`Successfully synced ${unsyncedItems.length} items.`);


      // Simulate sending data to the backend
      // const response = await fetch('/api/sync', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   // Note: You might need to send the Blob data differently depending on your backend
      //   // For this simulation, we'll just send metadata
      //   body: JSON.stringify(unsyncedItems.map(item => ({
      //     id: item.id,
      //     type: item.type,
      //     fileName: item.fileName,
      //     timestamp: item.timestamp,
      //     metadata: item.metadata
      //   }))),
      // });

      // if (response.ok) {
      //   console.log('Backend sync successful.');
      //   // Mark items as synced or delete them from IndexedDB
      //   for (const item of unsyncedItems) {
      //     await deleteSyncedDownloads([item.id]); // Use the new function and pass an array of ids
      //   }
      //   setMessage(`Successfully synced ${unsyncedItems.length} items.`);
      // } else {
      //   console.error('Backend sync failed:', response.statusText);
      //   setMessage('Sync failed. Data remains stored locally.');
      //   // Handle specific error responses from backend if needed
      // }
    } catch (error) {
      console.error('Error during sync process:', error);
      setMessage('An error occurred during syncing.');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div>
      <h1>Download Manager</h1>
      <p>Status: {online ? 'Online' : 'Offline'}</p>
      <p>{message}</p>
      <button onClick={() => simulateDownload('pdf')} disabled={syncing}>
        Download PDF
      </button>
      <button onClick={() => simulateDownload('image')} disabled={syncing}>
        Download Image
      </button>
      {!online && <p>Connect to the internet to sync data.</p>}
      {online && !syncing && (
        <button onClick={syncDownloads}>Manually Sync</button>
      )}
    </div>
  );
};

export default DownloadManager;