import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface CoinContextType {
  coins: number;
  setCoins: (coins: number) => void;
  addCoins: (amount: number) => void;
  subtractCoins: (amount: number) => void;
  food: number;
  setFood: (food: number) => void;
  addFood: (amount: number) => void;
  subtractFood: (amount: number) => void;
}

const CoinContext = createContext<CoinContextType | undefined>(undefined);

export const CoinProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [coins, setCoins] = useState<number>(0);
  const [food, setFood] = useState<number>(0);

  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem("coins");
      if (stored !== null) setCoins(Number(stored));
      const storedFood = await AsyncStorage.getItem("food");
      if (storedFood !== null) setFood(Number(storedFood));
    })();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem("coins", coins.toString());
  }, [coins]);

  useEffect(() => {
    AsyncStorage.setItem("food", food.toString());
  }, [food]);

  const addCoins = (amount: number) => setCoins((c) => c + amount);
  const subtractCoins = (amount: number) =>
    setCoins((c) => Math.max(0, c - amount));

  const addFood = (amount: number) => setFood((f) => f + amount);
  const subtractFood = (amount: number) =>
    setFood((f) => Math.max(0, f - amount));

  return (
    <CoinContext.Provider
      value={{
        coins,
        setCoins,
        addCoins,
        subtractCoins,
        food,
        setFood,
        addFood,
        subtractFood,
      }}
    >
      {children}
    </CoinContext.Provider>
  );
};

export const useCoins = () => {
  const context = useContext(CoinContext);
  if (!context) throw new Error("useCoins must be used within a CoinProvider");
  return context;
};
