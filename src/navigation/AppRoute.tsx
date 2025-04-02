import { Route, Routes } from 'react-router-dom';
import Home from '../pages/Home';
import Lobby from '../pages/Lobby';
import Board from '../pages/Board';
import Clue from '../pages/Clue';

export default function AppRoute() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="lobby" element={<Lobby />} />
      <Route path="board" element={<Board />} />
      <Route path="clue" element={<Clue />} />
    </Routes>
  );
}
