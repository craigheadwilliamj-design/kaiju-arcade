import {test} from 'node:test';import assert from 'node:assert/strict';
import {SARG,MOVE as MV} from '../src/config.ts';
import {animDuration} from '../src/presentation.ts';
import {bootCampaign} from './helpers/game-harness.ts';
// Sargathoth's run (docs/SARGATHOTH_KIT.md): an 8-frame strip, and the slowest land speed on the roster.
test('Run: his strip is registered (8 frames at 16 fps)',()=>{assert.equal(animDuration('Sargathoth','run'),8/16);});
const travel=async(kaiju:string,run:boolean)=>{
 const h=await bootCampaign(.75,{kaiju});
 try{h.step(40);const x0=h.state().x;if(run)h.down('ShiftLeft');h.down('KeyD');h.step(30);const x=h.state().x-x0;h.release();return x;}finally{h.cleanup();}
};
test('Run: walking and running are both scaled by SARG.moveSpeed against another kaiju, and running is still faster than walking',async()=>{
 const [sw,sr,mw,mr]=[await travel('Sargathoth',false),await travel('Sargathoth',true),await travel('Mogurodon',false),await travel('Mogurodon',true)];
 assert.ok(sw>0&&sr>sw,'he moves and running outpaces walking');
 assert.ok(Math.abs(sw/mw-SARG.moveSpeed)<.03,`walk ${sw} vs ${mw}`);
 assert.ok(Math.abs(sr/mr-SARG.moveSpeed)<.03,`run ${sr} vs ${mr} (x${MV.runSpeed})`);
});
