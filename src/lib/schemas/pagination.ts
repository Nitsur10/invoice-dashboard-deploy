import { z } from 'zod';

export const sortOrderSchema = z.enum(['asc', 'desc']).default('desc');

export const pageSchema = z
  .string()
  .transform(val => parseInt(val, 10))
  .pipe(z.number().int().min(0))
  .catch(0);

export const limitSchema = z
  .string()
  .transform(val => parseInt(val, 10))
  .pipe(z.number().int().min(1).max(100))
  .catch(20);

export const sortBySchema = (allowed: readonly string[]) =>
  z.enum(allowed as [string, ...string[]]).default(allowed[0] as string);

export const paginationQuerySchema = z.object({
  page: pageSchema,
  limit: limitSchema,
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export interface PaginationResponse {
  total: number;
  pageCount: number;
  pageSize: number;
  pageIndex: number;
}