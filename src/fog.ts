import type {BlockDef} from './levels.ts';
// Fog overlay opacity (0-1) at world x for a level with `fog: {from, to, max}`: clear up to `from`, thickening linearly to `max` at
// `to`, holding there. A level without fog is always 0.
export function fogAt(block:Pick<BlockDef,'fog'>,x:number){const f=block.fog;if(!f)return 0;if(x<=f.from)return 0;if(x>=f.to)return f.max;return f.max*(x-f.from)/(f.to-f.from);}
