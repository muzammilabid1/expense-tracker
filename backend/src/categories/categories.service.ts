import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, count, eq } from 'drizzle-orm';
import { DatabaseService } from '../db/database.module';
import { categories, transactions } from '../db/schema';
import { Category, CreateCategoryInput, UpdateCategoryInput } from './category.types';

@Injectable()
export class CategoriesService {
  constructor(private readonly database: DatabaseService) {}

  async list(userId: number): Promise<Category[]> {
    return this.database.db
      .select({ id: categories.id, userId: categories.userId, name: categories.name, type: categories.type, color: categories.color })
      .from(categories)
      .where(eq(categories.userId, userId))
      .orderBy(categories.name);
  }

  async create(userId: number, input: CreateCategoryInput): Promise<Category> {
    const name = input.name.trim();
    this.validateName(name);
    this.validateColor(input.color);
    try {
      const [category] = await this.database.db.insert(categories)
        .values({ userId, name, type: input.type, color: input.color ?? '#6e8d75' })
        .returning({ id: categories.id, userId: categories.userId, name: categories.name, type: categories.type, color: categories.color });
      return category;
    } catch (error) {
      this.rethrowUnique(error);
      throw error;
    }
  }

  async update(userId: number, input: UpdateCategoryInput): Promise<Category> {
    const [existing] = await this.database.db.select().from(categories)
      .where(and(eq(categories.id, input.id), eq(categories.userId, userId))).limit(1);
    if (!existing) throw new NotFoundException('Category not found.');

    if (input.type && input.type !== existing.type) {
      const [usage] = await this.database.db.select({ total: count() }).from(transactions)
        .where(and(eq(transactions.categoryId, input.id), eq(transactions.userId, userId)));
      if (usage.total > 0) throw new ConflictException('Category type cannot change while transactions use it.');
    }

    const changes: Partial<typeof categories.$inferInsert> = {};
    if (input.name !== undefined) {
      changes.name = input.name.trim();
      this.validateName(changes.name);
    }
    if (input.type !== undefined) changes.type = input.type;
    if (input.color !== undefined) {
      this.validateColor(input.color);
      changes.color = input.color;
    }
    if (Object.keys(changes).length === 0) return this.project(existing);

    try {
      const [updated] = await this.database.db.update(categories).set(changes)
        .where(and(eq(categories.id, input.id), eq(categories.userId, userId)))
        .returning({ id: categories.id, userId: categories.userId, name: categories.name, type: categories.type, color: categories.color });
      return updated;
    } catch (error) {
      this.rethrowUnique(error);
      throw error;
    }
  }

  async delete(userId: number, id: number): Promise<boolean> {
    const [existing] = await this.database.db.select({ id: categories.id }).from(categories)
      .where(and(eq(categories.id, id), eq(categories.userId, userId))).limit(1);
    if (!existing) throw new NotFoundException('Category not found.');
    const [usage] = await this.database.db.select({ total: count() }).from(transactions)
      .where(and(eq(transactions.categoryId, id), eq(transactions.userId, userId)));
    if (usage.total > 0) throw new ConflictException('Category cannot be deleted while transactions use it.');
    await this.database.db.delete(categories).where(and(eq(categories.id, id), eq(categories.userId, userId)));
    return true;
  }

  private project(row: typeof categories.$inferSelect): Category {
    return { id: row.id, userId: row.userId, name: row.name, type: row.type, color: row.color };
  }

  private validateName(name: string): void {
    if (!name || name.length > 100) throw new BadRequestException('Category name must be 1 to 100 characters.');
  }

  private validateColor(color?: string): void {
    if (color !== undefined && !/^#[0-9a-fA-F]{6}$/.test(color)) {
      throw new BadRequestException('Category color must be a six-digit hex color.');
    }
  }

  private rethrowUnique(error: unknown): void {
    if (this.getDatabaseErrorCode(error) === '23505') {
      throw new ConflictException('A category with this name and type already exists.');
    }
  }

  private getDatabaseErrorCode(error: unknown, visited = new Set<object>()): string | undefined {
    if (typeof error !== 'object' || error === null || visited.has(error)) return undefined;
    visited.add(error);

    if ('code' in error && typeof error.code === 'string') return error.code;
    if ('cause' in error) return this.getDatabaseErrorCode(error.cause, visited);
    return undefined;
  }
}
