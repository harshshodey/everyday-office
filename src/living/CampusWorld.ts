import {campusProfiles,makeCampusConfig} from '../world/campusData.ts'
import {OfficeSimulation} from './OfficeSimulation.ts'

export class CampusWorld {
  readonly simulations=new Map(campusProfiles.map(profile=>[profile.id,new OfficeSimulation(Math.random,makeCampusConfig(profile))]))
  update(delta:number):void {for(const simulation of this.simulations.values())simulation.update(delta)}
  get actors(){return [...this.simulations].flatMap(([roomId,world])=>world.actors.map(actor=>({...actor,roomId})))}
}
