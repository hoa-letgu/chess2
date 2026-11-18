import { analyze, solution } from './engine';
import type { Board, Move } from './engine';
self.onmessage=({data}:{data:{id:number;type:'hint'|'move';board:Board;move?:Move;remaining:number}})=>{
  try{self.postMessage({id:data.id,result:data.type==='hint'?solution(data.board,data.remaining):analyze(data.board,data.move!,data.remaining)});}
  catch(error){self.postMessage({id:data.id,error:error instanceof Error?error.message:'Không phân tích được thế cờ.'});}
};
