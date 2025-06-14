import { MovementType } from "@prisma/client";

export interface QueryGetMovement {
  createdAt: {
    gte: Date;
    lte: Date;
  };
  itemId?: number;
  type?: MovementType;
  batchCode?: {
    contains: string;
    mode: 'insensitive';
  };
}