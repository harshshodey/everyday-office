import { officeTeam, officeSpots, officeOccluders } from '../living/officeTeamData.ts'
import type { OfficeSpot } from '../living/officeTeamData.ts'
import { createRoomNavigator, officeFloor, officeFurniture } from '../living/OfficeNavigation.ts'
import type { Polygon } from '../living/OfficeNavigation.ts'

export interface RasterOccluder {slope:number;intercept:number;polygon:Polygon}
export interface AmbientSpec {id:string;kind:'screen'|'cursor'|'paper'|'leaf'|'device'|'coffee';x:number;y:number;width:number;height:number;person:boolean}
export interface CampusProfile {
  id:string; members:string[]; homes:string[]; heightScale:number; spots:OfficeSpot[]
  floor:Polygon; furniture:readonly Polygon[]; occluders:readonly RasterOccluder[]; ambient:AmbientSpec[]
}
const p=(id:string,x:number,y:number,kind:OfficeSpot['kind']='task',facing=1):OfficeSpot=>({id,x,y,kind,facing})
const social=(leader:[number,number],lines:[number,number][],chat:[number,number][]):OfficeSpot[]=>[
  p('leader',...leader,'briefing'),...lines.map(([x,y],i)=>p('line-'+i,x,y,'briefing',-1)),
  ...chat.map(([x,y],i)=>p('chat-'+['a','b','c'][i],x,y,'chat',i===0?-1:1)),
]
const event=(id:string,kind:AmbientSpec['kind'],x:number,y:number,width:number,height:number,person=true):AmbientSpec=>({id,kind,x,y,width,height,person})

export const campusProfiles:CampusProfile[]=[{
  id:'connected-office',members:['anika','riya','arjun'],homes:['desk-1','desk-3','desk-6'],heightScale:1,
  spots:officeSpots,floor:officeFloor,furniture:officeFurniture,occluders:officeOccluders,
  ambient:[event('monitor','screen',666,390,24,14),event('cursor','cursor',735,366,10,5),event('documents','paper',720,562,16,10),
    event('plant','leaf',446,463,42,56,false),event('coffee','coffee',775,143,17,17),event('device','device',583,162,9,6)],
},{
  id:'collaboration-suite',members:['maya','daniel','kabir'],homes:['suite-seat-1','suite-seat-2','suite-seat-3'],heightScale:1/0.58,
  floor:[[110,590],[731,300],[1400,640],[1080,841],[1010,800],[725,950]],
  furniture:[[[607,445],[781,387],[985,527],[956,586],[731,539]],[[430,665],[540,613],[639,662],[570,740]]],
  spots:[p('suite-seat-1',650,582,'seat'),p('suite-seat-2',771,653,'seat'),p('suite-seat-3',956,687,'seat'),
    p('presentation',1110,530),p('planning-board',1020,470),p('discussion-table',404,655),p('review-notes',835,735),
    ...social([1110,530],[[1100,608],[1170,647],[1230,684],[1060,700]],[[422,530],[472,558],[422,583]])],
  occluders:[{slope:0.46,intercept:147,polygon:[[608,445],[781,387],[985,527],[956,586],[731,539]]}],
  ambient:[event('slides','screen',341,304,80,45),event('planning','paper',967,237,25,25),event('page','paper',768,515,24,14),
    event('sticky','device',1030,266,11,12),event('leaves','leaf',1000,358,45,59,false),event('notebook','paper',636,443,25,15)],
},{
  id:'research-lab',members:['leah','leo'],homes:['lab-seat-1','lab-seat-2'],heightScale:1/0.7,
  floor:[[120,610],[805,298],[1450,650],[1280,724],[1240,700],[893,905],[746,795],[441,950]],
  furniture:[[[575,615],[850,465],[975,510],[700,735]],[[834,790],[1015,686],[1060,734],[875,865]]],
  spots:[p('lab-seat-1',435,534,'seat'),p('lab-seat-2',1250,602,'seat'),p('testing-bench',1020,495),p('research-notes',540,665),p('equipment',570,470),
    ...social([1070,510],[[1100,570],[1150,600],[1180,650],[1090,680]],[[1085,560],[1140,590],[1085,620]])],
  occluders:[{slope:-0.53,intercept:1106,polygon:[[575,567],[850,431],[975,488],[975,535],[700,691],[575,610]]}],
  ambient:[event('monitor','screen',354,379,35,22),event('test-device','device',952,236,12,14),event('indicator','device',839,191,8,5),
    event('equipment-adjustment','device',716,271,15,9),event('notes','paper',765,548,24,15),event('plant','leaf',1193,608,45,50,false)],
},{
  id:'design-studio',members:['tara'],homes:['design-seat'],heightScale:1/0.65,
  floor:[[120,551],[686,280],[1445,645],[1390,689],[1400,710],[1080,897],[1030,875],[857,975],[575,800],[495,829]],
  furniture:[[[565,465],[725,360],[990,490],[900,600],[760,650],[570,530]],[[247,432],[425,347],[477,425],[320,510]]],
  spots:[p('design-seat',450,745,'seat'),p('design-board',1050,520),p('paper-review',540,610),p('prototype',1070,705),p('interface-review',1210,780),
    ...social([1050,520],[[1040,595],[1100,630],[1160,660],[1050,700]],[[1040,610],[1090,640],[1040,675]])],
  occluders:[{slope:0.47,intercept:469,polygon:[[368,643],[459,594],[616,687],[616,721],[530,769],[368,678]]}],
  ambient:[event('sketch','paper',740,451,26,17),event('tablet','screen',687,505,22,12),event('sheet','paper',827,443,25,16),
    event('prototype','device',1216,492,18,10),event('plant','leaf',586,646,45,59,false),event('monitor','cursor',506,631,16,10)],
},{
  id:'team-lounge',members:['sam'],homes:['lounge-seat'],heightScale:1/0.6,
  floor:[[100,580],[615,290],[1485,620],[1410,680],[1385,700],[1220,792],[1135,742],[811,915],[708,840],[495,949]],
  furniture:[[[550,500],[752,398],[976,519],[945,710],[790,747],[547,616]],[[1125,611],[1195,572],[1290,621],[1250,682]],[[210,582],[305,538],[396,583],[350,647]]],
  spots:[p('lounge-seat',1395,640,'seat'),p('coffee-counter',450,450),p('books',1160,525),p('cafe-table',1140,740),p('magazine',1000,760),
    ...social([1050,470],[[1060,540],[1110,580],[1080,620],[1040,640]],[[1060,500],[1110,530],[1060,560]])],
  occluders:[{slope:-0.5,intercept:1210,polygon:[[778,794],[1005,681],[1070,718],[1070,777],[810,924],[780,901]]}],
  ambient:[event('espresso','coffee',413,284,24,22),event('cup','paper',1209,623,13,14),event('plant','leaf',1091,606,49,62,false),
    event('magazine','paper',984,521,23,13),event('reading-lamp','device',1350,416,14,10,false),event('laptop','screen',1231,615,24,14)],
}]

export function makeCampusConfig(profile:CampusProfile){
  const navigation=createRoomNavigator(profile.floor,profile.furniture)
  const members=profile.members.map((id,i)=>{
    const member=officeTeam.find(m=>m.id===id)!
    return {...member,home:profile.homes[i],height:member.height*profile.heightScale}
  })
  return {members,spots:profile.spots,navigate:navigation.planPath,isWalkable:navigation.isWalkable}
}
