import AiFeedback from "../models/AiFeedback.js";

/**
 * Calculate space efficiency and optimal seating strategy
 */
export async function getAiSeatingSuggestions({
  students = [],
  rooms = [],
  deptSemCombinations = [],
  examType = "College",
  useDistancing = false,
  rowGrouping = 0,
  colGrouping = 0,
  orgCode
}) {
  // 1. Fetch active globally learned rules for this organization
  const learnedRules = await AiFeedback.find({ orgCode, isActive: true }).sort({ createdAt: -1 }).lean();

  const totalStudents = students.length;
  
  // Calculate total capacities of available rooms
  const roomBreakdown = rooms.map(r => {
    const totalSeats = Number(r.rows) * Number(r.cols);
    return {
      id: r._id,
      name: r.name,
      rows: r.rows,
      cols: r.cols,
      capacity: totalSeats
    };
  });

  // Sort rooms by capacity descending
  roomBreakdown.sort((a, b) => b.capacity - a.capacity);

  const totalCapacity = roomBreakdown.reduce((sum, r) => sum + r.capacity, 0);

  // 2. Select optimal room set to minimize waste
  let neededCapacity = 0;
  const optimalRoomIds = [];
  let allocatedCapacity = 0;

  for (const room of roomBreakdown) {
    if (allocatedCapacity < totalStudents) {
      optimalRoomIds.push(String(room.id));
      allocatedCapacity += room.capacity;
    }
  }

  // If no room selected (e.g. 0 students), default to all rooms
  if (optimalRoomIds.length === 0) {
    rooms.forEach(r => optimalRoomIds.push(String(r._id)));
    allocatedCapacity = totalCapacity;
  }

  const spaceEfficiencyScore = totalCapacity > 0 
    ? Math.min(100, Math.round((totalStudents / (allocatedCapacity || 1)) * 100))
    : 0;

  const roomUtilizationRatio = totalCapacity > 0 ? (totalStudents / totalCapacity) : 0;

  // 3. Determine recommended parameters considering Learned Rules + Space Density
  let recommendedArrangementMode = "loose";
  let recommendedPatternMode = "scrambled";
  let recommendedRowGrouping = rowGrouping;
  let recommendedColGrouping = colGrouping;
  let recommendedUseDistancing = useDistancing;

  // Apply learned rules override if present
  let appliedRulesSummary = [];
  for (const rule of learnedRules) {
    if (rule.ruleKey === "pattern_preference" && rule.ruleValue?.patternMode) {
      recommendedPatternMode = rule.ruleValue.patternMode;
      appliedRulesSummary.push(`Applied Learned Rule: Preferred distribution pattern is '${recommendedPatternMode}' (${rule.description || 'Global Rule'}).`);
    }
    if (rule.ruleKey === "density_preference" && rule.ruleValue?.arrangementMode) {
      recommendedArrangementMode = rule.ruleValue.arrangementMode;
      appliedRulesSummary.push(`Applied Learned Rule: Preferred arrangement density is '${recommendedArrangementMode}'.`);
    }
    if (rule.ruleKey === "distancing_preference" && rule.ruleValue) {
      if (rule.ruleValue.rowGrouping !== undefined) recommendedRowGrouping = Number(rule.ruleValue.rowGrouping);
      if (rule.ruleValue.colGrouping !== undefined) recommendedColGrouping = Number(rule.ruleValue.colGrouping);
      appliedRulesSummary.push(`Applied Learned Rule: Configured gap spacing (${recommendedRowGrouping}x${recommendedColGrouping}).`);
    }
  }

  // Space-wise heuristic recommendations if not strictly set by rules
  if (appliedRulesSummary.length === 0) {
    if (roomUtilizationRatio > 0.85) {
      // High density - use loose arrangement to avoid unplaced students
      recommendedArrangementMode = "loose";
      recommendedPatternMode = "linear"; // Linear maximizes capacity while maintaining class interleaving
    } else if (roomUtilizationRatio < 0.50 && totalStudents > 0) {
      // Low density - suggest strict arrangement to give students max distance
      recommendedArrangementMode = "strict";
      recommendedPatternMode = "scrambled";
    } else {
      // Medium density
      recommendedArrangementMode = "loose";
      recommendedPatternMode = "scrambled";
    }
  }

  // 4. Try Gemini API if GEMINI_API_KEY is available in process.env
  const apiKey = process.env.GEMINI_API_KEY;
  let aiReasoningText = "";
  let isAiGenerated = false;

  if (apiKey) {
    try {
      const prompt = `You are an expert AI seating optimization advisor for exam seating management.
Given:
- Total Students: ${totalStudents} across ${deptSemCombinations.length} dept/sem combinations.
- Total Available Rooms: ${rooms.length} with combined capacity of ${totalCapacity} seats.
- Optimal Room Allocation needed: ${optimalRoomIds.length} rooms (capacity ${allocatedCapacity}).
- Space Efficiency Index: ${spaceEfficiencyScore}%.
- Active Learned Preferences: ${JSON.stringify(learnedRules.map(r => r.description))}

Provide a short, professional, 3-bullet-point executive summary advising how to best arrange seats and use room space wisely. Keep response concise, friendly, and actionable.`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      if (response.ok) {
        const json = await response.json();
        const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          aiReasoningText = text;
          isAiGenerated = true;
        }
      }
    } catch (err) {
      console.warn("[AI Seat Advisor] Gemini API call failed, falling back to smart heuristic:", err.message);
    }
  }

  if (!aiReasoningText) {
    // Generate intelligent heuristic summary
    const wasteSeats = Math.max(0, allocatedCapacity - totalStudents);
    aiReasoningText = `• Space Allocation Strategy: Selected ${optimalRoomIds.length} out of ${rooms.length} rooms for optimal space efficiency (${spaceEfficiencyScore}% space usage, leaving ${wasteSeats} empty seats).\n` +
      `• Seating Pattern: Recommended '${recommendedPatternMode.toUpperCase()}' mode with '${recommendedArrangementMode.toUpperCase()}' density to ensure proper subject isolation between adjacent seats.\n` +
      `• Global Learning Status: ${learnedRules.length > 0 ? `${learnedRules.length} global preference rule(s) active and incorporated into layout.` : "System is ready to learn from your feedback after this generation."}`;
  }

  return {
    success: true,
    spaceMetrics: {
      totalStudents,
      totalAvailableSeats: totalCapacity,
      allocatedSeats: allocatedCapacity,
      spaceEfficiencyScore, // 0 - 100
      selectedRoomCount: optimalRoomIds.length,
      totalRoomCount: rooms.length,
      wastedSeatCount: Math.max(0, allocatedCapacity - totalStudents),
    },
    recommendations: {
      arrangementMode: recommendedArrangementMode,
      patternMode: recommendedPatternMode,
      selectedRoomIds: optimalRoomIds,
      useDistancing: recommendedUseDistancing,
      rowGrouping: recommendedRowGrouping,
      colGrouping: recommendedColGrouping
    },
    aiReasoning: aiReasoningText,
    isAiGenerated,
    learnedRulesApplied: appliedRulesSummary,
    learnedRulesCount: learnedRules.length
  };
}

