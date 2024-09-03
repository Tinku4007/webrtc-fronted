import { useContext, useState } from 'react'
import './App.css'
import HomePage from '../pages/HomePage'
import { BrowserRouter, Routes, Route } from "react-router-dom"
import { SocketProvider } from './Providers/Socket'
import Room from '../pages/Room'
import { PeerProvider } from './Providers/Peer'

function App() {
  return (
    <>
      <BrowserRouter>
        <SocketProvider>
          <PeerProvider>
            <Routes>
              <Route path='/' element={<HomePage />} />
              <Route path='/room/:id' element={<Room />} />
            </Routes>
          </PeerProvider>
        </SocketProvider>
      </BrowserRouter>

    </>
  )
}

export default App
