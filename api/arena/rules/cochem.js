// Generated from CoChem/engine.ts. SHA256: b1dc1f2dd3e50eeac759ac8587cf3e0b2552a4e39d2aa3c9d60e9a3f80f85058
                         
                               
                                                
                         
                                                                 
                                                      
                                                     
                                                          
  
const inside = (r       ,c       )=>r>=0&&r<5&&c>=0&&c<5;
const key = (s          )=>`${s.board.map(c=>c===null?'.':c).join('')}:${s.turn}:${s.trap??'-'}`;
export const coordinate = (i       )=>`${'ABCDE'[i%5]}${5-Math.floor(i/5)}`;
export function neighbors(i       )          {
  if(!Number.isInteger(i)||i<0||i>=25)return [];
  const r=Math.floor(i/5),c=i%5,dirs=[[1,0],[-1,0],[0,1],[0,-1]];
  if((r+c)%2===0)dirs.push([1,1],[1,-1],[-1,1],[-1,-1]);
  return dirs.filter(([dr,dc])=>inside(r+dr,c+dc)).map(([dr,dc])=>(r+dr)*5+c+dc);
}
export function newChemGame(useMo=true)           {
  const board       =Array(25).fill(null);
  for(const i of [0,1,2,3,4,5,9,10])board[i]=1;
  for(const i of [14,15,19,20,21,22,23,24])board[i]=0;
  const s          ={board,turn:0,trap:null,useMo,moves:0,history:[],last:null,converted:[],ganh:[],vay:[],winner:null,reason:'',log:['Bàn mới đã sẵn sàng. Mỗi bên 8 quân, bạn Lá đi trước!']};
  s.history=[key(s)];return s;
}
export const countPieces=(s                        ,side     )=>s.board.filter(c=>c===side).length;
function rawMoves(board       ,side     )        {return board.flatMap((v,from)=>v===side?neighbors(from).filter(to=>board[to]===null).map(to=>({from,to})):[]);}
export function ganhAt(board       ,to       ,side     )          {
  const r=Math.floor(to/5),c=to%5,enemy=1-side,dirs=[[1,0],[0,1]],found         =[];
  if((r+c)%2===0)dirs.push([1,1],[1,-1]);
  for(const [dr,dc]of dirs)if(inside(r+dr,c+dc)&&inside(r-dr,c-dc)){
    const a=(r+dr)*5+c+dc,b=(r-dr)*5+c-dc;
    if(board[a]===enemy&&board[b]===enemy)found.push(a,b);
  }
  return found;
}
export function forcedMoves(s          )        {
  if(!s.useMo||s.trap===null||s.winner!==null)return [];
  return rawMoves(s.board,s.turn).filter(m=>{
    if(m.to!==s.trap)return false;
    const b=[...s.board];b[m.from]=null;b[m.to]=s.turn;
    return ganhAt(b,m.to,s.turn).length>0;
  });
}
export function legalMoves(s          )        {if(s.winner!==null)return [];const forced=forcedMoves(s);return forced.length?forced:rawMoves(s.board,s.turn);}
export function surrounded(board       ,side     )          {
  const seen=new Set        (),result         =[];
  for(let i=0;i<25;i++)if(board[i]===side&&!seen.has(i)){
    const group=[i];seen.add(i);let open=false;
    for(let j=0;j<group.length;j++)for(const n of neighbors(group[j])){
      if(board[n]===null)open=true;
      else if(board[n]===side&&!seen.has(n)){seen.add(n);group.push(n);}
    }
    if(!open)result.push(...group);
  }
  return result;
}
export function applyChemMove(original          ,move     )           {
  if(!legalMoves(original).some(m=>m.from===move.from&&m.to===move.to))throw Error('Chọn quân của mình rồi một điểm trống có đường nối. Khi có thế mở, phải đi vào điểm được đánh dấu.');
  const s          ={...original,board:[...original.board],history:[...original.history],log:[...original.log]},actor=s.turn;
  s.board[move.from]=null;s.board[move.to]=actor;
  s.ganh=ganhAt(s.board,move.to,actor);for(const i of s.ganh)s.board[i]=actor;
  s.vay=surrounded(s.board,(1-actor)        );for(const i of s.vay)s.board[i]=actor;
  s.converted=[...s.ganh,...s.vay];s.moves++;s.last={...move};s.turn=(1-actor)        ;
  s.trap=s.useMo&&!s.converted.length?move.from:null;
  if(s.trap!==null&&!forcedMoves(s).length)s.trap=null;
  const who=actor===0?'Bạn Lá':'Bạn Sen';
  s.log=[`${who}: ${coordinate(move.from)} → ${coordinate(move.to)}${s.ganh.length?` · gánh ${s.ganh.length} quân`:''}${s.vay.length?` · vây ${s.vay.length} quân`:''}${!s.converted.length?' · một nước đi khéo.':'.'}`,...s.log].slice(0,8);
  const position=key(s);s.history.push(position);
  if(countPieces(s,s.turn)===0){s.winner=actor;s.reason='Đã đổi toàn bộ quân đối phương về cùng một phe.';}
  else if(!legalMoves(s).length){s.winner=actor;s.reason='Đối phương không còn nước đi hợp lệ.';}
  else if(s.history.filter(p=>p===position).length>=3){s.winner=-1;s.reason='Thế cờ cùng lượt và thế mở lặp lại 3 lần.';}
  else if(s.moves>=200){s.winner=-1;s.reason='Hòa sau 200 lượt để khép lại một ván dài.';}
  return s;
}
export function chooseChemMove(s          ,difficulty               ='smart')                {
  const side=s.turn,choices=legalMoves(s);let best=choices[0],value=-Infinity;
  for(const move of choices){
    const after=applyChemMove(s,move);let score=evaluate(after,side);
    if(difficulty==='smart'&&after.winner===null){
      let worst=Infinity;
      for(const answer of legalMoves(after))worst=Math.min(worst,evaluate(applyChemMove(after,answer),side));
      score=worst+evaluate(after,side)*.025;
    }
    if(score>value){value=score;best=move;}
  }
  return best;
}
function evaluate(s          ,side     )        {
  if(s.winner!==null)return s.winner===-1?0:s.winner===side?10000:-10000;
  let center=0;for(let i=0;i<25;i++)if(s.board[i]!==null){const w=4-Math.abs(Math.floor(i/5)-2)-Math.abs(i%5-2);center+=(s.board[i]===side?1:-1)*w;}
  return (countPieces(s,side)-countPieces(s,(1-side)       ))*35+(rawMoves(s.board,side).length-rawMoves(s.board,(1-side)       ).length)*.8+center*.5;
}
