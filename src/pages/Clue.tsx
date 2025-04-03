import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import nlp from 'compromise';
import { useWebSocket } from '../context/WebSocketContext';
import getInterrogativeAndVerb from '../utils/getInterrogativeAndVerb';
import levenshteinDistance from '../utils/levenshteinDistance';

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
    if (!clue || !answer) return;

    const userAnswer = answer.trim().toLowerCase();
    const correctAnswer = clue.question.toLowerCase();

    // Normalize both answers using Compromise to extract key components
    const userAnswerDoc = nlp(userAnswer);
    const correctAnswerDoc = nlp(correctAnswer);

    // Extract the key components (nouns, verbs, etc.) from the answers
    const userAnswerKeywords = userAnswerDoc
      .match('#Noun+')
      .out('array')
      .join(' ')
      .trim();

    const correctAnswerKeywords = correctAnswerDoc
      .match('#Noun+')
      .out('array')
      .join(' ')
      .trim();

    // Ensure the answer starts with "What is" or "Who is"
    const isQuestionFormat = userAnswer.startsWith("what is") || userAnswer.startsWith("who is") || userAnswer.startsWith("what are") || userAnswer.startsWith("who are");

    if (!isQuestionFormat) {
      const synth = window.speechSynthesis;
      const utterance = new SpeechSynthesisUtterance("Your answer must be in the form of a question.");
      synth.speak(utterance);
      setMessage("Your answer must be in the form of a question, e.g., 'What is...'");
      return;
    }

    // Compare using Levenshtein distance for fuzzy matching
    const distance = levenshteinDistance(userAnswerKeywords, correctAnswerKeywords);

    // If distance is within a small threshold, consider it a correct answer
    const isCorrect = distance <= 3; // You can adjust the threshold here

    if (isCorrect) {
      if (!socket) return;
      socket.send(JSON.stringify({ type: "updatePlayerScore", gameId, playerId, score: clue.value }));
      setMessage(`Correct! You earned ${clue.value} points.`);
    } else {
      if (!socket) return;
      socket.send(JSON.stringify({ type: "updatePlayerScore", gameId, playerId, score: -clue.value }));
      socket.send(JSON.stringify({ type: "endPlayerTurn", gameId, playerId }));
      
      // Use getInterrogativeAndVerb to format the answer properly
      const interrogativeAndVerb = getInterrogativeAndVerb(clue.question);
      setMessage(`Sorry, we were looking for "${interrogativeAndVerb} ${clue.question}". You lost ${clue.value} points.`);

      // Text-to-Speech for the correct answer
      const synth = window.speechSynthesis;
      const utterance = new SpeechSynthesisUtterance(`Sorry, we were looking for "${interrogativeAndVerb} ${clue.question}".`);
      synth.speak(utterance);
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
      setAnswer(spokenText);
      setMessage(`You said: "${spokenText}"`);
    };
  
    recognition.onerror = (event: any) => {
      setMessage(`Error: ${event.error}`);
    };
  
    recognition.start();
  };

  useEffect(() => {
    if (clue?.answer) {
      const synth = window.speechSynthesis;
      const utterance = new SpeechSynthesisUtterance(clue.answer);
      synth.speak(utterance);
    }
  }, [clue]);

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


    // setTimeout(() => {
    //   navigate(`/board?gameId=${gameId}&playerId=${playerId}`);
    // }
    // , 3000);