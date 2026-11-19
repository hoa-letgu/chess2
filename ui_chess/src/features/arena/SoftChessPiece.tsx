import { useId } from 'react';

// One silhouette system for both colours, keeping pieces legible on small screens.
export default function SoftChessPiece({piece}:{piece:string}){
 const id=useId().replace(/:/g,''),white=piece===piece.toUpperCase(),kind=piece.toLowerCase();
 const ink='#18191b',shade=white?'#c9cbd0':'#353638',mid=white?'#f8f8f6':'#555658',light=white?'#ffffff':'#929394';
 const fill=`url(#soft-${id})`;
 const body=kind==='p'?<><path d="M36 45Q30 48 36 52L40 54Q38 65 31 72Q25 78 25 87H75Q75 78 69 72Q62 65 60 54L64 52Q70 48 64 45Z"/><circle cx="50" cy="32" r="16"/></>:
 kind==='r'?<><path d="M29 37L32 77H68L71 37Z"/><path d="M23 15Q21 15 22 25L23 34Q24 40 33 42H67Q76 40 77 34L78 18Q78 15 74 15H64V24H56V14H44V24H36V15Z"/><path d="M33 44L35 72" fill="none" stroke="#fff" strokeOpacity=".12" strokeWidth="5"/></>:
 kind==='n'?<><path d="M30 77Q34 66 44 59L57 49Q49 53 41 50L35 54Q32 56 28 53L16 44Q14 41 18 37L32 22L38 13L43 8Q46 8 50 17Q71 23 78 42Q85 60 71 78Z"/><path d="M49 20Q67 34 66 49Q65 61 54 69" fill="none" stroke="#fff" strokeOpacity=".14" strokeWidth="7"/><path d="M35 29L40 26" fill="none" stroke={ink} strokeWidth="5"/><path d="M24 44Q33 46 37 42" fill="none" stroke={ink} strokeWidth="2.5"/></>:
 kind==='b'?<><path d="M31 77Q18 63 28 43Q35 30 46 24L52 19Q54 14 50 12Q43 9 40 15Q38 20 43 23Q26 29 24 47Q21 66 33 76Z"/><path d="M40 77Q26 62 38 45L57 24Q69 37 73 49Q82 67 66 78Z"/><path d="M57 26L51 48Q50 53 55 53" fill="none" stroke={ink} strokeWidth="4"/></>:
 kind==='q'?<><path d="M24 31L34 76H68L79 31L62 52L60 22L50 49L40 22L39 52Z"/>{[[23,29],[39,20],[61,20],[80,29]].map(([x,y])=><circle key={x} cx={x} cy={y} r="7"/>)}</>:
 <><path d="M39 76Q25 68 20 55Q12 34 29 30Q40 27 47 41L48 24H41V15H48V7H58V15H66V24H58L59 41Q67 27 79 32Q92 40 80 58Q74 69 63 76Z"/><path d="M39 54Q28 43 27 48Q26 55 42 64M62 54Q75 43 77 48Q78 55 60 64" fill="none" stroke={ink} strokeWidth="4"/><path d="M52 30L48 71H63L56 30" stroke="none"/></>;
 return <svg className="imperial-chess-piece soft-chess-piece" viewBox="0 0 100 100" aria-hidden="true" focusable="false"><defs><linearGradient id={`soft-${id}`} x1=".15" y1="0" x2=".8" y2="1"><stop offset="0" stopColor={light}/><stop offset=".4" stopColor={mid}/><stop offset="1" stopColor={shade}/></linearGradient></defs><ellipse cx="51" cy="91" rx="29" ry="4" fill="#000" opacity=".14"/><g fill={fill} stroke={ink} strokeWidth="3.2" strokeLinejoin="round" strokeLinecap="round">{body}{kind!=='p'&&<path d="M31 76Q26 77 24 83L23 90Q23 92 28 92H74Q78 92 77 89L76 83Q75 77 69 76Z"/>}</g><path d={kind==='p'?'M31 83Q45 79 68 83':'M30 83Q44 79 69 81'} fill="none" stroke="#fff" strokeOpacity={white?'.6':'.24'} strokeWidth="3.5" strokeLinecap="round"/></svg>;
}
