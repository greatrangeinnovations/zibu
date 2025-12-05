import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  SafeAreaView,
  Alert,
  Dimensions,
  Animated,
} from "react-native";
import { FontAwesome5 } from "@expo/vector-icons";
import { useCoins } from "../contexts/CoinContext";

const SCREEN_WIDTH = Dimensions.get("window").width;
const SCREEN_HEIGHT = Dimensions.get("window").height - 100;
const PLAYER_SIZE = 50;
const ENEMY_SIZE = 40;
const BULLET_SIZE = 8;

interface Enemy {
  id: number;
  x: number;
  y: number;
}

interface Bullet {
  id: number;
  x: number;
  y: number;
}

export default function SpaceGameScreen({ navigation }: any) {
  const { coins, addCoins } = useCoins();
  const [playerX, setPlayerX] = useState(SCREEN_WIDTH / 2 - PLAYER_SIZE / 2);
  const [gameActive, setGameActive] = useState(false);
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [bullets, setBullets] = useState<Bullet[]>([]);
  const [score, setScore] = useState(0);
  const [gameTime, setGameTime] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const enemyIdRef = useRef(0);
  const bulletIdRef = useRef(0);
  const gameTimeRef = useRef(0);

  // Game loop
  useEffect(() => {
    if (!gameActive || gameOver) return;

    const gameInterval = setInterval(() => {
      gameTimeRef.current += 0.1;
      setGameTime(Math.floor(gameTimeRef.current * 10) / 10);

      // Spawn enemies
      if (Math.random() < 0.02) {
        const newEnemy: Enemy = {
          id: enemyIdRef.current++,
          x: Math.random() * (SCREEN_WIDTH - ENEMY_SIZE),
          y: -ENEMY_SIZE,
        };
        setEnemies((prev) => [...prev, newEnemy]);
      }

      // Update enemies
      setEnemies((prevEnemies) => {
        let newEnemies = prevEnemies.map((enemy) => ({
          ...enemy,
          y: enemy.y + 3,
        }));

        // Remove enemies that went off screen
        newEnemies = newEnemies.filter((enemy) => enemy.y < SCREEN_HEIGHT);

        // Check collisions with player
        newEnemies.forEach((enemy) => {
          if (
            enemy.y + ENEMY_SIZE > SCREEN_HEIGHT - PLAYER_SIZE &&
            enemy.y < SCREEN_HEIGHT &&
            enemy.x < playerX + PLAYER_SIZE &&
            enemy.x + ENEMY_SIZE > playerX
          ) {
            // Game over - collision with player
            setGameActive(false);
            setGameOver(true);
          }
        });

        return newEnemies;
      });

      // Update bullets
      setBullets((prevBullets) => {
        let newBullets = prevBullets.map((bullet) => ({
          ...bullet,
          y: bullet.y - 5,
        }));

        // Remove bullets that went off screen
        newBullets = newBullets.filter((bullet) => bullet.y > 0);

        // Check bullet-enemy collisions
        newBullets.forEach((bullet) => {
          setEnemies((prevEnemies) => {
            const remainingEnemies = prevEnemies.filter((enemy) => {
              if (
                bullet.x < enemy.x + ENEMY_SIZE &&
                bullet.x + BULLET_SIZE > enemy.x &&
                bullet.y < enemy.y + ENEMY_SIZE &&
                bullet.y + BULLET_SIZE > enemy.y
              ) {
                setScore((s) => s + 1);
                return false; // Remove enemy
              }
              return true;
            });
            return remainingEnemies;
          });
        });

        return newBullets;
      });
    }, 50);

    return () => clearInterval(gameInterval);
  }, [gameActive, gameOver, playerX]);

  const handleShoot = () => {
    const newBullet: Bullet = {
      id: bulletIdRef.current++,
      x: playerX + PLAYER_SIZE / 2 - BULLET_SIZE / 2,
      y: SCREEN_HEIGHT - PLAYER_SIZE,
    };
    setBullets((prev) => [...prev, newBullet]);
  };

  const startGame = () => {
    setGameActive(true);
    setGameOver(false);
    setEnemies([]);
    setBullets([]);
    setScore(0);
    setGameTime(0);
    gameTimeRef.current = 0;
    enemyIdRef.current = 0;
    bulletIdRef.current = 0;
  };

  const endGame = () => {
    setGameActive(false);
    setGameOver(true);
    const coinsEarned = Math.floor(gameTimeRef.current / 10);
    addCoins(coinsEarned);
    Alert.alert(
      "Game Over!",
      `Survived for ${gameTime.toFixed(
        1
      )} seconds!\nEnemies destroyed: ${score}\nCoins earned: ${coinsEarned}`,
      [
        { text: "Play Again", onPress: startGame },
        { text: "Back to Games", onPress: () => navigation.navigate("Games") },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.navigate("Games")}>
          <FontAwesome5 name="chevron-left" size={24} color="#333" />
        </Pressable>
        <Text style={styles.title}>Space Defense</Text>
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

      <View style={styles.gameContainer}>
        {/* Game area */}
        <View style={styles.gameArea}>
          {/* Enemies */}
          {enemies.map((enemy) => (
            <View
              key={enemy.id}
              style={[styles.enemy, { left: enemy.x, top: enemy.y }]}
            >
              <FontAwesome5
                name="cube"
                size={ENEMY_SIZE - 10}
                color="#E94F37"
              />
            </View>
          ))}

          {/* Bullets */}
          {bullets.map((bullet) => (
            <View
              key={bullet.id}
              style={[styles.bullet, { left: bullet.x, top: bullet.y }]}
            />
          ))}

          {/* Player */}
          <View style={[styles.player, { left: playerX }]}>
            <FontAwesome5
              name="rocket"
              size={PLAYER_SIZE - 10}
              color="#6DD19C"
            />
          </View>

          {/* Game over overlay */}
          {!gameActive && gameOver && (
            <View style={styles.gameOverOverlay}>
              <Pressable style={styles.restartButton} onPress={endGame}>
                <Text style={styles.restartText}>Game Over</Text>
              </Pressable>
            </View>
          )}

          {/* Start button */}
          {!gameActive && !gameOver && (
            <View style={styles.centerContent}>
              <Pressable style={styles.startButton} onPress={startGame}>
                <Text style={styles.startButtonText}>Start Game</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Controls and info */}
        <View style={styles.controlsContainer}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Time: {gameTime.toFixed(1)}s</Text>
            <Text style={styles.infoLabel}>Destroyed: {score}</Text>
            <Text style={styles.infoLabel}>
              Coins: {Math.floor(gameTime / 10)}
            </Text>
          </View>

          <View style={styles.controlsRow}>
            <Pressable
              style={styles.controlButton}
              onPress={() => setPlayerX(Math.max(0, playerX - 20))}
            >
              <FontAwesome5 name="chevron-left" size={24} color="#fff" />
            </Pressable>

            <Pressable
              style={styles.shootButton}
              onPress={handleShoot}
              disabled={!gameActive}
            >
              <FontAwesome5 name="bolt" size={24} color="#fff" />
              <Text style={styles.shootButtonText}>Shoot</Text>
            </Pressable>

            <Pressable
              style={styles.controlButton}
              onPress={() =>
                setPlayerX(Math.min(SCREEN_WIDTH - PLAYER_SIZE, playerX + 20))
              }
            >
              <FontAwesome5 name="chevron-right" size={24} color="#fff" />
            </Pressable>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a2e",
  },
  header: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    backgroundColor: "#0f0f1e",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
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
    color: "#F4D35E",
    marginLeft: 4,
  },
  gameContainer: {
    flex: 1,
  },
  gameArea: {
    flex: 1,
    backgroundColor: "#0a0a15",
    position: "relative",
    overflow: "hidden",
  },
  enemy: {
    position: "absolute",
    width: ENEMY_SIZE,
    height: ENEMY_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  bullet: {
    position: "absolute",
    width: BULLET_SIZE,
    height: BULLET_SIZE,
    backgroundColor: "#FFD700",
    borderRadius: BULLET_SIZE / 2,
  },
  player: {
    position: "absolute",
    bottom: 20,
    width: PLAYER_SIZE,
    height: PLAYER_SIZE,
    alignItems: "center",
    justifyContent: "center",
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
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  startButton: {
    backgroundColor: "#6DD19C",
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 24,
  },
  startButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  restartButton: {
    backgroundColor: "#E94F37",
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 24,
  },
  restartText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  controlsContainer: {
    backgroundColor: "#0f0f1e",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#333",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 16,
  },
  infoLabel: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  controlsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  controlButton: {
    backgroundColor: "#6DD19C",
    width: 50,
    height: 50,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  shootButton: {
    backgroundColor: "#FFD700",
    flex: 1,
    height: 50,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  shootButtonText: {
    color: "#000",
    fontWeight: "700",
    fontSize: 14,
  },
});
