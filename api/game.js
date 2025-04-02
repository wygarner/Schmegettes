// api/game.js
import { Server } from 'ws';

let wss; // WebSocket server instance
const clients = new Set(); // Set to hold connected clients

export default function handler(req, res) {
  if (req.method === 'GET') {
    if (!wss) {
      // Create WebSocket server on first request
      wss = new Server({ noServer: true });

      wss.on('connection', (socket) => {
        clients.add(socket);
        console.log('Player connected');

        // Broadcast a message when a new player connects
        socket.send(JSON.stringify({ message: 'Welcome to the game!' }));

        // Handle messages from clients
        socket.on('message', (message) => {
          console.log('Received message:', message);

          // Broadcast received message to all clients
          clients.forEach((client) => {
            if (client !== socket && client.readyState === client.OPEN) {
              client.send(message);
            }
          });
        });

        // Handle player disconnect
        socket.on('close', () => {
          clients.delete(socket);
          console.log('Player disconnected');
        });
      });
    }

    // Upgrade HTTP request to WebSocket connection
    res.socket.server.on('upgrade', (request, socket, head) => {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    });

    return res.status(200).end('WebSocket server running');
  }

  // Return a 405 error for non-GET methods
  return res.status(405).end('Method Not Allowed');
}
