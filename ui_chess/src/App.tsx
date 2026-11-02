import { lazy, Suspense, useEffect, useState } from "react";
import { ArrowLeft, ArrowUpRight, ChevronRight, Crown, Gamepad2, LayoutGrid, ShieldCheck, Sparkles, Swords, Wifi } from "lucide-react";
import ChessGame from "@/games/chess/ChessGame";
import XiangqiGame from "@/games/xiangqi/XiangqiGame";
import GoGame from "@/games/go/GoGame";
import GomokuGame from "@/games/gomoku/GomokuGame";
import GameCard from "@/components/game-card";
import ArenaHub from "@/features/arena/ArenaHub";
import OfflineArena from "@/features/arena/OfflineArena";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import "./lobby.css";
const LudoGame = lazy(() => import("@/games/Ludo/LudoGame"));
const OAnQuanGame = lazy(() => import("@/games/OAnQuan/OAnQuanGame"));
const CoChemGame = lazy(() => import("@/games/CoChem/CoChemGame"));
const CoUpGame = lazy(() => import("@/games/CoUp/CoUpGame"));
const TycoonGame = lazy(() => import("@/games/Tycoon/TycoonGame"));
const ShogiGame = lazy(() => import("@/games/Shogi/ShogiGame"));
const CheckersGame = lazy(() => import("@/games/Checkers/CheckersGame"));
const OthelloGame = lazy(() => import("@/games/Othello/OthelloGame"));

type OnlineGameId = "chess" | "xiangqi" | "go" | "gomoku";
type GameId = OnlineGameId | "ludo" | "oanquan" | "cochem" | "coup" | "tycoon" | "shogi" | "checkers" | "othello";
const games: { id: GameId; title: string; subtitle: string; description: string; image: string; accent: string; number: string; secondaryLabel?: string }[] = [
  { id: "chess", title: "Cờ vua", subtitle: "CHESS", description: "Mỗi nước đi, một bước tiến. Làm chủ bàn cờ 64 ô.", image: "/chess/bgcovua.png", accent: "gold", number: "01" },
  { id: "xiangqi", title: "Cờ tướng", subtitle: "XIANGQI", description: "Bày binh bố trận. Khẳng định tài cầm quân.", image: "/xiangqi/bgcotuong.png", accent: "red", number: "02" },
  { id: "go", title: "Cờ vây", subtitle: "GO", description: "Tư duy rộng mở. Tạo thế trận từ từng quân cờ.", image: "/go/bgcovay.png", accent: "sage", number: "03" },
  { id: "gomoku", title: "Cờ caro", subtitle: "GOMOKU", description: "Năm quân liên tiếp. Một khoảnh khắc quyết định.", image: "/gomoku/bgxo.png", accent: "blue", number: "04" },
  { id: "ludo", title: "Cờ cá ngựa", subtitle: "LUDO · NEON CLUB", description: "Bốn sắc màu. Một cuộc đua. Tung xúc xắc và bứt phá.", image: "/ludo/cover.svg", accent: "purple", number: "05", secondaryLabel: "2–4 người" },
  { id: "oanquan", title: "Ô ăn quan", subtitle: "LÀNG QUÊ · TRÒ CHƠI VIỆT", description: "Nhặt từng hòn sỏi. Gửi cả tuổi thơ dưới bóng tre làng.", image: "/oanquan/cover.svg", accent: "terracotta", number: "06", secondaryLabel: "2 người" },
  { id: "cochem", title: "Cờ chém", subtitle: "SÂN ĐÌNH · CỜ GÁNH 5×5", description: "Đi một nước thật khéo, gánh đôi niềm vui bên ao sen làng.", image: "/cochem/cover.svg", accent: "lotus", number: "07", secondaryLabel: "2 người" },
  { id: "coup", title: "Cờ úp", subtitle: "LONG ẨN KỲ · MYSTERY XIANGQI", description: "Ẩn quân dưỡng thế. Lật cờ định giang sơn.", image: "/coup/cover.svg", accent: "crimson", number: "08", secondaryLabel: "2 người" },
  { id: "tycoon", title: "Cờ tỷ phú", subtitle: "EMPIRE AVENUE · AMERICAN CITY", description: "Mua phố. Xây nhà. Viết giấc mơ Mỹ theo cách của bạn.", image: "/tycoon/cover.svg", accent: "empire", number: "09", secondaryLabel: "2–4 người" },
  { id: "shogi", title: "Shogi", subtitle: "SHŌGUN DOJO · CHIẾN KỲ NHẬT BẢN", description: "Tĩnh tâm. Định thế trận. Một nước cờ, một ý chí.", image: "/shogi/cover.svg", accent: "shogun", number: "10", secondaryLabel: "2 người" },
  { id: "checkers", title: "Cờ Đam", subtitle: "IRON CROWN · WESTERN DRAUGHTS", description: "Định chiến tuyến. Đoạt vương quyền. Viết nên khúc khải hoàn.", image: "/checkers/cover.svg", accent: "iron", number: "11", secondaryLabel: "2 người" },
  { id: "othello", title: "Othello", subtitle: "HUYỀN NGỌC · JADE DYNASTY", description: "Một nước chuyển thế. Hắc bạch giao tranh. Nắm càn khôn trên ngọc đài.", image: "/othello/cover.svg", accent: "jade", number: "12", secondaryLabel: "2 người" },
];

