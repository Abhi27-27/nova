import {
  createProjectSchema,
  deriveProjectKey,
  listTasksQuerySchema,
  loginSchema,
  registerSchema,
  slugify,
  toPercentage,
} from '@nova/shared';
import { describe, expect, it } from 'vitest';

/**
 * The shared schemas are the contract the API and the web client both compile
 * against, so these tests are really about the contract rather than about Zod.
 */
describe('registration contract', () => {
  it('normalises the email address', () => {
    const result = registerSchema.parse({
      name: 'Ada Lovelace',
      email: '  ADA@Example.COM ',
      password: 'Password123',
    });

    expect(result.email).toBe('ada@example.com');
  });

  it('rejects passwords that miss a character class', () => {
    const weak = registerSchema.safeParse({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      password: 'alllowercase1',
    });

    expect(weak.success).toBe(false);
    expect(weak.error?.issues.some((issue) => issue.path[0] === 'password')).toBe(true);
  });

  it('does not impose the password policy on sign-in', () => {
    // Sign-in must accept whatever the account already has, otherwise tightening
    // the policy would lock existing users out.
    expect(loginSchema.safeParse({ email: 'ada@example.com', password: 'old' }).success).toBe(true);
  });
});

describe('project contract', () => {
  it('refuses a due date that precedes the start date', () => {
    const result = createProjectSchema.safeParse({
      name: 'Apollo',
      startDate: '2026-05-01',
      dueDate: '2026-04-01',
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['dueDate']);
  });

  it('applies the documented defaults', () => {
    const result = createProjectSchema.parse({ name: 'Apollo Web Platform' });

    expect(result.status).toBe('PLANNING');
    expect(result.color).toBe('#6366f1');
    expect(result.memberIds).toEqual([]);
  });
});

describe('task query contract', () => {
  it('accepts comma separated and repeated filter values alike', () => {
    const commaSeparated = listTasksQuerySchema.parse({ status: 'TODO,DONE' });
    const repeated = listTasksQuerySchema.parse({ status: ['TODO', 'DONE'] });

    expect(commaSeparated.status).toEqual(['TODO', 'DONE']);
    expect(repeated.status).toEqual(['TODO', 'DONE']);
  });

  it('rejects an unknown status rather than silently dropping it', () => {
    expect(listTasksQuerySchema.safeParse({ status: 'TODO,NONSENSE' }).success).toBe(false);
  });

  it('caps the page size so a client cannot ask for the whole table', () => {
    expect(listTasksQuerySchema.safeParse({ pageSize: 5000 }).success).toBe(false);
    expect(listTasksQuerySchema.parse({}).pageSize).toBe(25);
  });
});

describe('shared helpers', () => {
  it('derives readable project keys', () => {
    expect(deriveProjectKey('Apollo Web Platform')).toBe('AWP');
    expect(deriveProjectKey('Atlas')).toBe('ATLA');
  });

  it('builds url-safe slugs', () => {
    expect(slugify('  Nova Labs — Product & Design  ')).toBe('nova-labs-product-design');
  });

  it('treats an empty total as zero percent rather than dividing by zero', () => {
    expect(toPercentage(0, 0)).toBe(0);
    expect(toPercentage(3, 4)).toBe(75);
  });
});
