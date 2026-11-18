import { lazy, Suspense, useEffect, useState } from "react";
import { ArrowLeft, ArrowUpRight, ChevronRight, Crown, Gamepad2, LayoutGrid, ShieldCheck, Sparkles, Swords, Wifi } from "lucide-react";
import ChessGame from "@/games/chess/ChessGame";
import XiangqiGame from "@/games/xiangqi/XiangqiGame";
import GoGame from "@/games/go/GoGame";
import GomokuGame from "@/games/gomoku/GomokuGame";
import GameCard from "@/components/game-card";
import ArenaHub from "@/features/arena/ArenaHub";
import Promotions from "@/features/arena/Promotions";
import OfflineArena from "@/features/arena/OfflineArena";
import { isArenaGame } from "@/features/arena/game-types";
import type { ArenaGame } from "@/features/arena/game-types";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import "./lobby.css";
import { useArenaPresence } from "@/features/arena/useArenaPresence";
import { useGameCatalog } from "@/features/arena/useGameCatalog";
const AdminPage = lazy(() => import("@/features/arena/AdminPage"));
const LudoGame = lazy(() => import("@/games/Ludo/LudoGame"));
const OAnQuanGame = lazy(() => import("@/games/OAnQuan/OAnQuanGame"));
const CoChemGame = lazy(() => import("@/games/CoChem/CoChemGame"));
const CoUpGame = lazy(() => import("@/games/CoUp/CoUpGame"));
const TycoonGame = lazy(() => import("@/games/Tycoon/TycoonGame"));
const ShogiGame = lazy(() => import("@/games/Shogi/ShogiGame"));
const CheckersGame = lazy(() => import("@/games/Checkers/CheckersGame"));
const CoTheGame = lazy(() => import("@/games/CoThe/CoTheGame"));
const OthelloGame = lazy(() => import("@/games/Othello/OthelloGame"));

type OnlineGameId = ArenaGame;
type GameId = OnlineGameId;
const games: { id: GameId; title: string; subtitle: string; description: string; image: string; accent: string; number: string; secondaryLabel?: string; primaryLabel?: string; solo?: boolean }[] = [
  { id: "chess", title: "Cờ vua", subtitle: "CHESS", description: "Mỗi nước đi, một bước tiến. Làm chủ bàn cờ 64 ô.", image: "/chess/bgcovua.png", accent: "gold", number: "01" },
  { id: "xiangqi", title: "Cờ tướng", subtitle: "XIANGQI", description: "Bày binh bố trận. Khẳng định tài cầm quân.", image: "/xiangqi/bgcotuong.png", accent: "red", number: "02" },
  { id: "go", title: "Cờ vây", subtitle: "GO", description: "Tư duy rộng mở. Tạo thế trận từ từng quân cờ.", image: "/go/bgcovay.png", accent: "sage", number: "03" },
  { id: "gomoku", title: "Cờ caro", subtitle: "GOMOKU", description: "Năm quân liên tiếp. Một khoảnh khắc quyết định.", image: "/gomoku/bgxo.png", accent: "blue", number: "04" },
  { id: "ludo", title: "Cờ cá ngựa", subtitle: "LUDO · NEON CLUB", description: "Bốn sắc màu. Một cuộc đua. Tung xúc xắc và bứt phá.", image: "/ludo/cover.svg", accent: "purple", number: "05", secondaryLabel: "Online · 2 người" },
  { id: "oanquan", title: "Ô ăn quan", subtitle: "LÀNG QUÊ · TRÒ CHƠI VIỆT", description: "Nhặt từng hòn sỏi. Gửi cả tuổi thơ dưới bóng tre làng.", image: "/oanquan/cover.svg", accent: "terracotta", number: "06", secondaryLabel: "Online · 2 người" },
  { id: "cochem", title: "Cờ chém", subtitle: "SÂN ĐÌNH · CỜ GÁNH 5×5", description: "Đi một nước thật khéo, gánh đôi niềm vui bên ao sen làng.", image: "/cochem/cover.svg", accent: "lotus", number: "07", secondaryLabel: "Online · 2 người" },
  { id: "coup", title: "Cờ úp", subtitle: "LONG ẨN KỲ · MYSTERY XIANGQI", description: "Ẩn quân dưỡng thế. Lật cờ định giang sơn.", image: "/coup/cover.svg", accent: "crimson", number: "08", secondaryLabel: "Online · 2 người" },
  { id: "tycoon", title: "Cờ tỷ phú", subtitle: "EMPIRE AVENUE · AMERICAN CITY", description: "Mua phố. Xây nhà. Viết giấc mơ Mỹ theo cách của bạn.", image: "/tycoon/cover.svg", accent: "empire", number: "09", secondaryLabel: "Online · 2 người" },
  { id: "shogi", title: "Shogi", subtitle: "SHŌGUN DOJO · CHIẾN KỲ NHẬT BẢN", description: "Tĩnh tâm. Định thế trận. Một nước cờ, một ý chí.", image: "/shogi/cover.svg", accent: "shogun", number: "10", secondaryLabel: "Online · 2 người" },
  { id: "checkers", title: "Cờ Đam", subtitle: "IRON CROWN · WESTERN DRAUGHTS", description: "Định chiến tuyến. Đoạt vương quyền. Viết nên khúc khải hoàn.", image: "/checkers/cover.svg", accent: "iron", number: "11", secondaryLabel: "Online · 2 người" },
  { id: "othello", title: "Othello", subtitle: "HUYỀN NGỌC · JADE DYNASTY", description: "Một nước chuyển thế. Hắc bạch giao tranh. Nắm càn khôn trên ngọc đài.", image: "/othello/cover.svg", accent: "jade", number: "12", secondaryLabel: "Online · 2 người" },
  { id: "cothe", title: "Cờ thế", subtitle: "THIÊN CƠ KỲ TRẬN · XIANGQI PUZZLES", description: "Phá thế hiểm. Khai mở kỳ trận. Một nước định càn khôn.", image: "/cothe/cover.svg", accent: "crimson", number: "13", primaryLabel: "Offline · Phá thế", secondaryLabel: "Online · 2 người" },
];

