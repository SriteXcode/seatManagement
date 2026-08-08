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
export function generateAllotments(params, onProgress) {
  let attemptsUsed = 1;
  const totalRoomsCount = (params.rooms || []).length;
  const startTime = Date.now();

  const reportProgress = (roomIdx, roomName, attempt) => {
    if (typeof onProgress === "function") {
      const elapsedSec = (Date.now() - startTime) / 1000;
      const doneRooms = (attempt - 1) * totalRoomsCount + roomIdx;
      const estTotalRooms = (attempt > 1 ? Math.min(5, attempt + 2) : 1) * totalRoomsCount;
      const avgTimePerRoom = doneRooms > 0 ? elapsedSec / doneRooms : 0.15;
      const remainingRooms = Math.max(0, estTotalRooms - doneRooms);
      const estSeconds = Math.max(1, Math.ceil(remainingRooms * avgTimePerRoom));

      onProgress({
        roomX: roomIdx,
        roomTotal: totalRoomsCount,
        roomName: roomName || `Room ${roomIdx}`,
        attemptX: attempt,
        attemptTotal: 10,
        estimatedTimeSec: estSeconds
      });
    }
  };

  let bestResult = executeSinglePass(params, (rIdx, rName) => reportProgress(rIdx, rName, 1));

  // If initial pass resulted in unplaced students going to bucket, attempt multi-pass re-allotment retries!
  if (bestResult.notPlaced.length > 0) {
    console.log(`[Multi-Pass Retry] Initial pass resulted in ${bestResult.notPlaced.length} bucket student(s). Starting multi-attempt re-allotment...`);

    const maxAttempts = 10;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      attemptsUsed = attempt + 1;
      const retrySeed = (Number(params.seed) || 1) + attempt * 1009;
      const attemptResult = executeSinglePass(
        { ...params, seed: retrySeed },
        (rIdx, rName) => reportProgress(rIdx, rName, attempt + 1)
      );

      if (attemptResult.notPlaced.length < bestResult.notPlaced.length) {
        console.log(`[Multi-Pass Retry] Attempt ${attempt} improved layout! Bucket students reduced from ${bestResult.notPlaced.length} -> ${attemptResult.notPlaced.length}`);
        bestResult = attemptResult;
      }

      if (bestResult.notPlaced.length === 0) {
        console.log(`[Multi-Pass Retry] Attempt ${attempt} achieved PERFECT zero-bucket allotment!`);
        break;
      }
    }
  }

  return {
    ...bestResult,
    attemptsUsed,
    retriesCount: attemptsUsed > 1 ? attemptsUsed - 1 : 0
  };
}

