import './App.css';

// Types
interface ClueData {
  category: string;
  value: number;
  question: string;
  answer: string;
  used?: boolean;
}

interface CategoryData {
  category: string;
  clues: ClueData[];
}

import React, { useState, useEffect } from 'react';

const JeopardyGame: React.FC = () => {
  const [gameData, setGameData] = useState<ClueData[] | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [gameBoard, setGameBoard] = useState<CategoryData[]>([]);
  const [currentClue, setCurrentClue] = useState<ClueData | null>(null);
  const [score, setScore] = useState<number>(0);
  const [answer, setAnswer] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Load a sample of the Jeopardy dataset
  useEffect(() => {
    // Since we can't directly fetch from GitHub in this environment,
    // I'll create a sample dataset based on the structure of the Jeopardy dataset
    const sampleData: ClueData[] = [
      { category: "HISTORY", value: 200, question: "In 1066 William the Conqueror defeated King Harold II at this battle", answer: "the Battle of Hastings" },
      { category: "HISTORY", value: 400, question: "This 'Great' king of Persia was defeated by Alexander the Great", answer: "Darius" },
      { category: "HISTORY", value: 600, question: "The Constitutional Convention was held in this city in 1787", answer: "Philadelphia" },
      { category: "HISTORY", value: 800, question: "This 1803 Supreme Court case established the principle of judicial review", answer: "Marbury v. Madison" },
      { category: "HISTORY", value: 1000, question: "This 1215 document limited the power of the English monarch", answer: "Magna Carta" },
      
      { category: "SCIENCE", value: 200, question: "This element with symbol 'O' is essential for human respiration", answer: "Oxygen" },
      { category: "SCIENCE", value: 400, question: "This is the study of heredity and the variation of inherited characteristics", answer: "Genetics" },
      { category: "SCIENCE", value: 600, question: "This physicist proposed the theory of relativity", answer: "Einstein" },
      { category: "SCIENCE", value: 800, question: "This is the process by which plants make their own food using sunlight", answer: "Photosynthesis" },
      { category: "SCIENCE", value: 1000, question: "This subatomic particle has a negative charge", answer: "Electron" },
      
      { category: "GEOGRAPHY", value: 200, question: "This is the largest ocean on Earth", answer: "Pacific Ocean" },
      { category: "GEOGRAPHY", value: 400, question: "This mountain is the tallest in the world", answer: "Mount Everest" },
      { category: "GEOGRAPHY", value: 600, question: "This South American country is home to the Amazon Rainforest", answer: "Brazil" },
      { category: "GEOGRAPHY", value: 800, question: "This desert is the largest hot desert in the world", answer: "Sahara Desert" },
      { category: "GEOGRAPHY", value: 1000, question: "This strait separates Asia and North America", answer: "Bering Strait" },
      
      { category: "LITERATURE", value: 200, question: "This Shakespeare play features the character Hamlet", answer: "Hamlet" },
      { category: "LITERATURE", value: 400, question: "This author wrote 'Pride and Prejudice'", answer: "Jane Austen" },
      { category: "LITERATURE", value: 600, question: "This novel by Harper Lee features the character Atticus Finch", answer: "To Kill a Mockingbird" },
      { category: "LITERATURE", value: 800, question: "This dystopian novel by George Orwell was published in 1949", answer: "1984" },
      { category: "LITERATURE", value: 1000, question: "This epic poem by Homer tells the story of Odysseus's journey home", answer: "The Odyssey" },
      
      { category: "ENTERTAINMENT", value: 200, question: "This film won the Academy Award for Best Picture in 1994", answer: "Forrest Gump" },
      { category: "ENTERTAINMENT", value: 400, question: "This band performed 'Hey Jude' and 'Let It Be'", answer: "The Beatles" },
      { category: "ENTERTAINMENT", value: 600, question: "This TV show features characters named Ross, Rachel, Joey, Chandler, Monica, and Phoebe", answer: "Friends" },
      { category: "ENTERTAINMENT", value: 800, question: "This director is known for films such as 'Jaws', 'E.T.', and 'Jurassic Park'", answer: "Steven Spielberg" },
      { category: "ENTERTAINMENT", value: 1000, question: "This actor played Tony Stark in the Marvel Cinematic Universe", answer: "Robert Downey Jr." },
      
      { category: "SPORTS", value: 200, question: "This sport is played with a ball and clubs on a course with 18 holes", answer: "Golf" },
      { category: "SPORTS", value: 400, question: "This athlete has won the most Olympic gold medals", answer: "Michael Phelps" },
      { category: "SPORTS", value: 600, question: "This team sport has positions such as setter, libero, and outside hitter", answer: "Volleyball" },
      { category: "SPORTS", value: 800, question: "This annual cycling race takes place in France", answer: "Tour de France" },
      { category: "SPORTS", value: 1000, question: "This American athlete won 4 gold medals at the 1936 Olympics in Berlin", answer: "Jesse Owens" },
    ];

    try {
      setGameData(sampleData);
      
      // Extract unique categories
      const uniqueCategories = [...new Set(sampleData.map(item => item.category))];
      setCategories(uniqueCategories);
      
      // Organize data into game board format
      const boardData: CategoryData[] = uniqueCategories.map(category => {
        const clues = sampleData
          .filter(item => item.category === category)
          .sort((a, b) => a.value - b.value);
        return {
          category,
          clues
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