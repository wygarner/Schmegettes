import React, { useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useWebSocket } from '../context/WebSocketContext';

export default function Clue() {
  const { state: { clue }} = useLocation() as { state: { clue: any } };
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const gameId = searchParams.get('gameId');
  const playerId = searchParams.get('playerId');
  const socket = useWebSocket();

  const [answer, setAnswer] = useState<string>('');
  const [message, setMessage] = useState<string>('');

  const handleAnswerSubmit = (): void => {
    if (!clue) return;
    
    const userAnswer = answer.trim().toLowerCase();
    const correctAnswer = clue.question.toLowerCase();
    
    // Check if the answer is correct (simplified matching)
    const isCorrect = 
      userAnswer === correctAnswer || 
      correctAnswer.includes(userAnswer) || 
      userAnswer.includes(correctAnswer);
    
    if (isCorrect) {
      if (!socket) return;
      socket.send(JSON.stringify({ type: 'updatePlayerScore', gameId, playerId, score: clue.value }));
      setMessage(`Correct! You earned ${clue.value} points.`);
    } else {
      if (!socket) return;
      socket.send(JSON.stringify({ type: 'updatePlayerScore', gameId, playerId, score: -clue.value }));
      setMessage(`Sorry, the correct answer was "${clue.question}". You lost ${clue.value} points.`);
    }

    setTimeout(() => {
      navigate(`/board?gameId=${gameId}&playerId=${playerId}`);
    }
    , 3000);
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

  return (
    <div className="clue-container">
      <div className="clue-card">
        <div className="clue-header">{clue.category} - ${clue.value}</div>
        <div className="clue-question">{clue.answer}</div>
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
  )
}