function executeSinglePass({ 
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
}, onRoomProgress) {
  console.log(`[Algo Exec Single Pass] students count: ${students ? students.length : 0}, arrangementMode: ${arrangementMode}, patternMode: ${patternMode}`);
  
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

    for (let rIdx = 0; rIdx < rooms.length; rIdx++) {
      const room = rooms[rIdx];
      if (typeof onRoomProgress === "function") {
        onRoomProgress(rIdx + 1, room.name);
      }
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

          // Fallback if current column group runs out of students
          if (!candidate) {
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
    // SCRAMBLED PATTERN - REVISED FROM SCRATCH WITH MAX-FREQUENCY CLASS INTERLEAVING
    // Group target students by their class/subject group code
    const groupBuckets = {};
    for (const st of target) {
      const gCode = st.groupCode || "DEFAULT";
      if (!groupBuckets[gCode]) groupBuckets[gCode] = [];
      groupBuckets[gCode].push(st);
    }

    // Shuffle inside each class group for randomness
    for (const key of Object.keys(groupBuckets)) {
      groupBuckets[key] = shuffleArray(groupBuckets[key], seed);
    }

    for (let rIdx = 0; rIdx < rooms.length; rIdx++) {
      const room = rooms[rIdx];
      if (typeof onRoomProgress === "function") {
        onRoomProgress(rIdx + 1, room.name);
      }
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

          // Check Left & Right horizontal neighbors ONLY for same class conflict
          const checkOffsets = [[0, -1], [0, 1]];
          const horizNeighbors = [];
          for (const [dr, dc] of checkOffsets) {
            const key = `${r + dr},${c + dc}`;
            if (occupancy[key]) horizNeighbors.push(occupancy[key]);
          }

          // Find valid class group keys that do not conflict with Left or Right neighbor
          const validKeys = Object.keys(groupBuckets).filter(gKey => {
            const remaining = groupBuckets[gKey].filter(s => !used.has(String(s._id)));
            if (remaining.length === 0) return false;

            const candidate = remaining[0];
            for (const nb of horizNeighbors) {
              if (shareClassOrSubject(candidate, nb)) return false;
            }
            return true;
          });

          let candidateToPlace = null;

          if (validKeys.length > 0) {
            // Sort valid keys by remaining unplaced student count (descending)
            // Pick from the class group with the LARGEST remaining count to prevent bottlenecks!
            validKeys.sort((a, b) => {
              const countA = groupBuckets[a].filter(s => !used.has(String(s._id))).length;
              const countB = groupBuckets[b].filter(s => !used.has(String(s._id))).length;
              return countB - countA;
            });

            const bestKey = validKeys[0];
            candidateToPlace = groupBuckets[bestKey].find(s => !used.has(String(s._id)));
          } else if (!isStrict) {
            // In Loose Mode, fallback: pick from largest remaining class group overall
            const allAvailableKeys = Object.keys(groupBuckets).filter(gKey => 
              groupBuckets[gKey].some(s => !used.has(String(s._id)))
            );
            if (allAvailableKeys.length > 0) {
              allAvailableKeys.sort((a, b) => {
                const countA = groupBuckets[a].filter(s => !used.has(String(s._id))).length;
                const countB = groupBuckets[b].filter(s => !used.has(String(s._id))).length;
                return countB - countA;
              });
              const fallbackKey = allAvailableKeys[0];
              candidateToPlace = groupBuckets[fallbackKey].find(s => !used.has(String(s._id)));
            }
          }

          if (candidateToPlace) {
            occupancy[`${r},${c}`] = candidateToPlace;
            used.add(String(candidateToPlace._id));
            const code = seatCodeFrom(r, c);
            result.push({
              student: candidateToPlace,
              room,
              row: r,
              col: c,
              seatCode: code,
              shift
            });
          }
        }
      }
    }
  }

  let notPlaced = target.filter(s => !used.has(String(s._id)));

  // If any unplaced students remain and there are empty seats, run Recursive Backtracking!
  if (notPlaced.length > 0 && rooms.length > 0) {
    backtrackPlacement({
      unplacedStudents: notPlaced,
      rooms,
      usedSet: used,
      resultList: result,
      shift,
      useDistancing,
      rowGrouping,
      colGrouping,
      isStrict
    });

    // Re-evaluate unplaced students after recursive backtracking
    notPlaced = target.filter(s => !used.has(String(s._id)));
  }

  return { allotments: result, notPlaced };
}

/**
 * Recursive Backtracking Engine
 * If unplaced students exist and empty seats are available, uses Depth-First Search with backtracking
 * to find valid placements and 1-step seat swaps.
 */
