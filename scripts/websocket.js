let ws;
let messageCallback = null;

function connectWebSocket(token, page, callback, onCloseCallback) {
    messageCallback = callback;

    return new Promise((resolve, reject) => {
        ws = new WebSocket(`wss://crm.aquaprylad.in.ua/ws/?token=${encodeURIComponent(token)}&page=[${page}]`);

        ws.onopen = () => {
            console.log('WebSocket connection opened');
            resolve();
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            reject(error);
        };

        ws.onclose = (event) => {
            console.log('WebSocket connection closed:', event);
            if (onCloseCallback) {
                onCloseCallback(event.code);
            }
        };

        ws.onmessage = (event) => {
            if (messageCallback) {
                messageCallback(event);
            }
        };
    });
}

function sendWebSocketMessage(message) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(message);
    } else {
        console.error('WebSocket is not connected.');
    }
}

function closeWebSocket(code, reason) {
    if (ws) {
        ws.close(code, reason);
    } else {
        console.error('WebSocket is not connected.');
    }
}

export { connectWebSocket, sendWebSocketMessage, closeWebSocket };
