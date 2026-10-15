import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { randomBytes, randomInt } from 'node:crypto';
import { JwtService } from '@nestjs/jwt';
import { and, eq, gt, isNull, lte, ne, sql } from 'drizzle-orm';
import { hash, verify } from 'argon2';
import { DatabaseService } from '../db/database.module';
import {
  emailChangeVerifications,
  passwordResetVerifications,
  refreshSessions,
  signupVerifications,
  users,
} from '../db/schema';
import { EmailService } from './email.service';
import {
  AuthPayload,
  LoginInput,
  ResetPasswordInput,
  SignupInput,
  UpdateProfileInput,
  User,
} from './auth.types';

type UserRecord = typeof users.$inferSelect;

type VerifyEmailChangeResult =
  | { status: 'verified'; user: UserRecord }
  | { status: 'missing' | 'expired' | 'locked' | 'incorrect' | 'in_use' };

type VerifySignupResult =
  | { status: 'verified'; user: UserRecord }
  | { status: 'missing' | 'expired' | 'locked' | 'incorrect' | 'in_use' };

export type AuthSession = {
  auth: AuthPayload;
  refreshToken: string;
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly database: DatabaseService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
  ) {}

  async signup(input: SignupInput): Promise<boolean> {
    const name = input.name.trim();
    const email = this.normalizeEmail(input.email);

    if (!name || name.length > 100) {
      throw new BadRequestException('Name must be 1 to 100 characters.');
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

    const now = new Date();
    const [pendingSignup] = await this.database.db
      .select()
      .from(signupVerifications)
      .where(eq(signupVerifications.email, email))
      .limit(1);

    if (pendingSignup && now.getTime() - pendingSignup.createdAt.getTime() < 60_000) {
      throw new HttpException(
        'Wait one minute before requesting another code.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const code = String(randomInt(100_000, 1_000_000));
    const [passwordHash, codeHash] = await Promise.all([
      hash(input.password),
      hash(code),
    ]);
    const expiresAt = new Date(now.getTime() + 10 * 60_000);

    await this.database.db
      .insert(signupVerifications)
      .values({ name, email, passwordHash, codeHash, expiresAt, createdAt: now })
      .onConflictDoUpdate({
        target: signupVerifications.email,
        set: { name, passwordHash, codeHash, attempts: 0, expiresAt, createdAt: now },
      });

    try {
      await this.emailService.sendSignupVerificationCode(email, code);
    } catch (error) {
      this.logger.error(
        'Unable to send a signup verification code.',
        error instanceof Error ? error.stack : undefined,
      );
      await this.database.db
        .delete(signupVerifications)
        .where(eq(signupVerifications.email, email));
      throw new ServiceUnavailableException(
        'We could not send the verification email. Check the email settings and try again.',
      );
    }

    return true;
  }

  async verifySignup(emailInput: string, code: string): Promise<AuthSession> {
    const email = this.normalizeEmail(emailInput);
    if (!/^\d{6}$/.test(code)) {
      throw new BadRequestException('Enter the six-digit code from your email.');
    }

    let result: VerifySignupResult;
    try {
      result = await this.database.db.transaction(async (transaction) => {
        const [request] = await transaction
          .select()
          .from(signupVerifications)
          .where(eq(signupVerifications.email, email))
          .for('update')
          .limit(1);

        if (!request) return { status: 'missing' as const };
        if (request.expiresAt <= new Date()) {
          await transaction
            .delete(signupVerifications)
            .where(eq(signupVerifications.id, request.id));
          return { status: 'expired' as const };
        }
        if (request.attempts >= 5) return { status: 'locked' as const };
        if (!(await verify(request.codeHash, code))) {
          await transaction
            .update(signupVerifications)
            .set({ attempts: sql`${signupVerifications.attempts} + 1` })
            .where(eq(signupVerifications.id, request.id));
          return { status: 'incorrect' as const };
        }

        const [existingUser] = await transaction
          .select({ id: users.id })
          .from(users)
          .where(eq(users.email, request.email))
          .limit(1);
        if (existingUser) {
          await transaction
            .delete(signupVerifications)
            .where(eq(signupVerifications.id, request.id));
          return { status: 'in_use' as const };
        }

        const [newUser] = await transaction
          .insert(users)
          .values({
            name: request.name,
            email: request.email,
            passwordHash: request.passwordHash,
          })
          .returning();
        await transaction
          .delete(signupVerifications)
          .where(eq(signupVerifications.id, request.id));

        return newUser
          ? { status: 'verified' as const, user: newUser }
          : { status: 'missing' as const };
      });
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException('An account with this email already exists.');
      }
      throw error;
    }

    if (result.status === 'verified') return this.createSession(result.user);
    if (result.status === 'expired') {
      throw new BadRequestException('That code has expired. Request a new one.');
    }
    if (result.status === 'locked') {
      throw new HttpException(
        'Too many incorrect codes. Request a new code.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (result.status === 'incorrect') {
      throw new UnauthorizedException('That code is incorrect. Check it and try again.');
    }
    if (result.status === 'in_use') {
      throw new ConflictException('An account with this email already exists.');
    }
    throw new BadRequestException('There is no active signup for this email. Request a new code.');
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

  async requestPasswordReset(rawEmail: string): Promise<boolean> {
    const email = this.normalizeEmail(rawEmail);
    const [user] = await this.database.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    // Return the same result for unknown emails to prevent account enumeration.
    if (!user) return true;

    const now = new Date();
    const [existingRequest] = await this.database.db
      .select()
      .from(passwordResetVerifications)
      .where(eq(passwordResetVerifications.userId, user.id))
      .limit(1);

    if (existingRequest && now.getTime() - existingRequest.createdAt.getTime() < 60_000) {
      return true;
    }

    const code = String(randomInt(100_000, 1_000_000));
    const codeHash = await hash(code);
    const expiresAt = new Date(now.getTime() + 10 * 60_000);
    await this.database.db
      .insert(passwordResetVerifications)
      .values({ userId: user.id, codeHash, expiresAt, createdAt: now })
      .onConflictDoUpdate({
        target: passwordResetVerifications.userId,
        set: { codeHash, attempts: 0, expiresAt, createdAt: now },
      });

    try {
      await this.emailService.sendPasswordResetCode(email, code);
    } catch (error) {
      this.logger.error(
        'Unable to send a password reset verification code.',
        error instanceof Error ? error.stack : undefined,
      );
      await this.database.db
        .delete(passwordResetVerifications)
        .where(eq(passwordResetVerifications.userId, user.id));
      // Keep the public response identical when email delivery fails.
    }

    return true;
  }

  async resetPassword(input: ResetPasswordInput): Promise<boolean> {
    const email = this.normalizeEmail(input.email);
    if (!/^\d{6}$/.test(input.code)) {
      throw new BadRequestException('The code is invalid or expired, or no reset was requested.');
    }
    if (input.newPassword.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters.');
    }

    const outcome = await this.database.db.transaction(async (transaction) => {
      const [user] = await transaction
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      if (!user) return 'invalid' as const;

      const [request] = await transaction
        .select()
        .from(passwordResetVerifications)
        .where(eq(passwordResetVerifications.userId, user.id))
        .for('update')
        .limit(1);
      if (!request || request.expiresAt <= new Date() || request.attempts >= 5) {
        if (request?.expiresAt && request.expiresAt <= new Date()) {
          await transaction
            .delete(passwordResetVerifications)
            .where(eq(passwordResetVerifications.userId, user.id));
        }
        return 'invalid' as const;
      }

      if (!(await verify(request.codeHash, input.code))) {
        await transaction
          .update(passwordResetVerifications)
          .set({ attempts: sql`${passwordResetVerifications.attempts} + 1` })
          .where(eq(passwordResetVerifications.userId, user.id));
        return 'invalid' as const;
      }

      const passwordHash = await hash(input.newPassword);
      await transaction
        .update(users)
        .set({ passwordHash })
        .where(eq(users.id, user.id));
      await transaction
        .delete(passwordResetVerifications)
        .where(eq(passwordResetVerifications.userId, user.id));
      await transaction
        .update(refreshSessions)
        .set({ revokedAt: new Date() })
        .where(
          and(
            eq(refreshSessions.userId, user.id),
            isNull(refreshSessions.revokedAt),
          ),
        );
      return 'reset' as const;
    });

    if (outcome === 'invalid') {
      throw new UnauthorizedException(
        'The code is invalid or expired, or no reset was requested.',
      );
    }
    return true;
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

  async logout(userId: number, sessionId: string): Promise<void> {
    await this.database.db
      .update(refreshSessions)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(refreshSessions.id, sessionId),
          eq(refreshSessions.userId, userId),
          isNull(refreshSessions.revokedAt),
        ),
      );
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

  async requestEmailChange(userId: number, rawEmail: string): Promise<boolean> {
    const email = this.normalizeEmail(rawEmail);
    const [currentUser] = await this.database.db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!currentUser) {
      throw new UnauthorizedException('User account was not found.');
    }
    if (currentUser.email === email) {
      throw new BadRequestException('That is already your current email address.');
    }

    const now = new Date();
    await this.database.db
      .delete(emailChangeVerifications)
      .where(
        and(
          eq(emailChangeVerifications.userId, userId),
          lte(emailChangeVerifications.expiresAt, now),
        ),
      );

    const [existingUser] = await this.database.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser) {
      throw new ConflictException('An account with this email already exists.');
    }

    const [existingRequest] = await this.database.db
      .select()
      .from(emailChangeVerifications)
      .where(eq(emailChangeVerifications.userId, userId))
      .limit(1);

    if (existingRequest && now.getTime() - existingRequest.createdAt.getTime() < 60_000) {
      throw new HttpException(
        'Wait one minute before requesting another code.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const [emailInUse] = await this.database.db
      .select({ userId: emailChangeVerifications.userId })
      .from(emailChangeVerifications)
      .where(
        and(
          eq(emailChangeVerifications.email, email),
          ne(emailChangeVerifications.userId, userId),
        ),
      )
      .limit(1);

    if (emailInUse) {
      throw new ConflictException('A verification is already pending for this email.');
    }

    const code = String(randomInt(100_000, 1_000_000));
    const codeHash = await hash(code);
    const expiresAt = new Date(now.getTime() + 10 * 60_000);

    try {
      await this.database.db
        .insert(emailChangeVerifications)
        .values({ userId, email, codeHash, expiresAt, createdAt: now })
        .onConflictDoUpdate({
          target: emailChangeVerifications.userId,
          set: { email, codeHash, attempts: 0, expiresAt, createdAt: now },
        });
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException('A verification is already pending for this email.');
      }
      throw error;
    }

    try {
      await this.emailService.sendEmailChangeCode(email, code);
    } catch (error) {
      this.logger.error(
        'Unable to send an email change verification code.',
        error instanceof Error ? error.stack : undefined,
      );
      await this.database.db
        .delete(emailChangeVerifications)
        .where(
          and(
            eq(emailChangeVerifications.userId, userId),
            eq(emailChangeVerifications.email, email),
          ),
        );
      throw new ServiceUnavailableException(
        'We could not send the verification email. Check the email settings and try again.',
      );
    }

    return true;
  }

  async verifyEmailChange(userId: number, code: string): Promise<User> {
    if (!/^\d{6}$/.test(code)) {
      throw new BadRequestException('Enter the six-digit code from your email.');
    }

    let result: VerifyEmailChangeResult;
    try {
      result = await this.verifyEmailChangeTransaction(userId, code);
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException('That email address is no longer available.');
      }
      throw error;
    }

    if (result.status === 'verified') return this.toPublicUser(result.user);
    if (result.status === 'expired') {
      throw new BadRequestException('That code has expired. Request a new one.');
    }
    if (result.status === 'locked') {
      throw new HttpException(
        'Too many incorrect codes. Request a new code.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (result.status === 'incorrect') {
      throw new UnauthorizedException('That code is incorrect. Check it and try again.');
    }
    if (result.status === 'in_use') {
      throw new ConflictException('That email address is no longer available.');
    }
    throw new BadRequestException('There is no active email change. Request a new code.');
  }

  private async verifyEmailChangeTransaction(
    userId: number,
    code: string,
  ): Promise<VerifyEmailChangeResult> {
    return this.database.db.transaction(async (transaction) => {
      const [request] = await transaction
        .select()
        .from(emailChangeVerifications)
        .where(eq(emailChangeVerifications.userId, userId))
        .for('update')
        .limit(1);

      if (!request) return { status: 'missing' as const };
      if (request.expiresAt <= new Date()) {
        await transaction
          .delete(emailChangeVerifications)
          .where(eq(emailChangeVerifications.userId, userId));
        return { status: 'expired' as const };
      }
      if (request.attempts >= 5) {
        return { status: 'locked' as const };
      }
      if (!(await verify(request.codeHash, code))) {
        await transaction
          .update(emailChangeVerifications)
          .set({ attempts: sql`${emailChangeVerifications.attempts} + 1` })
          .where(eq(emailChangeVerifications.userId, userId));
        return { status: 'incorrect' as const };
      }

      const [emailOwner] = await transaction
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, request.email))
        .limit(1);

      if (emailOwner && emailOwner.id !== userId) {
        await transaction
          .delete(emailChangeVerifications)
          .where(eq(emailChangeVerifications.userId, userId));
        return { status: 'in_use' as const };
      }

      const [updatedUser] = await transaction
        .update(users)
        .set({ email: request.email })
        .where(eq(users.id, userId))
        .returning();

      await transaction
        .delete(emailChangeVerifications)
        .where(eq(emailChangeVerifications.userId, userId));

      return updatedUser
        ? { status: 'verified' as const, user: updatedUser }
        : { status: 'missing' as const };
    });
  }

  async updateProfile(
    userId: number,
    input: UpdateProfileInput,
  ): Promise<User> {
    const changes: { name?: string } = {};

    if (input.name !== undefined) {
      const name = input.name.trim();
      if (!name || name.length > 100) {
        throw new BadRequestException('Name must be 1 to 100 characters.');
      }
      changes.name = name;
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
    const normalizedEmail = email.trim().toLowerCase();
    if (
      normalizedEmail.length > 255 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
    ) {
      throw new BadRequestException('Provide a valid email address (up to 255 characters).');
    }
    return normalizedEmail;
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === '23505'
    );
  }
}
