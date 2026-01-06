import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import { TopBar, type Tab } from "./components/TopBar";
import { BottomBar, type CommandHint } from "./components/BottomBar";
import { FudaList } from "./components/FudaList";
import { LogView } from "./components/LogView";
import { useFudaList } from "./hooks/useFudaList";
import { useAuditLog } from "./hooks/useAuditLog";

type TabId = "fuda" | "log";

const TABS: Tab[] = [
  { id: "fuda", label: "Fuda", shortcut: "1" },
  { id: "log", label: "Log", shortcut: "2" },
];

const TAB_SHORTCUTS: Record<string, TabId> = {
  "1": "fuda",
  "2": "log",
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
  initialTab = "fuda",
  activeTab: controlledActiveTab,
  onTabChange,
}: AppProps) {
  const [internalActiveTab, setInternalActiveTab] = useState<TabId>(initialTab);
  const [selectedFudaIndex, setSelectedFudaIndex] = useState(0);
  const [selectedLogIndex, setSelectedLogIndex] = useState(0);

  const activeTab = controlledActiveTab ?? internalActiveTab;
  const { fudas, loading, error } = useFudaList({ all: true });
  const { entries: logEntries, loading: logLoading, error: logError } = useAuditLog();

  const hints: CommandHint[] = [
    { key: "q", description: "Quit" },
    { key: "1/2", description: "Switch tab" },
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
    <Box flexDirection="column" height="100%">
      <TopBar tabs={TABS} activeTab={activeTab} />
      <Box flexDirection="row" flexGrow={1}>
        <Box flexDirection="column" flexGrow={1}>
          {activeTab === "fuda" && (
            loading ? (
              <Text>Loading...</Text>
            ) : error ? (
              <Text color="red">Error: {error}</Text>
            ) : fudas.length === 0 ? (
              <Text dimColor>No fuda found</Text>
            ) : (
              <FudaList
                fudas={fudas}
                selectedIndex={selectedFudaIndex}
                onSelect={setSelectedFudaIndex}
              />
            )
          )}
          {activeTab === "log" && (
            logLoading ? (
              <Text>Loading...</Text>
            ) : logError ? (
              <Text color="red">Error: {logError}</Text>
            ) : logEntries.length === 0 ? (
              <Text dimColor>No audit entries</Text>
            ) : (
              <LogView
                entries={logEntries}
                selectedIndex={selectedLogIndex}
                onSelect={setSelectedLogIndex}
              />
            )
          )}
        </Box>
      </Box>
      <BottomBar hints={hints} view={activeTab} />
    </Box>
  );
}
