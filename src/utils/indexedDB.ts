// utils/indexedDB.ts

import { set, get, del, values } from 'idb-keyval';

interface DownloadItem {
  id: string;
  type: 'pdf' | 'image';
  fileName: string;
  timestamp: number;
  data: Blob;
  synced: boolean;
  metadata?: any;
}

export const addDownload = async (item: DownloadItem): Promise<void> => {
  try {
    await set(item.id, item);
  } catch (error) {
    console.error('Error storing download item:', error);
    throw new Error('Error storing download item');
  }
};

export const getUnsyncedDownloads = async (): Promise<DownloadItem[]> => {
  try {
    const allItems: DownloadItem[] = await values();
    return allItems.filter(item => !item.synced);
  } catch (error) {
    console.error('Error retrieving unsynced download items:', error);
    throw new Error('Error retrieving unsynced download items');
  }
};

export const markAsSynced = async (ids: string[]): Promise<void> => {
  try {
    for (const id of ids) {
      const item: DownloadItem | undefined = await get(id);
      if (item) {
        item.synced = true;
        await set(id, item);
      }
    }
  } catch (error) {
    console.error('Error marking downloads as synced:', error);
    throw new Error('Error marking downloads as synced');
  }
};

export const deleteSyncedDownloads = async (ids: string[]): Promise<void> => {
  try {
    await Promise.all(ids.map(id => del(id)));
  } catch (error) {
    console.error('Error deleting synced downloads:', error);
    throw new Error('Error deleting synced downloads');
  }
};