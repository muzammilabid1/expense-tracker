import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { GraphqlRequestContext } from './graphql-context';

export const CurrentUserId = createParamDecorator(
  (_data: unknown, context: ExecutionContext): number => {
    const request = GqlExecutionContext.create(context).getContext<GraphqlRequestContext>().req;
    if (!request.user) throw new UnauthorizedException();
    return request.user.sub;
  },
);
