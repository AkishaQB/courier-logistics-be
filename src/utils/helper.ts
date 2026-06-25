export function generateBagCode(direction: string): string {
  const timestamp = Date.now();
  return `BAG-${direction.toUpperCase()}-${timestamp}`;
}

export function generateTruckCode(): string {
  const timestamp = Date.now();
  return `TRK-${timestamp}`;
}
