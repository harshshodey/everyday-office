import {test} from 'node:test'
import assert from 'node:assert/strict'
import {campusProfiles,makeCampusConfig} from '../src/world/campusData.ts'
import {OfficeSimulation} from '../src/living/OfficeSimulation.ts'
import {personClearance} from '../src/living/OfficeNavigation.ts'

test('five distinct profiles distribute the ten approved adults once, with valid home/task routes and six ambient events each',()=>{
  assert.equal(campusProfiles.length,5)
  const ids=campusProfiles.flatMap(p=>p.members)
  assert.equal(ids.length,10);assert.equal(new Set(ids).size,10)
  for(const profile of campusProfiles){
    assert.equal(profile.ambient.length,6)
    const config=makeCampusConfig(profile)
    for(const spot of config.spots)assert.ok(config.isWalkable(spot),profile.id+'/'+spot.id)
    for(const member of config.members)for(const target of config.spots.filter(p=>p.kind==='task'))
      assert.ok(config.navigate(config.spots.find(p=>p.id===member.home)!,target),profile.id+'/'+target.id)
  }
})

test('each environment supports independent work and task trips without feet entering furniture or another coworker',()=>{
  for(const profile of campusProfiles){
    let seed=6
    const config=makeCampusConfig(profile)
    const simulation=new OfficeSimulation(()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296},config)
    const modes=new Set<string>()
    for(let i=0;i<600*30;i++){
      simulation.update(1/30)
      simulation.actors.forEach((a,index)=>{
        modes.add(a.workMode)
        assert.ok(config.isWalkable(a.foot),profile.id+'/'+a.id)
        for(const b of simulation.actors.slice(0,index))assert.ok(Math.hypot(a.foot.x-b.foot.x,a.foot.y-b.foot.y)>=personClearance-0.001)
      })
    }
    assert.ok(simulation.actors.every(a=>a.trips>=2),profile.id+' supports task transitions')
    assert.equal(modes.size,4)
  }
})
