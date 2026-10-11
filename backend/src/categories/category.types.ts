import { Field, ID, InputType, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { transactionTypeEnum } from '../db/schema';

export const TransactionType = {
  INCOME: 'INCOME',
  EXPENSE: 'EXPENSE',
} as const;

registerEnumType(TransactionType, { name: 'TransactionType' });

@ObjectType()
export class Category {
  @Field(() => ID)
  id!: number;

  @Field(() => Int)
  userId!: number;

  @Field()
  name!: string;

  @Field(() => TransactionType)
  type!: (typeof transactionTypeEnum.enumValues)[number];

  @Field()
  color!: string;
}

@InputType()
export class CreateCategoryInput {
  @Field()
  name!: string;

  @Field(() => TransactionType)
  type!: (typeof transactionTypeEnum.enumValues)[number];

  @Field({ nullable: true })
  color?: string;
}

@InputType()
export class UpdateCategoryInput {
  @Field(() => Int)
  id!: number;

  @Field({ nullable: true })
  name?: string;

  @Field(() => TransactionType, { nullable: true })
  type?: (typeof transactionTypeEnum.enumValues)[number];

  @Field({ nullable: true })
  color?: string;
}
