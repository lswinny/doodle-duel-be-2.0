const AI_SERVER_URL =
  process.env.AI_SERVER_URL ||
  'https://edmund-overjoyful-recreantly.ngrok-free.dev';
import binaryToBase64 from './binarytob64.js';

/**
 * Call the AI server with a prompt and a set of images.
 *
 * @param {string} prompt - e.g. "Cat"
 * @param {string[]} images - data URL strings for each player's drawing
 * @returns {Promise<{ scores: { image_index: number, score: number }[], winnerIndex: number, isFallback: boolean }>}
 */
export async function judgeDrawingsWithAI(prompt, submissions) {
  if (!prompt || !Array.isArray(submissions) || submissions.length === 0) {
    throw new Error('judgeDrawingsWithAI called without prompt or submissions');
  }

  try {
    // Build a scoring function for ONE image
    async function scoreSingleImage(image, index, playerName) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(`${AI_SERVER_URL}/score-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({ prompt, image: binaryToBase64(image.buffer) }),
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`AI server error ${res.status}: ${text}`);
      }

      const data = await res.json();
      console.log(data);
      return {
        playerName,
        image: image,
        image_index: index,
        score: Number(data.confidence_percent) || 0,
      };
    }

    // Score ALL images in parallel
    const scores = await Promise.all(
      submissions.map((item, idx) => {
        return scoreSingleImage(item.imageData, idx, item.playerName);
      })
    );

    // Determine winner
    let best = -Infinity;
    let winnerIndex = 0;

    scores.forEach((item) => {
      if (item.score > best) {
        best = item.score;
        winnerIndex = item.image_index;
      }
    });

    return {
      scores,
      winnerIndex,
      isFallback: false,
    };
  } catch (err) {
    console.error('AI judge failed:', err.message);

    // fallback picks a random winner so game continues
    const fallbackWinnerIndex = Math.floor(Math.random() * submissions.length);

    return {
      scores: submissions.map((_, i) => ({
        image_index: i,
        score: i === fallbackWinnerIndex ? 1 : 0,
      })),
      winnerIndex: fallbackWinnerIndex,
      isFallback: true,
      error: err.message,
    };
  }
}
