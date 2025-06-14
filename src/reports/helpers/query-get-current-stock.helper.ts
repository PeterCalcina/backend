import { Status } from "@prisma/client";

export interface QueryGetCurrentStock {
  qty: {
    gte: number;
    lte: number;
  };
  id: number;
  name: {
    contains: string;
    mode: 'insensitive';
  };
  userId: string;
  status: Status;
}