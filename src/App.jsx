import { Routes, Route } from 'react-router-dom'
import './styles/global.css'
import './styles/auth.css'
import './styles/achievement.css'
import Hero from './components/Hero/Hero'
import Menu from './components/Menu/Menu'
import Welcome from './pages/Welcome'
import Register from './pages/Register'
import Login from './pages/Login'
import CheckIn from './pages/CheckIn'
import Profile from './pages/Profile'
import { useNfcLogin } from './hooks/useNfcLogin'
import { useSpotCheckIn } from './hooks/useSpotCheckIn'

function Home() {
  return (
    <div className="app">
      <Hero />
      <Menu />
    </div>
  )
}

function App() {
  // 全局检测 ?nfc=TOKEN 与 ?spot=TOKEN
  useNfcLogin()
  useSpotCheckIn()

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/welcome" element={<Welcome />} />
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<Login />} />
      <Route path="/checkin" element={<CheckIn />} />
      <Route path="/profile" element={<Profile />} />
    </Routes>
  )
}

export default App