function backtrackPlacement({
  unplacedStudents,
  rooms,
  usedSet,
  resultList,
  shift,
  useDistancing,
  rowGrouping,
  colGrouping,
  isStrict = false
}) {
  console.log(`[Backtracking Engine] Running recursive backtracking for ${unplacedStudents.length} unplaced student(s)...`);

  // Build room occupancy maps from resultList
  const roomOccupancy = {};
  for (const item of resultList) {
    const rId = String(item.room._id || item.room);
    if (!roomOccupancy[rId]) roomOccupancy[rId] = {};
    roomOccupancy[rId][`${item.row},${item.col}`] = item.student;
  }

  // Gather all empty valid seats across rooms
  const emptySeats = [];
  for (const room of rooms) {
    const rows = Number(room.rows);
    const cols = Number(room.cols);
    const rId = String(room._id);
    if (!roomOccupancy[rId]) roomOccupancy[rId] = {};
    const occ = roomOccupancy[rId];

    for (let r = 1; r <= rows; r++) {
      if (useDistancing && rowGrouping > 0) {
        if (((r - 1) % (rowGrouping + 1)) === rowGrouping) continue;
      }
      for (let c = 1; c <= cols; c++) {
        if (useDistancing && colGrouping > 0) {
          if (((c - 1) % (colGrouping + 1)) === colGrouping) continue;
        }

        if (!occ[`${r},${c}`]) {
          emptySeats.push({
            room,
            row: r,
            col: c,
            seatKey: `${r},${c}`
          });
        }
      }
    }
  }

  if (emptySeats.length === 0) {
    console.log(`[Backtracking Engine] No empty seats available for backtracking.`);
    return;
  }

  const remaining = [...unplacedStudents];
  const newlyPlaced = [];

  function isValidPlacement(st, room, r, c) {
    const rId = String(room._id || room);
    const occ = roomOccupancy[rId] || {};

    // Check Left (0, -1) and Right (0, 1) neighbors for same class conflict
    for (const [dr, dc] of [[0, -1], [0, 1]]) {
      const nbKey = `${r + dr},${c + dc}`;
      const nb = occ[nbKey];
      if (nb && shareClassOrSubject(st, nb)) {
        return false;
      }
    }
    return true;
  }

  let statesExplored = 0;
  const maxStates = 15000;

  function solve(index) {
    if (index >= remaining.length) return true; // All remaining unplaced students successfully placed!
    if (statesExplored++ > maxStates) return false;

    const st = remaining[index];

    // Level 1: Direct empty seat placement
    for (let sIdx = 0; sIdx < emptySeats.length; sIdx++) {
      const seat = emptySeats[sIdx];
      if (seat.occupiedBy) continue;

      if (isValidPlacement(st, seat.room, seat.row, seat.col)) {
        // CHOICE
        seat.occupiedBy = st;
        const rId = String(seat.room._id || seat.room);
        const occ = roomOccupancy[rId];
        occ[seat.seatKey] = st;
        newlyPlaced.push({
          student: st,
          room: seat.room,
          row: seat.row,
          col: seat.col,
          seatCode: seatCodeFrom(seat.row, seat.col),
          shift
        });

        // RECURSE
        if (solve(index + 1)) return true;

        // BACKTRACK
        newlyPlaced.pop();
        delete occ[seat.seatKey];
        seat.occupiedBy = null;
      }
    }

    // Level 2: 1-step seat swap with an existing occupant to free up a valid position
    for (let sIdx = 0; sIdx < emptySeats.length; sIdx++) {
      const seat = emptySeats[sIdx];
      if (seat.occupiedBy) continue;

      const rId = String(seat.room._id || seat.room);
      const occ = roomOccupancy[rId] || {};
      const keys = Object.keys(occ);

      for (const key of keys) {
        const existingSt = occ[key];
        if (!existingSt) continue;
        const [exR, exC] = key.split(',').map(Number);

        delete occ[key];
        if (isValidPlacement(st, seat.room, exR, exC)) {
          if (isValidPlacement(existingSt, seat.room, seat.row, seat.col)) {
            // CHOICE: Swap
            occ[key] = st;
            occ[seat.seatKey] = existingSt;
            seat.occupiedBy = existingSt;
            newlyPlaced.push({
              student: st,
              room: seat.room,
              row: exR,
              col: exC,
              seatCode: seatCodeFrom(exR, exC),
              shift
            });

            if (solve(index + 1)) return true;

            // BACKTRACK
            newlyPlaced.pop();
            delete occ[seat.seatKey];
            occ[key] = existingSt;
            seat.occupiedBy = null;
          }
        }
        occ[key] = existingSt;
      }
    }

    return false;
  }

  solve(0);

  // Loose Mode Fallback: If in Loose mode and some unplaced students still remain while empty seats exist,
  // place them into empty seats so that 0 students go to the bucket!
  if (!isStrict) {
    const unplacedAfterSolve = remaining.filter(st => !newlyPlaced.some(p => String(p.student._id) === String(st._id)));

    for (const st of unplacedAfterSolve) {
      const openSeat = emptySeats.find(seat => !seat.occupiedBy);
      if (!openSeat) break; // All available room capacity is filled!

      openSeat.occupiedBy = st;
      const rId = String(openSeat.room._id || openSeat.room);
      const occ = roomOccupancy[rId] || (roomOccupancy[rId] = {});
      occ[openSeat.seatKey] = st;

      newlyPlaced.push({
        student: st,
        room: openSeat.room,
        row: openSeat.row,
        col: openSeat.col,
        seatCode: seatCodeFrom(openSeat.row, openSeat.col),
        shift
      });
    }
  }

  // Reconstruct resultList and update usedSet directly from updated roomOccupancy
  resultList.length = 0;
  usedSet.clear();

  let placedCount = 0;
  for (const rId of Object.keys(roomOccupancy)) {
    const roomObj = rooms.find(r => String(r._id) === String(rId));
    if (!roomObj) continue;

    const occ = roomOccupancy[rId];
    for (const seatKey of Object.keys(occ)) {
      const studentObj = occ[seatKey];
      if (!studentObj) continue;

      const [r, c] = seatKey.split(',').map(Number);
      resultList.push({
        student: studentObj,
        room: roomObj,
        row: r,
        col: c,
        seatCode: seatCodeFrom(r, c),
        shift
      });
      usedSet.add(String(studentObj._id));
      placedCount++;
    }
  }

  console.log(`[Backtracking Engine] Finished! Total placed allotments across rooms: ${placedCount}`);
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
