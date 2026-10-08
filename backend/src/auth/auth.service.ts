import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { JwtService } from '@nestjs/jwt';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { hash, verify } from 'argon2';
import { DatabaseService } from '../db/database.module';
import { refreshSessions, users } from '../db/schema';
import {
  AuthPayload,
  LoginInput,
  SignupInput,
  UpdateProfileInput,
  User,
} from './auth.types';

type UserRecord = typeof users.$inferSelect;

export type AuthSession = {
  auth: AuthPayload;
  refreshToken: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly database: DatabaseService,
    private readonly jwtService: JwtService,
  ) {}

  async signup(input: SignupInput): Promise<AuthSession> {
    const name = input.name.trim();
    const email = this.normalizeEmail(input.email);

    if (!name) {
      throw new BadRequestException('Name is required.');
    }

    if (input.password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters.');
    }

    const [existingUser] = await this.database.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser) {
      throw new ConflictException('An account with this email already exists.');
    }

    const passwordHash = await hash(input.password);
    const [newUser] = await this.database.db
      .insert(users)
      .values({ name, email, passwordHash })
      .returning();

    return this.createSession(newUser);
  }

  async login(input: LoginInput): Promise<AuthSession> {
    const email = this.normalizeEmail(input.email);
    const [user] = await this.database.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user || !(await verify(user.passwordHash, input.password))) {
      throw new UnauthorizedException('Email or password is incorrect.');
    }

    return this.createSession(user);
  }

  async refresh(refreshToken: string): Promise<AuthSession> {
    const [sessionId, secret, extraPart] = refreshToken.split('.');

    if (!sessionId || !secret || extraPart) {
      throw new UnauthorizedException('The refresh token is invalid or expired.');
    }

    const [session] = await this.database.db
      .select()
      .from(refreshSessions)
      .where(eq(refreshSessions.id, sessionId))
      .limit(1);

    if (
      !session ||
      session.revokedAt ||
      session.expiresAt <= new Date() ||
      !(await verify(session.refreshTokenHash, secret))
    ) {
      throw new UnauthorizedException('The refresh token is invalid or expired.');
    }

    const nextSecret = randomBytes(32).toString('base64url');
    const nextHash = await hash(nextSecret);
    const [rotatedSession] = await this.database.db
      .update(refreshSessions)
      .set({ refreshTokenHash: nextHash })
      .where(
        and(
          eq(refreshSessions.id, session.id),
          eq(refreshSessions.refreshTokenHash, session.refreshTokenHash),
          isNull(refreshSessions.revokedAt),
          gt(refreshSessions.expiresAt, new Date()),
        ),
      )
      .returning();

    if (!rotatedSession) {
      throw new UnauthorizedException('The refresh token has already been used.');
    }

    const [user] = await this.database.db
      .select()
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);

    if (!user) {
      throw new UnauthorizedException('The user account was not found.');
    }

    return {
      auth: await this.createAuthPayload(user, session.id),
      refreshToken: `${session.id}.${nextSecret}`,
    };
  }

  async getProfile(userId: number): Promise<User> {
    const [user] = await this.database.db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new UnauthorizedException('User account was not found.');
    }

    return this.toPublicUser(user);
  }

  async updateProfile(
    userId: number,
    input: UpdateProfileInput,
  ): Promise<User> {
    const changes: { name?: string; email?: string } = {};

    if (input.name !== undefined) {
      const name = input.name.trim();
      if (!name) {
        throw new BadRequestException('Name cannot be empty.');
      }
      changes.name = name;
    }

    if (input.email !== undefined) {
      const email = this.normalizeEmail(input.email);
      const [existingUser] = await this.database.db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existingUser && existingUser.id !== userId) {
        throw new ConflictException('An account with this email already exists.');
      }

      changes.email = email;
    }

    if (Object.keys(changes).length === 0) {
      return this.getProfile(userId);
    }

    const [updatedUser] = await this.database.db
      .update(users)
      .set(changes)
      .where(eq(users.id, userId))
      .returning();

    if (!updatedUser) {
      throw new UnauthorizedException('User account was not found.');
    }

    return this.toPublicUser(updatedUser);
  }

  private async createSession(user: UserRecord): Promise<AuthSession> {
    const refreshSecret = randomBytes(32).toString('base64url');
    const refreshTokenHash = await hash(refreshSecret);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const [session] = await this.database.db
      .insert(refreshSessions)
      .values({ userId: user.id, refreshTokenHash, expiresAt })
      .returning({ id: refreshSessions.id });

    return {
      auth: await this.createAuthPayload(user, session.id),
      refreshToken: `${session.id}.${refreshSecret}`,
    };
  }

  private async createAuthPayload(
    user: UserRecord,
    sessionId: string,
  ): Promise<AuthPayload> {
    const accessToken = await this.jwtService.signAsync({
      sub: String(user.id),
      email: user.email,
      sid: sessionId,
    });

    return {
      accessToken,
      user: this.toPublicUser(user),
    };
  }

  private toPublicUser(user: UserRecord): User {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    };
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }
}
