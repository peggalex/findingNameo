import { register } from "../serviceWorker";

export var myPushSub: PushSubscription;

// Hard-coded, replace with your public key
const publicVapidKey = "BJ2XSl6yFWZV9fSzKYGcvUtlEbnYiUo2k0RFtetCpLj3q62YF6YsHwK62G5T7CbQKX4PHPgHgEa3CyPPmnxJWp4";
export function pokemonGoToThePolls(){
    if ('serviceWorker' in navigator) {
        console.log('Registering service worker');
        Notification.requestPermission()
            .then(()=>run().catch(error => console.error(error)));
    }
}

async function run(){
    console.log('Registering service worker');
    const registration = await navigator.serviceWorker.
        register('/worker.js', {scope: '/'});
    registration.update();
    console.log('Registered service worker');

    console.log('Registering push');
    const subscription: PushSubscription = await registration.pushManager.
        subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
        });
    console.log('Registered push');
    myPushSub = subscription;

    console.log('Sending push');
    await fetch('/subscribe', {
        method: 'POST',
        body: JSON.stringify(subscription),
        headers: {
        'content-type': 'application/json'
        }
    });
    console.log('Sent push');
}

// Web-Push
// Public base64 to Uint
// https://www.npmjs.com/package/web-push#using-vapid-key-for-applicationserverkey
function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');
  
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
  
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }