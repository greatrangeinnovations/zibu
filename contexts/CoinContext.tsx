import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface FoodItem {
  id: "star_milk" | "cosmic_fruit" | "galaxy_noodle";
  label: string;
  price: number;
  hungerRestore: number;
  icon: string;
  description: string;
}

export const FOOD_TYPES: Record<string, FoodItem> = {
  star_milk: {
    id: "star_milk",
    label: "Star Milk Bottle",
    price: 5,
    hungerRestore: 25,
    icon: "wine-bottle",
    description: "Cheap, everyday snack",
  },
  cosmic_fruit: {
    id: "cosmic_fruit",
    label: "Cosmic Fruit Mush",
    price: 15,
    hungerRestore: 50,
    icon: "apple-alt",
    description: "Colorful mid-tier food",
  },
  galaxy_noodle: {
    id: "galaxy_noodle",
    label: "Galaxy Noodle Bowl",
    price: 40,
    hungerRestore: 100,
    icon: "bowl-food",
    description: "Expensive, full meal",
  },
};

interface Inventory {
  star_milk: number;
  cosmic_fruit: number;
  galaxy_noodle: number;
  deflated_ball: number; // toy - has durability
  old_sponge: number; // cleaner - has durability
  tattered_blanket: number; // sleep item - has durability
}

// Durability for durable items (0-1 scale, 0.25 = 25%)
interface DurabilityState {
  deflated_ball: number;
  old_sponge: number;
  tattered_blanket: number;
}

interface CoinContextType {
  coins: number;
  setCoins: (coins: number) => void;
  addCoins: (amount: number) => void;
  subtractCoins: (amount: number) => void;
  inventory: Inventory;
  addInventoryItem: (foodId: keyof Inventory, amount: number) => void;
  subtractInventoryItem: (foodId: keyof Inventory, amount: number) => void;
  getTotalFood: () => number;
  durability: DurabilityState;
  setDurability: (durability: DurabilityState) => void;
  useDurableItem: (itemId: keyof DurabilityState, usage: number) => void;
}

const CoinContext = createContext<CoinContextType | undefined>(undefined);

export const CoinProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [coins, setCoins] = useState<number>(0);
  const [inventory, setInventory] = useState<Inventory>({
    star_milk: 0,
    cosmic_fruit: 0,
    galaxy_noodle: 0,
    deflated_ball: 0,
    old_sponge: 0,
    tattered_blanket: 0,
  });
  const [durability, setDurability] = useState<DurabilityState>({
    deflated_ball: 0,
    old_sponge: 0,
    tattered_blanket: 0,
  });
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from AsyncStorage on mount
  useEffect(() => {
    (async () => {
      try {
        const storedCoins = await AsyncStorage.getItem("coins");
        const storedInventory = await AsyncStorage.getItem("inventory");
        const storedDurability = await AsyncStorage.getItem("durability");

        if (storedCoins !== null) setCoins(Number(storedCoins));
        if (storedInventory !== null) {
          setInventory(JSON.parse(storedInventory));
        }
        if (storedDurability !== null) {
          setDurability(JSON.parse(storedDurability));
        }

        setIsLoaded(true);
      } catch (error) {
        console.error("Failed to load from AsyncStorage:", error);
        setIsLoaded(true);
      }
    })();
  }, []);

  // Persist coins whenever they change
  useEffect(() => {
    if (isLoaded) {
      AsyncStorage.setItem("coins", coins.toString()).catch((error) =>
        console.error("Failed to save coins:", error)
      );
    }
  }, [coins, isLoaded]);

  // Persist inventory whenever it changes
  useEffect(() => {
    if (isLoaded) {
      AsyncStorage.setItem("inventory", JSON.stringify(inventory)).catch(
        (error) => console.error("Failed to save inventory:", error)
      );
    }
  }, [inventory, isLoaded]);

  // Persist durability whenever it changes
  useEffect(() => {
    if (isLoaded) {
      AsyncStorage.setItem("durability", JSON.stringify(durability)).catch(
        (error) => console.error("Failed to save durability:", error)
      );
    }
  }, [durability, isLoaded]);

  const addCoins = (amount: number) => setCoins((c) => c + amount);
  const subtractCoins = (amount: number) =>
    setCoins((c) => Math.max(0, c - amount));

  const addInventoryItem = (foodId: keyof Inventory, amount: number) => {
    setInventory((prev) => ({
      ...prev,
      [foodId]: prev[foodId] + amount,
    }));
  };

  const subtractInventoryItem = (foodId: keyof Inventory, amount: number) => {
    setInventory((prev) => ({
      ...prev,
      [foodId]: Math.max(0, prev[foodId] - amount),
    }));
  };

  const getTotalFood = () => {
    return (
      inventory.star_milk + inventory.cosmic_fruit + inventory.galaxy_noodle
    );
  };

  const useDurableItem = (itemId: keyof DurabilityState, usage: number) => {
    setDurability((prev) => {
      const newDurability = Math.max(0, prev[itemId] - usage);
      // If durability reaches 0, remove the item
      if (newDurability <= 0) {
        setInventory((prevInv) => ({
          ...prevInv,
          [itemId]: Math.max(0, prevInv[itemId as keyof Inventory] - 1),
        }));
      }
      return {
        ...prev,
        [itemId]: newDurability,
      };
    });
  };

  return (
    <CoinContext.Provider
      value={{
        coins,
        setCoins,
        addCoins,
        subtractCoins,
        inventory,
        addInventoryItem,
        subtractInventoryItem,
        getTotalFood,
        durability,
        setDurability,
        useDurableItem,
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
