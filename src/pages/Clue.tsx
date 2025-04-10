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
  const [timer, setTimer] = useState<number>(10);
  const [didTimerStart, setDidTimerStart] = useState<boolean>(false);
  const [playerSpeaking, setPlayerSpeaking] = useState<string | null>(null);
  const [noSpeechError, setNoSpeechError] = useState<boolean>(false);

  const handleAnswerSubmit = (answer: string, timer?: number): void => {
    if (!socket) return;
    const interrogativeAndVerb = getInterrogativeAndVerb(clue.question);

    if (timer !== undefined && timer <= 0) {
      console.log("Timer expired");
      setMessage(`We were looking for "${interrogativeAndVerb} ${clue.question}".`);
      const utterance = new SpeechSynthesisUtterance(`We were looking for "${interrogativeAndVerb} ${clue.question}".`);
      synth.speak(utterance);
      setTimeout(() => {
        socket.send(JSON.stringify({ type: "requalifyAllPlayers", gameId }));
        navigate(`/board?gameId=${gameId}&playerId=${playerId}`);
      }
      , 3500);
      return;
    }

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
      socket.send(JSON.stringify({ type: "disqualifyPlayer", gameId, playerId }));
      return;
    }

    // Compare using Levenshtein distance for fuzzy matching
    const distance = levenshteinDistance(userAnswerKeywords, correctAnswerKeywords);

    // If distance is within a small threshold, consider it a correct answer
    const isCorrect = distance <= 2; // You can adjust the threshold here

    if (isCorrect) {
      socket.send(JSON.stringify({ type: "updatePlayerScore", gameId, playerId, score: clue.value }));
      setMessage(`Correct! The answer is "${interrogativeAndVerb} ${clue.question}". You earned ${clue.value} points.`);
      const utterance = new SpeechSynthesisUtterance(`Correct! The answer is "${interrogativeAndVerb} ${clue.question}". You earned ${clue.value} points.`);
      synth.speak(utterance);
      setTimeout(() => {
        socket.send(JSON.stringify({ type: "requalifyAllPlayers", gameId }));
        navigate(`/board?gameId=${gameId}&playerId=${playerId}`);
      }
      , 5000);
    } else {
      setMessage(`Sorry, you have schmegettes. You lost ${clue.value} points.`);
      const utterance = new SpeechSynthesisUtterance(`Sorry, you have schmeggettes. You lost ${clue.value} points.`);
      synth.speak(utterance);
      setTimeout(() => {
        socket.send(JSON.stringify({ type: "updatePlayerScore", gameId, playerId, score: -clue.value }));
        socket.send(JSON.stringify({ type: "disqualifyPlayer", gameId, playerId }));
        socket.send(JSON.stringify({ type: "endPlayerTurn", gameId, playerId }));
        socket.send(JSON.stringify({ type: "startTimer", gameId, duration: timer }));
      }, 3500);
    }
  };
  
  const handleVoiceInput = (timer: number) => {
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
      socket?.send(JSON.stringify({ type: 'pauseTimer', gameId, playerId }));
      setMessage("Listening...");
    };
  
    recognition.onresult = (event: any) => {
      const spokenText = event.results[0][0].transcript;
      setAnswer(spokenText);
      handleAnswerSubmit(spokenText, timer);
    };
  
    recognition.onerror = (event: any) => {
      setMessage(`Error: ${event.error}`);
      if (event.error == 'no-speech') {
        setNoSpeechError(true);
      }
    };
  
    recognition.start();
  };

  useEffect(() => {
    if (clue?.answer) {
      const utterance = new SpeechSynthesisUtterance(clue.answer);
      synth.speak(utterance);
      setTimeout(() => {
        socket?.send(JSON.stringify({ type: 'startTimer', gameId, duration: 10 }));
        setDidTimerStart(true);
      }, 3500);
    }
  }, [clue]);

  useEffect(() => {
    if (socket?.readyState == 1) {
      socket.onmessage = (event: { data: string; }) => {
        const data = JSON.parse(event.data);
        if (data.type === 'game') {
          console.log("Game data received:", data?.game?.timer);
          setActivePlayers(data?.game?.players || []);
          setTimer(data?.game?.timer || 0);
          setPlayerSpeaking(data?.game?.playerSpeaking || null);
        }
      };
    }
  }, [socket?.readyState]);

  useEffect(() => {
    if (timer <= 0) {
      handleAnswerSubmit('', timer);
    }
  }, [timer]);

  const shouldDisplayVoiceButton = () => {
    if (noSpeechError && playerSpeaking === playerId) {
      return true; // Show the button if there was a no-speech error and it's the player's turn
    }
    if (!didTimerStart) return false; // Don't show the button if the timer hasn't started
    if (playerSpeaking === null) return true; // If no one is speaking, show the button
    if (playerSpeaking) return false; // If someone is speaking, don't show the button
  }

  return (
    <div>
      <div className="clue-container">
        <div className="clue-card">
          <div className="clue-header">{clue.category} - ${clue.value}</div>
          <div className="clue-question">{clue.answer}</div>
          {message && (
            <div className="message">
              {message}
            </div>
          )}
        </div>
      </div>
      <div className="timer">
        <h2>Time Left: {timer}</h2>
      </div>
      <div className="players-container" style={{ marginTop: '80px' }}>
        {activePlayers?.map((player: any, index: number) => (
          <div key={index} className={`player-card`}>
            {answer && (
              <div className="message">
                You said: {answer}
              </div>
            )}
            <h2>{player.name}</h2>
            <p>Score: {player.score}</p>
            {shouldDisplayVoiceButton() && (
              <div>
                {!player.disqualified ? (
                  <button 
                    onClick={() => handleVoiceInput(timer)} 
                    className="voice-button"
                  >
                    🎤
                  </button>
                ): (
                  <div className="disqualified-message">
                    {`You have schmegettes...`}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}