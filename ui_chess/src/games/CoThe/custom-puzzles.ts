import { readCustomPosition } from './engine';
import type { CustomPosition, Puzzle } from './engine';

export const CUSTOM_STORAGE='board-arena-cothe-custom-v1';
export const CUSTOM_LIMIT=50;
export function asPuzzle(position:CustomPosition,id:string):Puzzle {
  return {...position,id,theme:'Thế cờ do bạn sáng tạo',lesson:'Tìm chuỗi chiếu liên tiếp và phối hợp các quân để khóa đường thoát của Tướng đen.',level:'Thử thách'};
}
export function loadCustomPuzzles():Puzzle[]{
  try{
    const rows:unknown=JSON.parse(localStorage.getItem(CUSTOM_STORAGE)||'[]');
    if(!Array.isArray(rows))return [];
    const seen=new Set<string>();
    return rows.slice(0,CUSTOM_LIMIT).flatMap(row=>{
      try{
        if(typeof row?.id!=='string'||!/^custom-[\w-]{1,80}$/.test(row.id)||seen.has(row.id))return [];
        const p=asPuzzle(readCustomPosition(row),row.id);seen.add(row.id);return [p];
      }catch{return [];}
    });
  }catch{return [];}
}
export function saveCustomPuzzles(puzzles:Puzzle[]){
  if(puzzles.length>CUSTOM_LIMIT)throw Error('Đã đủ 50 thế riêng. Hãy sửa một thế đã có.');
  localStorage.setItem(CUSTOM_STORAGE,JSON.stringify(puzzles));
}
export function exportPosition(position:CustomPosition):string {
  return JSON.stringify({version:1,...readCustomPosition(position)});
}
export function importPosition(code:string):CustomPosition {
  if(code.length>20000)throw Error('Mã thế cờ quá dài.');
  let value;try{value=JSON.parse(code);}catch{throw Error('Mã thế cờ không đúng định dạng JSON.');}
  if(value?.version!==1)throw Error('Phiên bản mã thế cờ chưa được hỗ trợ.');
  return readCustomPosition(value);
}
