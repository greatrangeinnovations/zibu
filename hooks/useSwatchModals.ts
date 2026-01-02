import { useState, useCallback } from "react";

export interface SwatchModalState {
  id: string;
  visible: boolean;
  title: string;
  selectedKey: string | null;
  instructions: string;
}

interface UseSwatchModalsConfig {
  food: { visible: boolean; selectedKey: string | null };
  clean: { visible: boolean; selectedKey: string | null };
  toy: { visible: boolean; selectedKey: string | null };
  sleep: { visible: boolean; selectedKey: string | null };
}

interface SwatchHandlers {
  onFoodSelect: (key: string) => void;
  onCleanSelect: (key: string) => void;
  onToySelect: (key: string) => void;
  onSleepSelect: (key: string) => void;
  onResetAllSelections: () => void;
}

/**
 * Custom hook to manage swatch modal state and prevent repetitive modal code
 */
export function useSwatchModals(handlers: SwatchHandlers) {
  const [foodSwatchOpen, setFoodSwatchOpen] = useState(false);
  const [selectedFood, setSelectedFood] = useState<string | null>(null);

  const [cleanSwatchOpen, setCleanSwatchOpen] = useState(false);
  const [selectedCleanTool, setSelectedCleanTool] = useState<string | null>(
    null
  );

  const [toySwatchOpen, setToySwatchOpen] = useState(false);
  const [selectedToy, setSelectedToy] = useState<string | null>(null);

  const [sleepSwatchOpen, setSleepSwatchOpen] = useState(false);
  const [selectedSleepItem, setSelectedSleepItem] = useState<string | null>(
    null
  );

  // Reset all selections
  const resetAllSelections = useCallback(() => {
    setSelectedFood(null);
    setSelectedCleanTool(null);
    setSelectedToy(null);
    setSelectedSleepItem(null);
  }, []);

  // Food selection handler
  const handleFoodSelect = useCallback(
    (key: string) => {
      resetAllSelections();
      setSelectedFood(key);
      setFoodSwatchOpen(false);
      handlers.onFoodSelect(key);
    },
    [handlers, resetAllSelections]
  );

  // Clean selection handler
  const handleCleanSelect = useCallback(
    (key: string) => {
      resetAllSelections();
      setSelectedCleanTool(key);
      setCleanSwatchOpen(false);
      handlers.onCleanSelect(key);
    },
    [handlers, resetAllSelections]
  );

  // Toy selection handler
  const handleToySelect = useCallback(
    (key: string) => {
      resetAllSelections();
      setSelectedToy(key);
      setToySwatchOpen(false);
      handlers.onToySelect(key);
    },
    [handlers, resetAllSelections]
  );

  // Sleep selection handler
  const handleSleepSelect = useCallback(
    (key: string) => {
      resetAllSelections();
      setSelectedSleepItem(key);
      setSleepSwatchOpen(false);
      handlers.onSleepSelect(key);
    },
    [handlers, resetAllSelections]
  );

  return {
    // Food
    foodSwatchOpen,
    setFoodSwatchOpen,
    selectedFood,
    setSelectedFood,
    onFoodSelect: handleFoodSelect,
    onFoodClose: () => setFoodSwatchOpen(false),

    // Clean
    cleanSwatchOpen,
    setCleanSwatchOpen,
    selectedCleanTool,
    setSelectedCleanTool,
    onCleanSelect: handleCleanSelect,
    onCleanClose: () => setCleanSwatchOpen(false),

    // Toy
    toySwatchOpen,
    setToySwatchOpen,
    selectedToy,
    setSelectedToy,
    onToySelect: handleToySelect,
    onToyClose: () => setToySwatchOpen(false),

    // Sleep
    sleepSwatchOpen,
    setSleepSwatchOpen,
    selectedSleepItem,
    setSelectedSleepItem,
    onSleepSelect: handleSleepSelect,
    onSleepClose: () => setSleepSwatchOpen(false),

    // Utilities
    resetAllSelections,
  };
}
