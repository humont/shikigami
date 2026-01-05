import {
  AGENT_INSTRUCTIONS_CONTENT,
  getStructuredContent,
  type AgentGuideStructured,
} from "../../content/agent-instructions";

export interface AgentGuideOptions {
  json?: boolean;
}

export { AgentGuideStructured };

export interface AgentGuideResult {
  success: boolean;
  content?: string;
  structured?: AgentGuideStructured;
  error?: string;
}

export async function runAgentGuide(
  options: AgentGuideOptions = {}
): Promise<AgentGuideResult> {
  if (options.json) {
    return {
      success: true,
      content: AGENT_INSTRUCTIONS_CONTENT,
      structured: getStructuredContent(),
    };
  }

  return {
    success: true,
    content: AGENT_INSTRUCTIONS_CONTENT,
  };
}
