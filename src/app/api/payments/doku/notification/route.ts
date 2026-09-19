import { getDokuConfig } from "@/lib/doku/config";
import { verifyDokuSignature } from "@/lib/doku/signature";
import { applyDokuNotification, parseDokuNotification } from "@/server/payments";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const clientId = request.headers.get("client-id");
  const requestId = request.headers.get("request-id");
  const timestamp = request.headers.get("request-timestamp");
  const signature = request.headers.get("signature");
  const config = getDokuConfig();
  if (!clientId || !requestId || !timestamp || clientId !== config.clientId || !verifyDokuSignature({ clientId, requestId, timestamp, requestTarget: "/api/payments/doku/notification", rawBody, secretKey: config.secretKey, signature })) return Response.json({ message: "invalid signature" }, { status: 401 });
  let payload: unknown;
  try { payload = JSON.parse(rawBody); } catch { return Response.json({ message: "invalid payload" }, { status: 400 }); }
  const notification = parseDokuNotification(payload);
  if (!notification) return Response.json({ message: "invalid payload" }, { status: 400 });
  const result = await applyDokuNotification(notification);
  return Response.json({ message: result === "acknowledged" ? "OK" : result }, { status: result === "mismatch" ? 422 : 200 });
}
