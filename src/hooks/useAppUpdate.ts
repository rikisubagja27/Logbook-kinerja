import { useState, useEffect, useCallback } from 'react';
import { registerSW } from 'virtual:pwa-register';

export interface AppUpdateState {
  needRefresh: boolean;
  offlineReady: boolean;
  isUpdating: boolean;
  updateApp: () => Promise<void>;
  dismissUpdate: () => void;
  checkForUpdates: () => Promise<boolean>;
  lastChecked: Date | null;
}

// Version stamp for display to give users clear visibility
export const APP_VERSION = 'v2.6.0 (Okt 2026)';
export const BUILD_DATE = '29 Oktober 2026';

/**
 * Hard reload and cache-busting utility:
 * Clears Service Worker asset caches while keeping 100% of localStorage, IndexedDB, and Firestore intact!
 */
export async function forceRefreshApp(): Promise<void> {
  // 1. Signal any waiting service workers to take over
  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const reg of registrations) {
        if (reg.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
        await reg.update().catch(() => {});
      }
    } catch (err) {
      console.warn('Service worker update check error:', err);
    }
  }

  // 2. Clear CacheStorage (only holds HTML, CSS, JS, and font assets)
  // LocalStorage, IndexedDB, and Firebase data are NOT touched!
  if ('caches' in window) {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    } catch (err) {
      console.warn('Cache clearing error:', err);
    }
  }

  // 3. Mark update flag in sessionStorage so we can show a success toast on reload
  try {
    sessionStorage.setItem('app_just_updated_feedback', 'true');
  } catch {}

  // 4. Force reload page
  window.location.reload();
}

export function useAppUpdate(): AppUpdateState {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [updateFunction, setUpdateFunction] = useState<(() => Promise<void>) | null>(null);

  useEffect(() => {
    // Only register if service worker is supported
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    try {
      const updateSW = registerSW({
        immediate: true,
        onNeedRefresh() {
          console.log('[PWA] New application version detected and ready to activate.');
          setNeedRefresh(true);
        },
        onOfflineReady() {
          console.log('[PWA] App ready to work offline.');
          setOfflineReady(true);
        },
        onRegistered(registration) {
          console.log('[PWA] Service Worker registered successfully.');
          if (registration) {
            // Check for updates periodically every 30 minutes
            const intervalId = setInterval(() => {
              registration.update().catch(() => {});
            }, 30 * 60 * 1000);

            // Also check when app comes back to focus / user re-opens tab
            const onVisibilityChange = () => {
              if (document.visibilityState === 'visible') {
                registration.update().catch(() => {});
              }
            };
            document.addEventListener('visibilitychange', onVisibilityChange);

            return () => {
              clearInterval(intervalId);
              document.removeEventListener('visibilitychange', onVisibilityChange);
            };
          }
        },
        onRegisterError(error) {
          console.warn('[PWA] Service Worker registration error:', error);
        },
      });

      setUpdateFunction(() => async () => {
        setIsUpdating(true);
        try {
          await updateSW(true);
        } catch {
          await forceRefreshApp();
        }
      });
    } catch (e) {
      console.warn('[PWA] virtual:pwa-register init warning:', e);
    }
  }, []);

  const updateApp = useCallback(async () => {
    setIsUpdating(true);
    if (updateFunction) {
      try {
        await updateFunction();
        return;
      } catch (err) {
        console.warn('Update function failed, falling back to forceRefreshApp', err);
      }
    }
    await forceRefreshApp();
  }, [updateFunction]);

  const dismissUpdate = useCallback(() => {
    setNeedRefresh(false);
  }, []);

  const checkForUpdates = useCallback(async (): Promise<boolean> => {
    setLastChecked(new Date());
    if ('serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          await reg.update();
          if (reg.waiting) {
            setNeedRefresh(true);
            return true;
          }
        }
      } catch (err) {
        console.warn('Check for updates error:', err);
      }
    }
    return false;
  }, []);

  return {
    needRefresh,
    offlineReady,
    isUpdating,
    updateApp,
    dismissUpdate,
    checkForUpdates,
    lastChecked,
  };
}
