import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/gql-auth.guard';
import { CurrentUserId } from '../graphql/current-user.decorator';
import { CategoriesService } from './categories.service';
import { Category, CreateCategoryInput, UpdateCategoryInput } from './category.types';

@Resolver(() => Category)
@UseGuards(GqlAuthGuard)
export class CategoriesResolver {
  constructor(private readonly categoryService: CategoriesService) {}

  @Query(() => [Category])
  categories(@CurrentUserId() userId: number): Promise<Category[]> {
    return this.categoryService.list(userId);
  }

  @Mutation(() => Category)
  createCategory(@CurrentUserId() userId: number, @Args('input') input: CreateCategoryInput): Promise<Category> {
    return this.categoryService.create(userId, input);
  }

  @Mutation(() => Category)
  updateCategory(@CurrentUserId() userId: number, @Args('input') input: UpdateCategoryInput): Promise<Category> {
    return this.categoryService.update(userId, input);
  }

  @Mutation(() => Boolean)
  deleteCategory(@CurrentUserId() userId: number, @Args('id', { type: () => Int }) id: number): Promise<boolean> {
    return this.categoryService.delete(userId, id);
  }
}
