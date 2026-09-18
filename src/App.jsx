import { HashRouter, Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import Game from "./pages/Game";
import Leaderboard from "./pages/LeaderBoard";
import Rules from "./pages/Rules";

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/game" element={<Game />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/rules" element={<Rules />} />
      </Routes>
    </HashRouter>
  );
}

export default App;