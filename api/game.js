// api/game.js
import { Server } from 'socket.io';

let io;

export default function handler(req, res) {
  if (req.method === 'GET') {
    if (!io) {
      // Initialize Socket.io server with CORS configuration
      io = new Server(res.socket.server, {
        cors: {
          origin: '*', // Allow all origins, or specify the frontend's origin
          methods: ['GET', 'POST'],
          allowedHeaders: ['Content-Type'],
        },
      });

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

    // Required for WebSocket connection to work in serverless functions
    res.socket.server.on('upgrade', (request, socket, head) => {
      io.handleUpgrade(request, socket, head, (socket) => {
        io.emit('connection', socket, request);
      });
    });

    res.status(200).send('Socket.io server running');
  } else {
    res.status(405).end('Method Not Allowed');
  }
}
