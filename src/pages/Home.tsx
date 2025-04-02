import { useState } from 'react'
import { useNavigate } from 'react-router-dom';

interface Game {
  id: string;
  name: string;
}

export default function Home() {
  const [games, setGames] = useState<Game[]>([
    { id: '1', name: 'Game 1' },
    { id: '2', name: 'Game 2' }
  ]);

  const navigate = useNavigate();

  const createGame = () => {
    const newGame: Game = {
      id: (games.length + 1).toString(),
      name: `Game ${games.length + 1}`
    };
    setGames([...games, newGame]);
  };

  return (
    <div>
      <h1>Available Games</h1>
      <ul>
        {games.map((game) => (
          <li key={game.id}>
            <button onClick={() => navigate(`/lobby?gameId=${game.id}`)}>
              Join {game.name}
            </button>
          </li>
        ))}
      </ul>
      <button onClick={createGame}>Create Game</button>
    </div>
  );
}
