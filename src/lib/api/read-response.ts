type ApiEnvelope<T> =
  | { success: true; data: T }
  | { success: false; error?: { message?: string } };

export async function readApiJson<T>(response: Response, fallback: string): Promise<T> {
  const text = await response.text();
  let payload: ApiEnvelope<T> | null = null;

  if (text) {
    try {
      payload = JSON.parse(text) as ApiEnvelope<T>;
    } catch {
      payload = null;
    }
  }

  if (!payload || typeof payload !== "object" || !("success" in payload)) {
    throw new Error(
      response.status === 404
        ? "This request did not reach the API. Refresh the page and try again."
        : fallback,
    );
  }

  if (!payload.success) {
    throw new Error(payload.error?.message || fallback);
  }

  return payload.data;
}
