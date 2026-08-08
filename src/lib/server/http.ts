import type { APIContext } from 'astro';

export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get('origin');
  return origin === null || origin === new URL(request.url).origin;
}

export function safeReturnPath(value: FormDataEntryValue | string | null | undefined, fallback = '/account') {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) {
    return fallback;
  }

  return value.startsWith('/api/') ? fallback : value;
}

export function redirect(location: string, status: 303 | 307 = 303): Response {
  return new Response(null, {
    headers: { Location: location },
    status,
  });
}

export async function readForm(request: Request, maximumBytes = 16_384): Promise<FormData> {
  const contentType = request.headers.get('content-type') ?? '';
  const contentLength = Number(request.headers.get('content-length') ?? '0');

  if (!contentType.includes('application/x-www-form-urlencoded') && !contentType.includes('multipart/form-data')) {
    throw new TypeError('Unsupported form content type.');
  }

  if (Number.isFinite(contentLength) && contentLength > maximumBytes) {
    throw new RangeError('Form is too large.');
  }

  return request.formData();
}

export function clearAuthAttemptCookies(context: Pick<APIContext, 'cookies'>) {
  context.cookies.delete('velora_otp_email', { path: '/' });
  context.cookies.delete('velora_return_to', { path: '/' });
}
