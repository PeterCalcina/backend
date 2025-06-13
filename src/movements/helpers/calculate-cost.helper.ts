import { Movement } from '@prisma/client';

export function calculateCost(entries: Movement[], qty: number, unitCost: number): number {
  if (entries.length === 0) return unitCost;

  const totalCost = entries.reduce((acc, entry) => acc + entry.unitCost * entry.quantity, 0);
  const totalQty = entries.reduce((acc, entry) => acc + entry.quantity, 0);
  return (totalCost + unitCost * qty) / (totalQty + qty);
}