export default function App() {
  const [selectedGame, setSelectedGame] = useState<GameId | null>(null);
  const [pendingGame, setPendingGame] = useState<OnlineGameId | null>(null);
  const [arenaGame, setArenaGame] = useState<OnlineGameId | null>(() => {
    try { const saved = sessionStorage.getItem('arena-game'); return ['chess','xiangqi','go','gomoku'].includes(saved ?? '') ? saved as OnlineGameId : null; } catch { return null; }
  });
  useEffect(() => {
    try { if (arenaGame) sessionStorage.setItem('arena-game', arenaGame); else sessionStorage.removeItem('arena-game'); } catch { /* Storage may be unavailable in private browser policies. */ }
  }, [arenaGame]);
  const exit = () => setSelectedGame(null);
  const openGame = (id: GameId) => { if (id === 'ludo' || id === 'oanquan' || id === 'cochem' || id === 'coup' || id === 'tycoon' || id === 'shogi' || id === 'checkers' || id === 'othello') setSelectedGame(id); else setPendingGame(id); };
  if (arenaGame) return <ArenaHub initialGame={arenaGame} onExit={() => setArenaGame(null)} />;
  if (selectedGame) {
    return <div className="game-session"><OfflineArena game={selectedGame} title={games.find(game => game.id === selectedGame)?.title ?? "Bàn cờ"}>
      {selectedGame === "chess" && <ChessGame onExit={exit} />}
      {selectedGame === "xiangqi" && <XiangqiGame />}
      {selectedGame === "go" && <GoGame onExit={exit} />}
      {selectedGame === "gomoku" && <GomokuGame onExit={exit} />}
      {selectedGame === "ludo" && <Suspense fallback={<div className="ludo-loading" role="status">Đang chuẩn bị bàn cá ngựa…</div>}><LudoGame onExit={exit} /></Suspense>}
      {selectedGame === "oanquan" && <Suspense fallback={<div className="quan-loading" role="status">Đang nhặt sỏi, bạn chờ chút nhé…</div>}><OAnQuanGame onExit={exit} /></Suspense>}
      {selectedGame === "cochem" && <Suspense fallback={<div className="chem-loading" role="status">Đang bày bàn cờ bên ao sen…</div>}><CoChemGame onExit={exit} /></Suspense>}
      {selectedGame === "coup" && <Suspense fallback={<div className="up-loading" role="status">Đang bày thế trận Long Ẩn Kỳ…</div>}><CoUpGame onExit={exit} /></Suspense>}
      {selectedGame === "tycoon" && <Suspense fallback={<div className="emp-loading" role="status">Đang mở cửa thành phố Empire Avenue…</div>}><TycoonGame onExit={exit} /></Suspense>}
      {selectedGame === "shogi" && <Suspense fallback={<div className="sg-loading" role="status">Đang bày thế trận tại võ đường Shōgun…</div>}><ShogiGame onExit={exit} /></Suspense>}
      {selectedGame === "checkers" && <Suspense fallback={<div className="ck-loading" role="status">Đang tập kết đạo quân Iron Crown…</div>}><CheckersGame onExit={exit} /></Suspense>}
      {selectedGame === "othello" && <Suspense fallback={<div className="ot-loading" role="status">Đang khai mở ngọc đài Huyền Ngọc…</div>}><OthelloGame onExit={exit} /></Suspense>}
      {(selectedGame === "xiangqi") && <button className="session-back" onClick={exit}><ArrowLeft size={16} /> Sảnh game</button>}
    </OfflineArena></div>;
  }
  return <div className="arena">
    <aside className="arena-rail" aria-label="Điều hướng">
      <a href="#" className="arena-mark" aria-label="Board Arena"><Crown size={27} /></a>
      <a className="rail-link active" href="#games" aria-label="Thư viện game"><LayoutGrid size={21} /></a>
      <span className="rail-divider" />
      {games.map(g => <button className="rail-link rail-game" key={g.id} onClick={() => openGame(g.id)} aria-label={`Chơi ${g.title}`}>{g.number}</button>)}
      <span className="rail-bottom">BA</span>
    </aside>
    <div className="arena-body">
      <header className="arena-header">
        <a href="#" className="arena-wordmark">BOARD<span>ARENA</span><span className="wordmark-tag">CLUB</span></a>
        <div className="header-caption">Không gian của những nước đi hay.</div>
        <button className="guest-badge lobby-wallet" onClick={() => setArenaGame('chess')}><span className="guest-avatar">K</span> Tài khoản & ví xu</button>
      </header>
      <main className="arena-main">
        <section className="arena-hero" aria-labelledby="hero-title">
          <div className="hero-art" aria-hidden="true" />
          <div className="hero-copy">
            <span className="eyebrow"><span /> CÂU LẠC BỘ TRÍ TUỆ</span>
            <h1 id="hero-title">Bản lĩnh nằm ở<br /><em>nước đi tiếp theo.</em></h1>
            <p>Mười hai trò chơi. Vô vàn thử thách. Thử sức cùng máy hoặc gặp gỡ đối thủ trong những ván đấu online.</p>
            <div className="hero-actions"><button className="arena-primary" onClick={() => setPendingGame("chess")}><Swords size={18} /> Chơi cờ vua <ArrowUpRight size={18} /></button><button className="arena-secondary lobby-online" onClick={() => setArenaGame('chess')}>Sảnh online · Bàn xu <ChevronRight size={17} /></button></div>
            <div className="hero-note"><ShieldCheck size={15} /> Chơi ngay với tư cách khách</div>
          </div>
          <div className="hero-stamp"><Crown size={22} /><span>THINK AHEAD.<br /><strong>PLAY YOUR WAY.</strong></span></div>
        </section>
        <section className="game-library" id="games" aria-labelledby="library-title">
          <div className="library-heading"><div><span className="eyebrow muted">CHỌN THỬ THÁCH CỦA BẠN</span><h2 id="library-title">Bàn cờ đang chờ.</h2></div><span className="library-count"><LayoutGrid size={15} /> {String(games.length).padStart(2, '0')} trò chơi</span></div>
          <div className="arena-game-grid">{games.map(game => <GameCard key={game.id} {...game} onClick={() => openGame(game.id)} />)}</div>
        </section>
        <section className="arena-features" aria-label="Các cách chơi">
          <div><span className="feature-icon"><Gamepad2 size={21} /></span><div><h3>Luyện tập cùng bot</h3><p>Thử chiến thuật, rèn tư duy qua từng ván.</p></div></div>
          <div><span className="feature-icon"><Wifi size={21} /></span><div><h3>Kết nối qua phòng đấu</h3><p>Chọn chế độ online và mời bạn cùng chơi.</p></div></div>
          <div><span className="feature-icon"><Sparkles size={21} /></span><div><h3>Mỗi ván một khám phá</h3><p>Từ những nước đầu tiên đến thế trận của bạn.</p></div></div>
        </section>
        <footer className="arena-footer"><span>BOARD ARENA <span className="footer-dot">·</span> Chơi bằng tư duy.</span><span>Cờ vua / Cờ tướng / Cờ vây / Caro / Cá ngựa / Ô ăn quan / Cờ chém / Cờ úp / Cờ tỷ phú / Shogi / Cờ Đam / Othello</span></footer>
      </main>
    </div>
    <Dialog open={pendingGame !== null} onOpenChange={open => { if (!open) setPendingGame(null); }}><DialogContent className="lobby-mode-dialog" showCloseButton={false}>
      <span className="eyebrow">{games.find(g => g.id === pendingGame)?.title}</span><DialogTitle>Bạn muốn chơi thế nào?</DialogTitle><DialogDescription className="sr-only">Chọn luyện tập miễn phí hoặc bàn online có ví xu.</DialogDescription>
      <button autoFocus onClick={() => { setSelectedGame(pendingGame); setPendingGame(null); }}><Gamepad2 size={23} /><span><strong>Luyện tập cùng bot</strong><small>Chơi tự do · Không sử dụng xu</small></span><ChevronRight size={18} /></button>
      <button onClick={() => { setArenaGame(pendingGame); setPendingGame(null); }}><Wifi size={23} /><span><strong>Đấu online · Bàn xu</strong><small>Đăng nhập chung · Bàn 0 xu hoặc đặt cược</small></span><ChevronRight size={18} /></button>
      <button className="lobby-mode-close" onClick={() => setPendingGame(null)}>Quay lại</button>
    </DialogContent></Dialog>
  </div>;
}
