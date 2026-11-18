export type Grid=(string|null)[][];
export type Point=[number,number];
const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
export function fiveLine(board:Grid,last?:Point|null):Point[]{
 if(!last||!board[last[0]]?.[last[1]])return [];
 const [r,c]=last,p=board[r][c];
 for(const [dr,dc] of [[1,0],[0,1],[1,1],[1,-1]]){
  const line:Point[]=[[r,c]];
  for(let k=1;board[r-dr*k]?.[c-dc*k]===p;k++)line.unshift([r-dr*k,c-dc*k]);
  for(let k=1;board[r+dr*k]?.[c+dc*k]===p;k++)line.push([r+dr*k,c+dc*k]);
  if(line.length>=5){const i=line.findIndex(([a,b])=>a===r&&b===c);return line.slice(Math.max(0,Math.min(i,line.length-5)),Math.max(0,Math.min(i,line.length-5))+5);}
 }
 return [];
}
export function goRegions(board:Grid){
 const seen=new Set<string>(),atari:Point[]=[],territory:{point:Point;owner:string}[]=[],score=[0,6.5];
 for(let r=0;r<board.length;r++)for(let c=0;c<board[r].length;c++){
  const key=`${r},${c}`;if(seen.has(key))continue;
  const color=board[r][c],queue:Point[]=[[r,c]],liberties=new Set<string>(),borders=new Set<string>();seen.add(key);
  for(let i=0;i<queue.length;i++)for(const [dr,dc]of dirs){const rr=queue[i][0]+dr,cc=queue[i][1]+dc;if(rr<0||cc<0||rr>=board.length||cc>=board[rr].length)continue;
   const value=board[rr][cc],k=`${rr},${cc}`;
   if(value===color&&!seen.has(k)){seen.add(k);queue.push([rr,cc]);}
   else if(color&&!value)liberties.add(k);else if(!color&&value)borders.add(value);
  }
  if(color){score[color==='black'?0:1]+=queue.length;if(liberties.size===1)atari.push(...queue);}
  else if(borders.size===1){const owner=[...borders][0];score[owner==='black'?0:1]+=queue.length;territory.push(...queue.map(point=>({point,owner})));}
 }
 return {atari,territory,score};
}
export function placementDelta(before:Grid|null,after:Grid){
 if(!before||before.length!==after.length||before[0]?.length!==after[0]?.length)return null;
 const added:Point[]=[],removed:Point[]=[];
 for(let r=0;r<after.length;r++)for(let c=0;c<after[r].length;c++){
  if(before[r][c]===after[r][c])continue;
  if(!before[r][c]&&after[r][c])added.push([r,c]);
  else if(before[r][c]&&!after[r][c])removed.push([r,c]);else return null;
 }
 return added.length===1?{to:added[0],removed}:null;
}
