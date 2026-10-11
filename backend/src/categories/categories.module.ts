import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../db/database.module';
import { CategoriesResolver } from './categories.resolver';
import { CategoriesService } from './categories.service';

@Module({ imports: [DatabaseModule, AuthModule], providers: [CategoriesService, CategoriesResolver], exports: [CategoriesService] })
export class CategoriesModule {}
