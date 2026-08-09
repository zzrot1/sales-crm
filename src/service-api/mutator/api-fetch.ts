import ky, { type Options, type SearchParamsOption } from "ky";

import { getBackendUrl } from "@/common/config";
import { routes } from "@/common/routes";

type ApiFetchOptions = Omit<RequestInit, "body"> & {
  params?: Record<string, unknown>;
  data?: unknown;
  body?: BodyInit | null;
};

export type ErrorType<ErrorData = unknown> = ErrorData;
export type BodyType<BodyData = unknown> = BodyData;

const api = ky.create({
  prefix: getBackendUrl(),
  credentials: "include",
  timeout: 60000,
  hooks: {
    afterResponse: [
      ({ response }) => {
        if (response.status === 401) {
          redirectToLogin();
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
    return {
      data: undefined,
      status: response.status,
      headers: response.headers,
    } as TResponse;
  }

  return {
    data: await response.json(),
    status: response.status,
    headers: response.headers,
  } as TResponse;
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

function redirectToLogin() {
  if (typeof window === "undefined") {
    return;
  }

  const loginUrl = new URL(routes.login.path, window.location.origin);
  loginUrl.searchParams.set("reason", routes.login.reasons.unauthorized);
  window.location.href = loginUrl.toString();
}


