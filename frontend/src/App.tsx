import { Route, Routes } from "react-router-dom"
import RootLayout from "./root-layout"

function App(): React.ReactElement {
  return (
    <>
      <Routes>
          <Route path="/" element={<RootLayout />}>
          {/* This is where all out routes will be e.g /compare, /leaderboard, etc. */}
          </Route>
      </Routes>
    </>
  )
}

export default App
