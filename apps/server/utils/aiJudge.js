const AI_SERVER_URL = process.env.AI_SERVER_URL || "http://127.0.0.1:8000";

/**
 * Call the AI server with a prompt and a set of images.
 *
 * @param {string} prompt - e.g. "Cat juggling oranges"
 * @param {string[]} images - base64/data URL strings for each player's drawing
 * @returns {Promise<{ scores: { image_index: number, score: number }[], winnerIndex: number, isFallback: boolean }>}
 */
export async function judgeDrawingsWithAI(prompt, images) {
  // Basic validation so we fail fast if the game logic calls this incorrectly
  if (!prompt || !Array.isArray(images) || images.length === 0) {
    throw new Error("judgeDrawingsWithAI called without prompt or images");
  }

  try {
    // Add a timeout so we don't hang forever if the AI server is dead
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s

    const res = await fetch(`${AI_SERVER_URL}/score-images`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({ prompt, images }),
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`AI server error ${res.status}: ${text}`);
    }

    const data = await res.json();

    if (!Array.isArray(data.scores)) {
      throw new Error("AI server response missing scores array");
    }

    // Normalise the response to something the rest of the game can use
    const scores = data.scores.map((item) => ({
      image_index: item.image_index,
      score: Number(item.score) || 0,
    }));

    // Prefer winner_index from the server, but recompute if missing
    let winnerIndex = typeof data.winner_index === "number" ? data.winner_index : 0;

    if (winnerIndex < 0 || winnerIndex >= images.length) {
      let bestScore = -Infinity;
      winnerIndex = 0;
      scores.forEach((s) => {
        if (s.score > bestScore) {
          bestScore = s.score;
          winnerIndex = s.image_index;
        }
      });
    }

    return {
      scores,
      winnerIndex,
      isFallback: false,
    };
  } catch (err) {
    console.error("AI judge failed:", err.message);

    // ---------- Handle API failures (ticket requirement) ----------
    // Fallback behaviour: pick a random winner so the game can continue.
    const fallbackWinnerIndex = Math.floor(Math.random() * images.length);

    return {
      scores: images.map((_, i) => ({
        image_index: i,
        score: i === fallbackWinnerIndex ? 1 : 0,
      })),
      winnerIndex: fallbackWinnerIndex,
      isFallback: true,
      error: err.message,
    };
  }
}
