export function output(data: unknown, isJson: boolean): void {
  if (isJson) {
    console.log(JSON.stringify(data, null, 2));
  } else if (typeof data === "string") {
    console.log(data);
  } else {
    console.log(data);
  }
}

export function outputError(message: string, isJson: boolean): void {
  if (isJson) {
    console.error(JSON.stringify({ error: message }));
  } else {
    console.error(`Error: ${message}`);
  }
}

export function formatFuda(fuda: {
  id: string;
  title: string;
  status: string;
  priority: number;
  spiritType: string;
}): string {
  return `${fuda.id} [${fuda.status}] ${fuda.title} (p${fuda.priority}, ${fuda.spiritType})`;
}

export function formatFudaList(
  fudas: Array<{
    id: string;
    title: string;
    status: string;
    priority: number;
    spiritType: string;
  }>
): string {
  if (fudas.length === 0) {
    return "No fuda found.";
  }
  return fudas.map(formatFuda).join("\n");
}
