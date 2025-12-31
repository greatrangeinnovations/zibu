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
  const animationFrameIdRef = useRef<number | null>(null);
  const isCompleteRef = useRef(false);

  useEffect(() => {
    // Cancel any existing animation frame
    if (animationFrameIdRef.current !== null) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }

    if (!isActive) {
      setFrame(0);
      isCompleteRef.current = false;
      return;
    }

    isCompleteRef.current = false;
    let startTime = Date.now();

    const animate = () => {
      if (isCompleteRef.current) {
        animationFrameIdRef.current = null;
        return;
      }

      const elapsed = Date.now() - startTime;
      const expectedFrame = Math.floor((elapsed / 1000) * config.fps);

      if (config.loop) {
        // Loop the animation indefinitely
        const loopedFrame = expectedFrame % config.frameCount;
        setFrame(loopedFrame);
        animationFrameIdRef.current = requestAnimationFrame(animate);
      } else {
        // Play once then stop
        if (expectedFrame < config.frameCount) {
          setFrame(expectedFrame);
          animationFrameIdRef.current = requestAnimationFrame(animate);
        } else {
          // Animation complete - stay on last frame
          setFrame(config.frameCount - 1);
          isCompleteRef.current = true;
          animationFrameIdRef.current = null;
          config.onComplete?.();
        }
      }
    };

    animationFrameIdRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameIdRef.current !== null) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
      isCompleteRef.current = true;
    };
  }, [isActive, config.fps, config.frameCount, config.loop, config.onComplete]);

  return frame;
}
