import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/gql-auth.guard';
import { CurrentUserId } from '../graphql/current-user.decorator';
import { MonthlySummary, Transaction, TransactionFilterInput, CreateTransactionInput, UpdateTransactionInput } from './transaction.types';
import { TransactionsService } from './transactions.service';

@Resolver(() => Transaction)
@UseGuards(GqlAuthGuard)
export class TransactionsResolver {
  constructor(private readonly transactionService: TransactionsService) {}

  @Query(() => [Transaction])
  transactions(@CurrentUserId() userId: number, @Args('filter', { nullable: true }) filter?: TransactionFilterInput): Promise<Transaction[]> {
    return this.transactionService.list(userId, filter ?? {});
  }

  @Mutation(() => Transaction)
  createTransaction(@CurrentUserId() userId: number, @Args('input') input: CreateTransactionInput): Promise<Transaction> {
    return this.transactionService.create(userId, input);
  }

  @Mutation(() => Transaction)
  updateTransaction(@CurrentUserId() userId: number, @Args('input') input: UpdateTransactionInput): Promise<Transaction> {
    return this.transactionService.update(userId, input);
  }

  @Mutation(() => Boolean)
  deleteTransaction(@CurrentUserId() userId: number, @Args('id', { type: () => Int }) id: number): Promise<boolean> {
    return this.transactionService.delete(userId, id);
  }

  @Query(() => MonthlySummary)
  monthlySummary(@CurrentUserId() userId: number, @Args('year', { type: () => Int }) year: number, @Args('month', { type: () => Int }) month: number): Promise<MonthlySummary> {
    return this.transactionService.monthlySummary(userId, year, month);
  }
}
