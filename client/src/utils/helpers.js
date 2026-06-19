export function authHeader(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function prettySeatLabel(roomName, seatCode, roll) {
  return `${roomName}.-${seatCode}-StudentRollno(${roll})`;
}

export function getSeatLabel(rowIndex, colIndex) {
  let n = rowIndex + 1; // 1-based row
  let s = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return `${s}${colIndex}`;
}

export function isTokenExpired(token) {
  if (!token) return true;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return true;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    if (!payload.exp) return false;
    const now = Math.floor(Date.now() / 1000);
    return payload.exp < now;
  } catch {
    return true;
  }
}

export function decodeToken(token) {
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    return JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return null;
  }
}

export function getDeptColor(dept, sem) {
  const colors = [
    "bg-red-200", "bg-yellow-200", "bg-green-200", "bg-blue-200",
    "bg-indigo-200", "bg-purple-200", "bg-pink-200", "bg-red-300",
    "bg-yellow-300", "bg-green-300", "bg-blue-300", "bg-indigo-300",
    "bg-purple-300", "bg-pink-300",
  ];
  if (!dept || !sem) return "";
  const str = `${dept}-${sem}`;
  const hash = str.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}
