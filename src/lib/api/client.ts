export const USE_MOCK_API = process.env.NEXT_PUBLIC_USE_MOCK_API !== "false";
export async function postJSON(path: string, body: unknown): Promise<unknown> {
 const response = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(30000) });
 const data = await response.json().catch(() => null);
 if (!response.ok) throw new Error(typeof data?.error === "string" ? data.error : `Request failed (${response.status}). Please try again.`);
 return data;
}
