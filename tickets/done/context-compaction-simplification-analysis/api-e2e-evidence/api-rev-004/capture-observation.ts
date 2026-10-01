const events=new Set(['managed_compaction_all_exit','managed_compaction_continuation_probe','managed_compaction_budget_probe','product_compactor_quality_probe']);
export function capture(chunk:unknown,validate:(v:unknown)=>void,persist:(event:string,v:unknown)=>void):void{
 if(typeof chunk!=='string'||!chunk.startsWith('{"event":'))return;
 const value=JSON.parse(chunk);if(!events.has(value.event))return;
 validate(value);persist(value.event,value);
}
