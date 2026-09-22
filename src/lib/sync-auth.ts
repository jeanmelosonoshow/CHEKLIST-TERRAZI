import { tokensMatch } from "./auth-crypto";

export function authorizeSync(request: Request) {
  const configured = process.env.SYNC_API_TOKEN;
  const authorization = request.headers.get("authorization");
  if (!configured || configured.length < 32 || !authorization?.startsWith("Bearer ")) return false;
  return tokensMatch(authorization.slice(7), configured);
}
