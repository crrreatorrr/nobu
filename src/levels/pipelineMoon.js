import { pipelinePanels } from './pipelineControllers.js';

// Geometry protects the interaction envelope as well as the landing height.
// The low doorway removes borrowed fan/backpack height; no ownership check is
// attached to any collider or pickup. All heights are authored above the path.
export function buildPipelineMoon(stage, track, k, { ledge = null, hidden = null } = {}) {
 if (stage.pipelineMoon) return stage.pipelineMoon;
 const session = stage.game.session;
 if (session.trial || session.remix || session.rush) return { ledge: null, hidden: null, shell: null };
 ledge ||= k.moonLedge(0, 21.2, 327, { w: 2, dd: 2 });
 hidden ||= k.hiddenBone(0, 21.2, 327, { move: 'moon' });
 const shell = pipelinePanels(stage, k, 'pipeline-moon-housing');
 shell.root.alwaysActive = true;
 const base = d => k.W(0, 0, d).y;
 for (let d = 322.6; d <= 331.4; d += .5) {
  for (const x of [-4.2, 4.2]) shell.panel(x, d, .3, .7, base(d) + 14.4, base(d) + 32);
 }
 // Foot entrances remain open beneath headers; the original main catwalk is
 // unchanged. Tall end/side panels cannot themselves become Crown launchpads.
 for (const d of [322.6, 331.4]) shell.panel(0, d, 8.7, .3, base(d) + 16.55, base(d) + 32);
 // A thick inset podium blocks attacks through the underside. Its whole top is
 // the earned landing surface, not an intermediate step below the Moon reward.
 let podiumMaterial;
 for (let d = 324.2; d < 330; d += .5) {
  shell.panel(0, d, 8.2, .65, base(d) + 18, base(d) + 21.2);
  const mesh = shell.root.obj.children.at(-1);
  podiumMaterial ||= mesh.material.clone();
  podiumMaterial.transparent = false; podiumMaterial.opacity = 1; podiumMaterial.depthWrite = true;
  podiumMaterial.color.setHex(0xdfe8ff); mesh.material = podiumMaterial;
 }
 shell.finish();
 const result = { ledge, hidden, shell, launch: k.W(0, 15, 323.25), landing: k.W(0, 21.2, 324.6),
  coordinate: [0, 21.2, 327], entry: [0, 15, 322.6], exit: [0, 15, 331.4] };
 stage.pipelineMoon = result;
 return result;
}
