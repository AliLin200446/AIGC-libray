/** A drag is one transaction. Snapshots contain only serializable scene data. */
export function createHistory<T>(limit=40){
 const past:T[]=[];let future:T[]=[],start:T|undefined;
 const clone=(v:T)=>structuredClone(v);
 return{
  begin(value:T){if(start===undefined)start=clone(value);},
  commit(value:T){if(start===undefined)return;if(JSON.stringify(start)!==JSON.stringify(value)){past.push(start);if(past.length>limit)past.shift();future=[];}start=undefined;},
  undo(value:T){if(!past.length)return;future.push(clone(value));start=undefined;return clone(past.pop()!);},
  redo(value:T){if(!future.length)return;past.push(clone(value));start=undefined;return clone(future.pop()!);},
  get active(){return start!==undefined;},get canUndo(){return past.length>0;},get canRedo(){return future.length>0;},
 };
}
