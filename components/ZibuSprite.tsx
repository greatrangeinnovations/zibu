import React from "react";
import { Image as ExpoImage } from "expo-image";
import { View } from "react-native";

export type ZibuSpriteProps = {
  isUpset: boolean;
  isSleeping: boolean;
  isFeeding: boolean;
  isPlaying: boolean;
  frame: number;
  sleepFrame: number;
  eatFrame: number;
  playFrame: number;
  upsetFrame: number;
  DISPLAY_SIZE: number;
  COLS: number;
  ROWS: number;
  PLAYING_COLS: number;
  PLAYING_ROWS: number;
  SLEEP_COLS: number;
  SLEEP_ROWS: number;
  EAT_COLS: number;
  EAT_ROWS: number;
  UPSET_COLS: number;
  UPSET_ROWS: number;
  dirtiness?: number;
};

function ZibuSprite({
  isUpset,
  isSleeping,
  isFeeding,
  isPlaying,
  frame,
  sleepFrame,
  eatFrame,
  playFrame,
  upsetFrame,
  DISPLAY_SIZE,
  COLS,
  ROWS,
  PLAYING_COLS,
  PLAYING_ROWS,
  SLEEP_COLS,
  SLEEP_ROWS,
  EAT_COLS,
  EAT_ROWS,
  UPSET_COLS,
  UPSET_ROWS,
  dirtiness = 0,
}: ZibuSpriteProps) {
  if (isUpset) {
    return (
      <View
        key="upset"
        style={{
          width: DISPLAY_SIZE,
          height: DISPLAY_SIZE,
          overflow: "hidden",
        }}
      >
        <ExpoImage
          source={require("../assets/upset/upset_spritesheet.png")}
          style={{
            width: DISPLAY_SIZE * UPSET_COLS,
            height: DISPLAY_SIZE * UPSET_ROWS,
            marginLeft: -((upsetFrame % UPSET_COLS) * DISPLAY_SIZE),
            marginTop: -(Math.floor(upsetFrame / UPSET_COLS) * DISPLAY_SIZE),
          }}
          contentFit="cover"
          cachePolicy="memory"
        />
        {dirtiness > 0 && (
          <ExpoImage
            source={require("../assets/upset/upset_spritesheet.png")}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: DISPLAY_SIZE * UPSET_COLS,
              height: DISPLAY_SIZE * UPSET_ROWS,
              marginLeft: -((upsetFrame % UPSET_COLS) * DISPLAY_SIZE),
              marginTop: -(Math.floor(upsetFrame / UPSET_COLS) * DISPLAY_SIZE),
              opacity: dirtiness * 0.4,
            }}
            contentFit="cover"
            cachePolicy="memory"
            tintColor="#3D2817"
          />
        )}
      </View>
    );
  } else if (isSleeping) {
    return (
      <View
        key="sleeping"
        style={{
          width: DISPLAY_SIZE,
          height: DISPLAY_SIZE,
          overflow: "hidden",
        }}
      >
        <ExpoImage
          source={require("../assets/sleep/sleeping_spritesheet.png")}
          style={{
            width: DISPLAY_SIZE * SLEEP_COLS,
            height: DISPLAY_SIZE * SLEEP_ROWS,
            marginLeft: -((sleepFrame % SLEEP_COLS) * DISPLAY_SIZE),
            marginTop: -(Math.floor(sleepFrame / SLEEP_COLS) * DISPLAY_SIZE),
          }}
          contentFit="cover"
          cachePolicy="memory"
        />
        {dirtiness > 0 && (
          <ExpoImage
            source={require("../assets/sleep/sleeping_spritesheet.png")}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: DISPLAY_SIZE * SLEEP_COLS,
              height: DISPLAY_SIZE * SLEEP_ROWS,
              marginLeft: -((sleepFrame % SLEEP_COLS) * DISPLAY_SIZE),
              marginTop: -(Math.floor(sleepFrame / SLEEP_COLS) * DISPLAY_SIZE),
              opacity: dirtiness * 0.4,
            }}
            contentFit="cover"
            cachePolicy="memory"
            tintColor="#3D2817"
          />
        )}
      </View>
    );
  } else if (isFeeding) {
    return (
      <View
        key="feeding"
        style={{
          width: DISPLAY_SIZE,
          height: DISPLAY_SIZE,
          overflow: "hidden",
        }}
      >
        <ExpoImage
          source={require("../assets/eat/eat_spritesheet2.png")}
          style={{
            width: DISPLAY_SIZE * EAT_COLS,
            height: DISPLAY_SIZE * EAT_ROWS,
            marginLeft: -((eatFrame % EAT_COLS) * DISPLAY_SIZE),
            marginTop: -(Math.floor(eatFrame / EAT_COLS) * DISPLAY_SIZE),
          }}
          contentFit="cover"
          cachePolicy="memory"
        />
        {dirtiness > 0 && (
          <ExpoImage
            source={require("../assets/eat/eat_spritesheet2.png")}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: DISPLAY_SIZE * EAT_COLS,
              height: DISPLAY_SIZE * EAT_ROWS,
              marginLeft: -((eatFrame % EAT_COLS) * DISPLAY_SIZE),
              marginTop: -(Math.floor(eatFrame / EAT_COLS) * DISPLAY_SIZE),
              opacity: dirtiness * 0.4,
            }}
            contentFit="cover"
            cachePolicy="memory"
            tintColor="#3D2817"
          />
        )}
      </View>
    );
  } else if (isPlaying) {
    return (
      <View
        key="playing"
        style={{
          width: DISPLAY_SIZE,
          height: DISPLAY_SIZE,
          overflow: "hidden",
        }}
      >
        <ExpoImage
          source={require("../assets/playing/laugh_spritesheet.png")}
          style={{
            width: DISPLAY_SIZE * PLAYING_COLS,
            height: DISPLAY_SIZE * PLAYING_ROWS,
            marginLeft: -((playFrame % PLAYING_COLS) * DISPLAY_SIZE),
            marginTop: -(Math.floor(playFrame / PLAYING_COLS) * DISPLAY_SIZE),
          }}
          contentFit="cover"
          cachePolicy="memory"
        />
        {dirtiness > 0 && (
          <ExpoImage
            source={require("../assets/playing/laugh_spritesheet.png")}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: DISPLAY_SIZE * PLAYING_COLS,
              height: DISPLAY_SIZE * PLAYING_ROWS,
              marginLeft: -((playFrame % PLAYING_COLS) * DISPLAY_SIZE),
              marginTop: -(Math.floor(playFrame / PLAYING_COLS) * DISPLAY_SIZE),
              opacity: dirtiness * 0.4,
            }}
            contentFit="cover"
            cachePolicy="memory"
            tintColor="#3D2817"
          />
        )}
      </View>
    );
  } else {
    return (
      <View
        key="blink"
        style={{
          width: DISPLAY_SIZE,
          height: DISPLAY_SIZE,
          overflow: "hidden",
        }}
      >
        <ExpoImage
          source={require("../assets/blinking/blink_spritesheet.png")}
          style={{
            width: DISPLAY_SIZE * COLS,
            height: DISPLAY_SIZE * ROWS,
            marginLeft: -((frame % COLS) * DISPLAY_SIZE),
            marginTop: -(Math.floor(frame / COLS) * DISPLAY_SIZE),
          }}
          contentFit="cover"
          cachePolicy="memory"
        />
        {dirtiness > 0 && (
          <ExpoImage
            source={require("../assets/blinking/blink_spritesheet.png")}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: DISPLAY_SIZE * COLS,
              height: DISPLAY_SIZE * ROWS,
              marginLeft: -((frame % COLS) * DISPLAY_SIZE),
              marginTop: -(Math.floor(frame / COLS) * DISPLAY_SIZE),
              opacity: dirtiness * 0.4,
            }}
            contentFit="cover"
            cachePolicy="memory"
            tintColor="#3D2817"
          />
        )}
      </View>
    );
  }
}

