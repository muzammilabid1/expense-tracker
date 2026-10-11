import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CategoriesModule } from '../categories/categories.module';
import { DatabaseModule } from '../db/database.module';
import { TransactionsResolver } from './transactions.resolver';
import { TransactionsService } from './transactions.service';

@Module({ imports: [DatabaseModule, AuthModule, CategoriesModule], providers: [TransactionsService, TransactionsResolver] })
export class TransactionsModule {}
