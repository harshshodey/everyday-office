import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react'
import { Camera } from '../camera/Camera'
import { fitCameraToRooms } from '../camera/fitCamera'
import { getAnimationState } from '../engine/animation'
import { canvasToWorld, findTopRoomAtPoint } from '../engine/interaction'
import { CanvasRenderer } from '../rendering/CanvasRenderer'
import type { Point, Size } from '../types/geometry'
import { rooms } from '../world/roomData'
import { LivingWorld } from '../living/LivingWorld'
import { livingRooms } from '../living/roomActivities'
import { CampusWorld } from '../living/CampusWorld'

export interface DioramaCanvasHandle {
  zoomIn: () => void
  zoomOut: () => void
  resetView: () => void
  focusRoom: (roomId:string) => void
}

interface DioramaCanvasProps {
  onZoomChange: (zoom: number) => void
  onRoomSelect: (roomId: string | null) => void
}

interface InteractionState {
  pointerId: number | null
  lastPointer: Point
  dragDistance: number
  dragging: boolean
  hoveredRoomId: string | null
  selectedRoomId: string | null
}

export const DioramaCanvas = forwardRef<DioramaCanvasHandle, DioramaCanvasProps>(
  function DioramaCanvas({ onZoomChange, onRoomSelect }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const onZoomChangeRef = useRef(onZoomChange)
    const cameraRef = useRef(new Camera(fitCameraToRooms({ width: 1200, height: 700 }, rooms)))
    const viewportRef = useRef<Size>({ width: 1, height: 1 })
    const cameraWasMovedRef = useRef(false)
    const interactionRef = useRef<InteractionState>({
      pointerId: null,
      lastPointer: { x: 0, y: 0 },
      dragDistance: 0,
      dragging: false,
      hoveredRoomId: null,
      selectedRoomId: null,
    })

    useEffect(() => {
      onZoomChangeRef.current = onZoomChange
    }, [onZoomChange])

    const setZoom = (nextZoom: number, point?: Point) => {
      cameraWasMovedRef.current = true
      const viewport = viewportRef.current
      cameraRef.current.zoomAt(
        nextZoom,
        point ?? { x: viewport.width / 2, y: viewport.height / 2 },
        viewport,
      )
      onZoomChange(cameraRef.current.value.zoom)
    }

    useImperativeHandle(ref, () => ({
      focusRoom: (roomId:string) => {
        const room=rooms.find(r=>r.id===roomId)
        if(!room)return
        cameraWasMovedRef.current=true
        cameraRef.current.reset(fitCameraToRooms(viewportRef.current,[room]))
        interactionRef.current.selectedRoomId=roomId
        onRoomSelect(roomId);onZoomChange(cameraRef.current.value.zoom)
      },
      zoomIn: () => setZoom(cameraRef.current.value.zoom * 1.16),
      zoomOut: () => setZoom(cameraRef.current.value.zoom / 1.16),
      resetView: () => {
        cameraWasMovedRef.current = false
        const initial = fitCameraToRooms(viewportRef.current, rooms)
        cameraRef.current.reset(initial)
        onZoomChange(initial.zoom)
      },
    }))

    useEffect(() => {
      const canvas = canvasRef.current
      if (!canvas) return
      const context = canvas.getContext('2d', { alpha: false })
      if (!context) return

      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
      const renderer = new CanvasRenderer(context, pixelRatio)
      const livingWorld = new LivingWorld(livingRooms.filter(definition => rooms.some(room => room.id === definition.roomId)))
      const campus = new CampusWorld()
      const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)')
      // Explicit preview opt-in leaves the OS accessibility preference untouched.
      const fullMotion = new URLSearchParams(window.location.search).get('motion') === 'full'
      let lastFrame = 0
      let lastReport = 0
      let animationFrame = 0
      let mounted = true

      const resize = () => {
        const rect = canvas.getBoundingClientRect()
        viewportRef.current = { width: rect.width, height: rect.height }
        canvas.width = Math.max(1, Math.round(rect.width * pixelRatio))
        canvas.height = Math.max(1, Math.round(rect.height * pixelRatio))
        if (!cameraWasMovedRef.current) {
          const initial = fitCameraToRooms(viewportRef.current, rooms)
          cameraRef.current.reset(initial)
          onZoomChangeRef.current(initial.zoom)
        }
      }

      const observer = new ResizeObserver(resize)
      observer.observe(canvas)
      resize()

      const renderFrame = (timestamp: number) => {
        if (!mounted) return
        animationFrame = requestAnimationFrame(renderFrame)
        if (document.hidden) { lastFrame = timestamp; return }
        if (timestamp - lastFrame < 1000 / 30) return
        const delta = Math.min(0.1, (timestamp - lastFrame) / 1000)
        lastFrame = timestamp
        const reducedMotion = motionPreference.matches && !fullMotion
        if (renderer.livingReady && !reducedMotion) livingWorld.update(delta)
        if (renderer.teamReady && !reducedMotion) campus.update(delta)
        const interaction = interactionRef.current
        renderer.render(
          viewportRef.current,
          cameraRef.current,
          rooms,
          getAnimationState(timestamp),
          interaction.hoveredRoomId,
          interaction.selectedRoomId,
          [],
          livingWorld.rooms.length ? livingWorld : undefined,
          reducedMotion,
          campus,
        )
        // Read-only, low-frequency diagnostics for long-run verification; no React animation state.
        if (timestamp - lastReport > 1000) {
          lastReport = timestamp
          canvas.dataset.office = JSON.stringify({
            ready: renderer.teamReady, error: renderer.teamError, time: Math.round(campus.simulations.values().next().value?.time??0),
            rooms:[...campus.simulations].map(([id,world])=>({id,phase:world.phase,briefings:world.briefings,conversations:world.conversations})),
            actors: campus.actors.map(({id,roomId,state,spot,destination,trips,talks,foot,workMode}) =>
              ({id,roomId,state,spot,destination,trips,talks,foot,workMode})),
          })
          canvas.dataset.living = JSON.stringify({
            ready: renderer.livingReady, seconds: Math.round(livingWorld.time),
            characters: livingWorld.characters.map(({id,gender,roomId,state,pointId,trips,talks,walkingSeconds,foot,arrivedAt,currentDwellDuration,recentActivities,lastMovementTime}) =>
              ({id,gender,roomId,state,pointId,trips,talks,walkingSeconds:Math.round(walkingSeconds),x:Math.round(foot.x),y:Math.round(foot.y),
                settledSeconds:Math.round(livingWorld.time-arrivedAt),currentDwellDuration:Math.round(currentDwellDuration),recentActivities,lastMovementTime})),
            ambient: [...livingWorld.ambient].map(([roomId,events])=>({roomId,events:events.map(e=>({id:e.definition.id,active:e.active,starts:e.starts}))})),
            renderer: renderer.livingStats,
          })
        }
      }
      animationFrame = requestAnimationFrame(renderFrame)

      return () => {
        mounted = false
        observer.disconnect()
        cancelAnimationFrame(animationFrame)
      }
    }, [])

    const getCanvasPoint = (
      event: React.PointerEvent<HTMLCanvasElement> | React.WheelEvent<HTMLCanvasElement>,
    ): Point => {
      const rect = event.currentTarget.getBoundingClientRect()
      return { x: event.clientX - rect.left, y: event.clientY - rect.top }
    }

    const updateHover = (point: Point) => {
      const world = canvasToWorld(point, viewportRef.current, cameraRef.current)
      const room = findTopRoomAtPoint(world, rooms)
      interactionRef.current.hoveredRoomId = room?.id ?? null
    }

    const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
      const point = getCanvasPoint(event)
      cameraWasMovedRef.current = true
      event.currentTarget.setPointerCapture(event.pointerId)
      interactionRef.current.pointerId = event.pointerId
      interactionRef.current.lastPointer = point
      interactionRef.current.dragDistance = 0
      interactionRef.current.dragging = true
      event.currentTarget.classList.add('is-dragging')
    }

    const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
      const point = getCanvasPoint(event)
      const interaction = interactionRef.current
      if (interaction.dragging && interaction.pointerId === event.pointerId) {
        const dx = point.x - interaction.lastPointer.x
        const dy = point.y - interaction.lastPointer.y
        cameraRef.current.pan(dx, dy)
        interaction.dragDistance += Math.hypot(dx, dy)
        interaction.lastPointer = point
      } else {
        updateHover(point)
      }
      event.currentTarget.classList.toggle('is-hovering', Boolean(interaction.hoveredRoomId))
    }

    const endPointer = (event: React.PointerEvent<HTMLCanvasElement>) => {
      const point = getCanvasPoint(event)
      const interaction = interactionRef.current
      if (interaction.dragging && interaction.dragDistance < 5) {
        const world = canvasToWorld(point, viewportRef.current, cameraRef.current)
        const room = findTopRoomAtPoint(world, rooms)
        interaction.selectedRoomId = room?.id ?? null
        onRoomSelect(room?.id ?? null)
      }
      interaction.dragging = false
      interaction.pointerId = null
      updateHover(point)
      event.currentTarget.classList.remove('is-dragging')
      event.currentTarget.classList.toggle('is-hovering', Boolean(interaction.hoveredRoomId))
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }
    }

    const handleWheel = (event: React.WheelEvent<HTMLCanvasElement>) => {
      event.preventDefault()
      const point = getCanvasPoint(event)
      const factor = Math.exp(-event.deltaY * 0.00115)
      setZoom(cameraRef.current.value.zoom * factor, point)
      updateHover(point)
    }

    return (
      <canvas
        ref={canvasRef}
        className="diorama-canvas"
        role="img"
        aria-label="Five illustrated workplace environments: Everyday Office, Collaboration Suite, Research Lab, Design Studio and Team Lounge. Drag to pan, scroll to zoom, click to select."
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onPointerLeave={(event) => {
          if (!interactionRef.current.dragging) {
            interactionRef.current.hoveredRoomId = null
            event.currentTarget.classList.remove('is-hovering')
          }
        }}
        onWheel={handleWheel}
      />
    )
  },
)
