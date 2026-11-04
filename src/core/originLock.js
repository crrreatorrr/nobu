// Origin-wide serialization for synchronous Save transactions. Web Locks are preferred;
// an IndexedDB readwrite transaction provides the same exclusion on older browsers.
const DB='nobu-save-locks-v1',STORE='locks';
const localQueue=new Map();
function localOnly(name,run){
 const job=(localQueue.get(name)||Promise.resolve()).catch(()=>{}).then(run);
 localQueue.set(name,job);job.finally(()=>{if(localQueue.get(name)===job)localQueue.delete(name);}).catch(()=>{});return job;
}
function indexedLock(factory,name,run){return new Promise((resolve,reject)=>{
 let request;try{request=factory.open(DB,1);}catch(error){reject(error);return;}
 request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains(STORE))request.result.createObjectStore(STORE);};
 request.onerror=()=>reject(request.error||new Error('Save lock unavailable'));
 request.onsuccess=()=>{
  const db=request.result;let result,error,started=false,transaction;
  try{transaction=db.transaction(STORE,'readwrite');}catch(error){db.close();reject(error);return;}
  const row=transaction.objectStore(STORE).get(name);
  row.onsuccess=()=>{
   try{started=true;result=run();}
   catch(cause){error=cause;transaction.abort();}
  };
  transaction.oncomplete=()=>{db.close();resolve(result);};
  transaction.onabort=()=>{db.close();const cause=error||transaction.error||new Error('Save lock aborted');const failure=cause instanceof Error?cause:new Error(String(cause));failure.transactionStarted=started;reject(failure);};
  transaction.onerror=()=>{};
 };
});}
export function withOriginLock(name,run){
 const fallback=()=>{
  if(globalThis.indexedDB)return indexedLock(indexedDB,name,run).catch(error=>{
   // Never repeat a mutator which may already have persisted its firstPaid flag.
   if(error.transactionStarted)throw error;
   console.warn('[save] cross-tab lock unavailable; persistence is limited',error);
   return localOnly(name,run);
  });
  // Existing Save remains best effort if browser storage is entirely unavailable.
  // This fallback serializes this realm only; it does not claim cross-tab safety.
  return localOnly(name,run);
 };
 if(globalThis.navigator?.locks?.request){
  let started=false;
  try{return Promise.resolve(navigator.locks.request(name,()=>{started=true;return run();})).catch(error=>{if(started)throw error;return fallback();});}
  catch(error){if(started)return Promise.reject(error);return fallback();}
 }
 return fallback();
}
