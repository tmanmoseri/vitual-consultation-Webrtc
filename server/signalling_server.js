const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8081 }, () => {
    console.log("Signalling server is now listening on port 8081");
});
//distribute requests to other clients
wss.broadcast = (ws, data) => {
    wss.clients.forEach((client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(data);
        }
    });
};


wss.on('connection', ws => {
    console.log('Client connected. Total connected clients: ${wss.clients.size}');

    //broadcast any message coming in
    ws.on('message', message => {
        // msg = JSON.parse(message);
        console.log(message + "\n\n");
        wss.broadcast(ws, message);
    });
    
    //show how many clients are currently connected
    ws.on('close', ws => {
        console.log('Client disconnected. Total connected clients: ${wss.clients.size}');
    })

    ws.on('error', error => {
        console.log('Client error. Total connected clients: ${wss.clients.size}');
    });
});
