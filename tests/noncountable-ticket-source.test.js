import * as THREE from 'three';
import { beforeEach, expect, it, vi } from 'vitest';
vi.mock('../src/art/assets.js',()=>({Assets:{has:()=>false,aspect:()=>1.7,tex:()=>new THREE.Texture()}}));
vi.mock('../src/audio/audio.js',()=>({audio:{play:vi.fn()}}));
import { Backpack } from '../src/entities/breakables.js';
import { TicketSystem } from '../src/entities/tickets.js';
import { Session } from '../src/game/session.js';
import { World } from '../src/world/physics.js';
import { save } from '../src/core/save.js';
beforeEach(()=>{localStorage.clear();save.load();});
it('keeps a noncountable twelve-raw prize out of Snack progress while paying its four whole Tickets',()=>{
 const game={player:{pos:new THREE.Vector3(),dead:false},fx:{burst(){},puff(){},sparkle(){}},ui:{setHud(){}}};
 const stage={game,scene:new THREE.Scene(),world:new World(),entities:[]};
 const session=new Session(game,'3');game.session=session;
 const tickets=new TicketSystem(game,stage);game.tickets=session.tickets=tickets;tickets.finalize();
 const prize=new Backpack(stage,0,0,0,{tickets:12});prize.countable=false;prize.onBite(game.player);
 for(let i=0;i<180;i++)tickets.update(1/120);
 expect(session.fieldRaw).toBe(12);expect(session.levelTickets).toBe(4);expect(session.snack.raw).toBe(0);
});
