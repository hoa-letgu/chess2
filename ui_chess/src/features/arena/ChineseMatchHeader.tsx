import './chinese-table.css';

export default function ChineseMatchHeader({turn,names=['Hồng quân','Hắc quân'],label}:{turn:number;names?:[string,string];label?:string}){
  return <header className="chinese-match-header">
    <div className="chinese-players">{[1,0].map(side=><div className={`chinese-player side-${side} ${turn===side?'is-turn':''}`} key={side} aria-current={turn===side?'true':undefined}>
      <span className="chinese-avatar" aria-hidden="true">{side===0?'帥':'將'}</span><div><strong>{names[side]}</strong><small>{side===0?'HỒNG QUÂN':'HẮC QUÂN'}</small></div>
    </div>)}</div>
    <div className={`chinese-turn-track turn-${turn}`} aria-label={label??`Lượt đi: ${turn===0?'Hồng quân':'Hắc quân'}`}><span aria-hidden="true">帥</span><div><i/><b>{label??(turn===0?'Hồng quân xuất chiêu':'Hắc quân xuất chiêu')}</b></div><span aria-hidden="true">將</span></div>
  </header>;
}

export function ChineseFiles({flip=false,bottom=false}:{flip?:boolean;bottom?:boolean}){
  return <div className="chinese-files" aria-hidden="true">{Array.from({length:9},(_,i)=><span key={i}>{flip!==bottom?9-i:i+1}</span>)}</div>;
}
