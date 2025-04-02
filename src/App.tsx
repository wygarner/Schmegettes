import { Route, BrowserRouter as Router, Routes } from 'react-router-dom'
import AppRoute from './navigation/AppRoute';
import './App.css';

function App() {

  return (
    <Router>
      <Routes>
        <Route path="*" element={<AppRoute />} />
      </Routes>
    </Router>
  )
}

export default App;