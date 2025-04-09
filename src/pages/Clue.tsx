import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import nlp from 'compromise';
import { useWebSocket } from '../context/WebSocketContext';
import getInterrogativeAndVerb from '../utils/getInterrogativeAndVerb';
import levenshteinDistance from '../utils/levenshteinDistance';

export default function Clue() {
  const { state: { clue, players }} = useLocation() as { state: { clue: any, players: any } };
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const gameId = searchParams.get('gameId');
  const playerId = searchParams.get('playerId');
  const socket = useWebSocket();
  const synth = window.speechSynthesis;

  const [answer, setAnswer] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [activePlayers, setActivePlayers] = useState<any[]>(players);

  const handleAnswerSubmit = (answer: string): void => {
    console.log("Answer submitted:", answer);
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
      const utterance = new SpeechSynthesisUtterance("Your answer must be in the form of a question.");
      synth.speak(utterance);
      setMessage("Your answer must be in the form of a question, e.g., 'What is...'");
      return;
    }

    // Compare using Levenshtein distance for fuzzy matching
    const distance = levenshteinDistance(userAnswerKeywords, correctAnswerKeywords);

    // If distance is within a small threshold, consider it a correct answer
    const isCorrect = distance <= 2; // You can adjust the threshold here

    const interrogativeAndVerb = getInterrogativeAndVerb(clue.question);

    if (isCorrect) {
      if (!socket) return;
      socket.send(JSON.stringify({ type: "updatePlayerScore", gameId, playerId, score: clue.value }));
      socket.send(JSON.stringify({ type: "requalifyAllPlayers", gameId }));
      setMessage(`Correct! The answer is "${interrogativeAndVerb} ${clue.question}". You earned ${clue.value} points.`);
      const utterance = new SpeechSynthesisUtterance(`Correct! The answer is "${interrogativeAndVerb} ${clue.question}". You earned ${clue.value} points.`);
      synth.speak(utterance);
      setTimeout(() => {
        navigate(`/board?gameId=${gameId}&playerId=${playerId}`);
      }
      , 5000);
    } else {
      if (!socket) return;
      socket.send(JSON.stringify({ type: "updatePlayerScore", gameId, playerId, score: -clue.value }));
      socket.send(JSON.stringify({ type: "disqualifyPlayer", gameId, playerId }));
      socket.send(JSON.stringify({ type: "endPlayerTurn", gameId, playerId }));
      setMessage(`Sorry, we were looking for "${interrogativeAndVerb} ${clue.question}". You lost ${clue.value} points.`);
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
      handleAnswerSubmit(spokenText);
    };
  
    recognition.onerror = (event: any) => {
      setMessage(`Error: ${event.error}`);
    };
  
    recognition.start();
  };

  useEffect(() => {
    if (clue?.answer) {
      const utterance = new SpeechSynthesisUtterance(clue.answer);
      synth.speak(utterance);
    }
  }, [clue]);

  useEffect(() => {
    if (socket?.readyState == 1) {
      socket.onmessage = (event: { data: string; }) => {
        const data = JSON.parse(event.data);
        if (data.type === 'game') {
          setActivePlayers(data?.game?.players || []);
        }
      };
    }
  }, [socket?.readyState]);

  return (
    <div>
      <div className="clue-container">
        <div className="clue-card">
          <div className="clue-header">{clue.category} - ${clue.value}</div>
          <div className="clue-question">{clue.answer}</div>
          <button onClick={handleVoiceInput} className="voice-button">
            🎤 Speak Answer
          </button>
          {answer && (
            <div className="message">
              You said: {answer}
            </div>
          )}
          {message && (
            <div className="message">
              {message}
            </div>
          )}
        </div>
      </div>
      <div className="players-container" style={{ marginTop: '80px' }}>
        {activePlayers?.map((player: any, index: number) => (
          <div key={index} className={`player-card`}>
            <h2>{player.name}</h2>
            <p>Score: {player.score}</p>
          </div>
        ))}
      </div>
    </div>
  )
}