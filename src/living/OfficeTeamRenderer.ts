import { atlasColumns, atlasRows, officeOccluders } from './officeTeamData.ts'
import type { OfficeSimulation, OfficeActor } from './OfficeSimulation'
import type {RasterOccluder} from '../world/campusData'

interface Frame { image: HTMLCanvasElement; width: number; height: number }
export interface TeamArtwork { frames: Frame[][]; cuts: { image: HTMLCanvasElement; x: number; y: number; slope: number; intercept: number }[] }
type CanvasFactory = (width: number, height: number) => HTMLCanvasElement
const makeCanvas: CanvasFactory = (width,height) => {
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height; return canvas
}

/** Extract once at load, never per frame. Preserve the generated atlas alpha without color-keying. */
export function prepareTeamArtwork(sheet: CanvasImageSource, plate: CanvasImageSource, createCanvas = makeCanvas, occluders:readonly RasterOccluder[]=officeOccluders): TeamArtwork {
  const frames = atlasRows.slice(0,-1).map((top,row) => atlasColumns.slice(0,-1).map((left,col) => {
    const width = atlasColumns[col+1]-left, height = atlasRows[row+1]-top
    const source = createCanvas(width,height), ctx = source.getContext('2d')!
    ctx.drawImage(sheet,left,top,width,height,0,0,width,height)
    const pixels = ctx.getImageData(0,0,width,height).data
    let x0=width,y0=height,x1=0,y1=0
    for(let y=0;y<height;y++) for(let x=0;x<width;x++) if(pixels[(y*width+x)*4+3]>100) {
      x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y)
    }
    if(x0>x1 || y0>y1) throw new Error(`Empty office character frame ${row}/${col}`)
    const image=createCanvas(x1-x0+1,y1-y0+1)
    image.getContext('2d')!.drawImage(source,x0,y0,image.width,image.height,0,0,image.width,image.height)
    return {image,width:image.width,height:image.height}
  }))
  const cuts=occluders.map(({polygon,slope,intercept})=>{
    const x=Math.min(...polygon.map(p=>p[0])),y=Math.min(...polygon.map(p=>p[1]))
    const image=createCanvas(Math.max(...polygon.map(p=>p[0]))-x+1,Math.max(...polygon.map(p=>p[1]))-y+1)
    const ctx=image.getContext('2d')!;ctx.translate(-x,-y);ctx.beginPath()
    polygon.forEach(([px,py],i)=>i?ctx.lineTo(px,py):ctx.moveTo(px,py));ctx.closePath();ctx.clip();ctx.drawImage(plate,0,0)
    return {image,x,y,slope,intercept}
  })
  return {frames,cuts}
}

function frameIndex(actor: OfficeActor, time: number, reduced: boolean): number {
  const gesturing=!reduced&&time<actor.gestureUntil
  const alternate=gesturing?Math.floor((time+actor.gesturePhase)/actor.gesturePeriod)%2:0
  if(actor.state==='WORKING')return actor.workMode==='reading'||actor.workMode==='inspecting'?4:4+alternate
  if(reduced)return 0
  if(actor.state==='WALKING')return 2+Math.floor(actor.distance/12)%2
  if(actor.state==='TALKING'||actor.state==='PRESENTING'||actor.state==='TASK')return alternate
  return 0
}

export function drawOfficeTeam(ctx: CanvasRenderingContext2D, world: OfficeSimulation, art: TeamArtwork, reduced = false): void {
  const items: {depth:number;draw:()=>void}[] = world.actors.map(actor=>({depth:actor.foot.y,draw:()=>{
    const frame=art.frames[actor.row][frameIndex(actor,world.time,reduced)]
    const scale=actor.height/art.frames[actor.row][0].height
    const bob=actor.state==='WALKING'&&!reduced?Math.sin(actor.distance/12*Math.PI)*0.65:0
    ctx.save();ctx.translate(actor.foot.x,actor.foot.y+bob)
    ctx.fillStyle='rgba(39,53,57,0.12)';ctx.beginPath();ctx.ellipse(0,-1,12,4,0,0,Math.PI*2);ctx.fill()
    ctx.scale(scale*actor.facing,scale)
    ctx.drawImage(frame.image,-frame.width/2,-frame.height);ctx.restore()
    if((actor.state==='WORKING'&&(actor.workMode==='reading'||actor.workMode==='writing'))||actor.state==='PRESENTING') {
      ctx.save();ctx.translate(actor.foot.x,actor.foot.y);ctx.scale(actor.facing,1)
      if(actor.state==='PRESENTING')ctx.translate(-3,-5)
      ctx.fillStyle='#f2e8cf';ctx.strokeStyle='#52646b';ctx.lineWidth=0.6
      ctx.beginPath();ctx.moveTo(-23,-39);ctx.lineTo(-10,-44);ctx.lineTo(-3,-37);ctx.lineTo(-17,-32);ctx.closePath();ctx.fill();ctx.stroke()
      ctx.beginPath();ctx.moveTo(-19,-38);ctx.lineTo(-10,-41);ctx.moveTo(-17,-36);ctx.lineTo(-8,-39);ctx.stroke()
      if(actor.workMode==='writing'&&world.time<actor.gestureUntil) {
        const nudge=Math.sin((world.time+actor.gesturePhase)*7)*1.5
        ctx.beginPath();ctx.moveTo(-12+nudge,-39);ctx.lineTo(-8+nudge,-46);ctx.stroke()
      }
      ctx.restore()
    }
    // A long diagonal desk has no single valid screen-Y depth. Compare feet to its front plane.
    ctx.save();ctx.beginPath()
    ctx.rect(actor.foot.x-frame.width*scale/2-1,actor.foot.y-frame.height*scale-2,frame.width*scale+2,frame.height*scale+4);ctx.clip()
    for(const cut of art.cuts) if(actor.foot.y < cut.slope*actor.foot.x+cut.intercept)ctx.drawImage(cut.image,cut.x,cut.y)
    ctx.restore()
  }}))
  items.sort((a,b)=>a.depth-b.depth).forEach(item=>item.draw())
}

export class OfficeTeamRenderer {
  artwork: TeamArtwork | null = null
  plate: HTMLImageElement | null = null
  error: string | null = null
  constructor(source='/assets/rooms/connected-office.png',occluders:readonly RasterOccluder[]=officeOccluders) {
    const load=(source:string)=>new Promise<HTMLImageElement>((resolve,reject)=>{
      const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error(`Cannot load ${source}`));image.src=source
    })
    void Promise.all([load('/assets/living/office-team.png'),load(source)])
      .then(([sheet,plate])=>{this.plate=plate;this.artwork=prepareTeamArtwork(sheet,plate,makeCanvas,occluders)})
      .catch((error:unknown)=>{this.error=String(error);console.error('Office population:',error)})
  }
}
