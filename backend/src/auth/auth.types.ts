import {
  Field,
  GraphQLISODateTime,
  ID,
  InputType,
  ObjectType,
} from '@nestjs/graphql';

@ObjectType()
export class User {
  @Field(() => ID)
  id!: number;

  @Field()
  name!: string;

  @Field()
  email!: string;

  @Field(() => GraphQLISODateTime)
  createdAt!: Date;
}

@ObjectType()
export class AuthPayload {
  @Field()
  accessToken!: string;

  @Field(() => User)
  user!: User;
}

@InputType()
export class SignupInput {
  @Field()
  name!: string;

  @Field()
  email!: string;

  @Field()
  password!: string;
}

@InputType()
export class LoginInput {
  @Field()
  email!: string;

  @Field()
  password!: string;
}

@InputType()
export class UpdateProfileInput {
  @Field({ nullable: true })
  name?: string;

  @Field({ nullable: true })
  email?: string;
}
