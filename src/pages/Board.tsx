import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useWebSocket } from '../context/WebSocketContext';

interface ClueData {
  category: string;
  value: number;
  question: string;
  answer: string;
  used?: boolean;
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
  const navigate = useNavigate();
  const socket = useWebSocket();

  const [categories, setCategories] = useState<string[]>([]);
  const [gameBoard, setGameBoard] = useState<CategoryData[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [activeRound, setActiveRound] = useState<number>(1);

  const handleClueSelect = (categoryIndex: number, clueIndex: number): void => {
    const clue = gameBoard[categoryIndex].clues[clueIndex];
    // Mark the clue as used by creating a new game board with this clue marked
    const newGameBoard = [...gameBoard];
    if (newGameBoard[categoryIndex].clues[clueIndex].used) return; // Already used
    
    newGameBoard[categoryIndex].clues[clueIndex] = {
      ...newGameBoard[categoryIndex].clues[clueIndex],
      used: true
    };

    if (!socket) return;
    socket.send(JSON.stringify({ type: 'clearClue', clueId: clue.id }));

    // Navigate to the clue page with the clue data
    // navigate('/clue', { state: { clue } });
    
    // setGameBoard(newGameBoard);
  };

  useEffect(() => {
    if (socket?.readyState == 1) {
      socket.onmessage = (event: { data: string; }) => {
        const data = JSON.parse(event.data);
        if (data.type === 'game') {
          console.log('game', data);
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
                  onClick={() => handleClueSelect(categoryIndex, clueIndex)}
                  className={`clue-cell`}
                >
                  {clue.used ? '' : `$${clue.value}`}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="players-container">
        {players.map((player: any, index: number) => (
          <div key={index} className="player-card">
            <h2>{player.name}</h2>
            <p>Score: {player.score}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
