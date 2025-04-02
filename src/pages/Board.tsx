import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom';

interface ClueData {
  category: string;
  value: number;
  question: string;
  answer: string;
  used?: boolean;
  round?: number;
}

interface CategoryData {
  category: string;
  clues: ClueData[];
}

export default function Board() {
  const { state: { clues }} = useLocation() as { state: { clues: ClueData[] } };
  const navigate = useNavigate();

  const [activeRound, _] = useState<number>(1);
  const [categories, setCategories] = useState<string[]>([]);
  const [gameBoard, setGameBoard] = useState<CategoryData[]>([]);
  const [score, setScore] = useState<number>(0);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [messages, setMessages] = useState<string[]>([]);

  const handleClueSelect = (categoryIndex: number, clueIndex: number): void => {
    const clue = gameBoard[categoryIndex].clues[clueIndex];
    // Mark the clue as used by creating a new game board with this clue marked
    const newGameBoard = [...gameBoard];
    if (newGameBoard[categoryIndex].clues[clueIndex].used) return; // Already used
    
    newGameBoard[categoryIndex].clues[clueIndex] = {
      ...newGameBoard[categoryIndex].clues[clueIndex],
      used: true
    };

    // Navigate to the clue page with the clue data
    navigate('/clue', { state: { clue } });
    
    // setGameBoard(newGameBoard);
  };

  const resetGame = (): void => {
    const newGameBoard = gameBoard.map(category => ({
      ...category,
      clues: category.clues.map(clue => ({
        ...clue,
        used: false
      }))
    }));
    
    setGameBoard(newGameBoard);
    setScore(0);
  };

  const sendMessage = (message: string) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ message }));
    }
  };

  useEffect(() => {
    const cluesByRound: { [key: number]: ClueData[] } = clues.reduce((acc, clue) => {
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

  }, [activeRound, clues]);

  useEffect(() => {
    // Connect to the WebSocket server
    const socket = new WebSocket('wss://your-vercel-deployment-url/api/game');

    socket.onopen = () => {
      console.log('Connected to WebSocket server');
    };

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      setMessages((prevMessages) => [...prevMessages, message]);
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    socket.onclose = () => {
      console.log('Disconnected from WebSocket server');
    };

    // Store the WebSocket connection in state
    setWs(socket);

    // Clean up on component unmount
    return () => {
      if (socket) socket.close();
    };
  }, []);

  return (
      <div className="jeopardy-container">
        <div className="jeopardy-header">
          <h1 className="jeopardy-title">JEOPARDY!</h1>
          <div className="jeopardy-score">Score: ${score}</div>
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
        <div>
          {messages.map((msg, idx) => (
            <p key={idx}>{msg}</p>
          ))}
        </div>
        <div className="reset-container">
          <button
            onClick={resetGame}
          >
            Reset Game
          </button>
          <button
            onClick={() => sendMessage('Hello from the game board!')}
          >
            Send Message
          </button>
        </div>
      </div>
    );
}
