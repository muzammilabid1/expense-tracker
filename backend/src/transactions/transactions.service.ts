import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, gte, lt, lte } from 'drizzle-orm';
import { DatabaseService } from '../db/database.module';
import { categories, transactions } from '../db/schema';
import { CreateTransactionInput, MonthlySummary, Transaction, TransactionFilterInput, UpdateTransactionInput } from './transaction.types';

@Injectable()
export class TransactionsService {
  constructor(private readonly database: DatabaseService) {}

  async list(userId: number, filter: TransactionFilterInput = {}): Promise<Transaction[]> {
    const conditions = [eq(transactions.userId, userId)];
    if (filter.type) conditions.push(eq(transactions.type, filter.type));
    if (filter.categoryId !== undefined) conditions.push(eq(transactions.categoryId, filter.categoryId));
    if (filter.from) { this.validateDate(filter.from); conditions.push(gte(transactions.date, filter.from)); }
    if (filter.to) { this.validateDate(filter.to); conditions.push(lte(transactions.date, filter.to)); }
    if (filter.from && filter.to && filter.from > filter.to) throw new BadRequestException('The start date must be before the end date.');
    const rows = await this.database.db.select().from(transactions)
      .where(and(...conditions)).orderBy(transactions.date);
    return rows.map((row) => this.project(row));
  }

  async create(userId: number, input: CreateTransactionInput): Promise<Transaction> {
    this.validateFields(input.title, input.amount, input.date);
    await this.requireMatchingCategory(userId, input.categoryId, input.type);
    const [row] = await this.database.db.insert(transactions).values({
      userId, title: input.title.trim(), amount: input.amount.toFixed(2), type: input.type,
      date: input.date, categoryId: input.categoryId, note: input.note?.trim() || null,
    }).returning();
    return this.project(row);
  }

  async update(userId: number, input: UpdateTransactionInput): Promise<Transaction> {
    const [existing] = await this.database.db.select().from(transactions)
      .where(and(eq(transactions.id, input.id), eq(transactions.userId, userId))).limit(1);
    if (!existing) throw new NotFoundException('Transaction not found.');
    const type = input.type ?? existing.type;
    const categoryId = input.categoryId ?? existing.categoryId;
    await this.requireMatchingCategory(userId, categoryId, type);
    if (input.date !== undefined) this.validateDate(input.date);
    if (input.title !== undefined && !input.title.trim()) throw new BadRequestException('Title is required.');
    if (input.amount !== undefined && (!Number.isFinite(input.amount) || input.amount <= 0 || input.amount >= 1_000_000_000_000)) throw new BadRequestException('Amount must be positive and within the supported range.');
    const changes: Partial<typeof transactions.$inferInsert> = {};
    if (input.title !== undefined) changes.title = input.title.trim();
    if (input.amount !== undefined) changes.amount = input.amount.toFixed(2);
    if (input.type !== undefined) changes.type = input.type;
    if (input.date !== undefined) changes.date = input.date;
    if (input.categoryId !== undefined) changes.categoryId = input.categoryId;
    if (input.note !== undefined) changes.note = input.note.trim() || null;
    if (Object.keys(changes).length === 0) return this.project(existing);
    const [updated] = await this.database.db.update(transactions).set(changes)
      .where(and(eq(transactions.id, input.id), eq(transactions.userId, userId))).returning();
    return this.project(updated);
  }

  async delete(userId: number, id: number): Promise<boolean> {
    const [deleted] = await this.database.db.delete(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId))).returning({ id: transactions.id });
    if (!deleted) throw new NotFoundException('Transaction not found.');
    return true;
  }

  async monthlySummary(userId: number, year: number, month: number): Promise<MonthlySummary> {
    if (!Number.isInteger(year) || year < 2000 || year > 9999 || !Number.isInteger(month) || month < 1 || month > 12) {
      throw new BadRequestException('Provide a valid year and month (1 to 12).');
    }
    const start = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(Date.UTC(year, month, 1));
    const end = `${endDate.getUTCFullYear()}-${String(endDate.getUTCMonth() + 1).padStart(2, '0')}-01`;
    const rows = await this.database.db.select({ amount: transactions.amount, type: transactions.type, categoryId: categories.id, categoryName: categories.name, color: categories.color })
      .from(transactions).innerJoin(categories, eq(transactions.categoryId, categories.id))
      .where(and(eq(transactions.userId, userId), gte(transactions.date, start), lt(transactions.date, end)));
    const breakdown = new Map<string, MonthlySummary['categoryBreakdown'][number]>();
    let incomeTotal = 0;
    let expenseTotal = 0;
    for (const row of rows) {
      const amount = Number(row.amount);
      if (row.type === 'INCOME') incomeTotal += amount; else expenseTotal += amount;
      const key = `${row.categoryId}:${row.type}`;
      const item = breakdown.get(key) ?? { categoryId: row.categoryId, categoryName: row.categoryName, color: row.color, type: row.type, total: 0 };
      item.total += amount;
      breakdown.set(key, item);
    }
    return { year, month, incomeTotal, expenseTotal, netTotal: incomeTotal - expenseTotal, categoryBreakdown: [...breakdown.values()] };
  }

  private async requireMatchingCategory(userId: number, categoryId: number, type: 'INCOME' | 'EXPENSE'): Promise<void> {
    const [category] = await this.database.db.select({ id: categories.id, type: categories.type }).from(categories)
      .where(and(eq(categories.id, categoryId), eq(categories.userId, userId))).limit(1);
    if (!category) throw new NotFoundException('Category not found.');
    if (category.type !== type) throw new ConflictException('Transaction type must match its category type.');
  }

  private validateFields(title: string, amount: number, date: string): void {
    if (!title.trim() || title.trim().length > 150) throw new BadRequestException('Title must be 1 to 150 characters.');
    if (!Number.isFinite(amount) || amount <= 0 || amount >= 1_000_000_000_000) throw new BadRequestException('Amount must be positive and within the supported range.');
    this.validateDate(date);
  }

  private validateDate(value: string): void {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
      throw new BadRequestException('Date must be a valid YYYY-MM-DD date.');
    }
  }

  private project(row: typeof transactions.$inferSelect): Transaction {
    return { id: row.id, userId: row.userId, title: row.title, amount: Number(row.amount), type: row.type, date: row.date, categoryId: row.categoryId, note: row.note };
  }
}
