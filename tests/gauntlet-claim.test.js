import {test,expect,vi,beforeEach,afterEach} from 'vitest';
import {IDBFactory} from 'fake-indexeddb';
import {awardGauntlet} from '../src/game/gauntletRewards.js';
import {save as tabA,SAVE_KEY} from '../src/core/save.js?claim-tab-a';
import {save as tabB} from '../src/core/save.js?claim-tab-b';
function loadBoth(wallet=0){localStorage.setItem(SAVE_KEY,JSON.stringify({v:3,tickets:wallet}));tabA.load();tabB.load();}
function clear(tab,id='g1',stats={}){return tab.withGauntletEnd(data=>{
 const result=awardGauntlet(data,id,{broken:12,total:12,deaths:0,ms:10000,...stats});
 // This callback is an API fixture. Actual Session canonical credit is separately tested.
 data.tickets+=result.tickets;return result;
});}
beforeEach(()=>{localStorage.clear();vi.stubGlobal('indexedDB',new IDBFactory());});
afterEach(()=>vi.unstubAllGlobals());
for(const locks of [false,true]){
 function mode(){if(!locks)return;let tail=Promise.resolve();vi.stubGlobal('navigator',{locks:{request:vi.fn((_name,run)=>{const result=tail.then(run);tail=result.catch(()=>{});return result;})}});}
 test(`${locks?'Web Locks':'IndexedDB fallback'} merges a stale second tab before firstPaid entitlement`,async()=>{
  mode();loadBoth();expect((await clear(tabA)).tickets).toBe(5);expect(tabB.data.gauntlets.g1).toBeUndefined();expect((await clear(tabB)).tickets).toBe(0);
  const disk=JSON.parse(localStorage.getItem(SAVE_KEY));expect(disk.tickets).toBe(5);expect(disk.gauntlets.g1.firstPaid).toBe(true);
 });
 test(`${locks?'Web Locks':'IndexedDB fallback'} serializes simultaneous same-gauntlet claims`,async()=>{
  mode();loadBoth();const results=await Promise.all([clear(tabA),clear(tabB)]);expect(results.map(r=>r.tickets).sort()).toEqual([0,5]);expect(JSON.parse(localStorage.getItem(SAVE_KEY)).tickets).toBe(5);
 });
 test(`${locks?'Web Locks':'IndexedDB fallback'} keeps ten Tickets and both records for parallel different clears`,async()=>{
  mode();loadBoth();await Promise.all([clear(tabA,'g1'),clear(tabB,'g2')]);const disk=JSON.parse(localStorage.getItem(SAVE_KEY));expect(disk.tickets).toBe(10);expect(disk.gauntlets).toMatchObject({g1:{firstPaid:true},g2:{firstPaid:true}});
 });
 test(`${locks?'Web Locks':'IndexedDB fallback'} uses a latest spent wallet and preserves local lives/monotone medals`,async()=>{
  mode();loadBoth(20);tabB.data.lives=2;await clear(tabA,'g1',{broken:10});
  const disk=JSON.parse(localStorage.getItem(SAVE_KEY));disk.tickets=3;disk.gauntlets.g1.flawless=true;localStorage.setItem(SAVE_KEY,JSON.stringify(disk));
  await clear(tabB,'g2');expect(tabB.data.tickets).toBe(8);expect(tabB.data.lives).toBe(2);expect(tabB.data.gauntlets.g1.flawless).toBe(true);
  tabB.reset();expect(tabB.data.gauntlets.g1.firstPaid).toBe(true);expect(tabB.data.gauntlets.g2.firstPaid).toBe(true);
 });
}
test('unavailable Web Locks falls back to IndexedDB without losing normal first-clear payment',async()=>{
 vi.stubGlobal('navigator',{locks:{request:()=>Promise.reject(new Error('Web Locks unavailable'))}});loadBoth();
 const results=await Promise.all([clear(tabA),clear(tabB)]);expect(results.map(r=>r.tickets).sort()).toEqual([0,5]);expect(JSON.parse(localStorage.getItem(SAVE_KEY)).tickets).toBe(5);
});
test('a throwing synchronous mutator is never retried outside its IndexedDB lock',async()=>{
 loadBoth();let count=0;await expect(tabA.withGauntletEnd(()=>{count++;throw new Error('claim failed');})).rejects.toThrow('claim failed');expect(count).toBe(1);
});
test('a working lock is not a durable claim receipt when Save storage rejects the write',async()=>{
 loadBoth();const write=vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw new DOMException('quota','QuotaExceededError');});
 try{expect(await clear(tabA)).toMatchObject({tickets:5,claimDurable:false});expect(await clear(tabB)).toMatchObject({tickets:5,claimDurable:false});expect(JSON.parse(localStorage.getItem(SAVE_KEY)).gauntlets).toBeUndefined();}finally{write.mockRestore();}
});
test('a queued abandoned claim neither invokes its mutator nor writes Save',async()=>{
 loadBoth();const mutate=vi.fn(),write=vi.spyOn(Storage.prototype,'setItem');expect(await tabA.withGauntletEnd(mutate,{shouldCommit:()=>false})).toMatchObject({cancelled:true,claimDurable:false});expect(mutate).not.toHaveBeenCalled();expect(write).not.toHaveBeenCalled();write.mockRestore();
});
