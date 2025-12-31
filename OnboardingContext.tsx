import React from "react";

export const OnboardingContext = React.createContext<{
  resetOnboarding: () => Promise<void>;
  resetCounter: number;
} | null>(null);
