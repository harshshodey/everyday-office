import { useRef, useState } from 'react'
import { DioramaCanvas, type DioramaCanvasHandle } from './components/DioramaCanvas'
import { Toolbar } from './components/Toolbar'
import { rooms } from './world/roomData'
import './App.css'

function App() {
  const canvasRef = useRef<DioramaCanvasHandle>(null)
  const [zoom, setZoom] = useState(0.86)
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null)
  const selectedRoomData = rooms.find((room) => room.id === selectedRoom)
  const selectedRoomNumber = selectedRoomData
    ? String(rooms.indexOf(selectedRoomData) + 1).padStart(2, '0')
    : '—'

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true"><span /></span>
          <div>
            <p className="eyebrow">Little worlds / A shared workspace</p>
            <h1>The everyday office</h1>
          </div>
        </div>
        <div className="status-chip">
          <span className="status-dot" aria-hidden="true" />
          Five places, one shared world
        </div>
      </header>

      <section className="workspace" aria-label="Interactive five-room workplace">
        <nav className="room-navigation" aria-label="Explore the five environments">
          {rooms.map((room,index)=><button key={room.id} type="button" aria-pressed={selectedRoom===room.id}
            onClick={()=>canvasRef.current?.focusRoom(room.id)}><span>{String(index+1).padStart(2,'0')}</span>{room.name}</button>)}
        </nav>
        <div className="canvas-frame">
          <div className="canvas-meta" aria-hidden="true">
            <span>A PLACE FOR SMALL IDEAS</span>
            <span>WORK · MEET · UNWIND</span>
          </div>
          <DioramaCanvas
            ref={canvasRef}
            onZoomChange={setZoom}
            onRoomSelect={setSelectedRoom}
          />
          <div className="interaction-hint">
            <span className="mouse-icon" aria-hidden="true" />
            Drag to explore · Scroll to zoom · Click the room
          </div>
          <div className={`room-toast ${selectedRoom ? 'is-visible' : ''}`} role="status" aria-live="polite">
            <span
              className="room-toast-index"
              style={{ color: selectedRoomData?.theme.label }}
            >{selectedRoomNumber}</span>
            <span>
              <strong>{selectedRoomData?.name ?? 'Select a room'}</strong>
            </span>
          </div>
        </div>

        <Toolbar
          zoom={zoom}
          onZoomIn={() => canvasRef.current?.zoomIn()}
          onZoomOut={() => canvasRef.current?.zoomOut()}
          onReset={() => canvasRef.current?.resetView()}
        />
      </section>

      <footer className="footer-note">
        <span>Small ideas, quietly growing.</span>
        <span className="coordinate-key">An illustrated world in progress</span>
      </footer>
    </main>
  )
}

export default App
