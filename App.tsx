import React from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Image,
  StatusBar,
} from "react-native";

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.content}>
        <Image
          source={require("./assets/zibu.png")}
          style={styles.zibuImage}
          resizeMode="contain"
        />
        <Text style={styles.title}>Zibu</Text>
        <Text style={styles.subtitle}>Your little space buddy</Text>

        {/* Placeholder bars for Hunger / Clean / Fun, etc. */}
        <View style={styles.barsContainer}>
          <View style={styles.barRow}>
            <Text style={styles.barLabel}>Hunger</Text>
            <View style={styles.barBackground}>
              <View style={[styles.barFill, { flex: 0.7 }]} />
            </View>
          </View>

          <View style={styles.barRow}>
            <Text style={styles.barLabel}>Clean</Text>
            <View style={styles.barBackground}>
              <View style={[styles.barFill, { flex: 0.4 }]} />
            </View>
          </View>

          <View style={styles.barRow}>
            <Text style={styles.barLabel}>Fun</Text>
            <View style={styles.barBackground}>
              <View style={[styles.barFill, { flex: 0.9 }]} />
            </View>
          </View>
        </View>

        <Text style={styles.helperText}>
          Next step: hold to feed, swipe to wash, shake to play. We’ll wire
          those up soon.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F6F6FF",
  },
  content: {
    flex: 1,
    alignItems: "center",
    paddingTop: 40,
    paddingHorizontal: 24,
  },
  zibuImage: {
    width: 220,
    height: 220,
  },
  title: {
    marginTop: 16,
    fontSize: 32,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 16,
    marginTop: 4,
    color: "#666",
  },
  barsContainer: {
    marginTop: 32,
    width: "100%",
    gap: 12,
  },
  barRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  barLabel: {
    width: 70,
    fontSize: 14,
    fontWeight: "500",
  },
  barBackground: {
    flex: 1,
    height: 14,
    borderRadius: 999,
    backgroundColor: "#E0E8FF",
    overflow: "hidden",
  },
  barFill: {
    flex: 1,
    backgroundColor: "#6DD19C",
  },
  helperText: {
    marginTop: 32,
    fontSize: 13,
    color: "#888",
    textAlign: "center",
  },
});
