import { Field, Float, ID, InputType, Int, ObjectType } from '@nestjs/graphql';
import { TransactionType } from '../categories/category.types';

@ObjectType()
export class Transaction {
  @Field(() => ID)
  id!: number;

  @Field(() => Int)
  userId!: number;

  @Field()
  title!: string;

  @Field(() => Float)
  amount!: number;

  @Field(() => TransactionType)
  type!: 'INCOME' | 'EXPENSE';

  @Field()
  date!: string;

  @Field(() => Int)
  categoryId!: number;

  @Field(() => String, { nullable: true })
  note?: string | null;
}

@InputType()
export class CreateTransactionInput {
  @Field()
  title!: string;

  @Field(() => Float)
  amount!: number;

  @Field(() => TransactionType)
  type!: 'INCOME' | 'EXPENSE';

  @Field()
  date!: string;

  @Field(() => Int)
  categoryId!: number;

  @Field({ nullable: true })
  note?: string;
}

@InputType()
export class UpdateTransactionInput {
  @Field(() => Int)
  id!: number;

  @Field({ nullable: true })
  title?: string;

  @Field(() => Float, { nullable: true })
  amount?: number;

  @Field(() => TransactionType, { nullable: true })
  type?: 'INCOME' | 'EXPENSE';

  @Field({ nullable: true })
  date?: string;

  @Field(() => Int, { nullable: true })
  categoryId?: number;

  @Field({ nullable: true })
  note?: string;
}

@InputType()
export class TransactionFilterInput {
  @Field(() => TransactionType, { nullable: true })
  type?: 'INCOME' | 'EXPENSE';

  @Field(() => Int, { nullable: true })
  categoryId?: number;

  @Field({ nullable: true })
  from?: string;

  @Field({ nullable: true })
  to?: string;
}

@ObjectType()
export class CategoryBreakdown {
  @Field(() => Int)
  categoryId!: number;

  @Field()
  categoryName!: string;

  @Field()
  color!: string;

  @Field(() => TransactionType)
  type!: 'INCOME' | 'EXPENSE';

  @Field(() => Float)
  total!: number;
}

@ObjectType()
export class MonthlySummary {
  @Field(() => Int)
  year!: number;

  @Field(() => Int)
  month!: number;

  @Field(() => Float)
  incomeTotal!: number;

  @Field(() => Float)
  expenseTotal!: number;

  @Field(() => Float)
  netTotal!: number;

  @Field(() => [CategoryBreakdown])
  categoryBreakdown!: CategoryBreakdown[];
}
