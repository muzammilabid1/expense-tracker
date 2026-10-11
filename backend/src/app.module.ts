import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './db/database.module';
import { GraphqlRequestContext } from './graphql/graphql-context';
import { CategoriesModule } from './categories/categories.module';
import { TransactionsModule } from './transactions/transactions.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
      path: '/graphql',
      graphiql: true,
      context: (requestContext: { req: any; res: any }): GraphqlRequestContext => requestContext,
    }),
    AuthModule,
    CategoriesModule,
    TransactionsModule,
  ],
})
export class AppModule {}
