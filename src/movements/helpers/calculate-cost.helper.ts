import { Movement } from "@prisma/client";

export function calculateWeightedAverageCost(
  entries: Movement[],
  newQty: number = 0,
  newUnitCost: number = 0
): number {
  const totalQty = entries.reduce((sum, entry) => sum + entry.quantity, 0);
  const totalCost = entries.reduce((sum, entry) => sum + entry.unitCost * entry.quantity, 0);

  const combinedQty = totalQty + newQty;
  const combinedCost = totalCost + newUnitCost * newQty;

  if (combinedQty === 0) return 0;

  return combinedCost / combinedQty;
}