/**
 * Record user feedback and extract reusable global preference rules
 */
export async function recordAiFeedback({ orgCode, rating, comment, ruleType, customRule }) {
  let ruleKey = "general_preference";
  let ruleValue = {};
  let description = comment || "User feedback on seating arrangement";

  if (customRule) {
    ruleKey = customRule.key || "custom_preference";
    ruleValue = customRule.value || {};
    description = customRule.description || comment;
  } else if (comment) {
    const lower = comment.toLowerCase();
    if (lower.includes("linear") || lower.includes("column")) {
      ruleKey = "pattern_preference";
      ruleValue = { patternMode: "linear" };
      description = "User prefers Linear (Column-by-Column) seating pattern globally.";
    } else if (lower.includes("scramble") || lower.includes("king") || lower.includes("chess")) {
      ruleKey = "pattern_preference";
      ruleValue = { patternMode: "scrambled" };
      description = "User prefers Scrambled (King's Move) seating pattern globally.";
    } else if (lower.includes("strict") || lower.includes("empty seat") || lower.includes("gap")) {
      ruleKey = "density_preference";
      ruleValue = { arrangementMode: "strict" };
      description = "User prefers Strict Arrangement with empty seat gaps globally.";
    } else if (lower.includes("loose") || lower.includes("full capacity") || lower.includes("pack")) {
      ruleKey = "density_preference";
      ruleValue = { arrangementMode: "loose" };
      description = "User prefers Loose (Full Capacity) arrangement globally.";
    }
  }

  // Deactivate existing rules of same ruleKey to update with latest preference
  if (ruleKey !== "general_preference") {
    await AiFeedback.updateMany(
      { orgCode, ruleKey, isActive: true },
      { $set: { isActive: false } }
    );
  }

  const feedbackDoc = await AiFeedback.create({
    orgCode,
    type: ruleType || (rating ? "rating" : "rule"),
    ruleKey,
    ruleValue,
    description,
    rating: rating ? Number(rating) : undefined,
    comment,
    isActive: true
  });

  return feedbackDoc;
}

/**
 * Learn from manual seat swaps and updates
 */
export async function learnFromManualAdjustments({ orgCode, allotments }) {
  if (!allotments || allotments.length === 0) return;

  // Calculate stats on manual edits (e.g. how many rooms were used, manual placements)
  const roomIds = new Set();
  allotments.forEach(a => {
    if (a.room) roomIds.add(String(a.room._id || a.room));
  });

  const description = `Learned from manual seating adjustment: User customized layout across ${roomIds.size} rooms (${allotments.length} seats).`;

  await AiFeedback.create({
    orgCode,
    type: "manual_adjustment",
    ruleKey: "manual_layout_pattern",
    ruleValue: { roomCount: roomIds.size, totalSeats: allotments.length },
    description,
    isActive: true
  });
}

