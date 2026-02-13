// src/games/chess/components/OnlineActions.tsx
import { showSuccess } from "@/games/common/toast";

export function OnlineActions({
  mode,
  roomId,
  gameFinished,
  history = [],          // ✅ default
  socket,
  setPopup,
}: {
  mode: "bot" | "online" | "botvsbot";
  roomId: string;
  gameFinished: boolean;
  history?: string[];    // ✅ optional
  socket: any;
  setPopup: any;
}) {
  if (mode !== "online" || !roomId) return null;

  const canOfferDraw = !gameFinished && Array.isArray(history) && history.length > 1;

  return (
    <>
      {!gameFinished && (
        <button
          onClick={() => {
            showSuccess("Đã gửi yêu cầu rời phòng", "Vui lòng chờ đối thủ phản hồi.");
            socket?.emit?.("room:leave:request", { roomName: roomId });
          }}
          className="fixed bottom-6 right-24 w-14 h-14 rounded-full bg-red-700 hover:bg-red-600 shadow-lg flex items-center justify-center text-white text-xl"
        >
          🚪
        </button>
      )}

      {canOfferDraw && (
        <button
          onClick={() => {
            showSuccess("Đã gửi lời mời hòa", "Đang chờ đối thủ trả lời.");
            socket?.emit?.("draw:offer", { roomName: roomId });
          }}
          className="fixed bottom-6 right-44 w-14 h-14 rounded-full bg-yellow-700 hover:bg-yellow-600 shadow-lg flex items-center justify-center text-white text-xl"
        >
          🤝
        </button>
      )}
    </>
  );
}
