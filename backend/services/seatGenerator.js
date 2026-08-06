// services/seatGenerator.js
import crypto from "crypto";

/**
 * Seeded shuffle for reproducible runs
 */
function seededRng(seed) {
  const hash = crypto.createHash("sha256").update(String(seed)).digest();
  let idx = 0;
  return () => {
    const v = hash[idx % hash.length];
    idx++;
    return v / 255;
  };
}
export function shuffleArray(arr, seed = Date.now()) {
  const rnd = seededRng(seed);
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Convert numeric row/col to seat code like A1, B3, ... (supports >26 rows)
 */
export function seatCodeFrom(row, col) {
  let n = row;
  let s = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return `${s}${col}`;
}

/**
 * adjacency neighbors for (r,c)
 */
// 8-way King's move offsets (North, South, West, East, NW, NE, SW, SE)
const kingOffsets = [
  [-1, -1], [-1, 0], [-1, 1],
  [ 0, -1],          [ 0, 1],
  [ 1, -1], [ 1, 0], [ 1, 1]
];

// 4-way orthogonal offsets (North, South, West, East)
const orthogonalOffsets = [
  [-1, 0], [1, 0], [0, -1], [0, 1]
];

// 2-way horizontal offsets (West, East)
const horizontalOffsets = [
  [0, -1], [0, 1]
];

/**
 * Generate temporary group code for class & subject (e.g. ENG03 for Class 3 English, HIN03 for Class 3 Hindi)
 */
export function getGroupCode(st) {
  if (!st) return "";
  const sub = (Array.isArray(st.subject) ? st.subject[0] : st.subject) || "";
  const subPrefix = sub ? sub.trim().substring(0, 3).toUpperCase() : "SUB";
  const semStr = (st.sem !== undefined && st.sem !== null && String(st.sem).trim() !== "") 
    ? String(st.sem).trim().padStart(2, '0') 
    : (st.dept || "").trim().toUpperCase();
  return `${subPrefix}${semStr}`;
}

function shareAnySubject(st, nb) {
  if (!st || !nb) return false;
  const s1 = Array.isArray(st.subject) ? st.subject : (st.subject ? [st.subject] : []);
  const s2 = Array.isArray(nb.subject) ? nb.subject : (nb.subject ? [nb.subject] : []);
  if (s1.length === 0 || s2.length === 0) return false;
  return s1.some(sub => s2.includes(sub));
}

function shareClassOrSubject(st, nb) {
  if (!st || !nb) return false;
  const code1 = getGroupCode(st);
  const code2 = getGroupCode(nb);
  if (code1 && code2 && code1 === code2) return true;
  if (shareAnySubject(st, nb)) return true;
  if (st.dept && nb.dept && st.dept === nb.dept) {
    if (String(st.sem) === String(nb.sem)) return true;
  }
  return false;
}

/**
 * Main generator
 * students: array of student docs { _id, roll, name, dept, sem, subject }
 * rooms: array of room docs { _id, name, rows, cols }
 * shift: 1 or 2
 * seed: numeric seed
 * arrangementMode: "loose" | "strict"
 * patternMode: "scrambled" | "linear"
 *
 * Returns { allotments: [{student, room, row, col, seatCode}], notPlaced: [student...] }
 */
export function generateAllotments({ 
  students = [], 
  rooms = [], 
  shift = 1, 
  seed = 1, 
  occupied = [], 
  useDistancing = false, 
  rowGrouping = 0, 
  colGrouping = 0,
  arrangementMode = "loose",
  patternMode = "scrambled"
}) {
  console.log(`[Algo Exec] students count: ${students ? students.length : 0}, arrangementMode: ${arrangementMode}, patternMode: ${patternMode}`);
  
  // Step 1: Pre-assign temporary group code to all students (e.g. ENG03 for Class 3 English)
  const target = (students || []).map(s => ({
    ...s,
    groupCode: getGroupCode(s)
  }));

  const used = new Set();
  const result = [];
  const isStrict = arrangementMode === "strict";

  if (patternMode === "linear") {
    // LINEAR COLUMN-BY-COLUMN PATTERN
    // Group students by temporary Group Code (e.g. ENG03, HIN03, CS05)
    const classGroups = {};
    for (const st of target) {
      const key = st.groupCode || "DEFAULT";
      if (!classGroups[key]) classGroups[key] = [];
      classGroups[key].push(st);
    }

    // Shuffle individual class groups for randomness within group
    for (const k of Object.keys(classGroups)) {
      classGroups[k] = shuffleArray(classGroups[k], seed);
    }

    for (const room of rooms) {
      const rows = Number(room.rows);
      const cols = Number(room.cols);
      const occupancy = {};

      // Pre-fill occupancy with existing allotments for this room
      const roomOccupied = occupied.filter(o => String(o.room) === String(room._id));
      for (const o of roomOccupied) {
        occupancy[`${o.row},${o.col}`] = o.student;
      }

      let lastColGroupKey = null;

      for (let c = 1; c <= cols; c++) {
        if (useDistancing && colGrouping > 0) {
          if (((c - 1) % (colGrouping + 1)) === colGrouping) continue;
        }

        // Available class group keys with remaining unplaced students
        let availableKeys = Object.keys(classGroups).filter(k => 
          classGroups[k].some(s => !used.has(String(s._id)))
        );

        if (availableKeys.length === 0) break; // All students placed

        // Prefer group key different from previous column
        let preferredKeys = availableKeys.filter(k => k !== lastColGroupKey);
        let selectedKey = preferredKeys.length > 0 ? preferredKeys[0] : availableKeys[0];

        if (isStrict && selectedKey === lastColGroupKey && availableKeys.length > 1) {
          selectedKey = availableKeys.find(k => k !== lastColGroupKey) || null;
        }

        if (!selectedKey && isStrict) {
          // Strict mode: if no distinct class group available for adjacent column, skip column to leave space
          continue;
        }

        if (selectedKey) {
          lastColGroupKey = selectedKey;
        }

        for (let r = 1; r <= rows; r++) {
          if (useDistancing && rowGrouping > 0) {
            if (((r - 1) % (rowGrouping + 1)) === rowGrouping) continue;
          }

          if (occupancy[`${r},${c}`]) continue;

          let candidate = null;

          // Try selected class group for column
          if (selectedKey && classGroups[selectedKey]) {
            candidate = classGroups[selectedKey].find(s => !used.has(String(s._id)));
          }

          // Loose mode fallback if current group runs out
          if (!candidate && !isStrict) {
            const anyGroupKey = Object.keys(classGroups).find(k => 
              classGroups[k].some(s => !used.has(String(s._id)))
            );
            if (anyGroupKey) {
              candidate = classGroups[anyGroupKey].find(s => !used.has(String(s._id)));
              if (candidate) lastColGroupKey = anyGroupKey;
            }
          }

          if (!candidate) continue;

          // Check Left & Right horizontal neighbors for same group code
          const horizNeighbors = [];
          for (const [dr, dc] of [[0, -1], [0, 1]]) { // Left & Right ONLY (front/back is ok!)
            const key = `${r + dr},${c + dc}`;
            if (occupancy[key]) horizNeighbors.push(occupancy[key]);
          }

          let conflict = false;
          for (const nb of horizNeighbors) {
            if (candidate.groupCode && nb.groupCode && candidate.groupCode === nb.groupCode) {
              conflict = true; // Same group code on Left or Right!
              break;
            }
          }

          if (conflict && isStrict) {
            // Strict mode: leave seat empty if candidate conflicts with Left/Right neighbor
            continue;
          }

          occupancy[`${r},${c}`] = candidate;
          used.add(String(candidate._id));
          const code = seatCodeFrom(r, c);
          result.push({
            student: candidate,
            room,
            row: r,
            col: c,
            seatCode: code,
            shift
          });
        }
      }
    }

  } else {
    // SCRAMBLED PATTERN
    const shuffled = shuffleArray(target, seed);

    for (const room of rooms) {
      const rows = Number(room.rows);
      const cols = Number(room.cols);
      const occupancy = {};

      // Pre-fill occupancy
      const roomOccupied = occupied.filter(o => String(o.room) === String(room._id));
      for (const o of roomOccupied) {
        occupancy[`${o.row},${o.col}`] = o.student;
      }

      for (let r = 1; r <= rows; r++) {
        if (useDistancing && rowGrouping > 0) {
          if (((r - 1) % (rowGrouping + 1)) === rowGrouping) continue;
        }
        for (let c = 1; c <= cols; c++) {
          if (useDistancing && colGrouping > 0) {
            if (((c - 1) % (colGrouping + 1)) === colGrouping) continue;
          }
          if (occupancy[`${r},${c}`]) continue;

          let placed = false;

          // In Strict Mode:
          // - Ahead (-1, 0) and Behind (+1, 0) allow ANY student
          // - Left (0, -1) and Right (0, +1) MUST BE NON-IDENTICAL (different class/dept/sem/subject)
          // In Loose Mode:
          // - Try non-identical Left & Right first (level 0), then 4-way (level 1), then fallback (level 2)
          const maxRelax = isStrict ? 0 : 2;

          for (let relax = 0; relax <= maxRelax && !placed; relax++) {
            // Horizontal offsets (Left & Right) where non-identical check is strictly required
            const checkOffsets = (relax === 0 || isStrict) 
              ? horizontalOffsets 
              : (relax === 1 ? orthogonalOffsets : []);

            for (let i = 0; i < shuffled.length; i++) {
              const st = shuffled[i];
              if (!st || used.has(String(st._id))) continue;

              let hasConflict = false;

              if (checkOffsets.length > 0) {
                for (const [dr, dc] of checkOffsets) {
                  const key = `${r + dr},${c + dc}`;
                  const nb = occupancy[key];
                  if (nb && shareClassOrSubject(st, nb)) {
                    hasConflict = true; // Same class/subject student on Left or Right!
                    break;
                  }
                }
              }

              if (!hasConflict) {
                occupancy[`${r},${c}`] = st;
                used.add(String(st._id));
                const code = seatCodeFrom(r, c);
                result.push({
                  student: st,
                  room,
                  row: r,
                  col: c,
                  seatCode: code,
                  shift
                });
                placed = true;
                break;
              }
            }
          }
          // In strict mode (isStrict = true), if Left or Right contains identical student and no non-identical student is available, seat (r,c) is left empty!
        }
      }
    }
  }

  const notPlaced = target.filter(s => !used.has(String(s._id)));
  return { allotments: result, notPlaced };
}

// export function generateAllotments({ students = [], rooms = [], shift = 1, seed = 1 }) {
//   // Filter students for given shift (odd sem -> shift 1; even -> shift 2)
//   const target = students.filter(s => {
//     const sem = Number(s.sem);
//     const sshift = (sem % 2 === 1) ? 1 : 2;
//     return sshift === shift;
//   });

//   const shuffled = shuffleArray(target, seed);

//   const used = new Set();
//   const result = [];

//   // Helper to check neighbors for current occupancy map
//   for (const room of rooms) {
//     const rows = Number(room.rows);
//     const cols = Number(room.cols);
//     const occupancy = {}; // key "r,c" => student object

//     // iterate each seat in scanline order
//     for (let r = 1; r <= rows; r++) {
//       for (let c = 1; c <= cols; c++) {
//         let placed = false;
//         // try relax levels: 0 (strict: no same dept AND no same sem adjacent)
//         // 1 -> allow same sem adjacency (but not dept)
//         // 2 -> allow same dept adjacency (i.e., relax both)
//         for (let relax = 0; relax <= 2 && !placed; relax++) {
//           // look for candidate from shuffled array not used
//           for (let i = 0; i < shuffled.length; i++) {
//             const st = shuffled[i];
//             if (!st) continue;
//             if (used.has(String(st._id))) continue;
//             // check neighbors
//             let neighbors = [];
//             for (const [dr, dc] of neighborOffsets) {
//               const key = `${r + dr},${c + dc}`;
//               if (occupancy[key]) neighbors.push(occupancy[key]);
//             }
//             let ok = true;
//             for (const nb of neighbors) {
//               if (!nb) continue;
//               if (relax === 0) {
//                 // strict: neither same dept nor same sem allowed
//                 if (nb.dept === st.dept || Number(nb.sem) === Number(st.sem)) { ok = false; break; }
//               } else if (relax === 1) {
//                 // allow same sem, but not same dept
//                 if (nb.dept === st.dept) { ok = false; break; }
//               } else {
//                 // relax==2 : allow both (always ok)
//               }
//             }
//             if (ok) {
//               // place student at r,c
//               occupancy[`${r},${c}`] = st;
//               used.add(String(st._id));
//               const code = seatCodeFrom(r, c);
//               result.push({
//                 student: st,
//                 room,
//                 row: r,
//                 col: c,
//                 seatCode,
//                 seatCode: code,
//                 shift
//               });
//               placed = true;
//               break;
//             }
//           } // end candidates loop
//         } // end relax loop
//       } // end cols
//     } // end rows
//   } // end rooms loop

//   const notPlaced = shuffled.filter(s => !used.has(String(s._id))).map(s => s.roll);
//   return { allotments: result, notPlaced };
// }
