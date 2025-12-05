import React from "react";
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
  return (
    <ImageBackground source={meteorImg} style={styles.bg} resizeMode="cover">
      <Pressable style={styles.overlay} onPress={onContinue}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.text}>
            A glowing meteor just landed quietly… and left behind a strange
            little egg!
          </Text>
        </ScrollView>
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
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  text: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    textShadowColor: "#222",
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 8,
  },
});
