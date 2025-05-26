// Import Firebase scripts for service worker
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Firebase configuration - Replace with your config
const firebaseConfig = {
    apiKey: "your-api-key",
    authDomain: "your-project-id.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project-id.appspot.com",
    messagingSenderId: "your-sender-id",
    appId: "your-app-id"
};

// Initialize Firebase in service worker
firebase.initializeApp(firebaseConfig);

// Get messaging instance
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
    console.log('Received background message:', payload);

    const notificationTitle = payload.notification?.title || 'New Message';
    const notificationOptions = {
        body: payload.notification?.body || 'You have a new message',
        icon: payload.notification?.image || '/icon-192x192.png',
        badge: '/badge-72x72.png',
        tag: 'fcm-notification',
        data: payload.data || {},
        actions: [
            {
                action: 'open',
                title: 'Open'
            },
            {
                action: 'close',
                title: 'Close'
            }
        ],
        requireInteraction: true,
        silent: false
    };

    // Show notification
    return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
    console.log('Notification clicked:', event);

    event.notification.close();

    if (event.action === 'open' || !event.action) {
        // Open the app when notification is clicked
        event.waitUntil(
            clients.matchAll({ type: 'window', includeUncontrolled: true })
                .then((clientList) => {
                    // If app is already open, focus it
                    for (const client of clientList) {
                        if (client.url.includes(location.origin) && 'focus' in client) {
                            return client.focus();
                        }
                    }
                    
                    // If app is not open, open it
                    if (clients.openWindow) {
                        return clients.openWindow('/');
                    }
                })
        );
    }
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
    console.log('Notification closed:', event);
    
    // Track notification close event if needed
    // analytics.logEvent('notification_close', {
    //     notification_id: event.notification.tag
    // });
});

// Service worker install event
self.addEventListener('install', (event) => {
    console.log('Service worker installing...');
    self.skipWaiting();
});

// Service worker activate event
self.addEventListener('activate', (event) => {
    console.log('Service worker activating...');
    event.waitUntil(self.clients.claim());
});

// Handle sync events (for offline functionality)
self.addEventListener('sync', (event) => {
    if (event.tag === 'background-sync') {
        console.log('Background sync event triggered');
        // Implement background sync logic here
    }
});

// Handle push events (alternative to FCM background messages)
self.addEventListener('push', (event) => {
    console.log('Push event received:', event);

    if (event.data) {
        const data = event.data.json();
        const title = data.notification?.title || 'New Message';
        const options = {
            body: data.notification?.body || 'You have a new message',
            icon: data.notification?.icon || '/icon-192x192.png',
            badge: '/badge-72x72.png',
            data: data.data || {}
        };

        event.waitUntil(
            self.registration.showNotification(title, options)
        );
    }
});
