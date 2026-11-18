import { thinkBotMove } from './goBot';
import { BOT_PRESETS } from '@/features/arena/bot-presets';
self.onmessage=({data})=>{for(let depth=1;depth<=BOT_PRESETS.go.depth;depth++){const move=thinkBotMove(data,depth);self.postMessage({move,done:!move||depth===BOT_PRESETS.go.depth});if(!move)break;}};
