import { Route, Routes } from "react-router-dom";
import RootLayout from "./root-layout";
import { Compare, Inpsect, LeaderBoard } from "./routes";

function App(): React.ReactElement {
  return (
    <>
      <Routes>
        <Route path="/" element={<RootLayout />}>

          {/* This is where all out routes will be e.g /compare, /leaderboard, etc. */}
          <Route element={<Inpsect />} index />
          <Route path="/compare" element={<Compare />} />
          <Route path="/leaderboard" element={<LeaderBoard />} />

        </Route>

      </Routes>
    </>
  )
}

export default App
