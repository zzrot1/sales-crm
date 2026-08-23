import { HTTPError } from "ky";


export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly body?: unknown,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "ApiError";
  }
}

const messagesByStatus: Record<number, string> = {
  0: "Nu am putut contacta serverul. Verifica conexiunea.",
  400: "Datele trimise nu sunt valide.",
  401: "Sesiunea a expirat. Autentifica-te din nou.",
  403: "Nu ai permisiunea pentru aceasta actiune.",
  404: "Resursa nu a fost gasita.",
  409: "Exista deja o inregistrare cu aceste date.",
  422: "Datele trimise nu sunt valide.",
  500: "A aparut o eroare pe server. Incearca din nou.",
};

function readMessage(body: unknown) {
  if (!body || typeof body !== "object") {
    return undefined;
  }

  const { message } = body as { message?: unknown };

  if (typeof message === "string" && message.trim()) {
    return message.trim();
  }

  if (Array.isArray(message) && typeof message[0] === "string") {
    return message[0];
  }

  return undefined;
}

export async function toApiError(error: unknown) {
  if (error instanceof ApiError) {
    return error;
  }

  if (!(error instanceof HTTPError)) {
    return new ApiError(0, messagesByStatus[0], undefined, { cause: error });
  }

  const { status } = error.response;
  const body = await error.response
    .clone()
    .json()
    .catch(() => undefined);

  return new ApiError(
    status,
    readMessage(body) ?? messagesByStatus[status] ?? "A aparut o eroare.",
    body,
    { cause: error },
  );
}

export function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : messagesByStatus[0];
}
