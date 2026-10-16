import type { Camera } from '../camera/Camera'
import type { AnimationState } from '../engine/animation'
import { sortByDepth } from '../engine/depth'
import type { Size } from '../types/geometry'
import type { Room } from '../types/world'
import type { WorkerEntity } from '../types/worker'
import { renderRoom } from './roomRenderer'
import { RoomArtworkRenderer } from './rooms/RoomArtworkRenderer'
import { ImageCache } from './sprites/ImageCache'
import { SpriteRenderer } from './sprites/SpriteRenderer'
import { LivingRenderer } from '../living/LivingRenderer'
import type { LivingWorld } from '../living/LivingWorld'
import { OfficeTeamRenderer, drawOfficeTeam } from '../living/OfficeTeamRenderer'
import type { CampusWorld } from '../living/CampusWorld'
import {campusProfiles} from '../world/campusData'
import {CampusAmbience} from '../living/CampusAmbience'
import { getRoomArtwork } from '../assets/rooms/manifest'
import { worldToIso } from '../engine/isometric'

export class CanvasRenderer {
  private readonly context: CanvasRenderingContext2D
  private readonly pixelRatio: number
  private readonly imageCache = new ImageCache()
  private readonly spriteRenderer = new SpriteRenderer(this.imageCache)
  private readonly roomArtworkRenderer = new RoomArtworkRenderer(this.imageCache)
  private livingRenderer: LivingRenderer | null = null
  private readonly teamRenderers=new Map(campusProfiles.map(profile=>[profile.id,new OfficeTeamRenderer('/assets/rooms/'+profile.id+'.png',profile.occluders)]))
  private readonly ambience=new Map(campusProfiles.map(profile=>[profile.id,new CampusAmbience(profile.ambient)]))
  get teamReady() { return [...this.teamRenderers.values()].every(renderer=>Boolean(renderer.artwork)) }
  get teamError() { return [...this.teamRenderers.values()].find(renderer=>renderer.error)?.error??null }
  artworkReady(rooms: Room[]) { return rooms.every(room => this.roomArtworkRenderer.isReady(room)) }

  get livingStats() { return this.livingRenderer?.stats }
  get livingReady() { return this.livingRenderer?.ready ?? false }

  constructor(
    context: CanvasRenderingContext2D,
    pixelRatio: number,
  ) {
    this.context = context
    this.pixelRatio = pixelRatio
  }

  render(
    viewport: Size,
    camera: Camera,
    rooms: Room[],
    animation: AnimationState,
    hoveredRoomId: string | null,
    selectedRoomId: string | null,
    workers: WorkerEntity[],
    livingWorld?: LivingWorld,
    reducedMotion = false,
    campus?: CampusWorld,
  ): void {
    if (livingWorld) {
      this.livingRenderer ??= new LivingRenderer(this.context, this.pixelRatio, rooms, livingWorld.rooms)
      if (this.livingRenderer.ready) {
        this.livingRenderer.render(viewport, camera, rooms, livingWorld, hoveredRoomId, selectedRoomId, reducedMotion)
        return
      }
    }
    const ctx = this.context
    const dpr = this.pixelRatio
    const state = camera.value

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, viewport.width, viewport.height)
    this.drawBackdrop(viewport)

    ctx.setTransform(
      dpr * state.zoom,
      0,
      0,
      dpr * state.zoom,
      dpr * (viewport.width / 2 + state.x),
      dpr * (viewport.height / 2 + state.y),
    )
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    ctx.imageSmoothingEnabled = false

    sortByDepth(rooms, (room) => ({
      anchor: {
        x: room.origin.x + room.width,
        y: room.origin.y + room.depth,
        z: 0,
      },
    })).forEach((room) => {
      renderRoom(
        ctx,
        room,
        animation,
        hoveredRoomId === room.id,
        selectedRoomId === room.id,
        this.spriteRenderer,
        this.roomArtworkRenderer,
        workers,
      )
      const simulation=campus?.simulations.get(room.id), teamRenderer=this.teamRenderers.get(room.id)
      const profile=campusProfiles.find(p=>p.id===room.id)
      if (room.artwork && simulation && profile && teamRenderer?.artwork) {
          const origin = worldToIso(room.origin), art = getRoomArtwork(room.artwork.assetId)
          ctx.save(); ctx.translate(origin.x + art.base.offset.x, origin.y + art.base.offset.y)
          ctx.scale(art.base.scale??1,art.base.scale??1)
          ctx.beginPath();art.base.clipPolygon?.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.clip()
          drawOfficeTeam(ctx, simulation, teamRenderer.artwork, reducedMotion)
          if(teamRenderer.plate)this.ambience.get(room.id)!.draw(ctx,teamRenderer.plate,profile.ambient,simulation,reducedMotion)
          ctx.restore()
      }
      if(room.artwork&&this.roomArtworkRenderer.isReady(room)) {
        const art=getRoomArtwork(room.artwork.assetId),origin=worldToIso(room.origin)
        const bottom=art.base.clipPolygon?.reduce((a,b)=>a.y>b.y?a:b)
        if(bottom) {
          ctx.save();ctx.fillStyle='#777c70';ctx.textAlign='center';ctx.font=`${10/state.zoom}px monospace`
          ctx.fillText(String(rooms.indexOf(room)+1).padStart(2,'0')+'  '+room.name,
            origin.x+art.base.offset.x+bottom.x*(art.base.scale??1),origin.y+art.base.offset.y+bottom.y*(art.base.scale??1)+16/state.zoom)
          ctx.restore()
        }
      }
    })
  }

  private drawBackdrop(viewport: Size): void {
    const ctx = this.context
    ctx.fillStyle = '#f3eddf'
    ctx.fillRect(0, 0, viewport.width, viewport.height)

    ctx.fillStyle = 'rgba(92, 78, 63, 0.09)'
    const offset = 0
    for (let y = 8 + offset; y < viewport.height; y += 17) {
      for (let x = 10 + ((y / 17) % 2) * 9; x < viewport.width; x += 21) {
        ctx.fillRect(x, y, 1, 1)
      }
    }
  }
}
