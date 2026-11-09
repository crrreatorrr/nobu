// Static census must not import a builder (save migration reads it before play).
export const PIPELINE_DOG_SECTIONS = {
  'shiba-a': 'opening', 'pug-a': 'pump', 'corgi-a': 'smog',
  'dalmatian-a': 'trading', 'shiba-b': 'rug', 'corgi-b': 'orderBook', 'pug-b': 'coldWallet',
};
export function pipelineSections(text) {
  return [
    [-8,50,'opening'],[50,125,'pump'],[125,205,'smog'],[205,280,'trading'],
    [280,335,'chimney'],[335,385,'rug'],[385,472.001,'liquidation'],
  ].map(([d0,d1,key])=>({d0,d1,name:text[key]})).concat([
    {d0:232,d1:272.001,name:text.orderBook,detour:true},
    {d0:52,d1:116.001,name:text.coldWallet,detour:true},
  ]).sort((a,b)=>a.d0-b.d0);
}
