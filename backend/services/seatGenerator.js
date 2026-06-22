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
const neighborOffsets = [
  [-1, 0], // north
  [1, 0],  // south
  [0, -1], // west
  [0, 1]   // east
];

function shareAnySubject(st, nb) {
  if (!st || !nb) return false;
  const s1 = Array.isArray(st.subject) ? st.subject : (st.subject ? [st.subject] : []);
  const s2 = Array.isArray(nb.subject) ? nb.subject : (nb.subject ? [nb.subject] : []);
  if (s1.length === 0 || s2.length === 0) return false;
  return s1.some(sub => s2.includes(sub));
}

/**
 * Main generator
 * students: array of student docs { _id, roll, name, dept, sem }
 * rooms: array of room docs { _id, name, rows, cols }
 * shift: 1 or 2
 * seed: numeric seed
 *
 * Returns { allotments: [{student, room, row, col, seatCode}], notPlaced: [studentRoll...] }
 */
export function generateAllotments({ students = [], rooms = [], shift = 1, seed = 1, occupied = [], useDistancing = false, rowGrouping = 0, colGrouping = 0 }) {
  console.log(`[Algo Exec] students param count: ${students ? students.length : 'undefined'}`);
  const target = students;

  const shuffled = shuffleArray(target, seed);
  console.log(`[Algo Exec] shuffled count: ${shuffled ? shuffled.length : 'undefined'}`);
  const used = new Set();
  const result = [];

  for (const room of rooms) {
    const rows = Number(room.rows);
    const cols = Number(room.cols);
    const occupancy = {};

    // Pre-fill occupancy with existing allotments for this room
    const roomOccupied = occupied.filter(o => String(o.room) === String(room._id));
    for (const o of roomOccupied) {
      occupancy[`${o.row},${o.col}`] = o.student; // Expects student object with dept/sem
    }

    for (let r = 1; r <= rows; r++) {
      if (useDistancing && rowGrouping > 0) {
        if (((r - 1) % (rowGrouping + 1)) === rowGrouping) {
          // Skip gap row
          continue;
        }
      }
      for (let c = 1; c <= cols; c++) {
        if (useDistancing && colGrouping > 0) {
          if (((c - 1) % (colGrouping + 1)) === colGrouping) {
            // Skip gap column
            continue;
          }
        }
        let placed = false;
        for (let relax = 0; relax <= 2 && !placed; relax++) {
          for (let i = 0; i < shuffled.length; i++) {
            const st = shuffled[i];
            if (!st) continue;
            if (used.has(String(st._id))) continue;

            // collect neighbor students
            const neighbors = [];
            for (const [dr, dc] of neighborOffsets) {
              const key = `${r + dr},${c + dc}`;
              if (occupancy[key]) neighbors.push(occupancy[key]);
            }

            let ok = true;
            for (const nb of neighbors) {
              if (!nb) continue;
              if (relax === 0) {
                if (shareAnySubject(st, nb)) {
                  ok = false;
                  break;
                }
                const hasSubjects = (Array.isArray(st.subject) ? st.subject.length > 0 : !!st.subject) && 
                                    (Array.isArray(nb.subject) ? nb.subject.length > 0 : !!nb.subject);
                const shareSubject = hasSubjects ? shareAnySubject(st, nb) : true;
                if (shareSubject && (nb.dept === st.dept || String(nb.sem) === String(st.sem))) {
                  ok = false;
                  break;
                }
              } else if (relax === 1) {
                if (shareAnySubject(st, nb)) {
                  ok = false;
                  break;
                }
                const hasSubjects = (Array.isArray(st.subject) ? st.subject.length > 0 : !!st.subject) && 
                                    (Array.isArray(nb.subject) ? nb.subject.length > 0 : !!nb.subject);
                const shareSubject = hasSubjects ? shareAnySubject(st, nb) : true;
                if (shareSubject && nb.dept === st.dept) {
                  ok = false;
                  break;
                }
              } else {
                // relax === 2 allow all
              }
            }

            if (ok) {
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
      }
    }
  }

  const notPlaced = shuffled.filter(s => !used.has(String(s._id)));
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
