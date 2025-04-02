import { useLocation } from 'react-router-dom';

// Types
interface ClueData {
  category: string;
  value: number;
  question: string;
  answer: string;
  used?: boolean;
  clueValue?: string;
}

interface CategoryData {
  category: string;
  clues: ClueData[];
}

import React, { useState, useEffect } from 'react';

const JeopardyGame: React.FC = () => {
  const { state: { clues }} = useLocation() as { state: { clues: ClueData[] } };
  console.log('clues:', clues);
  const [_, setGameData] = useState<ClueData[] | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [gameBoard, setGameBoard] = useState<CategoryData[]>([]);
  const [currentClue, setCurrentClue] = useState<ClueData | null>(null);
  const [score, setScore] = useState<number>(0);
  const [answer, setAnswer] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const socket = new WebSocket('ws://localhost:3000'); // Use the host’s local IP
  socket.onopen = () => {
    console.log('Connected to game server');
    socket.send('Player 1 has joined');
  };

  socket.onmessage = (event) => {
    console.log('Message from server:', event.data);
  };


  // Load a sample of the Jeopardy dataset
  useEffect(() => {
    try {
      setGameData(clues);
      
      // Extract unique categories
      const uniqueCategories = [...new Set(clues.map(item => item.category))];
      setCategories(uniqueCategories);
      
      // Organize data into game board format
      const boardData: CategoryData[] = uniqueCategories.map(category => {
        const categoryClues = clues
          .filter(item => item.category === category)
          .sort((a, b) => a.value - b.value);
        return {
          category,
          clues: categoryClues
        };
      });
      
      setGameBoard(boardData);
      setIsLoading(false);
    } catch (err) {
      setError("Failed to load game data");
      setIsLoading(false);
    }
  }, []);

  const handleClueSelect = (categoryIndex: number, clueIndex: number): void => {
    const clue = gameBoard[categoryIndex].clues[clueIndex];
    // Mark the clue as used by creating a new game board with this clue marked
    const newGameBoard = [...gameBoard];
    if (newGameBoard[categoryIndex].clues[clueIndex].used) return; // Already used
    
    newGameBoard[categoryIndex].clues[clueIndex] = {
      ...newGameBoard[categoryIndex].clues[clueIndex],
      used: true
    };
    
    setGameBoard(newGameBoard);
    setCurrentClue(clue);
    setAnswer('');
    setMessage('');
  };

  const handleAnswerSubmit = (): void => {
    if (!currentClue) return;
    
    const userAnswer = answer.trim().toLowerCase();
    const correctAnswer = currentClue.answer.toLowerCase();
    
    // Check if the answer is correct (simplified matching)
    const isCorrect = 
      userAnswer === correctAnswer || 
      correctAnswer.includes(userAnswer) || 
      userAnswer.includes(correctAnswer);
    
    if (isCorrect) {
      setScore(score + currentClue.value);
      setMessage(`Correct! You earned ${currentClue.value} points.`);
    } else {
      setScore(score - currentClue.value);
      setMessage(`Sorry, the correct answer was "${currentClue.answer}". You lost ${currentClue.value} points.`);
    }
    
    // Close the clue after a short delay
    setTimeout(() => {
      setCurrentClue(null);
    }, 3000);
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
    setCurrentClue(null);
    setScore(0);
    setAnswer('');
    setMessage('');
  };

  const handleVoiceInput = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  
    if (!SpeechRecognition) {
      alert("Your browser does not support speech recognition.");
      return;
    }
  
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
  
    recognition.onstart = () => {
      setMessage("Listening...");
    };
  
    recognition.onresult = (event: any) => {
      const spokenText = event.results[0][0].transcript;
      setAnswer(spokenText);
      setMessage(`You said: "${spokenText}"`);
    };
  
    recognition.onerror = (event: any) => {
      setMessage(`Error: ${event.error}`);
    };
  
    recognition.start();
  };
  

  if (isLoading) {
    return (
      <div>
        <div>Loading Jeopardy! Game...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div>Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="jeopardy-container">
      <div className="jeopardy-header">
        <h1 className="jeopardy-title">JEOPARDY!</h1>
        <div className="jeopardy-score">Score: ${score}</div>
      </div>
      
      {currentClue ? (
        <div className="clue-container">
          <div className="clue-card">
            <div className="clue-header">{currentClue.category} - ${currentClue.value}</div>
            <div className="clue-question">{currentClue.question}</div>
            <input
              type="text"
              value={answer}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAnswer(e.target.value)}
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handleAnswerSubmit()}
              placeholder="Your answer..."
              className="clue-input"
              disabled
            />
            <button
              onClick={handleAnswerSubmit}
              className="submit-button"
            >
              Submit Answer
            </button>
            <button onClick={handleVoiceInput} className="voice-button">
              🎤 Speak Answer
            </button>
            {message && (
              <div className="message">
                {message}
              </div>
            )}
          </div>
        </div>
      ) : (
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
      )}
      
      <div className="reset-container">
        <button
          onClick={resetGame}
        >
          Reset Game
        </button>
      </div>
    </div>
  );
};

export default JeopardyGame;