/**
 * Compare generated layout against user reorganized layout and extract global preference rules
 */
export async function compareAndLearnLayouts({ orgCode, originalAllotments = [], reorganizedAllotments = [] }) {
  const origMap = {};
  originalAllotments.forEach(a => {
    const sId = String(a.student?._id || a.student || "");
    if (sId) {
      origMap[sId] = {
        roomId: String(a.room?._id || a.room || ""),
        roomName: a.room?.name || "",
        row: a.row,
        col: a.col,
        seatCode: a.seatCode,
        dept: a.student?.dept || "",
        sem: a.student?.sem || "",
        subject: a.subject || ""
      };
    }
  });

  let movedCount = 0;
  let roomSwaps = 0;
  let seatSwaps = 0;
  let unplacedToPlaced = 0;

  const reorganizedRoomDepts = {};

  reorganizedAllotments.forEach(a => {
    const sId = String(a.student?._id || a.student || "");
    const newRoomId = String(a.room?._id || a.room || "");
    const newRoomName = a.room?.name || "";
    const orig = origMap[sId];

    const studentDept = a.student?.dept || (orig ? orig.dept : "");
    if (newRoomId && studentDept) {
      if (!reorganizedRoomDepts[newRoomName || newRoomId]) {
        reorganizedRoomDepts[newRoomName || newRoomId] = {};
      }
      reorganizedRoomDepts[newRoomName || newRoomId][studentDept] = (reorganizedRoomDepts[newRoomName || newRoomId][studentDept] || 0) + 1;
    }

    if (!orig) {
      movedCount++;
    } else {
      if (orig.roomId !== newRoomId || orig.row !== a.row || orig.col !== a.col) {
        movedCount++;
        if (!orig.roomId && newRoomId) unplacedToPlaced++;
        else if (orig.roomId && orig.roomId !== newRoomId) roomSwaps++;
        else seatSwaps++;
      }
    }
  });

  // Extract department clustering insights
  const clusterInsights = [];
  for (const [roomName, depts] of Object.entries(reorganizedRoomDepts)) {
    const topDept = Object.entries(depts).sort((a, b) => b[1] - a[1])[0];
    if (topDept && topDept[1] >= 5) {
      clusterInsights.push(`Prioritize placing ${topDept[0]} department students together in Room ${roomName} (${topDept[1]} seats allocated).`);
    }
  }

  // Generate natural language reasoning with Gemini API or smart heuristic
  const apiKey = process.env.GEMINI_API_KEY;
  let summaryText = "";
  let extractedRules = [];

  if (apiKey) {
    try {
      const prompt = `You are an AI seating optimization engine.
The user reorganized the generated seating plan:
- Total Seat Adjustments / Swaps: ${movedCount}
- Inter-room Transfers: ${roomSwaps}
- Intra-room Seat Adjustments: ${seatSwaps}
- Placed from Staging Bucket: ${unplacedToPlaced}
- Department Room Clusters Observed: ${JSON.stringify(reorganizedRoomDepts)}

Provide a concise 2-sentence comparison summary and 2 actionable rules learned from this user reorganization.
Format as JSON: { "summary": "...", "rules": ["...", "..."] }`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      if (response.ok) {
        const json = await response.json();
        const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) {
          const match = rawText.match(/\{[\s\S]*\}/);
          if (match) {
            const parsed = JSON.parse(match[0]);
            summaryText = parsed.summary;
            extractedRules = parsed.rules || [];
          }
        }
      }
    } catch (err) {
      console.warn("[AI Seat Advisor] Gemini compare & learn call failed, using heuristic:", err.message);
    }
  }

  if (!summaryText) {
    summaryText = `Compared original generated allotment with your reorganized arrangement: Detected ${movedCount} student movements (${roomSwaps} room transfers, ${seatSwaps} seat swaps, ${unplacedToPlaced} placed from bucket).`;
  }

  if (extractedRules.length === 0) {
    if (clusterInsights.length > 0) {
      extractedRules = clusterInsights;
    } else {
      extractedRules = [
        `Learn user manual seat preference: Maintain custom seat layout across active rooms.`,
        `Optimize student group proximity based on user reorganization patterns.`
      ];
    }
  }

  // Save extracted rules into MongoDB AiFeedback collection as active global rules!
  const savedRuleDocs = [];
  for (const ruleText of extractedRules) {
    const doc = await AiFeedback.create({
      orgCode,
      type: "rule",
      ruleKey: "layout_reorganization",
      ruleValue: { movedCount, roomSwaps, seatSwaps },
      description: ruleText,
      isActive: true
    });
    savedRuleDocs.push(doc);
  }

  return {
    success: true,
    metrics: {
      totalMoved: movedCount,
      roomSwaps,
      seatSwaps,
      unplacedToPlaced,
      originalTotal: originalAllotments.length,
      reorganizedTotal: reorganizedAllotments.length
    },
    summary: summaryText,
    learnedRules: extractedRules,
    savedRuleDocs
  };
}

