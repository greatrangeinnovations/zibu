import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface CoinContextType {
  coins: number;
  setCoins: (coins: number) => void;
  addCoins: (amount: number) => void;
  subtractCoins: (amount: number) => void;
}

const CoinContext = createContext<CoinContextType | undefined>(undefined);

export const CoinProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [coins, setCoins] = useState<number>(0);

  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem("coins");
      if (stored !== null) setCoins(Number(stored));
    })();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem("coins", coins.toString());
  }, [coins]);

  const addCoins = (amount: number) => setCoins((c) => c + amount);
  const subtractCoins = (amount: number) =>
    setCoins((c) => Math.max(0, c - amount));

  return (
    <CoinContext.Provider value={{ coins, setCoins, addCoins, subtractCoins }}>
      {children}
    </CoinContext.Provider>
  );
};

export const useCoins = () => {
  const context = useContext(CoinContext);
  if (!context) throw new Error("useCoins must be used within a CoinProvider");
  return context;
};
