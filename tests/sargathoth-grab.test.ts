import {test} from 'node:test';import assert from 'node:assert/strict';
import {animDuration,SPRITES} from '../src/presentation.ts';
// Sargathoth's grab (docs/SARGATHOTH_KIT.md): a frond hauls the prop onto his crown, where the carry strips ride it.
test('Grab: the strips are registered (grab 9 frames at 20 fps; carry and carry-walk reuse idle and walk)',()=>{
 assert.equal(animDuration('Sargathoth','grab'),9/20);assert.equal(animDuration('Sargathoth','carry'),8/8);assert.equal(animDuration('Sargathoth','carryWalk'),8/10);
});
// Hold points are frame pixels; convert to world units from the feet and the body centre (the same maths as holdPoint, which needs loaded art).
const world=(a:any,p:number[])=>{const k=SPRITES.Sargathoth.width/(256*a.scale);return [(p[0]-a.anchor)*k,-(191-p[1])*k];};
test('Grab: the prop starts at his feet, follows the frond up, and lands where the carry strips hold it',()=>{
 const A=SPRITES.Sargathoth.anims,g=A.grab,c=A.carry,w=A.carryWalk,gh=g.hold as number[][],ch=c.hold as number[][],wh=w.hold as number[][];
 assert.equal(gh.length,g.frames);assert.equal(ch.length,c.frames);assert.equal(wh.length,w.frames);
 const s=world(g,gh[0]),e=world(g,gh[gh.length-1]),k=world(c,ch[0]);
 assert.ok(s[1]>-5&&s[0]>40&&s[0]<90,`starts on the street just ahead of him ${s}`);assert.ok(e[1]<s[1]-30,'hauled up');
 assert.ok(Math.abs(e[0]-k[0])<6&&Math.abs(e[1]-k[1])<8,`grab ends at the carry spot ${e} vs ${k}`);
 assert.ok(Math.abs(world(w,wh[0])[0]-k[0])<4&&Math.abs(world(w,wh[0])[1]-k[1])<4,'idle and walk carry hold the same point');
});
