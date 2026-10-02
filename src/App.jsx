import { HashRouter, Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import Game from "./pages/Game";
import Leaderboard from "./pages/LeaderBoard";
import Rules from "./pages/Rules";
import EnvironmentSelect from "./pages/EnvironmentSelect";
import StyleSelect from "./pages/StyleSelect";
import Intro from "./pages/Intro";
import Career from "./pages/Career";

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/game" element={<Game />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/rules" element={<Rules />} />
        <Route path="/environment" element={<EnvironmentSelect />} />
        <Route path="/style" element={<StyleSelect />} />
        <Route path="/intro" element={<Intro />} />
        <Route path="/career" element={<Career />} />
      </Routes>
    </HashRouter>
  );
}

export default App;