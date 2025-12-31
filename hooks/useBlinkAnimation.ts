import { useEffect, useState } from "react";
import { FRAME_COUNT, FPS } from "../constants/animation";

/**
 * Custom blink animation that alternates between single and double blinks
 * Pattern: single blink → wait 2s → double blink → wait 5s → repeat
 */
export function useBlinkAnimation() {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    let isAnimating = true;
    let timeoutId: NodeJS.Timeout | null = null;

    const playBlink = (count: number, speed: number = FPS) => {
      return new Promise<void>((resolve) => {
        let blinkCount = 0;

        const playOnce = () => {
          let startTime = Date.now();
          const animate = () => {
            if (!isAnimating) return;
            const elapsed = Date.now() - startTime;
            const expectedFrame = Math.floor((elapsed / 1000) * speed);

            if (expectedFrame < FRAME_COUNT) {
              setFrame(expectedFrame);
              requestAnimationFrame(animate);
            } else {
              setFrame(0);
              blinkCount++;

              if (blinkCount < count) {
                // Wait 200ms between blinks, then play again
                timeoutId = setTimeout(playOnce, 200);
              } else {
                // All blinks done
                resolve();
              }
            }
          };
          animate();
        };

        playOnce();
      });
    };

    const startAnimation = async () => {
      while (isAnimating) {
        // Single blink at normal speed
        await playBlink(1, FPS);
        if (!isAnimating) break;

        // Wait 2 seconds
        await new Promise((resolve) => {
          timeoutId = setTimeout(resolve, 2000);
        });
        if (!isAnimating) break;

        // Double blink at faster speed (26 FPS instead of 15)
        await playBlink(2, 26);
        if (!isAnimating) break;

        // Wait 5 seconds
        await new Promise((resolve) => {
          timeoutId = setTimeout(resolve, 5000);
        });
      }
    };

    const timeout = setTimeout(() => startAnimation(), 500);

    return () => {
      isAnimating = false;
      if (timeout) clearTimeout(timeout);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  return frame;
}
