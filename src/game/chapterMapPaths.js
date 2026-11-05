// The original island paths are part of the map art; Chapter 2 extends them.
export function chapterMapPaths(data, registry, fresh = []) {
  return [[3,4],[4,6],[6,5]].filter(([a,b])=>registry[a]?.shipped &&
    registry[b]?.shipped && registry[b].unlock(data)).map(([a,b])=>({
      id: `${a}-${b}`, from: registry[a].mapPos, to: registry[b].mapPos,
      animate: fresh.includes(b),
    }));
}

export function chapterMapMarkup(paths) {
  if (!paths.length) return '';
  return `<svg class="chapter-map-paths" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${paths.map(p=>{
    const points=`x1="${p.from.x}" y1="${p.from.y}" x2="${p.to.x}" y2="${p.to.y}"`;
    const mask=`chapter-path-${p.id}`;
    return `${p.animate?`<defs><mask id="${mask}" maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100"><line ${points} stroke="white" stroke-width="2" pathLength="1" stroke-dasharray="1"><animate attributeName="stroke-dashoffset" from="1" to="0" dur="0.8s" fill="freeze"/></line></mask></defs>`:''}<line data-chapter-path="${p.id}" ${points} ${p.animate?`mask="url(#${mask})"`:''} stroke="#ffda62" stroke-width="4" stroke-linecap="round" stroke-dasharray="2 5" vector-effect="non-scaling-stroke"/>`;
  }).join('')}</svg>`;
}
