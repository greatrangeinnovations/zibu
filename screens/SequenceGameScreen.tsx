import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  SafeAreaView,
  Alert,
  Dimensions,
} from "react-native";
import { FontAwesome5 } from "@expo/vector-icons";
import { useCoins } from "../contexts/CoinContext";

const SYMBOLS = ["star", "circle", "square", "triangle"];
const SYMBOL_COLORS: { [key: string]: string } = {
  star: "#FF6B6B",
  circle: "#4ECDC4",
  square: "#FFE66D",
  triangle: "#95E1D3",
};

export default function SequenceGameScreen({ navigation }: any) {
  const { coins, addCoins } = useCoins();
  const [sequence, setSequence] = useState<number[]>([0, 1, 2]); // Starting with 3 symbols
  const [playerSequence, setPlayerSequence] = useState<number[]>([]);
  const [isPlayingSequence, setIsPlayingSequence] = useState(false);
  const [canClick, setCanClick] = useState(false);
  const [activeSymbol, setActiveSymbol] = useState<number | null>(null);
  const [roundScore, setRoundScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  // Play the full sequence at the start of each round
  useEffect(() => {
    if (playerSequence.length === 0 && !gameOver) {
      const timer = setTimeout(playSequence, 100);
      return () => clearTimeout(timer);
    }
  }, [sequence, gameOver]);

  const playSequence = async () => {
    setIsPlayingSequence(true);
    setCanClick(false);
    setPlayerSequence([]);

    for (let i = 0; i < sequence.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 600));
      flashSymbol(sequence[i]);
    }

    setIsPlayingSequence(false);
    setCanClick(true);
  };

  const flashSymbol = async (index: number) => {
    setActiveSymbol(index);
    await new Promise((resolve) => setTimeout(resolve, 300));
    setActiveSymbol(null);
  };

  const handleSymbolPress = async (index: number) => {
    if (!canClick || isPlayingSequence || gameOver) return;

    const newPlayerSequence = [...playerSequence, index];
    setPlayerSequence(newPlayerSequence);

    // Flash the pressed symbol
    await flashSymbol(index);

    // Check if the player's input is correct
    if (
      newPlayerSequence[newPlayerSequence.length - 1] !==
      sequence[newPlayerSequence.length - 1]
    ) {
      // Wrong symbol - game over
      endGame(newPlayerSequence.length - 1);
      return;
    }

    // Check if player completed the sequence
    if (newPlayerSequence.length === sequence.length) {
      // Correct sequence! Add another symbol and play again
      setCanClick(false);
      setPlayerSequence([]); // Reset player sequence immediately
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setSequence([...sequence, Math.floor(Math.random() * SYMBOLS.length)]);
      setRoundScore(sequence.length);
    }
  };

  const endGame = (correctSymbols: number) => {
    setGameOver(true);
    setCanClick(false);
    const coinsEarned = Math.max(1, Math.floor(correctSymbols / 2));
    addCoins(coinsEarned);
    Alert.alert(
      "Game Over!",
      `You got ${correctSymbols} symbols right!\nYou earned ${coinsEarned} coins!`,
      [
        { text: "Play Again", onPress: resetGame },
        { text: "Back to Games", onPress: () => navigation.navigate("Games") },
      ]
    );
  };

  const resetGame = () => {
    setSequence([0, 1, 2]);
    setPlayerSequence([]);
    setRoundScore(0);
    setGameOver(false);
    setCanClick(false);
    setActiveSymbol(null);
  };

  const screenWidth = Dimensions.get("window").width;
  const buttonSize = Math.min((screenWidth - 64) / 2, 100);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.navigate("Games")}>
          <FontAwesome5 name="chevron-left" size={24} color="#333" />
        </Pressable>
        <Text style={styles.title}>Sequence Game</Text>
        <View style={styles.coinRow}>
          <FontAwesome5
            name="coins"
            size={16}
            color="#F4D35E"
            style={{ marginRight: 4 }}
          />
          <Text style={styles.coinText}>{coins}</Text>
        </View>
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          {isPlayingSequence ? "Watch the sequence..." : "Your turn!"}
        </Text>
        <Text style={styles.scoreText}>Round: {sequence.length}</Text>
      </View>

      <View style={styles.buttonGrid}>
        {SYMBOLS.map((symbol, index) => (
          <Pressable
            key={index}
            style={[
              styles.symbolButton,
              {
                width: buttonSize,
                height: buttonSize,
                backgroundColor:
                  activeSymbol === index
                    ? SYMBOL_COLORS[symbol]
                    : `${SYMBOL_COLORS[symbol]}80`,
              },
            ]}
            onPress={() => handleSymbolPress(index)}
            disabled={!canClick || isPlayingSequence || gameOver}
          >
            <FontAwesome5 name={symbol} size={buttonSize * 0.35} color="#fff" />
          </Pressable>
        ))}
      </View>

      {gameOver && (
        <View style={styles.gameOverOverlay}>
          <Pressable style={styles.restartButton} onPress={resetGame}>
            <Text style={styles.restartText}>Play Again</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F6F6F6",
  },
  header: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    backgroundColor: "#fff",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    flex: 1,
    marginLeft: 12,
  },
  coinRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  coinText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6DD19C",
    marginLeft: 4,
  },
  infoContainer: {
    paddingVertical: 24,
    alignItems: "center",
  },
  infoText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  scoreText: {
    fontSize: 14,
    color: "#999",
    marginTop: 8,
  },
  buttonGrid: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    gap: 16,
  },
  symbolButton: {
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
  gameOverOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  restartButton: {
    backgroundColor: "#6DD19C",
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
  },
  restartText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
