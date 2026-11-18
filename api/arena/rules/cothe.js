// Generated from CoThe/engine.ts. SHA256: 56d39de8b3aa021d915da37219015735c7356710df5b8b716b6e216d132b9776
                                                                            
                                     
                       
                                  
                                        
                                                                                                                                                     
                                                                         
// Treat imported positions and room payloads as untrusted data.
export function readCustomPosition(value        )                {
  if(!value||typeof value!=='object')throw Error('Dữ liệu thế cờ không hợp lệ.');
  const input=value                          ;
  if(typeof input.title!=='string'||!input.title.trim()||input.title.trim().length>60)throw Error('Tên thế cờ cần từ 1 đến 60 ký tự.');
  if(!Number.isInteger(input.moves)||Number(input.moves)<1||Number(input.moves)>3)throw Error('Chọn mục tiêu chiếu bí trong 1 đến 3 nước đỏ.');
  if(!Array.isArray(input.board)||input.board.length!==10||input.board.some(row=>!Array.isArray(row)||row.length!==9||row.some(p=>p!==null&&(typeof p!=='string'||!['G','A','E','H','R','C','S','g','a','e','h','r','c','s'].includes(p)))))throw Error('Bàn cờ phải có 10 hàng, 9 cột và các quân hợp lệ.');
  const board=clone(input.board         ),counts                      ={};
  const limits                      ={G:1,A:2,E:2,H:2,R:2,C:2,S:5};
  for(let r=0;r<10;r++)for(let c=0;c<9;c++){
    const p=board[r][c];if(!p)continue;const kind=p.toUpperCase(),red=p===kind;
    counts[p]=(counts[p]??0)+1;if(counts[p]>limits[kind])throw Error(`Quá số lượng quân ${p} cho phép.`);
    const homeR=red?9-r:r;
    if(kind==='G'&&(homeR>2||c<3||c>5))throw Error('Tướng phải ở trong cung của mình.');
    if(kind==='A'&&![[0,3],[0,5],[1,4],[2,3],[2,5]].some(([rr,cc])=>rr===homeR&&cc===c))throw Error('Sĩ phải ở đúng đường chéo trong cung.');
    if(kind==='E'&&![[0,2],[0,6],[2,0],[2,4],[2,8],[4,2],[4,6]].some(([rr,cc])=>rr===homeR&&cc===c))throw Error('Tượng phải ở đúng vị trí bên phần sân của mình.');
    if(kind==='S'&&(homeR<3||(homeR<=4&&c%2!==0)))throw Error('Tốt phải ở vị trí có thể đi tới theo luật.');
  }
  if(counts.G!==1||counts.g!==1)throw Error('Cần đúng một Tướng đỏ và một Tướng đen.');
  if(checked(board,0)||checked(board,1))throw Error('Vị trí bắt đầu không được chiếu sẵn hoặc để hai Tướng đối mặt.');
  return {title:input.title.trim(),moves:Number(input.moves),board};
}
const inside=(r       ,c       )=>r>=0&&r<10&&c>=0&&c<9;
const side=(piece      )     =>piece===piece.toUpperCase()?0:1;
export const clone=(board      )      =>board.map(row=>[...row]);
export const square=([r,c]    )=>`${'abcdefghi'[c]}${10-r}`;
export function play(board      ,move     )      {const next=clone(board);next[move.to[0]][move.to[1]]=next[move.from[0]][move.from[1]];next[move.from[0]][move.from[1]]=null;return next;}
function attacks(board      ,from    ,to    )        {
  const [r,c]=from,[rr,cc]=to;if(!inside(r,c)||!inside(rr,cc)||(r===rr&&c===cc))return false;
  const piece=board[r][c];if(!piece)return false;
  const army=side(piece),dr=rr-r,dc=cc-c,ar=Math.abs(dr),ac=Math.abs(dc),kind=piece.toUpperCase();
  const palace=cc>=3&&cc<=5&&(army===0?rr>=7:rr<=2);
  if(kind==='G'){
    if(c===cc&&board[rr][cc]?.toUpperCase()==='G'&&board[rr][cc]!==piece){for(let row=Math.min(r,rr)+1;row<Math.max(r,rr);row++)if(board[row][c])return false;return true;}
    return palace&&ar+ac===1;
  }
  if(kind==='A')return palace&&ar===1&&ac===1;
  if(kind==='E')return ar===2&&ac===2&&(army===0?rr>=5:rr<=4)&&!board[r+dr/2][c+dc/2];
  if(kind==='H')return ar*ac===2&&!board[r+(ar===2?dr/2:0)][c+(ac===2?dc/2:0)];
  if(kind==='S')return (dc===0&&dr===(army===0?-1:1))||((army===0?r<=4:r>=5)&&dr===0&&ac===1);
  if((kind==='R'||kind==='C')&&(r===rr||c===cc)){
    let screens=0;const sr=Math.sign(dr),sc=Math.sign(dc);for(let row=r+sr,col=c+sc;row!==rr||col!==cc;row+=sr,col+=sc)if(board[row][col])screens++;
    return kind==='R'?screens===0:board[rr][cc]?screens===1:screens===0;
  }
  return false;
}
export function checked(board      ,army     )        {
  let king         =null;for(let r=0;r<10;r++)for(let c=0;c<9;c++)if(board[r][c]===(army===0?'G':'g'))king=[r,c];
  if(!king)return true;
  for(let r=0;r<10;r++)for(let c=0;c<9;c++){const piece=board[r][c];if(piece&&side(piece)!==army&&attacks(board,[r,c],king))return true;}
  return false;
}
export function legalMoves(board      ,army     )       {
  const moves       =[];for(let r=0;r<10;r++)for(let c=0;c<9;c++){
    const piece=board[r][c];if(!piece||side(piece)!==army)continue;
    for(let rr=0;rr<10;rr++)for(let cc=0;cc<9;cc++){
      const target=board[rr][cc];if(target&&(side(target)===army||target.toUpperCase()==='G'))continue;
      const move     ={from:[r,c],to:[rr,cc]};if(attacks(board,move.from,move.to)&&!checked(play(board,move),army))moves.push(move);
    }
  }return moves;
}
export const sameMove=(a     ,b     )=>a.from[0]===b.from[0]&&a.from[1]===b.from[1]&&a.to[0]===b.to[0]&&a.to[1]===b.to[1];
export const mate=(board      )=>checked(board,1)&&legalMoves(board,1).length===0;
                                                      
