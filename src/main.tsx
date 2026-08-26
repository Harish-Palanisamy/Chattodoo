import {
  StrictMode,
} from 'react'

import {
  createRoot,
} from 'react-dom/client'

import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from 'react-router-dom'

import App from './App'

import SportsPage from './pages/SportsPage'

import LeaguePage from './pages/LeaguePage'

import MatchRoomPage from './pages/MatchRoomPage'

import CommunityRoomPage from './pages/CommunityRoomPage'

import LoginPage from './pages/LoginPage'

import SignupPage from './pages/SignupPage'

import './index.css'
import FeedbackPage from './pages/FeedbackPage'

createRoot(
  document.getElementById(
    'root',
  )!,
).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        {/* HOME */}

        <Route
          path="/"
          element={
            <App />
          }
        />

        {/* FOOTBALL */}

        <Route
          path="/sports"
          element={
            <SportsPage />
          }
        />

        {/* =================================================
            LEAGUE HUB

            Examples:

            /league/premier-league
            /league/la-liga
            /league/champions-league
        ================================================= */}

        <Route
          path="/league/:leagueId"
          element={
            <LeaguePage />
          }
        />

        {/* MATCH HUB */}

        <Route
          path="/match/:sport/:matchSlug"
          element={
            <MatchRoomPage />
          }
        />

        {/* COMMUNITY MATCH ROOM */}

        <Route
          path="/match/:sport/:matchSlug/room/:roomId"
          element={
            <CommunityRoomPage />
          }
        />

        {/* AUTH */}

        <Route
          path="/login"
          element={
            <LoginPage />
          }
        />

        <Route
          path="/signup"
          element={
            <SignupPage />
          }
        />

        {/* OLD FOOTBALL LINK */}

        <Route
          path="/football"
          element={
            <Navigate
              to="/sports"
              replace
            />
          }
        />

        {/* OLD SPORT ROUTES */}

        <Route
          path="/sports/:sport"
          element={
            <Navigate
              to="/sports"
              replace
            />
          }
        />

        {/* FALLBACK */}

        <Route
          path="*"
          element={
            <Navigate
              to="/"
              replace
            />
          }
        />
        
        {/* FEEDBACK */}

        <Route
          path="/feedback"
          element={
            <FeedbackPage />
          }
        />
        
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)