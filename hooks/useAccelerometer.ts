import { useEffect, useRef } from "react";
import { Accelerometer } from "expo-sensors";

export interface AccelerometerCallbacks {
  // Called when a shake is detected (acceleration > 2)
  onShake?: (timestamp: number) => void;
  // Called continuously with raw acceleration data
  onAcceleration?: (x: number, y: number, z: number) => void;
}

/**
 * Hook to handle accelerometer input
 * Detects shakes and/or provides raw acceleration data
 */
export function useAccelerometer(
  isEnabled: boolean,
  callbacks: AccelerometerCallbacks,
  debounceMs: number = 0
) {
  const subscriptionRef = useRef<any>(null);
  const lastEventTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!isEnabled) {
      subscriptionRef.current?.remove();
      subscriptionRef.current = null;
      return;
    }

    const setupAccelerometer = async () => {
      await Accelerometer.setUpdateInterval(100);
      subscriptionRef.current = Accelerometer.addListener(({ x, y, z }) => {
        const acceleration = Math.sqrt(x * x + y * y + z * z);
        const now = Date.now();

        // Call raw acceleration callback
        callbacks.onAcceleration?.(x, y, z);

        // Detect shake and call callback with debouncing
        if (acceleration > 2) {
          if (debounceMs === 0 || now - lastEventTimeRef.current > debounceMs) {
            lastEventTimeRef.current = now;
            callbacks.onShake?.(now);
          }
        }
      });
    };

    setupAccelerometer();

    return () => {
      subscriptionRef.current?.remove();
      subscriptionRef.current = null;
    };
  }, [isEnabled, debounceMs, callbacks]);
}