export default function App() {
  useArenaPresence();
  const catalog = useGameCatalog();
  const visibleGames = games.filter(game => catalog.available(game.id));
  const [adminOpen, setAdminOpen] = useState(() => window.location.hash === "#admin" || window.location.pathname === "/admin");
  useEffect(() => { const change = () => setAdminOpen(window.location.hash === "#admin" || window.location.pathname === "/admin"); window.addEventListener("hashchange", change); return () => window.removeEventListener("hashchange", change); }, []);
  const [selectedGame, setSelectedGame] = useState<GameId | null>(null);
  const [pendingGame, setPendingGame] = useState<OnlineGameId | null>(null);
  const [arenaGame, setArenaGame] = useState<OnlineGameId | null>(() => {
    try { if (new URL(window.location.href).searchParams.has('payment')) return 'chess'; const saved = sessionStorage.getItem('arena-game'); return saved && isArenaGame(saved) ? saved : null; } catch { return null; }
  });
  useEffect(() => {
    try { if (arenaGame) sessionStorage.setItem('arena-game', arenaGame); else sessionStorage.removeItem('arena-game'); } catch { /* Storage may be unavailable in private browser policies. */ }
  }, [arenaGame]);
  const exit = () => setSelectedGame(null);
  const openGame = (id: GameId) => { if (!catalog.available(id)) return; setPendingGame(id); };
  if (adminOpen) return <Suspense fallback={<p role="status">Đang mở trang quản trị…</p>}><AdminPage onExit={() => { if (window.location.pathname === "/admin") window.history.replaceState(null, "", "/"); window.location.hash = ""; setAdminOpen(false); }} /></Suspense>;
  if (arenaGame) return <ArenaHub initialGame={arenaGame} onExit={() => setArenaGame(null)} />;
  if (selectedGame) {
    return <div className="game-session"><OfflineArena game={selectedGame} title={games.find(game => game.id === selectedGame)?.title ?? "Bàn cờ"}>
      {selectedGame === "cothe" && <Suspense fallback={<p className="up-loading" role="status">Đang khai mở Thiên Cơ Kỳ Trận…</p>}><CoTheGame onExit={exit} onOnline={()=>{setSelectedGame(null);setArenaGame("cothe");}}/></Suspense>}
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
      {visibleGames.map(g => <button className="rail-link rail-game" key={g.id} onClick={() => openGame(g.id)} aria-label={`Chơi ${g.title}`}>{g.number}</button>)}
      <span className="rail-bottom">BA</span>
    </aside>
    <div className="arena-body">
      <header className="arena-header">
        <a href="#" className="arena-wordmark">BOARD<span>ARENA</span><span className="wordmark-tag">CLUB</span></a>
        <div className="header-caption">Không gian của những nước đi hay.</div>
        <a href="#admin" className="guest-badge" style={{textDecoration:"none"}}><ShieldCheck size={15}/> Quản trị</a>
        <button className="guest-badge lobby-wallet" onClick={() => setArenaGame('chess')}><span className="guest-avatar">K</span> Tài khoản & ví xu</button>
      </header>
      <main className="arena-main">
        <section className="arena-hero" aria-labelledby="hero-title">
          <div className="hero-art" aria-hidden="true" />
          <div className="hero-copy">
            <span className="eyebrow"><span /> CÂU LẠC BỘ TRÍ TUỆ</span>
            <h1 id="hero-title">Bản lĩnh nằm ở<br /><em>nước đi tiếp theo.</em></h1>
            <p>Mười ba trò chơi. Vô vàn thử thách. Thử sức cùng máy hoặc gặp gỡ đối thủ trong những ván đấu online.</p>
            <div className="hero-actions"><button className="arena-primary" disabled={!visibleGames.length} onClick={() => { if (visibleGames[0]) openGame(visibleGames[0].id); }}><Swords size={18} /> {visibleGames[0] ? `Chơi ${visibleGames[0].title}` : "Đang bảo trì"} <ArrowUpRight size={18} /></button><button className="arena-secondary lobby-online" onClick={() => setArenaGame('chess')}>Sảnh online · Bàn xu <ChevronRight size={17} /></button></div>
            <div className="hero-note"><ShieldCheck size={15} /> Chơi ngay với tư cách khách</div>
          </div>
          <div className="hero-stamp"><Crown size={22} /><span>THINK AHEAD.<br /><strong>PLAY YOUR WAY.</strong></span></div>
        </section>
        <Promotions/>
        <section className="game-library" id="games" aria-labelledby="library-title">
          <div className="library-heading"><div><span className="eyebrow muted">CHỌN THỬ THÁCH CỦA BẠN</span><h2 id="library-title">Bàn cờ đang chờ.</h2></div><span className="library-count"><LayoutGrid size={15} /> {String(visibleGames.length).padStart(2, '0')} trò chơi</span></div>
          {!catalog.games && <p role="status">{catalog.error || "Đang tải trò chơi…"}</p>}{catalog.games && !visibleGames.length && <p role="status">Các trò chơi đang được bảo trì. Vui lòng quay lại sau.</p>}<div className="arena-game-grid">{visibleGames.map(game => <GameCard key={game.id} {...game} onClick={() => openGame(game.id)} />)}</div>
        </section>
        <section className="arena-features" aria-label="Các cách chơi">
          <div><span className="feature-icon"><Gamepad2 size={21} /></span><div><h3>Luyện tập cùng bot</h3><p>Thử chiến thuật, rèn tư duy qua từng ván.</p></div></div>
          <div><span className="feature-icon"><Wifi size={21} /></span><div><h3>Kết nối qua phòng đấu</h3><p>Chọn chế độ online và mời bạn cùng chơi.</p></div></div>
          <div><span className="feature-icon"><Sparkles size={21} /></span><div><h3>Mỗi ván một khám phá</h3><p>Từ những nước đầu tiên đến thế trận của bạn.</p></div></div>
        </section>
        <footer className="arena-footer"><span>BOARD ARENA <span className="footer-dot">·</span> Chơi bằng tư duy.</span><span>{visibleGames.map(game => game.title).join(" / ")}</span></footer>
      </main>
    </div>
    <Dialog open={pendingGame !== null} onOpenChange={open => { if (!open) setPendingGame(null); }}><DialogContent className="lobby-mode-dialog" showCloseButton={false}>
      <span className="eyebrow">{games.find(g => g.id === pendingGame)?.title}</span><DialogTitle>Bạn muốn chơi thế nào?</DialogTitle><DialogDescription className="sr-only">Chọn luyện tập miễn phí hoặc bàn online có ví xu.</DialogDescription>
      {pendingGame && !catalog.available(pendingGame) && <p role="status">{catalog.games?.find(game => game.id === pendingGame)?.message || "Trò chơi đang bảo trì. Vui lòng chọn trò khác."}</p>}
      <button autoFocus disabled={!catalog.available(pendingGame)} onClick={() => { if (!catalog.available(pendingGame)) return; setSelectedGame(pendingGame); setPendingGame(null); }}><Gamepad2 size={23} /><span><strong>{pendingGame === "cothe" ? "Offline · Phá thế cùng máy" : "Luyện tập cùng bot"}</strong><small>Chơi tự do · Không sử dụng xu</small></span><ChevronRight size={18} /></button>
      <button disabled={!catalog.available(pendingGame)} onClick={() => { if (!catalog.available(pendingGame)) return; setArenaGame(pendingGame); setPendingGame(null); }}><Wifi size={23} /><span><strong>{pendingGame === "cothe" ? "Online · Đấu thế hai người" : "Đấu online · Bàn xu"}</strong><small>{pendingGame === "cothe" ? "Đỏ phá thế · Đen hóa giải · Bàn miễn phí" : "Đăng nhập chung · Bàn 0 xu hoặc đặt cược"}</small></span><ChevronRight size={18} /></button>
      <button className="lobby-mode-close" onClick={() => setPendingGame(null)}>Quay lại</button>
    </DialogContent></Dialog>
  </div>;
}
