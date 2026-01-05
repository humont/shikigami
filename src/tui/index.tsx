import React from "react";
import { render, type RenderOptions } from "ink";
import { App } from "./App";

interface FullscreenRenderOptions extends RenderOptions {
  fullscreen?: boolean;
}

export function run() {
  // Enter alternate screen buffer for fullscreen mode
  process.stdout.write("\x1B[?1049h");

  const instance = render(<App onExit={() => cleanup()} />, {
    fullscreen: true,
  } as FullscreenRenderOptions);

  function cleanup() {
    instance.unmount();
    // Exit alternate screen buffer
    process.stdout.write("\x1B[?1049l");
  }

  return instance;
}
