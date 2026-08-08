export function getBackendUrl() {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  if (backendUrl) {
    return backendUrl;
  }

  if (process.env.NODE_ENV === "development") {
    return "http://localhost:3000/v1";
  }

  throw new Error("Missing NEXT_PUBLIC_BACKEND_URL");
}
