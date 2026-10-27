import type { ImportInput } from './types';
/** RFC4180-style quoted fields; no eval, HTML or spreadsheet formula execution. */
export function parseManifest(text:string):ImportInput[] {
 if(text.length>65536)throw Error('Manifest too large.');
 if(text.trim().startsWith('[')){const value:unknown=JSON.parse(text);if(!Array.isArray(value))throw Error('Expected a JSON array.');return value as ImportInput[];}
 const rows:string[][]=[];let row:string[]=[],cell='',quoted=false;
 for(let i=0;i<text.length;i++){const ch=text[i];if(ch==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if(!quoted&&(ch===','||ch==='\n')){row.push(cell.replace(/\r$/,''));cell='';if(ch==='\n'){rows.push(row);row=[];}}else cell+=ch;}
 if(quoted)throw Error('Unclosed CSV quote.');if(cell||row.length){row.push(cell.replace(/\r$/,''));rows.push(row);}
 const header=rows.shift();if(!header||!header.includes('id')||!header.includes('sourceUrl'))throw Error('CSV needs id,version,sourceUrl,reviewer,notes columns.');
 return rows.filter(r=>r.some(Boolean)).map(r=>{if(r.length!==header.length)throw Error('Invalid CSV row.');const fields=Object.fromEntries(header.map((h,i)=>[h,r[i]]));return {id:fields.id!,version:Number(fields.version),sourceUrl:fields.sourceUrl!,reviewer:fields.reviewer!,notes:fields.notes!};});
}
