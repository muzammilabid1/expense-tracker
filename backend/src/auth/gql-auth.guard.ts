import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { JwtService } from '@nestjs/jwt';

type AuthenticatedUser = {
  sub: string;
  email: string;
};

type GraphqlContext = {
  req: {
    headers: {
      authorization?: string;
    };
    user?: AuthenticatedUser;
  };
};

@Injectable()
export class GqlAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const graphqlContext = GqlExecutionContext.create(context);
    const { req } = graphqlContext.getContext<GraphqlContext>();
    const authorization = req.headers.authorization;

    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('A bearer token is required.');
    }

    const token = authorization.slice('Bearer '.length);

    try {
      req.user = await this.jwtService.verifyAsync<AuthenticatedUser>(token);
      return true;
    } catch {
      throw new UnauthorizedException('The token is invalid or expired.');
    }
  }
}
