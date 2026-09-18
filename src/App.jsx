import { HashRouter, Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import Game from "./pages/Game";
import Leaderboard from "./pages/Leaderboard";

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/game" element={<Game />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
      </Routes>
    </HashRouter>
  );
}

export default App;