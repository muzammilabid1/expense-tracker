import {
  Args,
  Context,
  Mutation,
  Query,
  Resolver,
} from '@nestjs/graphql';
import { UnauthorizedException, UseGuards } from '@nestjs/common';
import { AuthService, AuthSession } from './auth.service';
import {
  AuthPayload,
  LoginInput,
  SignupInput,
  UpdateProfileInput,
  User,
  VerifySignupInput,
} from './auth.types';
import { GqlAuthGuard } from './gql-auth.guard';
import type { GraphqlRequestContext } from '../graphql/graphql-context';

@Resolver()
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  @Mutation(() => Boolean)
  signup(@Args('input') input: SignupInput): Promise<boolean> {
    return this.authService.signup(input);
  }

  @Mutation(() => AuthPayload)
  async verifySignup(
    @Args('input') input: VerifySignupInput,
    @Context() context: GraphqlRequestContext,
  ): Promise<AuthPayload> {
    return this.withRefreshCookie(
      await this.authService.verifySignup(input.email, input.code),
      context,
    );
  }

  @Mutation(() => AuthPayload)
  async login(
    @Args('input') input: LoginInput,
    @Context() context: GraphqlRequestContext,
  ): Promise<AuthPayload> {
    return this.withRefreshCookie(await this.authService.login(input), context);
  }

  @Mutation(() => AuthPayload)
  async refresh(
    @Context() context: GraphqlRequestContext,
  ): Promise<AuthPayload> {
    const token = this.readRefreshCookie(context.req.headers.cookie);
    const session = await this.authService.refresh(token);
    context.res.cookie('refreshToken', session.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/graphql',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    return session.auth;
  }

  @Mutation(() => Boolean)
  @UseGuards(GqlAuthGuard)
  async logout(@Context() context: GraphqlRequestContext): Promise<boolean> {
    const user = context.req.user!;
    await this.authService.logout(user.sub, user.sid);
    context.res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/graphql',
    });
    return true;
  }

  @Query(() => User)
  @UseGuards(GqlAuthGuard)
  me(@Context() context: GraphqlRequestContext): Promise<User> {
    return this.authService.getProfile(context.req.user!.sub);
  }

  @Mutation(() => User)
  @UseGuards(GqlAuthGuard)
  updateProfile(
    @Args('input') input: UpdateProfileInput,
    @Context() context: GraphqlRequestContext,
  ): Promise<User> {
    return this.authService.updateProfile(context.req.user!.sub, input);
  }

  @Mutation(() => Boolean)
  @UseGuards(GqlAuthGuard)
  requestEmailChange(
    @Args('email') email: string,
    @Context() context: GraphqlRequestContext,
  ): Promise<boolean> {
    return this.authService.requestEmailChange(context.req.user!.sub, email);
  }

  @Mutation(() => User)
  @UseGuards(GqlAuthGuard)
  verifyEmailChange(
    @Args('code') code: string,
    @Context() context: GraphqlRequestContext,
  ): Promise<User> {
    return this.authService.verifyEmailChange(context.req.user!.sub, code);
  }

  private withRefreshCookie(
    session: AuthSession,
    context: GraphqlRequestContext,
  ): AuthPayload {
    context.res.cookie('refreshToken', session.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/graphql',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    return session.auth;
  }

  private readRefreshCookie(cookieHeader?: string): string {
    const cookie = cookieHeader
      ?.split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith('refreshToken='));
    if (!cookie) {
      throw new UnauthorizedException('Refresh token cookie is required.');
    }
    return decodeURIComponent(cookie.slice('refreshToken='.length));
  }
}
