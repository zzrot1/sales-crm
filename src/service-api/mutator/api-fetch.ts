import ky, { HTTPError, type Options, type SearchParamsOption } from "ky";

import { getBackendUrl } from "@/common/config";
import { routes } from "@/common/routes";
import { getRefreshUrl } from "@/service-api/generated/endpoints/auth/auth";

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
});

let refreshPromise: Promise<boolean> | undefined;

export async function apiFetch<TResponse>(
  url: string,
  options: ApiFetchOptions = {},
): Promise<TResponse> {
  const requestOptions = getRequestOptions(options);
  let response: Response;

  try {
    response = await api(url, requestOptions);
  } catch (error) {
    if (!(error instanceof HTTPError) || error.response.status !== 401) {
      throw error;
    }

    if (isAuthRefreshRequest(url)) {
      redirectToLogin();
      throw error;
    }

    const tryRefresh = await refreshSession();

    if (!tryRefresh) {
      redirectToLogin();
      throw error;
    }

    try {
      response = await api(url, requestOptions);
    } catch (retryError) {
      if (retryError instanceof HTTPError && retryError.response.status === 401) {
        redirectToLogin();
      }

      throw retryError;
    }
  }

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

function getRequestOptions(options: ApiFetchOptions): Options {
  return {
    method: options.method ?? "GET",
    headers: options.headers,
    searchParams: getSearchParams(options.params),
    ...getBodyOptions(options),
    signal: options.signal,
  };
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

function isAuthRefreshRequest(url: string) {
  const refreshUrl = getRefreshUrl();
  return url === refreshUrl || url.endsWith(refreshUrl);
}

async function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = refreshSessionRequest();
  }

  return refreshPromise;
}

async function refreshSessionRequest() {
  try {
    await api.post(getRefreshUrl(), {
        headers: { "Content-Type": "application/json" },
        json: { refreshToken: "" },
    });

    return true;
  } catch {
    return false;
  } finally {
    refreshPromise = undefined;
  }
}

function redirectToLogin() {
  if (typeof window === "undefined") {
    return;
  }

  const loginUrl = new URL(routes.login.path, window.location.origin);
  loginUrl.searchParams.set("reason", routes.login.reasons.unauthorized);
  window.location.href = loginUrl.toString();
}


