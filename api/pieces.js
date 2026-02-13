// pieces.js

// QUY ƯỚC:
// - Chữ HOA  = ĐỎ  (red side)
// - Chữ thường = ĐEN (black side)
//
// G/g = General (Tướng)
// A/a = Advisor (Sĩ)
// E/e = Elephant (Tượng)
// H/h = Horse (Mã)
// R/r = Chariot (Xe)
// C/c = Cannon (Pháo)
// S/s = Soldier (Tốt)

export const XIANGQI_PIECE_IMG = {
  // RED
  G: "xiangqi/General_red.png",
  A: "xiangqi/Advisor_red.png",
  E: "xiangqi/Elephant_red.png",
  H: "xiangqi/Horse_red.png",
  R: "xiangqi/Chariot_red.png",
  C: "xiangqi/Cannon_red.png",
  S: "xiangqi/Soldier_red.png",

  // BLACK
  g: "xiangqi/General_black.png",
  a: "xiangqi/Advisor_black.png",
  e: "xiangqi/Elephant_black.png",
  h: "xiangqi/Horse_black.png",
  r: "xiangqi/Chariot_black.png",
  c: "xiangqi/Cannon_black.png",
  s: "xiangqi/Soldier_black.png",
};

/**
 * Kiểm tra một giá trị có phải là key quân cờ Xiangqi hợp lệ không
 */
export function isXiangqiPieceKey(x) {
  return typeof x === "string" && Object.prototype.hasOwnProperty.call(XIANGQI_PIECE_IMG, x);
}
