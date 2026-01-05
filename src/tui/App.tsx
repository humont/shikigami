import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import { TopBar, type Tab } from "./components/TopBar";
import { BottomBar, type CommandHint } from "./components/BottomBar";

type TabId = "list" | "details" | "log";

const TABS: Tab[] = [
  { id: "list", label: "List", shortcut: "1" },
  { id: "details", label: "Details", shortcut: "2" },
  { id: "log", label: "Log", shortcut: "3" },
];

const TAB_SHORTCUTS: Record<string, TabId> = {
  "1": "list",
  "2": "details",
  "3": "log",
};

interface AppProps {
  onExit?: () => void;
  inputMode?: boolean;
  initialTab?: TabId;
  activeTab?: TabId;
  onTabChange?: (tab: TabId) => void;
}

export function App({
  onExit,
  inputMode = false,
  initialTab = "list",
  activeTab: controlledActiveTab,
  onTabChange,
}: AppProps) {
  const [internalActiveTab, setInternalActiveTab] = useState<TabId>(initialTab);

  const activeTab = controlledActiveTab ?? internalActiveTab;

  const hints: CommandHint[] = [
    { key: "q", description: "Quit" },
    { key: "1/2/3", description: "Switch tab" },
    { key: "j/k", description: "Navigate" },
  ];

  useInput((input, key) => {
    // Handle quit
    if ((input === "q" && !inputMode) || key.ctrl && input === "c") {
      onExit?.();
      return;
    }

    // Handle tab switching
    const targetTab = TAB_SHORTCUTS[input];
    if (targetTab && targetTab !== activeTab) {
      if (controlledActiveTab === undefined) {
        setInternalActiveTab(targetTab);
      }
      onTabChange?.(targetTab);
    }
  });

  return (
    <Box flexDirection="column">
      <TopBar tabs={TABS} activeTab={activeTab} />
      <Box flexDirection="row" flexGrow={1}>
        <Box flexDirection="column" flexGrow={1}>
          {activeTab === "list" && <Text>List View</Text>}
          {activeTab === "details" && <Text>Details View</Text>}
          {activeTab === "log" && <Text>Log View</Text>}
        </Box>
      </Box>
      <BottomBar hints={hints} view={activeTab} />
    </Box>
  );
}
