import {test} from 'node:test';import assert from 'node:assert/strict';
import {animDuration} from '../src/presentation.ts';
// Undertow (docs/SARGATHOTH_KIT.md) heavy strips: rear, hold, slam are registered and timed. The snares it throws come with the Kelp Snare card.
test('Undertow: his heavy rear, hold and slam strips are registered',()=>{
 for(const [a,d] of [['heavyRear',5/20],['heavyHold',4/10],['heavySlam',9/18]] as const)assert.equal(animDuration('Sargathoth',a),d,a);
});
