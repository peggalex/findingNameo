console.log('Loaded service worker!');

self.addEventListener('push', ev => {
    const data = ev.data.json();
    console.log('Got push', data);
    self.registration.showNotification(data.title, {
        body: data.body,
        icon: 'http://mongoosejs.com/docs/images/mongoose5_62x30_transparent.png'
    });
});

self.addEventListener('message', function(event) {
    if (event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }
});

//https://github.com/vkarpov15/web-push-demo/blob/master/worker.js