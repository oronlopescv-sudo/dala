// Registo do Service Worker + notificações locais

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js');
    return reg;
  } catch (err) {
    console.error('SW registration failed:', err);
    return null;
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

// Notificação local quando alguém começa a falar (app aberta em background)
export async function notifySpeaker(userName: string, channelName: string) {
  if (typeof window === 'undefined') return;
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  // Só notifica se a página não está visível (background)
  if (document.visibilityState === 'visible') return;

  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg) {
      await reg.showNotification(`${userName} está a falar`, {
        body: `Canal: ${channelName}`,
        icon: '/icon-192.png',
        tag: 'dafala-voice',
        // @ts-expect-error renotify é suportado nos browsers principais
        renotify: true,
      });
    }
  } catch {
    /* ignora */
  }
}
