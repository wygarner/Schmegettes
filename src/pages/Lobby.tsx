import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom';

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
}

interface QuestionGroup {
  airDate: string;
  clues: Clue[];
}

const TSV_BASE_URL = "https://raw.githubusercontent.com/wygarner/jeopardy_clue_dataset/refs/heads/main/seasons";

export default function Lobby() {
  const [searchParams] = useSearchParams();
  const gameId = searchParams.get('gameId');
  const [questions, setQuestions] = useState<QuestionGroup[]>([]);
  const [players, setPlayers] = useState<string[]>(['Player 1', 'Player 2']);
  const [selectedSeason, setSelectedSeason] = useState<string>('season1');
  const [playerName, setPlayerName] = useState<string>('');
  const navigate = useNavigate();

  const [selectedAirDate, setSelectedAirDate] = useState<string | null>(null);

  const handleSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedAirDate(event.target.value);
  };

  // Find selected questions
  const selectedClues = questions.find(q => q.airDate === selectedAirDate)?.clues || [];

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
    // Simulate fetching players for the game
    console.log(`Fetching players for game ${gameId}`);
  }, [gameId]);

  const updatePlayerName = () => {
    if (playerName.trim() !== '') {
      setPlayers((prevPlayers) => [...prevPlayers, playerName]);
      setPlayerName('');
    }
  };

  const startGame = () => {
    console.log('Game Started!');
    if (!selectedClues.length) {
      console.error('No clues selected');
      return;
    }
    navigate('/board', { state: { clues: selectedClues } });
  };

  const handleSeasonChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedSeason(event.target.value);
  };

  console.log('selected clues', selectedClues);

  return (
    <div>
      <h1>Lobby</h1>

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

      <h2>Players in Lobby:</h2>
      <ul>
        {players.map((player, index) => (
          <li key={index}>{player}</li>
        ))}
      </ul>
      <label htmlFor="player-name">Change Player Name:</label>
      <input id="player-name" type="text" placeholder="Enter your name" />
      <button onClick={updatePlayerName}>Update</button>
    </div>
  );
}
