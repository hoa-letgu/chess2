import { ArrowUpRight, Bot, Users } from "lucide-react";
interface GameCardProps {
  title: string;
  subtitle?: string;
  description: string;
  image: string;
  accent?: string;
  number?: string;
  secondaryLabel?: string;
  onClick: () => void;
}
export default function GameCard({ title, subtitle, description, image, accent = "gold", number, secondaryLabel = "Online", onClick }: GameCardProps) {
  return <button type="button" className={`arena-game-card accent-${accent}`} onClick={onClick} aria-label={`Chơi ${title}`}>
    <div className="game-card-art"><img src={image} alt="" loading="lazy" /><span className="game-card-number">{number}</span><span className="game-card-launch"><ArrowUpRight size={20} /></span></div>
    <div className="game-card-copy"><span className="game-card-subtitle">{subtitle}</span><h3>{title}</h3><p>{description}</p><div className="game-card-meta"><span><Bot size={14} /> Đấu bot</span><span><Users size={14} /> {secondaryLabel}</span><ArrowUpRight size={17} className="game-card-arrow" /></div></div>
  </button>;
}
