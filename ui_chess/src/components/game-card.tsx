import { ArrowUpRight, Bot, Users, Puzzle, Trophy } from "lucide-react";
interface GameCardProps {
  title: string;
  subtitle?: string;
  description: string;
  image: string;
  accent?: string;
  number?: string;
  secondaryLabel?: string;
  primaryLabel?: string;
  solo?: boolean;
  onClick: () => void;
}
export default function GameCard({ title, subtitle, description, image, accent = "gold", number, secondaryLabel = "Online", primaryLabel = "Đấu bot", solo = false, onClick }: GameCardProps) {
  return <button type="button" className={`arena-game-card accent-${accent}`} onClick={onClick} aria-label={`Chơi ${title}`}>
    <div className="game-card-art"><img src={image} alt="" loading="lazy" /><span className="game-card-number">{number}</span><span className="game-card-launch"><ArrowUpRight size={20} /></span></div>
    <div className="game-card-copy"><span className="game-card-subtitle">{subtitle}</span><h3>{title}</h3><p>{description}</p><div className="game-card-meta"><span>{solo ? <Puzzle size={14}/> : <Bot size={14}/>} {primaryLabel}</span><span>{solo ? <Trophy size={14}/> : <Users size={14}/>} {secondaryLabel}</span><ArrowUpRight size={17} className="game-card-arrow" /></div></div>
  </button>;
}
