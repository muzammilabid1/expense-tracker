export class ApiError extends Error {
  constructor(message: string, readonly code?: string) {
    super(message);
    this.name = 'ApiError';
  }
}

type User = { id: string; name: string; email: string; createdAt: string };
type AuthPayload = { accessToken: string; user: User };

const endpoint = (process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:3000/graphql').replace(/\/$/, '');

type GraphqlEnvelope<T> = { data?: T; errors?: Array<{ message?: string; extensions?: { code?: string; originalError?: { message?: string | string[] } } }> };

function errorText<T>(body: GraphqlEnvelope<T>): { message: string; code?: string } {
  const error = body.errors?.[0];
  const original = error?.extensions?.originalError?.message;
  const message = Array.isArray(original) ? original.join(', ') : original || error?.message;
  return { message: message || 'The request could not be completed.', code: error?.extensions?.code };
}

async function request<T>(query: string, variables?: Record<string, unknown>, token?: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ query, variables }),
      cache: 'no-store',
    });
  } catch {
    throw new ApiError(`Could not reach the backend at ${endpoint}. Check that NestJS is running and NEXT_PUBLIC_GRAPHQL_URL is correct.`);
  }

  let body: GraphqlEnvelope<T>;
  try {
    body = (await response.json()) as GraphqlEnvelope<T>;
  } catch {
    throw new ApiError(`The backend returned an unreadable response (HTTP ${response.status}).`);
  }

  if (!response.ok || body.errors?.length || !body.data) {
    const error = errorText(body);
    throw new ApiError(error.message, error.code);
  }

  return body.data;
}

let refreshInFlight: Promise<AuthPayload> | null = null;

export function refreshSession(): Promise<AuthPayload> {
  refreshInFlight ??= request<{ refresh: AuthPayload }>(queries.refresh)
    .then(({ refresh }) => refresh)
    .finally(() => { refreshInFlight = null; });
  return refreshInFlight;
}

export async function gql<T>(query: string, variables?: Record<string, unknown>, token?: string): Promise<T> {
  try {
    return await request<T>(query, variables, token);
  } catch (error) {
    if (!(error instanceof ApiError) || !token || !/unauthenticated|token is invalid|token is expired|bearer token is required/i.test(error.message)) throw error;
    try {
      const session = await refreshSession();
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('auth:session', { detail: session }));
      return await request<T>(query, variables, session.accessToken);
    } catch (refreshError) {
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('auth:expired'));
      throw refreshError;
    }
  }
}

export const queries = {
  signup: `mutation Signup($input: SignupInput!) { signup(input: $input) }`,
  verifySignup: `mutation VerifySignup($input: VerifySignupInput!) { verifySignup(input: $input) { accessToken user { id name email createdAt } } }`,
  login: `mutation Login($input: LoginInput!) { login(input: $input) { accessToken user { id name email createdAt } } }`,
  refresh: `mutation Refresh { refresh { accessToken user { id name email createdAt } } }`,
  logout: `mutation Logout { logout }`,
  me: `query Me { me { id name email createdAt } }`,
  updateProfile: `mutation UpdateProfile($input: UpdateProfileInput!) { updateProfile(input: $input) { id name email createdAt } }`,
  requestEmailChange: `mutation RequestEmailChange($email: String!) { requestEmailChange(email: $email) }`,
  verifyEmailChange: `mutation VerifyEmailChange($code: String!) { verifyEmailChange(code: $code) { id name email createdAt } }`,
  categories: `query Categories { categories { id userId name type color } }`,
  createCategory: `mutation CreateCategory($input: CreateCategoryInput!) { createCategory(input: $input) { id userId name type color } }`,
  updateCategory: `mutation UpdateCategory($input: UpdateCategoryInput!) { updateCategory(input: $input) { id userId name type color } }`,
  deleteCategory: `mutation DeleteCategory($id: Int!) { deleteCategory(id: $id) }`,
  transactions: `query Transactions($filter: TransactionFilterInput) { transactions(filter: $filter) { id userId title amount type date categoryId note } }`,
  createTransaction: `mutation CreateTransaction($input: CreateTransactionInput!) { createTransaction(input: $input) { id userId title amount type date categoryId note } }`,
  updateTransaction: `mutation UpdateTransaction($input: UpdateTransactionInput!) { updateTransaction(input: $input) { id userId title amount type date categoryId note } }`,
  deleteTransaction: `mutation DeleteTransaction($id: Int!) { deleteTransaction(id: $id) }`,
  monthlySummary: `query MonthlySummary($year: Int!, $month: Int!) { monthlySummary(year: $year, month: $month) { year month incomeTotal expenseTotal netTotal categoryBreakdown { categoryId categoryName color type total } } }`,
};
