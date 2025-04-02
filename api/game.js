// api/game.js
import { Server } from 'socket.io';

let io;

export default function handler(req, res) {
  if (req.method === 'GET') {
    if (!io) {
      // Initialize Socket.io server only once
      io = new Server(res.socket.server);

      // Listen for connections
      io.on('connection', (socket) => {
        console.log('Player connected');

        // Handle messages from clients
        socket.on('playerMove', (data) => {
          console.log('Player move:', data);
          // Broadcast to all connected clients
          io.emit('updateGameState', { message: 'Game state updated!' });
        });

        // Handle player disconnect
        socket.on('disconnect', () => {
          console.log('Player disconnected');
        });
      });
    }

    // Required for the WebSocket connection to work
    res.socket.server.on('upgrade', (request, socket, head) => {
      io.handleUpgrade(request, socket, head, (socket) => {
        io.emit('connection', socket, request);
      });
    });

    // Return response (required by Vercel)
    res.status(200).send('Socket.io server running');
  } else {
    res.status(405).end('Method Not Allowed');
  }
}
