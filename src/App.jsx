import { Routes, Route, Navigate } from 'react-router-dom'
import './styles/global.css'
import './styles/auth.css'
import './styles/achievement.css'
import './styles/admin.css'
import './styles/map.css'
import Hero from './components/Hero/Hero'
import Menu from './components/Menu/Menu'
import Welcome from './pages/Welcome'
import Register from './pages/Register'
import Login from './pages/Login'
import CheckIn from './pages/CheckIn'
import Profile from './pages/Profile'
import MapHub from './pages/Map'
import MapChangsha from './pages/MapChangsha'
import MapVenue from './pages/MapVenue'
import AdminLayout from './pages/admin/AdminLayout'
import AdminUsers from './pages/admin/AdminUsers'
import AdminSpots from './pages/admin/AdminSpots'
import AdminCheckIns from './pages/admin/AdminCheckIns'
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
      <Route path="/map" element={<MapHub />} />
      <Route path="/map/changsha" element={<MapChangsha />} />
      <Route path="/map/venue" element={<MapVenue />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Navigate to="users" replace />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="spots" element={<AdminSpots />} />
        <Route path="check-ins" element={<AdminCheckIns />} />
      </Route>
    </Routes>
  )
}

export default App
