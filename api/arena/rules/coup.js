// Generated from CoUp/engine.ts. SHA256: a2c3991bb9cc9386084738b88b18302a251432f90bf4d929d651d7decc518c10
                     
                                             
                                                                 
                                         
                                                        
                                
                                                                            
                                                     
                                                                      
  
// The bag includes unrevealed captured pieces. No face is assigned to a covered
// piece, so neither player nor bot can inspect a preassigned hidden identity.
                                                              
export const ARMY       =['R','R','H','H','E','E','A','A','C','C','S','S','S','S','S'];
export const NAMES                    ={G:'Tướng',R:'Xe',H:'Mã',E:'Tượng',A:'Sĩ',C:'Pháo',S:'Tốt'};
export const HAN                             ={G:['帥','將'],R:['俥','車'],H:['傌','馬'],E:['相','象'],A:['仕','士'],C:['炮','砲'],S:['兵','卒']};
export const coord=(i       )=>`${'abcdefghi'[i%9]}${10-Math.floor(i/9)}`;
export const sideName=(side     )=>side===0?'Hồng quân':'Hắc quân';
const inside=(r       ,c       )=>r>=0&&r<10&&c>=0&&c<9;
const key=(s           )=>s.board.map(p=>p?`${p.side}${p.kind??`?${p.role}`}`:'.').join('/')+`:${s.turn}`;
export function newUpGame()         {
  const board               =Array(90).fill(null),back       =['R','H','E','A','G','A','E','H','R'];
  for(const side of [0,1]        ){
    const row=side===0?9:0;
    function put(r       ,c       ,role     ){const i=r*9+c;board[i]={id:`${side}-${i}`,side,role,kind:role==='G'?'G':null};}
    back.forEach((kind,c)=>put(row,c,kind));for(const c of [1,7])put(side===0?7:2,c,'C');for(const c of [0,2,4,6,8])put(side===0?6:3,c,'S');
  }
  const s        ={board,turn:0,bags:[[...ARMY],[...ARMY]],captured:[[],[]],moves:0,quiet:0,winner:null,reason:'',history:[],last:null,log:['Hồng quân khai cuộc. Hai Tướng lộ mặt, ba mươi quân chờ mở.']};s.history=[key(s)];return s;
}
export function pseudo(board               ,from       ,to       )         {
  if(!Number.isInteger(from)||!Number.isInteger(to)||from<0||from>=90||to<0||to>=90||from===to)return false;
  const p=board[from];if(!p||board[to]?.side===p.side)return false;
  const r=Math.floor(from/9),c=from%9,rr=Math.floor(to/9),cc=to%9,dr=rr-r,dc=cc-c,ar=Math.abs(dr),ac=Math.abs(dc),kind=p.kind??p.role;
  const palace=cc>=3&&cc<=5&&(p.side===0?rr>=7:rr<=2);
  if(kind==='G'){
    if(board[to]?.kind==='G'&&c===cc){for(let row=Math.min(r,rr)+1;row<Math.max(r,rr);row++)if(board[row*9+c])return false;return true;}
    return ar+ac===1&&palace;
  }
  if(kind==='A')return ar===1&&ac===1&&(p.kind!==null||palace);
  if(kind==='E')return ar===2&&ac===2&&!board[(r+dr/2)*9+c+dc/2]&&(p.kind!==null||(p.side===0?rr>=5:rr<=4));
  if(kind==='H')return (ar===2&&ac===1&&!board[(r+Math.sign(dr))*9+c])||(ar===1&&ac===2&&!board[r*9+c+Math.sign(dc)]);
  if(kind==='S')return (dc===0&&dr===(p.side===0?-1:1))||(dr===0&&ac===1&&(p.side===0?r<=4:r>=5));
  if((kind==='R'||kind==='C')&&(r===rr||c===cc)){
    let blockers=0;for(let row=r+Math.sign(dr),col=c+Math.sign(dc);row!==rr||col!==cc;row+=Math.sign(dr),col+=Math.sign(dc))if(board[row*9+col])blockers++;
    return blockers===(kind==='C'&&board[to]?1:0);
  }
  return false;
}
export function kingSquare(position           ,side     )        {return position.board.findIndex(p=>p?.side===side&&p.kind==='G');}
export function isChecked(position           ,side     )         {
  const king=kingSquare(position,side);if(king<0)return true;
  return position.board.some((p,i)=>p&&p.side!==side&&pseudo(position.board,i,king));
}
function relocated(board               ,move     )               {const next=[...board];next[move.to]=next[move.from];next[move.from]=null;return next;}
export function legalUpMoves(position           ,from        )       {
  const moves       =[];
  for(let i=0;i<90;i++)if((from===undefined||i===from)&&position.board[i]?.side===position.turn){
    // Candidate destinations are constrained before the king-safety check.
    for(let to=0;to<90;to++)if(pseudo(position.board,i,to)){
      const move={from:i,to},board=relocated(position.board,move);
      if(!isChecked({board,turn:position.turn},position.turn))moves.push(move);
    }
  }
  return moves;
}
export function secureIndex(length       )        {
  if(!Number.isInteger(length)||length<1||length>0x100000000)throw Error('Số quân không hợp lệ.');
  const bytes=new Uint32Array(1),limit=Math.floor(0x100000000/length)*length;
  do{crypto.getRandomValues(bytes);}while(bytes[0]>=limit);return bytes[0]%length;
}
export function applyUpMove(original        ,move     ,draw                        =secureIndex)         {
  if(original.winner!==null||!legalUpMoves(original,move.from).some(m=>m.to===move.to))throw Error('Nước đi không hợp lệ hoặc để Tướng bị chiếu.');
  const s        ={...original,board:[...original.board],bags:[[...original.bags[0]],[...original.bags[1]]],captured:[[...original.captured[0]],[...original.captured[1]]],history:[...original.history],log:[...original.log]};
  const actor=s.turn,piece={...s.board[move.from] },victim=s.board[move.to];let revealed          =null;
  if(piece.kind===null){const index=draw(s.bags[actor].length);if(!Number.isInteger(index)||index<0||index>=s.bags[actor].length)throw Error('Lựa chọn quân mở không hợp lệ.');revealed=s.bags[actor].splice(index,1)[0];piece.kind=revealed;}
  if(victim)s.captured[actor].push({...victim}); // Captured covered faces stay unknown.
  s.board[move.from]=null;s.board[move.to]=piece;s.moves++;s.quiet=victim||revealed?0:s.quiet+1;s.turn=(1-actor)       ;
  s.last={...move,revealed,captured:!!victim};
  const who=actor===0?'Hồng quân':'Hắc quân';
  s.log=[`${who}: ${coord(move.from)} → ${coord(move.to)}${revealed?` · mở ${NAMES[revealed]}`:''}${victim?` · bắt ${victim.kind?NAMES[victim.kind]:'quân úp'}`:''}.`,...s.log].slice(0,10);
  const position=key(s);s.history.push(position);
  if(kingSquare(s,s.turn)<0){s.winner=actor;s.reason='Tướng đối phương đã bị bắt.';}
  else if(!legalUpMoves(s).length){s.winner=actor;s.reason=isChecked(s,s.turn)?'Chiếu bí. Đối phương không thể giải chiếu.':'Đối phương hết nước đi hợp lệ.';}
  else if(s.history.filter(p=>p===position).length>=3){s.winner=-1;s.reason='Hòa do cùng thế cờ và lượt đi lặp 3 lần.';}
  else if(s.quiet>=120){s.winner=-1;s.reason='Hòa sau 120 nửa lượt không bắt hoặc mở quân.';}
  else if(s.moves>=400){s.winner=-1;s.reason='Hòa theo giới hạn 400 nửa lượt của bản đấu tập.';}
  return s;
}
export function observeUp(s        )               {return {board:s.board.map(p=>p?{...p}:null),turn:s.turn,unseen:[[...s.bags[0]],[...s.bags[1]]]};}
const VALUE                    ={G:20000,R:900,C:450,H:400,E:220,A:200,S:100};
function expected(p      ,view              )        {return p.kind?VALUE[p.kind]:view.unseen[p.side].reduce((n,k)=>n+VALUE[k],0)/Math.max(view.unseen[p.side].length,1);}
// The policy receives only visible roles and publicly deducible unseen pools.
// It never samples a real reveal and never assigns hidden identities while planning.
export function chooseUpMove(view              ,difficulty               ='smart')                {
  const moves=legalUpMoves(view);let best=moves[0],score=-Infinity;
  for(const move of moves){
    const piece=view.board[move.from] ,victim=view.board[move.to],board=relocated(view.board,move);
    let value=(victim?expected(victim,view):0)+(piece.kind===null?35:0);
    const row=Math.floor(move.to/9),col=move.to%9;value+=(4-Math.abs(col-4))*2+(piece.side===0?9-row:row)*1.5;
    if(victim?.kind==='G')value+=100000;
    if(difficulty==='smart'){
      const attacked=board.some((p,i)=>p&&p.side!==piece.side&&pseudo(board,i,move.to));
      if(attacked)value-=expected(piece,view)*.78;
      // Check potential checks for each possible face; no actual hidden face is read.
      const types=piece.kind?[piece.kind]:view.unseen[piece.side];
      let checks=0;for(const kind of types){board[move.to]={...piece,kind};if(isChecked({board,turn:piece.side},(1-piece.side)       ))checks++;}
      value+=types.length?checks/types.length*65:0;
    }
    if(value>score){score=value;best=move;}
  }
  return best;
}
export function pieceTargets(position           ,from       )         {return legalUpMoves(position,from).map(m=>m.to);}
export const allInside=(board               )=>board.length===90&&board.every((p,i)=>!p||inside(Math.floor(i/9),i%9));
