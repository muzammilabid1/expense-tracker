export type TransactionType = 'INCOME' | 'EXPENSE';

export type User = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
};

export type AuthPayload = { accessToken: string; user: User };

export type Category = {
  id: string;
  userId: string;
  name: string;
  type: TransactionType;
  color: string;
};

export type Transaction = {
  id: string;
  userId: string;
  title: string;
  amount: number;
  type: TransactionType;
  date: string;
  categoryId: number;
  note?: string | null;
};

export type CategoryBreakdown = {
  categoryId: number;
  categoryName: string;
  color: string;
  type: TransactionType;
  total: number;
};

export type MonthlySummary = {
  year: number;
  month: number;
  incomeTotal: number;
  expenseTotal: number;
  netTotal: number;
  categoryBreakdown: CategoryBreakdown[];
};
