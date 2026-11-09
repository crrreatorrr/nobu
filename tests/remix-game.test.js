import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { Game } from '../src/game/game.js';
import { save } from '../src/core/save.js';
import { hub } from '../src/hub/hubBridge.js';
import { resetWorld } from './helpers.js';
import { Assets } from '../src/art/assets.js';
beforeEach(()=>{resetWorld();vi.spyOn(hub,'bank').mockResolvedValue();vi.spyOn(Assets,'url').mockImplementation(id=>id);});
afterEach(()=>vi.restoreAllMocks());
function fixture(){return{mapSel:1,mapRemix:true,ui:{setScreen:vi.fn(),boneBoard:vi.fn(()=>'<b>NORMAL BOARD</b>'),hideHud(){},bossHide(){},fade:vi.fn()},_worldLine:vi.fn(()=>'<b>WORLD BOARD</b>')};}
it('renders only its own single bone and suppresses ordinary board and ranked controls',()=>{
 save.data.beaten[5]=true;save.data.beaten[1]=true;save.data.remix[1]={golden:true};
 const g=fixture();Game.prototype._drawMap.call(g);const html=g.ui.setScreen.mock.calls[0][0];
 expect(html).toContain('Remix Golden Bone');expect(html).toContain('R: Smog Remix');
 expect(html).not.toContain('NORMAL BOARD');expect(html).not.toContain('TIME TRIAL');expect(html).not.toContain('WORLD BOARD');
 expect(g._worldLine).not.toHaveBeenCalled();
});
it('normal map keeps its board and unavailable Remix resets to ordinary presentation',()=>{
 const g=fixture();Game.prototype._drawMap.call(g);expect(g.mapRemix).toBe(false);
 expect(g.ui.setScreen.mock.calls[0][0]).toContain('NORMAL BOARD');expect(g.ui.setScreen.mock.calls[0][0]).toContain('Beat the Pump Queen');
});
it('completion presentation does not write progress or bank a second time',()=>{
 const g=fixture(),s={level:1,def:{name:'Bark Jungle'}};g.session=s;
 const before=structuredClone(save.data);Game.prototype.remixCleared.call(g,s,{id:1,golden:true,fresh:true});
 expect(save.data).toEqual(before);expect(hub.bank).not.toHaveBeenCalled();expect(g.completeNext).toEqual({n:1,bonus:true});
 expect(g.ui.setScreen.mock.calls[0][0]).toContain('REMIX GOLDEN BONE!');
 s.disposed=true;expect(Game.prototype.remixCleared.call(g,s,{})).toBe(false);expect(g.ui.setScreen).toHaveBeenCalledOnce();
});
it('rejects illegal mode combinations and locked remix before UI or saved changes',async()=>{
 const g=fixture(),before=structuredClone(save.data);
 expect(await Game.prototype.startLevel.call(g,1,{remix:true})).toBe(false);
 save.data.beaten[5]=true;await expect(Game.prototype.startLevel.call(g,1,{remix:true,trial:true})).rejects.toThrow('mutually exclusive');
 expect(g.ui.fade).not.toHaveBeenCalled();delete save.data.beaten[5];expect(save.data).toEqual(before);
});
it('keeps Green destination copy in centralized bone strings for both opened paths',()=>{
 const g={ui:{banner:vi.fn()}};Game.prototype.collectBone.call(g,'green');
 expect(g.ui.banner.mock.calls[0][1]).toContain('Pump & Dump Pipeline and Bark Jungle');expect(save.data.colorBones.green).toBe(true);
});
