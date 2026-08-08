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

export function getDeptColorObject(dept, sem, subject) {
  const HIGH_CONTRAST_PALETTES = [
    {
      bg: "bg-indigo-100/90 hover:bg-indigo-200/90",
      border: "border-l-4 border-indigo-600 border-t border-r border-b border-indigo-200",
      text: "text-indigo-950",
      subtext: "text-indigo-700",
      badge: "bg-indigo-700 text-white"
    },
    {
      bg: "bg-emerald-100/90 hover:bg-emerald-200/90",
      border: "border-l-4 border-emerald-600 border-t border-r border-b border-emerald-200",
      text: "text-emerald-950",
      subtext: "text-emerald-700",
      badge: "bg-emerald-700 text-white"
    },
    {
      bg: "bg-amber-100/90 hover:bg-amber-200/90",
      border: "border-l-4 border-amber-600 border-t border-r border-b border-amber-200",
      text: "text-amber-950",
      subtext: "text-amber-800",
      badge: "bg-amber-700 text-white"
    },
    {
      bg: "bg-rose-100/90 hover:bg-rose-200/90",
      border: "border-l-4 border-rose-600 border-t border-r border-b border-rose-200",
      text: "text-rose-950",
      subtext: "text-rose-700",
      badge: "bg-rose-700 text-white"
    },
    {
      bg: "bg-cyan-100/90 hover:bg-cyan-200/90",
      border: "border-l-4 border-cyan-600 border-t border-r border-b border-cyan-200",
      text: "text-cyan-950",
      subtext: "text-cyan-800",
      badge: "bg-cyan-700 text-white"
    },
    {
      bg: "bg-purple-100/90 hover:bg-purple-200/90",
      border: "border-l-4 border-purple-600 border-t border-r border-b border-purple-200",
      text: "text-purple-950",
      subtext: "text-purple-700",
      badge: "bg-purple-700 text-white"
    },
    {
      bg: "bg-orange-100/90 hover:bg-orange-200/90",
      border: "border-l-4 border-orange-600 border-t border-r border-b border-orange-200",
      text: "text-orange-950",
      subtext: "text-orange-800",
      badge: "bg-orange-700 text-white"
    },
    {
      bg: "bg-teal-100/90 hover:bg-teal-200/90",
      border: "border-l-4 border-teal-600 border-t border-r border-b border-teal-200",
      text: "text-teal-950",
      subtext: "text-teal-800",
      badge: "bg-teal-700 text-white"
    },
    {
      bg: "bg-blue-100/90 hover:bg-blue-200/90",
      border: "border-l-4 border-blue-600 border-t border-r border-b border-blue-200",
      text: "text-blue-950",
      subtext: "text-blue-700",
      badge: "bg-blue-700 text-white"
    },
    {
      bg: "bg-pink-100/90 hover:bg-pink-200/90",
      border: "border-l-4 border-pink-600 border-t border-r border-b border-pink-200",
      text: "text-pink-950",
      subtext: "text-pink-700",
      badge: "bg-pink-700 text-white"
    },
    {
      bg: "bg-lime-100/90 hover:bg-lime-200/90",
      border: "border-l-4 border-lime-600 border-t border-r border-b border-lime-200",
      text: "text-lime-950",
      subtext: "text-lime-800",
      badge: "bg-lime-700 text-white"
    },
    {
      bg: "bg-fuchsia-100/90 hover:bg-fuchsia-200/90",
      border: "border-l-4 border-fuchsia-600 border-t border-r border-b border-fuchsia-200",
      text: "text-fuchsia-950",
      subtext: "text-fuchsia-700",
      badge: "bg-fuchsia-700 text-white"
    },
    {
      bg: "bg-sky-100/90 hover:bg-sky-200/90",
      border: "border-l-4 border-sky-600 border-t border-r border-b border-sky-200",
      text: "text-sky-950",
      subtext: "text-sky-700",
      badge: "bg-sky-700 text-white"
    },
    {
      bg: "bg-red-100/90 hover:bg-red-200/90",
      border: "border-l-4 border-red-600 border-t border-r border-b border-red-200",
      text: "text-red-950",
      subtext: "text-red-700",
      badge: "bg-red-700 text-white"
    },
    {
      bg: "bg-violet-100/90 hover:bg-violet-200/90",
      border: "border-l-4 border-violet-600 border-t border-r border-b border-violet-200",
      text: "text-violet-950",
      subtext: "text-violet-700",
      badge: "bg-violet-700 text-white"
    },
    {
      bg: "bg-amber-200/80 hover:bg-amber-300/80",
      border: "border-l-4 border-amber-700 border-t border-r border-b border-amber-300",
      text: "text-amber-950",
      subtext: "text-amber-900",
      badge: "bg-amber-800 text-white"
    }
  ];

  if (!dept && !sem && !subject) {
    return HIGH_CONTRAST_PALETTES[0];
  }
  const subStr = Array.isArray(subject) ? subject.join("-") : (subject || "");
  const str = `${(dept || "").trim().toUpperCase()}_SEM${(sem || "").trim().toUpperCase()}_${subStr.trim().toUpperCase()}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % HIGH_CONTRAST_PALETTES.length;
  return HIGH_CONTRAST_PALETTES[idx];
}

export function getDeptColor(dept, sem, subject) {
  const palette = getDeptColorObject(dept, sem, subject);
  return `${palette.bg} ${palette.border} ${palette.text}`;
}

export function getStudentClassSecLabel(st) {
  if (!st) return "";
  let rawCls = (st.dept || st.className || st.class || "").toString().trim();
  let sec = (st.sem !== undefined && st.sem !== null ? st.sem : (st.section || st.sec || "")).toString().trim();
  
  // Clean "Class " prefix if present (e.g. "Class 3" -> "3", "Class 10" -> "10")
  let cleanCls = rawCls.replace(/^Class\s+/i, '').replace(/^Class/i, '').trim();

  if (cleanCls && sec) return `${cleanCls}-${sec}`;
  if (cleanCls) return cleanCls;
  if (sec) return `Sec ${sec}`;
  
  const sub = Array.isArray(st.subject) ? st.subject[0] : st.subject;
  if (sub) return String(sub).trim();
  
  return "STD";
}
