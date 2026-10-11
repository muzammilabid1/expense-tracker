import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { JwtService } from '@nestjs/jwt';

type JwtPayload = {
  sub: string;
  email: string;
  sid: string;
};

type AuthenticatedUser = {
  sub: number;
  email: string;
  sid: string;
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
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      const userId = Number(payload.sub);

      if (
        !payload ||
        !Number.isSafeInteger(userId) ||
        userId <= 0 ||
        typeof payload.email !== 'string' ||
        typeof payload.sid !== 'string' ||
        payload.sid.length === 0
      ) {
        throw new Error('Invalid user claims.');
      }

      req.user = { ...payload, sub: userId };
      return true;
    } catch {
      throw new UnauthorizedException('The token is invalid or expired.');
    }
  }
}
