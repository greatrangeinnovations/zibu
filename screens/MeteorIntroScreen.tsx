import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  Pressable,
  ScrollView,
  Dimensions,
} from "react-native";

const meteorImg = require("../assets/egg/meteor.png");
const { width, height } = Dimensions.get("window");

export default function MeteorIntroScreen({
  onContinue,
}: {
  onContinue: () => void;
}) {
  const fullText =
    "A glowing meteor just landed quietly… and left behind a strange little egg!";
  const [displayedText, setDisplayedText] = useState("");

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      setDisplayedText(fullText.slice(0, i + 1));
      i++;
      if (i >= fullText.length) clearInterval(interval);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  return (
    <ImageBackground source={meteorImg} style={styles.bg} resizeMode="cover">
      <Pressable style={styles.overlay} onPress={onContinue}>
        <View style={styles.bottomContainer}>
          <Text style={styles.text}>{displayedText}</Text>
        </View>
      </Pressable>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: {
    width,
    height,
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  overlay: {
    flex: 1,
    width: "100%",
    height: "100%",
    justifyContent: "flex-end",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  bottomContainer: {
    width: "100%",
    paddingHorizontal: 32,
    paddingBottom: 48,
    alignItems: "center",
  },
  text: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    textShadowColor: "#222",
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 8,
  },
});
