import { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [player, setPlayer] = useState(null)
  const [token, setToken] = useState(localStorage.getItem('token') || null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    }
    setLoading(false)
  }, [token])

  const login = (playerData, tokenData) => {
    setPlayer(playerData)
    setToken(tokenData)
    localStorage.setItem('token', tokenData)
    axios.defaults.headers.common['Authorization'] = `Bearer ${tokenData}`
  }

  const logout = () => {
    setPlayer(null)
    setToken(null)
    localStorage.removeItem('token')
    delete axios.defaults.headers.common['Authorization']
  }

  return (
    <AuthContext.Provider value={{ player, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)