function solve(board      ,remaining       ,search       )          {
  if(remaining<1)return null;
  if(++search.nodes>100000)throw Error('Thế cờ cần phân tích sâu hơn. Hãy thử lại hoặc đổi thế.');
  const key=board.flat().map(piece=>piece??'.').join('')+remaining;if(search.memo.has(key))return search.memo.get(key) ;
  for(const move of legalMoves(board,0)){
    const next=play(board,move);if(!checked(next,1))continue;
    const replies=legalMoves(next,1);
    if(!replies.length){search.memo.set(key,move);return move;}
    if(remaining>1&&replies.every(reply=>solve(play(next,reply),remaining-1,search)!==null)){search.memo.set(key,move);return move;}
  }search.memo.set(key,null);return null;
}
export function solution(board      ,remaining       )          {return solve(board,remaining,{nodes:0,memo:new Map()});}
                                                                                                   
export function analyze(board      ,move     ,remaining       )         {
  if(!legalMoves(board,0).some(candidate=>sameMove(candidate,move)))throw Error('Nước đi không hợp lệ hoặc để Tướng đỏ bị chiếu.');
  const next=play(board,move);
  if(!checked(next,1))return {status:'failed',board:next,reply:null,message:'Thế này cần chiếu liên tiếp. Hãy tìm một nước buộc đối thủ giải chiếu.'};
  const replies=legalMoves(next,1);if(!replies.length)return {status:'won',board:next,reply:null,message:'Chiếu bí! Bạn đã phá được thế cờ.'};
  if(remaining<=1)return {status:'failed',board:next,reply:null,message:'Đối thủ vẫn còn nước giải chiếu. Bạn đã dùng hết số nước của thế này.'};
  const search       ={nodes:0,memo:new Map()};
  for(const reply of replies){const defense=play(next,reply);if(!solve(defense,remaining-1,search))return {status:'failed',board:defense,reply,message:`Đen đi ${square(reply.from)} → ${square(reply.to)} và thoát khỏi chuỗi chiếu bí trong số nước yêu cầu. Thử một ý khác nhé.`};}
  // Prefer a defense that prevents a one-move mate, when there is a choice.
  const reply=replies.find(candidate=>remaining>2&&!solve(play(next,candidate),1,search))??replies[0];
  return {status:'continue',board:play(next,reply),reply,message:`Đen phòng thủ ${square(reply.from)} → ${square(reply.to)}. Tiếp tục tìm nước chiếu quyết định.`};
}
function position(pieces                        )      {const board      =Array.from({length:10},()=>Array            (9).fill(null));for(const [piece,r,c] of pieces)board[r][c]=piece;return board;}
const base                        =[['G',9,4],['g',0,4],['S',5,4]];
const originals         =[
  {id:'song-xa',title:'Song Xa Trấn Cung',theme:'Hai xe phối hợp',lesson:'Một xe khống chế đường thoát, xe còn lại khóa hàng cuối. Đừng vội bắt quân.',moves:1,level:'Nhập môn',board:position([...base,['R',1,3],['R',2,8]])},
  {id:'thien-loi',title:'Thiên Lôi Pháo',theme:'Pháo mượn ngòi',lesson:'Mã vừa làm ngòi pháo vừa khống chế hai cửa cung. Tìm đường đưa pháo vào trung lộ.',moves:1,level:'Nhập môn',board:position([...base,['R',1,0],['H',2,4],['C',3,7]])},
  {id:'ma-khoa',title:'Mã Khóa Cửu Cung',theme:'Mã và xe hiệp lực',lesson:'Kiểm tra chân mã trước khi xuất quân. Xe sẽ giữ các cửa thoát còn lại.',moves:1,level:'Chiến thuật',board:position([...base,['R',1,0],['R',2,3],['H',3,3],['a',0,5]])},
  {id:'binh-lam',title:'Binh Lâm Thành Hạ',theme:'Tốt mở đường xe',lesson:'Tốt qua sông có thể quyết định cả thế trận. Một bước tiến mở thêm đường khống chế của xe.',moves:1,level:'Chiến thuật',board:position([...base,['R',1,0],['H',2,4],['S',1,3]])},
  {id:'long-mon',title:'Long Môn Tuyệt Lộ',theme:'Dẫn tướng vào lưới',lesson:'Chiếu để dẫn Tướng đen về hàng cuối, rồi dùng xe thứ hai kết thúc. Chú ý bảo vệ xe chiếu.',moves:2,level:'Thử thách',board:position([['G',9,4],['g',1,4],['S',5,4],['S',3,4],['R',3,3],['R',3,8],['H',3,2]])},
  {id:'tam-diep',title:'Tam Điệp Liên Hoàn',theme:'Ba đợt chiếu liên tiếp',lesson:'Mỗi nước chiếu phải giữ được sự phối hợp. Máy có thể chọn cửa trên hoặc cửa dưới; cả hai đều có cách khóa.',moves:3,level:'Thử thách',board:position([['G',9,4],['g',2,4],['S',5,4],['R',4,3],['R',4,8],['H',4,2],['H',3,4]])},
];
export const PUZZLES         =originals.flatMap(puzzle=>[puzzle,{...puzzle,id:`${puzzle.id}-doi-canh`,title:`${puzzle.title} · Đổi cánh`,board:puzzle.board.map(row=>[...row].reverse())}]);


                                                                                                                                    
export function newOnlinePuzzle(index       =10,custom         )              {
  if(custom!==undefined){const p=readCustomPosition(custom);return {board:p.board,turn:0,lastMove:null,puzzleId:'custom',title:p.title,limit:p.moves,used:0};}
  if(!Number.isInteger(index)||index<0||index>=PUZZLES.length)throw Error('Thế cờ không hợp lệ.');
  const puzzle=PUZZLES[index];
  return {board:clone(puzzle.board),turn:0,lastMove:null,puzzleId:puzzle.id,title:puzzle.title,limit:puzzle.moves,used:0};
}
export function applyOnlinePuzzle(original             ,action     ){
  const validPos=(pos    )=>Array.isArray(pos)&&pos.length===2&&pos.every(Number.isInteger)&&inside(pos[0],pos[1]);
  if(!action||!validPos(action.from)||!validPos(action.to)||!legalMoves(original.board,original.turn).some(move=>sameMove(move,action)))throw Error('Nước đi không hợp lệ hoặc để Tướng bị chiếu.');
  const state             ={...original,board:play(original.board,action),turn:original.turn===0?1:0,lastMove:{from:[...action.from],to:[...action.to]},used:original.used+(original.turn===0?1:0)};
  let winner            =null,reason            =null;
  if(original.turn===0){
    if(!checked(state.board,1)){winner=1;reason='Đỏ ngắt chuỗi chiếu. Đen hóa giải thành công.';}
    else if(!legalMoves(state.board,1).length){winner=0;reason='Đỏ phá thế thành công: chiếu bí Tướng đen.';}
    else if(state.used>=state.limit){winner=1;reason='Đỏ hết số nước cho phép. Đen hóa giải thành công.';}
  }else if(!legalMoves(state.board,0).length){winner=1;reason='Đỏ không còn nước đi hợp lệ.';}
  return {state,winner,reason};
}
