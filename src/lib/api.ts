import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * Thrown by API helpers to short-circuit with an HTTP error response.
 * Caught by `handleApiError` in route catch blocks.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}

/**
 * Authenticate the request. Returns the Supabase client and user.
 * Throws ApiError(401) if not authenticated.
 */
export async function requireAuth() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new ApiError('Unauthorized', 401);
  }

  return { supabase, user };
}

/**
 * Validate and extract a numeric stock ID from route params.
 * Throws ApiError(400) if invalid.
 */
export async function validateStockId(params: Promise<{ stockId: string }>) {
  const { stockId } = await params;
  if (!/^\d{4,6}$/.test(stockId)) {
    throw new ApiError('Invalid stock ID', 400);
  }
  return stockId;
}

/**
 * Parse and validate an integer query parameter.
 * Throws ApiError(400) if outside the allowed range.
 */
export function parseIntParam(
  searchParams: URLSearchParams,
  name: string,
  defaultVal: number,
  min: number,
  max: number
): number {
  const raw = searchParams.get(name);
  if (raw === null) return defaultVal;

  const value = parseInt(raw, 10);
  if (isNaN(value) || value < min || value > max) {
    throw new ApiError(
      `Invalid "${name}" parameter. Must be between ${min} and ${max}.`,
      400
    );
  }
  return value;
}

/**
 * Catch handler for API routes. Converts ApiError to JSON response,
 * logs unexpected errors as 500.
 */
export function handleApiError(label: string, err: unknown): NextResponse {
  if (err instanceof ApiError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  console.error(`[${label}] unexpected error:`, err);
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}
