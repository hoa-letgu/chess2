// src/games/chess/components/RoomSettings.tsx
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";

type PieceTheme = "classic" | "neo" | "wood";
type Mode = "bot" | "online" | "botvsbot";

type Props = {
  showSettings: boolean;
  setShowSettings: (v: boolean) => void;

  mode: Mode;
  setMode: (m: Mode) => void;



  setRoomId: (v: string) => void;

  resetBoardState: () => void;

  // ✅ thêm cho BOT mode
  botPlaysWhite: boolean;
  setBotPlaysWhite: (v: boolean) => void;

  pieceTheme: PieceTheme;
  setPieceTheme: (v: PieceTheme) => void;
};

export function RoomSettings({
  showSettings,
  setShowSettings,
  mode,
  setMode,
  setRoomId,
  resetBoardState,

  // ✅ nhận thêm
  botPlaysWhite,
  setBotPlaysWhite,
  pieceTheme,
  setPieceTheme,
}: Props) {
  return (
    <Dialog open={showSettings} onOpenChange={setShowSettings}>
      <DialogContent className="bg-slate-900 text-white border border-slate-700 max-w-sm">
        <DialogHeader>
          <DialogTitle>Cài đặt luyện tập</DialogTitle>
          <DialogDescription>Đổi bên đi trước hoặc chế độ xem BOT sẽ bắt đầu ván mới.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* MODE SWITCH */}
          <div className="flex bg-slate-800 p-1 rounded-lg gap-1">
            <button
              className={`flex-1 py-2 rounded ${
                mode === "bot" ? "bg-slate-600 text-white" : "text-slate-400"
              }`}
              onClick={() => {
                setMode("bot");
                resetBoardState();
                setRoomId("");
              }}
            >
              🤖 BOT
            </button>

            <button
              className={`flex-1 py-2 rounded ${
                mode === "botvsbot" ? "bg-slate-600 text-white" : "text-slate-400"
              }`}
              onClick={() => {
                setMode("botvsbot");
                resetBoardState();
                setRoomId("");
              }}
            >
              🤖🤖 BOT vs BOT
            </button>


          </div>

          {/* ✅ BOT SETTINGS */}
          {mode === "bot" && (
            <div className="space-y-4 rounded-lg border border-slate-700 bg-slate-950/40 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">Người đi trước</div>
                  <div className="text-xs text-slate-400">
                    {botPlaysWhite ? "BOT đi trước (BOT cầm Trắng)" : "Bạn đi trước (Bạn cầm Trắng)"}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Bạn</span>
                  <Switch
                    checked={botPlaysWhite}
                    onCheckedChange={(v) => {
                      setBotPlaysWhite(v);
                      resetBoardState();
                      setRoomId("");
                    }}
                  />
                  <span className="text-xs text-slate-400">BOT</span>
                </div>
              </div>

              <div>
                <div className="text-sm font-semibold mb-2">Màu quân (Theme)</div>
                <div className="flex gap-2">
                  <button
                    className={`flex-1 py-2 rounded ${
                      pieceTheme === "classic" ? "bg-slate-600 text-white" : "bg-slate-800 text-slate-300"
                    }`}
                    onClick={() => setPieceTheme("classic")}
                  >
                    Classic
                  </button>
                  <button
                    className={`flex-1 py-2 rounded ${
                      pieceTheme === "wood" ? "bg-slate-600 text-white" : "bg-slate-800 text-slate-300"
                    }`}
                    onClick={() => setPieceTheme("wood")}
                  >
                    Wood
                  </button>
                  <button
                    className={`flex-1 py-2 rounded ${
                      pieceTheme === "neo" ? "bg-slate-600 text-white" : "bg-slate-800 text-slate-300"
                    }`}
                    onClick={() => setPieceTheme("neo")}
                  >
                    Neo
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
        <Button onClick={() => setShowSettings(false)}>Tiếp tục ván đấu</Button>
      </DialogContent>
    </Dialog>
  );
}
