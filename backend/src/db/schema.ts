import {
  date,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const transactionTypeEnum = pgEnum('transaction_type', [
  'INCOME',
  'EXPENSE',
]);

export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 100 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex('users_email_idx').on(table.email)],
);

export const refreshSessions = pgTable(
  'refresh_sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    refreshTokenHash: varchar('refresh_token_hash', { length: 255 }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index('refresh_sessions_user_id_idx').on(table.userId)],
);

export const emailChangeVerifications = pgTable(
  'email_change_verifications',
  {
    userId: integer('user_id')
      .primaryKey()
      .references(() => users.id, { onDelete: 'cascade' }),
    email: varchar('email', { length: 255 }).notNull(),
    codeHash: varchar('code_hash', { length: 255 }).notNull(),
    attempts: integer('attempts').notNull().default(0),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex('email_change_verifications_email_idx').on(table.email)],
);

export const signupVerifications = pgTable(
  'signup_verifications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 100 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    codeHash: varchar('code_hash', { length: 255 }).notNull(),
    attempts: integer('attempts').notNull().default(0),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex('signup_verifications_email_idx').on(table.email)],
);

export const categories = pgTable(
  'categories',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 100 }).notNull(),
    type: transactionTypeEnum('type').notNull(),
    color: varchar('color', { length: 7 }).notNull().default('#6e8d75'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('categories_user_name_type_idx').on(
      table.userId,
      table.name,
      table.type,
    ),
  ],
);

export const transactions = pgTable(
  'transactions',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 150 }).notNull(),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    type: transactionTypeEnum('type').notNull(),
    date: date('date').notNull(),
    categoryId: integer('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'restrict' }),
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('transactions_user_date_idx').on(table.userId, table.date),
    index('transactions_category_id_idx').on(table.categoryId),
  ],
);
