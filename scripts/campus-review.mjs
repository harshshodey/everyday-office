import {build} from 'rolldown';
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
mkdirSync('output/campus-review',{recursive:true});
await build({input:'scripts/campus-runtime.ts',platform:'node',output:{file:'output/campus-review/runtime.mjs',format:'esm'}});
const require=createRequire(resolve(process.argv[2],'package.json'));
const {createCanvas,Image}=require('@napi-rs/canvas');
globalThis.document={createElement:()=>createCanvas(1,1)};
globalThis.Image=class extends Image {set src(value){super.src=resolve('public'+value)}get src(){return super.src}};
const {CanvasRenderer,CampusWorld,rooms,fitCameraToRooms,Camera,getRoomArtwork,worldToIso,findTopRoomAtPoint,canvasToWorld}=await import('../output/campus-review/runtime.mjs');
const viewport={width:1600,height:1100},canvas=createCanvas(viewport.width,viewport.height),ctx=canvas.getContext('2d');
const renderer=new CanvasRenderer(ctx,1),world=new CampusWorld(),camera=new Camera(fitCameraToRooms(viewport,rooms));
const render=()=>renderer.render(viewport,camera,rooms,{elapsed:0,screenPulse:0,lampPulse:0,plantSway:0},null,null,[],undefined,false,world);
for(let i=0;i<500;i++){render();if(renderer.teamReady&&renderer.artworkReady(rooms))break;await new Promise(resolve=>setTimeout(resolve,20));}
if(!renderer.teamReady||!renderer.artworkReady(rooms)||renderer.teamError)throw new Error('Campus asset loading failed: '+renderer.teamError);
render();writeFileSync('output/campus-review/overview.png',canvas.toBuffer('image/png'));
for(const room of rooms){
  const art=getRoomArtwork(room.artwork.assetId),origin=worldToIso(room.origin),scale=art.base.scale??1;
  for(const p of art.base.clipPolygon){const x=viewport.width/2+camera.value.x+(origin.x+art.base.offset.x+p.x*scale)*camera.value.zoom,y=viewport.height/2+camera.value.y+(origin.y+art.base.offset.y+p.y*scale)*camera.value.zoom;if(x<0||x>viewport.width||y<0||y>viewport.height)throw new Error('Overview clipped '+room.id);}
  const home=world.simulations.get(room.id).actors[0].foot;
  const point={x:viewport.width/2+camera.value.x+(origin.x+art.base.offset.x+home.x*scale)*camera.value.zoom,y:viewport.height/2+camera.value.y+(origin.y+art.base.offset.y+home.y*scale)*camera.value.zoom};
  if(findTopRoomAtPoint(canvasToWorld(point,viewport,camera),rooms)?.id!==room.id)throw new Error('Room selection mismatch '+room.id);
}
for(let i=0;i<400*30;i++)world.update(1/30);
render();writeFileSync('output/campus-review/overview-active.png',canvas.toBuffer('image/png'));
for(const room of rooms){camera.reset(fitCameraToRooms(viewport,[room]));render();writeFileSync('output/campus-review/'+room.id+'.png',canvas.toBuffer('image/png'));}
const report={rooms:rooms.map(r=>({id:r.id,name:r.name})),actors:world.actors.map(a=>({id:a.id,roomId:a.roomId,state:a.state,trips:a.trips})),assetsReady:renderer.teamReady,selection:'five room centers passed',camera:'all silhouettes fit overview'};
writeFileSync('output/campus-review/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
