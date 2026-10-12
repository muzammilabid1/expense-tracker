import { Logger, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './db/database.module';
import { GraphqlRequestContext } from './graphql/graphql-context';
import { CategoriesModule } from './categories/categories.module';
import { TransactionsModule } from './transactions/transactions.module';

const graphqlLogger = new Logger('GraphQL');

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
      path: '/graphql',
      graphiql: process.env.NODE_ENV !== 'production',
      debug: process.env.NODE_ENV !== 'production',
      formatError: (formattedError, error) => {
        const originalError = formattedError.extensions?.originalError as
          | { statusCode?: unknown }
          | undefined;
        const statusCode = originalError?.statusCode;
        const isInternalError =
          typeof statusCode === 'number'
            ? statusCode >= 500
            : formattedError.extensions?.code === 'INTERNAL_SERVER_ERROR';

        if (!isInternalError) return formattedError;

        const errorName = error instanceof Error ? error.name : 'UnknownError';
        const path = formattedError.path?.join('.') ?? 'unknown field';
        graphqlLogger.error(`Request failed in ${path} (${errorName}).`);

        return {
          message: 'Something went wrong. Please try again.',
          ...(formattedError.locations ? { locations: formattedError.locations } : {}),
          ...(formattedError.path ? { path: formattedError.path } : {}),
          extensions: { code: 'INTERNAL_SERVER_ERROR' },
        };
      },
      context: (requestContext: { req: any; res: any }): GraphqlRequestContext => requestContext,
    }),
    AuthModule,
    CategoriesModule,
    TransactionsModule,
  ],
})
export class AppModule {}
