type NetworkStatusHandler = () => void;

let onlineStatus: boolean = navigator.onLine;
const onlineHandlers: NetworkStatusHandler[] = [];
const offlineHandlers: NetworkStatusHandler[] = [];

const handleOnlineEvent = () => {
  onlineStatus = true;
  onlineHandlers.forEach(handler => handler());
};

const handleOfflineEvent = () => {
  onlineStatus = false;
  offlineHandlers.forEach(handler => handler());
};

/**
 * Checks if the application is currently online.
 * @returns {boolean} True if online, false otherwise.
 */
export const isOnline = (): boolean => {
  return onlineStatus;
};

/**
 * Adds a handler function to be called when the application goes online.
 * @param handler The function to call.
 */
export const onOnline = (handler: NetworkStatusHandler): void => {
  onlineHandlers.push(handler);
};

/**
 * Adds a handler function to be called when the application goes offline.
 * @param handler The function to call.
 */
export const onOffline = (handler: NetworkStatusHandler): void => {
  offlineHandlers.push(handler);
};

/**
 * Removes a handler function from the online event listeners.
 * @param handler The function to remove.
 */
export const offOnline = (handler: NetworkStatusHandler): void => {
  const index = onlineHandlers.indexOf(handler);
  if (index > -1) {
    onlineHandlers.splice(index, 1);
  }
};

/**
 * Removes a handler function from the offline event listeners.
 * @param handler The function to remove.
 */
export const offOffline = (handler: NetworkStatusHandler): void => {
  const index = offlineHandlers.indexOf(handler);
  if (index > -1) {
    offlineHandlers.splice(index, 1);
  }
};

/**
 * Sets up the global online and offline event listeners on the window object.
 * This should ideally be called once when your application initializes.
 */
export const setupNetworkStatusListeners = (): void => {
  window.addEventListener('online', handleOnlineEvent);
  window.addEventListener('offline', handleOfflineEvent);
};

/**
 * Removes the global online and offline event listeners from the window object.
 * Call this when your application is shutting down if necessary.
 */
export const cleanupNetworkStatusListeners = (): void => {
  window.removeEventListener('online', handleOnlineEvent);
  window.removeEventListener('offline', handleOfflineEvent);
};

// Initialize the online status on script load
setupNetworkStatusListeners();