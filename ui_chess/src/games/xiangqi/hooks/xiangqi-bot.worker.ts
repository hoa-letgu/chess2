import { findBestBotMove } from '../utils/xiangqiBotEngine';
self.onmessage = ({data}) => {
  const {board,botSide,historyKeys,depth}=data;
  for(let level=1;level<=depth;level++) {
    const move=findBestBotMove(board,botSide,historyKeys,level);
    self.postMessage({move,done:level===depth||!move});
    if(!move)break;
  }
};
