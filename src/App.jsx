import { Routes, Route } from 'react-router-dom'
import './styles/global.css'
import './styles/auth.css'
import Hero from './components/Hero/Hero'
import Menu from './components/Menu/Menu'
import Welcome from './pages/Welcome'
import Register from './pages/Register'
import Login from './pages/Login'
import { useNfcLogin } from './hooks/useNfcLogin'

function Home() {
  return (
    <div className="app">
      <Hero />
      <Menu />
    </div>
  )
}

function App() {
  // 全局检测 ?nfc=TOKEN，命中即触发登录
  useNfcLogin()

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/welcome" element={<Welcome />} />
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<Login />} />
    </Routes>
  )
}

export default App
