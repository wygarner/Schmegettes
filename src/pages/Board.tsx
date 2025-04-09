import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useWebSocket } from '../context/WebSocketContext';
import levenshteinDistance from '../utils/levenshteinDistance';

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
  const [message, setMessage] = useState<string>('');
  const [activeRound, setActiveRound] = useState<number>(1);

  const navigateToClue = (clue: ClueData, players: any) => {
    console.log('Navigating to clue:', clue, players);
    navigate(`/clue?gameId=${gameId}&playerId=${playerId}`, { state: { clue, players } });
  }

  const handleClueSelect = (spokenText: string): void => {
    if (!gameBoard || gameBoard.length === 0) return;
  
    const regex = /(.+?)\s*(?:for\s*)?(\d+)/i;
    const match = spokenText.match(regex);
  
    if (!match) {
      setMessage(`Couldn't understand. Try saying something like '${categories[0]} for 100'.`);
      return;
    }
  
    const spokenCategory = match[1].trim().toLowerCase();
    const spokenValue = parseInt(match[2]);
  
    let closestCategory = '';
    let smallestDistance = Infinity;
  
    for (const category of categories) {
      const distance = levenshteinDistance(spokenCategory, category.toLowerCase());
      if (distance < smallestDistance) {
        smallestDistance = distance;
        closestCategory = category;
      }
    }
  
    const categoryObj = gameBoard.find(c => c.category === closestCategory);
    const clue = categoryObj?.clues.find(c => c.value === spokenValue && c.active);
  
    if (clue) {
      socket?.send(JSON.stringify({ type: 'clearClue', clueId: clue.id, gameId }));
    } else {
      setMessage(`No active clue found for ${closestCategory} at $${spokenValue}`);
    }
  };
  
  

  const handleVoiceInput = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  
    if (!SpeechRecognition) {
      alert("Your browser does not support speech recognition.");
      return;
    }
  
    const recognition = new SpeechRecognition();
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
  
    recognition.onstart = () => {
      setMessage("Listening...");
    };
  
    recognition.onresult = (event: any) => {
      const spokenText = event.results[0][0].transcript;
      setMessage(`You said: ${spokenText}`);
      handleClueSelect(spokenText);
    };
  
    recognition.onerror = (event: any) => {
      setMessage(`Error: ${event.error}`);
    };
  
    recognition.start();
  };

  const currentPlayer = players.find((player: any) => player.id === playerId);

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
        if (data.type === 'clueSelected') {
          const { clue, game } = data;
          const players = game.players || [];
          navigateToClue(clue, players);
        }
      };
    };
  }, [socket?.readyState]);

  useEffect(() => {
    console.log('socket readyState:', socket?.readyState);
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
        <h1 className="jeopardy-title">Schmegettes!</h1>
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
                  className={`clue-cell`}
                  style={{
                    cursor: currentPlayer.isTurn && clue.active ? 'pointer' : 'not-allowed',
                  }}
                >
                  {!clue.active ? '' : `$${clue.value}`}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      {message && (
        <div className="message">
          {message}
        </div>
      )}
      <div className="players-container">
        {players.map((player: any, index: number) => (
          <div key={index} className={`player-card ${player.isTurn ? 'active-turn' : ''}`}>
            <h2>{player.name}</h2>
            <p>Score: {player.score}</p>
            {player.isTurn && (
              <button onClick={handleVoiceInput} className="voice-button">
                🎤
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
