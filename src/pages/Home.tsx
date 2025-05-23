import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWebSocket } from '../context/WebSocketContext';

interface Game {
  id: string;
  name: string;
}

export default function Home() {
  const [games, setGames] = useState<Game[]>([]);
  const navigate = useNavigate();
  const socket = useWebSocket(); // Access WebSocket from context

  const createGame = () => {
    if (socket) {
      socket.send(JSON.stringify({ type: 'createGame' }));
    }
  };

  useEffect(() => {
    if (socket?.readyState == 1) {
      socket.onmessage = (event: { data: string; }) => {
        const data = JSON.parse(event.data);
        if (data.type === 'gamesList') {
          setGames(data.games);
        }
      };
    }
  }, [socket?.readyState]);

  useEffect(() => {
    if (socket?.readyState == 1) {
      try {
        socket.send(JSON.stringify({ type: 'getGamesList' }));
      } catch (error) {
        console.error('Error sending message:', error);
      }
    }
  }, [socket?.readyState]);

  return (
    <div>
      <h1>Answer: Schmegettes!</h1>
      <h1>Question: ...What is Schmegettes?</h1>
      {games && games.length > 0 && <h3>Available Games</h3>}
        {games?.map((game) => (
          <div style={{ marginBottom: '10px' }} key={game.id}>
            <button key={game.id} onClick={() => navigate(`/lobby?gameId=${game.id}`)}>
              Go To {game.id} Lobby
            </button>
          </div>
        ))}
      <button onClick={createGame}>Create Game</button>
    </div>
  );
}
