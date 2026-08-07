import ky, { type Options, type SearchParamsOption } from "ky";

import {
  getAccessToken,
  handleUnauthorizedResponse,
} from "@/features/auth/lib/api-auth";

type ApiFetchOptions = {
  method?: string;
  params?: Record<string, unknown>;
  data?: unknown;
  body?: BodyInit | Record<string, unknown> | null;
  headers?: Options["headers"];
  signal?: AbortSignal;
};

export type ErrorType<ErrorData = unknown> = ErrorData;
export type BodyType<BodyData = unknown> = BodyData;

const api = ky.create({
  prefix: process.env.NEXT_PUBLIC_BACKEND_URL,
  hooks: {
    beforeRequest: [
      async ({ request }) => {
        const token = await getAccessToken();

        if (token) {
          request.headers.set("Authorization", `Bearer ${token}`);
        }
      },
    ],
    afterResponse: [
      async ({ response }) => {
        if (response.status === 401) {
          await handleUnauthorizedResponse();
        }
      },
    ],
  },
});

export async function apiFetch<TResponse>(
  url: string,
  options: ApiFetchOptions = {},
): Promise<TResponse> {
  const response = await api(url, {
    method: options.method ?? "GET",
    headers: options.headers,
    searchParams: getSearchParams(options.params),
    ...getBodyOptions(options),
    signal: options.signal,
  });

  if (response.status === 204) {
    return undefined as TResponse;
  }

  return response.json<TResponse>();
}

function getSearchParams(
  params?: Record<string, unknown>,
): SearchParamsOption | undefined {
  if (!params) {
    return undefined;
  }

  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => searchParams.append(key, String(item)));
      return;
    }

    searchParams.set(key, String(value));
  });

  return searchParams;
}

function getBodyOptions(options: ApiFetchOptions): Pick<Options, "body" | "json"> {
  const body = options.body ?? options.data;

  if (!body) {
    return {};
  }

  if (
    typeof body === "string" ||
    body instanceof Blob ||
    body instanceof FormData ||
    body instanceof URLSearchParams
  ) {
    return { body };
  }

  return { json: body };
}
