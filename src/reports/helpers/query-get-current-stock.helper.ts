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
}