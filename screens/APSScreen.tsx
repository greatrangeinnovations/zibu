import React from "react";
import { View, Text, Pressable, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Rocket } from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { NeedKey } from "../types";

interface APSScreenProps {
  coins: number;
  currentCost: number;
  apsInfractions: number;
  canRecoverForFree: boolean | number | null;
  recoveryTimeRemaining: number;
  onRecoverWithCoins: () => Promise<void>;
  onWaitForRecovery: () => Promise<void>;
}

export default function APSScreen({
  coins,
  currentCost,
  apsInfractions,
  canRecoverForFree,
  recoveryTimeRemaining,
  onRecoverWithCoins,
  onWaitForRecovery,
}: APSScreenProps) {
  const currentStrike = apsInfractions + 1;

  const formatTimeRemaining = (ms: number) => {
    const hours = Math.ceil(ms / (1000 * 60 * 60));
    return `${hours}h`;
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#1a1a2e" }}>
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 20,
        }}
      >
        <Rocket size={80} color="#FF6B6B" style={{ marginBottom: 20 }} />

        <Text
          style={{
            fontSize: 32,
            fontWeight: "700",
            color: "#fff",
            marginBottom: 12,
            textAlign: "center",
          }}
        >
          Zibu Taken by APS
        </Text>

        <Text
          style={{
            fontSize: 16,
            color: "#ccc",
            marginBottom: 24,
            textAlign: "center",
            lineHeight: 24,
          }}
        >
          Alien Protective Services noticed Zibu wasn't feeling well. This is a
          warning to take extra care.
        </Text>

        {/* Warning banner */}
        <View
          style={{
            backgroundColor: "#FF9500",
            padding: 12,
            borderRadius: 8,
            marginBottom: 24,
            width: "100%",
            borderLeftWidth: 4,
            borderLeftColor: "#FF6B6B",
          }}
        >
          <Text
            style={{
              fontSize: 14,
              fontWeight: "700",
              color: "#fff",
              textAlign: "center",
            }}
          >
            ⚠️ Zibu requires proper care or APS will intervene.
          </Text>
        </View>

        {/* Recovery options */}
        <View style={{ width: "100%", gap: 12 }}>
          {/* Option 1: Pay coins */}
          <Pressable
            onPress={onRecoverWithCoins}
            style={{
              paddingVertical: 16,
              paddingHorizontal: 16,
              backgroundColor: coins >= currentCost ? "#6DD19C" : "#999",
              borderRadius: 8,
              width: "100%",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: "#fff",
                marginBottom: 4,
              }}
            >
              {coins >= currentCost
                ? `Help Zibu Recover (${currentCost} coins)`
                : `Not Enough Coins (need ${currentCost})`}
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: "rgba(255,255,255,0.8)",
              }}
            >
              Current coins: {coins}
            </Text>
          </Pressable>

          {/* Option 2: Wait for recovery */}
          <Pressable
            onPress={onWaitForRecovery}
            style={{
              paddingVertical: 16,
              paddingHorizontal: 16,
              backgroundColor: "#4A5B8A",
              borderRadius: 8,
              width: "100%",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: "#fff",
                marginBottom: 4,
              }}
            >
              Wait until Tomorrow
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: "rgba(255,255,255,0.8)",
              }}
            >
              Zibu will rest for 24 hours (free)
            </Text>
          </Pressable>
        </View>

        <Text
          style={{
            fontSize: 12,
            color: "#888",
            marginTop: 20,
            textAlign: "center",
          }}
        >
          Either way, Zibu will recover and feel 50% better.
        </Text>
      </View>
    </SafeAreaView>
  );
}
