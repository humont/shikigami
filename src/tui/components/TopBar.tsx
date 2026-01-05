import React from "react";
import { Box, Text } from "ink";

export interface Tab {
  id: string;
  label: string;
  shortcut?: string;
}

interface TopBarProps {
  tabs: Tab[];
  activeTab: string;
}

export function TopBar({ tabs, activeTab }: TopBarProps) {
  return (
    <Box flexDirection="row" gap={1}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <Box key={tab.id}>
            {tab.shortcut && (
              <Text dimColor>[{tab.shortcut}]</Text>
            )}
            <Text> </Text>
            {isActive ? (
              <Text bold color="cyan">
                [{tab.label}]
              </Text>
            ) : (
              <Text>{tab.label}</Text>
            )}
          </Box>
        );
      })}
    </Box>
  );
}
