import React from "react";
import { Image as ExpoImage } from "expo-image";

export type ZibuSpriteProps = {
  isUpset: boolean;
  isSleeping: boolean;
  isFeeding: boolean;
  frame: number;
  sleepFrame: number;
  eatFrame: number;
  upsetFrame: number;
  DISPLAY_SIZE: number;
  COLS: number;
  ROWS: number;
  SLEEP_COLS: number;
  SLEEP_ROWS: number;
  EAT_COLS: number;
  EAT_ROWS: number;
  UPSET_COLS: number;
  UPSET_ROWS: number;
};

export default function ZibuSprite({
  isUpset,
  isSleeping,
  isFeeding,
  frame,
  sleepFrame,
  eatFrame,
  upsetFrame,
  DISPLAY_SIZE,
  COLS,
  ROWS,
  SLEEP_COLS,
  SLEEP_ROWS,
  EAT_COLS,
  EAT_ROWS,
  UPSET_COLS,
  UPSET_ROWS,
}: ZibuSpriteProps) {
  if (isUpset) {
    return (
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
    );
  } else if (isSleeping) {
    return (
      <ExpoImage
        source={require("../assets/sleep/sleep_spritesheet.png")}
        style={{
          width: DISPLAY_SIZE * SLEEP_COLS,
          height: DISPLAY_SIZE * SLEEP_ROWS,
          marginLeft: -((sleepFrame % SLEEP_COLS) * DISPLAY_SIZE),
          marginTop: -(Math.floor(sleepFrame / SLEEP_COLS) * DISPLAY_SIZE),
        }}
        contentFit="cover"
        cachePolicy="memory"
      />
    );
  } else if (isFeeding) {
    return (
      <ExpoImage
        source={require("../assets/eat/eat_spritesheet.png")}
        style={{
          width: DISPLAY_SIZE * EAT_COLS,
          height: DISPLAY_SIZE * EAT_ROWS,
          marginLeft: -((eatFrame % EAT_COLS) * DISPLAY_SIZE),
          marginTop: -(Math.floor(eatFrame / EAT_COLS) * DISPLAY_SIZE),
        }}
        contentFit="cover"
        cachePolicy="memory"
      />
    );
  } else {
    return (
      <ExpoImage
        source={require("../assets/happy-blink/blink_spritesheet.png")}
        style={{
          width: DISPLAY_SIZE * COLS,
          height: DISPLAY_SIZE * ROWS,
          marginLeft: -((frame % COLS) * DISPLAY_SIZE),
          marginTop: -(Math.floor(frame / COLS) * DISPLAY_SIZE),
        }}
        contentFit="cover"
        cachePolicy="memory"
      />
    );
  }
}
