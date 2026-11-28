import {test} from 'node:test';import assert from 'node:assert/strict';
import {SARG} from '../src/config.ts';
import {createCombat,receiveHit,holdfast,regenHP,capHP} from '../src/combat.ts';
import {bootCampaign} from './helpers/game-harness.ts';
// Holdfast (docs/SARGATHOTH_KIT.md): crouch to anchor. Armour, no stagger or knockback, and water/rain regen.
test('Holdfast armour: takes holdfastResistance less damage and cannot be staggered or knocked back',()=>{
 try{
  holdfast.on=false;holdfast.resist=SARG.holdfastResistance;const a=createCombat(),b=createCombat();
  const open=receiveHit(a,10,'enemy' as any,50,1);assert.ok(a.stagger>0);
  holdfast.on=true;const held=receiveHit(b,10,'enemy' as any,50,1);
  assert.ok(Math.abs(held/open-(1-SARG.holdfastResistance))<1e-9);assert.equal(b.stagger,0);assert.equal(b.knockback,0);
 }finally{holdfast.on=false;}
});
test('Regen heals up to the HP cap and no further',()=>{const s=createCombat();s.hp=capHP(s.cap)-1;regenHP(s,50);assert.equal(s.hp,capHP(s.cap));});
const crouched=async(city:string,seconds:number)=>{
 const h=await bootCampaign(.75,{city,kaiju:'Sargathoth'});
 try{h.step(40);const hp0=h.state().hp;h.down('KeyS');h.step(Math.round(seconds*60));return {hp0,hp:h.state().hp};}finally{h.release();h.cleanup();}
};
test('Holdfast in the real loop: anchors after holdfastDelay of crouching (regen in Tokyo rain starts then, not before) and standing releases it',async()=>{
 const h=await bootCampaign(.75,{city:'tyo',kaiju:'Sargathoth'});
 try{h.step(40);const hp0=h.state().hp;h.down('KeyS');h.step(Math.round(SARG.holdfastDelay*60*.6));assert.equal(h.state().hp,hp0,'not anchored yet: no regen');
  h.step(Math.round(SARG.holdfastDelay*60*.4)+30);const hp1=h.state().hp;assert.ok(hp1>hp0,'anchored: regen');
  h.up('KeyS');h.step(30);const hp2=h.state().hp;h.step(30);assert.equal(h.state().hp,hp2,'standing releases it');}finally{h.release();h.cleanup();}
});
test('Holdfast regen: heals while anchored in Tokyo’s rain, not on a dry street',async()=>{
 const dry=await crouched('nyc-classic',2),rain=await crouched('tyo',2);
 assert.equal(dry.hp,dry.hp0,'dry: armour only');
 assert.ok(rain.hp>rain.hp0,`rain: ${rain.hp0} -> ${rain.hp}`);
});
