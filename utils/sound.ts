export const playNotificationSound = () => {
    try {
        // Simple "pop" sound (Base64 encoded WAV)
        const audio = new Audio("data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YT4AAAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA");

        // Attempt to play - browsers might block autoplay if no user interaction
        const promise = audio.play();

        if (promise !== undefined) {
            promise.catch(error => {
                console.warn('Audio playback prevented by browser policy:', error);
            });
        }
    } catch (e) {
        console.error('Error playing notification sound', e);
    }
};
