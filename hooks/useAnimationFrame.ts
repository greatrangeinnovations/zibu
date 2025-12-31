import { useEffect, useRef, useState } from "react";

export interface AnimationConfig {
  fps: number;
  frameCount: number;
  loop?: boolean; // If true, loops; if false, stops at last frame
  onComplete?: () => void; // Called when animation completes (only used if loop=false)
}

/**
 * Generic animation frame hook
 * Manages smooth frame progression based on elapsed time and FPS
 */
export function useAnimationFrame(isActive: boolean, config: AnimationConfig) {
  const [frame, setFrame] = useState(0);
  const isAnimatingRef = useRef(true);

  useEffect(() => {
    if (!isActive) {
      setFrame(0);
      return;
    }

    isAnimatingRef.current = true;
    let startTime = Date.now();

    const animate = () => {
      if (!isAnimatingRef.current) return;

      const elapsed = Date.now() - startTime;
      let expectedFrame = Math.floor((elapsed / 1000) * config.fps);

      if (config.loop) {
        // Loop the animation
        expectedFrame = expectedFrame % config.frameCount;
        setFrame(expectedFrame);
        requestAnimationFrame(animate);
      } else {
        // Play once then stop
        if (expectedFrame < config.frameCount) {
          setFrame(expectedFrame);
          requestAnimationFrame(animate);
        } else {
          // Animation complete
          setFrame(config.frameCount - 1);
          isAnimatingRef.current = false;
          config.onComplete?.();
        }
      }
    };

    animate();

    return () => {
      isAnimatingRef.current = false;
    };
  }, [isActive, config]);

  return frame;
}