// Custom comparison for React.memo to prevent re-renders
// Only re-render if the relevant animation frame or state flags change
const propsAreEqual = (
  prevProps: ZibuSpriteProps,
  nextProps: ZibuSpriteProps
): boolean => {
  // If state flags changed, re-render
  if (
    prevProps.isUpset !== nextProps.isUpset ||
    prevProps.isSleeping !== nextProps.isSleeping ||
    prevProps.isFeeding !== nextProps.isFeeding ||
    prevProps.isPlaying !== nextProps.isPlaying ||
    prevProps.dirtiness !== nextProps.dirtiness
  ) {
    return false;
  }

  // If only constant props changed (dimensions, cols, rows), don't re-render
  // Check only the active animation frame for the current state
  if (prevProps.isUpset && prevProps.upsetFrame !== nextProps.upsetFrame) {
    return false;
  }
  if (prevProps.isSleeping && prevProps.sleepFrame !== nextProps.sleepFrame) {
    return false;
  }
  if (prevProps.isFeeding && prevProps.eatFrame !== nextProps.eatFrame) {
    return false;
  }
  if (prevProps.isPlaying && prevProps.playFrame !== nextProps.playFrame) {
    return false;
  }
  // Default idle state uses frame
  if (
    !prevProps.isUpset &&
    !prevProps.isSleeping &&
    !prevProps.isFeeding &&
    !prevProps.isPlaying &&
    prevProps.frame !== nextProps.frame
  ) {
    return false;
  }

  return true;
};

export default React.memo(ZibuSprite, propsAreEqual);
