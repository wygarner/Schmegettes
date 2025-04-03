import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useWebSocket } from '../context/WebSocketContext';

interface ClueData {
  category: string;
  value: number;
  question: string;
  answer: string;
  active?: boolean;
  round?: number;
  id: string;
}

interface CategoryData {
  category: string;
  clues: ClueData[];
}

export default function Board() {
  const [searchParams] = useSearchParams();
  const gameId = searchParams.get('gameId');
  const playerId = searchParams.get('playerId');
  const navigate = useNavigate();
  const socket = useWebSocket();

  const [categories, setCategories] = useState<string[]>([]);
  const [gameBoard, setGameBoard] = useState<CategoryData[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [activeRound, setActiveRound] = useState<number>(1);

  const handleClueSelect = (clue: any): void => {
    if (!socket) return;
    socket.send(JSON.stringify({ type: 'clearClue', clueId: clue.id, gameId }));

    navigate(`/clue?gameId=${gameId}&playerId=${playerId}`, { state: { clue } });
  };

  useEffect(() => {
    if (socket?.readyState == 1) {
      socket.onmessage = (event: { data: string; }) => {
        const data = JSON.parse(event.data);
        if (data.type === 'game') {
          const {
            players,
            activeRound,
            clues,
          } = data.game || {};
          setPlayers(players || []);
          setActiveRound(activeRound || 1);
          const cluesByRound: { [key: number]: ClueData[] } = clues.reduce((acc: { [x: string]: any[]; }, clue: { round: number; }) => {
            const round = clue.round || 1; // Default to round 1 if not specified
            if (!acc[round]) {
              acc[round] = [];
            }
            acc[round].push(clue);
            return acc;
          }, {} as { [key: number]: ClueData[] });
        
          const activeClues = cluesByRound[activeRound] || [];
      
          const uniqueCategories = [...new Set(activeClues.map(item => item.category))];
          setCategories(uniqueCategories);
      
          const boardData: CategoryData[] = uniqueCategories.map(category => {
            const clues = activeClues
              .filter(item => item.category === category)
              .sort((a, b) => a.value - b.value);
            return {
              category,
              clues
            };
          });
          setGameBoard(boardData);
        }
      };
    };
  }, [socket?.readyState]);

  useEffect(() => {
    if (socket?.readyState == 1 && gameId) {
      try {
        socket.send(JSON.stringify({ type: 'getGame', gameId }));
      } catch (error) {
        console.error('Error sending message:', error);
      }
    }
  }, [socket?.readyState, gameId]);

  console.log('game board', gameBoard);

  return (
    <div className="jeopardy-container">
      <div className="jeopardy-header">
        <h1 className="jeopardy-title">SCHMEGETTES!</h1>
      </div>
      <div className="board-container">
        <div className="game-board">
          {categories.map((category, categoryIndex) => (
            <div key={categoryIndex} className="category-column">
              <div className="category-header">
                {category}
              </div>
              {gameBoard[categoryIndex].clues.map((clue, clueIndex) => (
                <div 
                  key={clueIndex}
                  onClick={() => handleClueSelect(clue)}
                  className={`clue-cell`}
                >
                  {!clue.active ? '' : `$${clue.value}`}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="players-container">
        {players.map((player: any, index: number) => (
          <div key={index} className={`player-card ${player.isTurn ? 'active-turn' : ''}`}>
            <h2>{player.name}</h2>
            <p>Score: {player.score}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
