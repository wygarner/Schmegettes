import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useWebSocket } from '../context/WebSocketContext';

interface Clue {
  round: number;
  value: number;
  dailyDoubleValue: string;
  category: string;
  comments: string;
  answer: string;
  question: string;
  notes: string;
  isDailyDouble: boolean;
  isFinalJeopardy: boolean;
  id: string;
  active: boolean;
}

interface QuestionGroup {
  airDate: string;
  clues: Clue[];
}

interface Player {
  name: string;
  id: string;
  score: number;
}

const TSV_BASE_URL = "https://raw.githubusercontent.com/wygarner/jeopardy_clue_dataset/refs/heads/main/seasons";

export default function Lobby() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const gameId = searchParams.get('gameId');
  const [playerId, setPlayerId] = useState(searchParams.get('playerId'));
  const socket = useWebSocket();

  const [questions, setQuestions] = useState<QuestionGroup[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<string>('season1');
  const [selectedAirDate, setSelectedAirDate] = useState<string | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [isGameActive, setIsGameActive] = useState<boolean>(false);

  // Find selected questions
  const selectedClues = questions.find(q => q.airDate === selectedAirDate)?.clues || [];

  const joinGame = () => {
    if (!socket) return;

    const playerName = (document.getElementById('player-name') as HTMLInputElement).value;
    if (!playerName) {
      console.error('Player name is required');
      return;
    }
    socket.send(JSON.stringify({ type: 'joinGame', gameId, playerName }));
    (document.getElementById('player-name') as HTMLInputElement).value = '';
  };

  const startGame = () => {
    if (!selectedClues.length) {
      console.error('No clues selected');
      return;
    }
    if (!socket) return;
    socket.send(JSON.stringify({ type: 'startGame', gameId, clues: selectedClues, activeRound: 1 }));
    navigate(`/board?gameId=${gameId}&playerId=${playerId}`);
  };

  const handleSeasonChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedSeason(event.target.value);
  };

  const handleSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedAirDate(event.target.value);
  };

  useEffect(() => {
    if (!selectedSeason) return;
  
    const url = `${TSV_BASE_URL}/${selectedSeason}.tsv`;
    fetch(url)
      .then((response) => response.text())
      .then((text) => {
        const rows = text.split("\n").map((row) => row.split("\t"));
        const headers = rows[0]; // First row is the header
  
        // Convert TSV rows to objects
        const formattedData = rows.slice(1) // Skip headers
          .filter(row => row.length === headers.length) // Ensure valid rows
          .map(row => ({
            round: Number(row[0]),
            value: Number(row[1]),
            dailyDoubleValue: row[2],
            category: row[3],
            comments: row[4],
            answer: row[5],
            question: row[6],
            airDate: row[7],
            notes: row[8],
            isDailyDouble: Number(row[2]) > 0,
            isFinalJeopardy: row[0] === '3',
            id: Math.random().toString(36).substring(2, 15), // Generate a random ID
            active: true,
          }));
  
        // Group by airDate
        const groupedByDate: Record<string, Clue[]> = {};
        formattedData.forEach(clue => {
          if (!groupedByDate[clue.airDate]) {
            groupedByDate[clue.airDate] = [];
          }
          groupedByDate[clue.airDate].push(clue);
        });
  
        // Convert to array format
        const groupedQuestions: QuestionGroup[] = Object.keys(groupedByDate).map(airDate => ({
          airDate,
          clues: groupedByDate[airDate],
        }));
  
        setQuestions(groupedQuestions);
      })
      .catch((error) => console.error("Error loading TSV:", error));
  }, [selectedSeason]);

  useEffect(() => {
    if (socket?.readyState == 1) {
      socket.onmessage = (event: { data: string; }) => {
        const data = JSON.parse(event.data);
        if (data.type === 'joinedGame') {
          const { player } = data;
          // add player id to url search params
          const url = new URL(window.location.href);
          url.searchParams.set('playerId', player.id);
          window.history.pushState({}, '', url);
          setPlayerId(player.id);
        };
        if (data.type === 'game') {
          setPlayers(data?.game?.players || []);
          setIsGameActive(data?.game?.active || false);
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
    <div>
      <h1>Lobby</h1>
      {isGameActive ? (
        <div>
          <button onClick={() => navigate(`/board?gameId=${gameId}&playerId=${playerId}`)}>Enter Game</button>
        </div>
      ) : (
        <div>
          <label htmlFor="season-select">Select a Season:</label>
          <select id="season-select" value={selectedSeason} onChange={handleSeasonChange}>
            <option value="" disabled>Select a season</option>
            {Array.from({ length: 40 }, (_, i) => (
              <option key={i + 1} value={`season${i + 1}`}>
                Season {i + 1}
              </option>
            ))}
          </select>
          <label>Select a game:</label>
          <select onChange={handleSelectChange} value={selectedAirDate || ""}>
            <option value="">Select a date</option>
            {questions.map((q) => (
              <option key={q.airDate} value={q.airDate}>
                {q.airDate}
              </option>
            ))}
          </select>
          <button onClick={startGame}>Start Game</button>
        </div>
      )}
      <h2>Players in Lobby:</h2>
      <ul>
        {players.map((player, index) => (
          <li key={index}>{player?.name}</li>
        ))}
      </ul>
      {!playerId && (
        <div>
          <label htmlFor="player-name">Enter Player Name:</label>
          <input id="player-name" type="text" placeholder="Enter your name" />
          <button onClick={joinGame}>Join</button>
        </div>
      )}
    </div>
  );
}
