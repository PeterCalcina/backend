import { Prisma } from "@prisma/client";

export type QueryGetExpiringStock = {
  type: 'ENTRY';
  remainingQuantity?: {
    gt: number;
  };
  expirationDate?: Prisma.DateTimeFilter;
  itemId: number;
};