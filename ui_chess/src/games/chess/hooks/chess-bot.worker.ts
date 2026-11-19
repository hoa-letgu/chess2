import { Chess } from 'chess.js';
import { createEngineCache, findBestMoveTS } from '../utils/tsEngine';
const cache=createEngineCache();
self.onmessage=(event:MessageEvent<{fen:string;depth:number;timeLimitMs:number}>)=>{
 const {fen,depth,timeLimitMs}=event.data;
 try{const result=findBestMoveTS(new Chess(fen),{maxDepth:depth,timeLimitMs,cache});self.postMessage({fen,result});}
 catch{self.postMessage({fen,error:true});}
};
