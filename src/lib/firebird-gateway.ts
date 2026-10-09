import { createHash, createHmac, randomUUID } from "node:crypto";

export type FirebirdParameter = string | number | boolean | null;

type GatewayResponse<T> = {
  success: true;
  rows: T[];
  row_count: number;
  truncated: boolean;
  request_id?: string;
};

type GatewayOptions = {
  env?: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

export class FirebirdGatewayError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status = 502,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "FirebirdGatewayError";
  }
}

export async function queryFirebirdGateway<T extends Record<string, unknown>>(
  sql: string,
  params: FirebirdParameter[] = [],
  options: GatewayOptions = {},
): Promise<T[]> {
  const env = options.env ?? process.env;
  const url = String(env.FIREBIRD_GATEWAY_URL ?? "").trim().replace(/\/+$/, "");
  const tokenId = String(env.FIREBIRD_GATEWAY_TOKEN_ID ?? "").trim();
  const secret = String(env.FIREBIRD_GATEWAY_HMAC_SECRET ?? "").trim();
  const missing = [
    ["FIREBIRD_GATEWAY_URL", url],
    ["FIREBIRD_GATEWAY_TOKEN_ID", tokenId],
    ["FIREBIRD_GATEWAY_HMAC_SECRET", secret],
  ].filter(([, value]) => !value).map(([name]) => name);

  if (missing.length > 0) {
    throw new FirebirdGatewayError(
      `Configuração incompleta do Gateway: ${missing.join(", ")}.`,
      "FIREBIRD_GATEWAY_CONFIG_ERROR",
      500,
    );
  }

  const path = "/query";
  const body = JSON.stringify({ sql, params });
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = randomUUID();
  const bodyHash = createHash("sha256").update(body, "utf8").digest("hex");
  const canonical = [timestamp, nonce, "POST", path, bodyHash].join("\n");
  const signature = createHmac("sha256", secret).update(canonical, "utf8").digest("hex");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 35_000);

  try {
    const response = await (options.fetchImpl ?? fetch)(`${url}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenId}`,
        "Content-Type": "application/json",
        "X-Timestamp": timestamp,
        "X-Nonce": nonce,
        "X-Signature": signature,
      },
      body,
      cache: "no-store",
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => null) as GatewayResponse<T> | { error?: string; detail?: string } | null;

    if (!response.ok) {
      const detail = payload && "detail" in payload ? payload.detail : payload && "error" in payload ? payload.error : undefined;
      throw new FirebirdGatewayError(
        detail || `Gateway respondeu com HTTP ${response.status}.`,
        "FIREBIRD_GATEWAY_UPSTREAM_ERROR",
        response.status === 401 || response.status === 403 ? 502 : response.status,
      );
    }

    if (!payload || !("success" in payload) || payload.success !== true || !Array.isArray(payload.rows)) {
      throw new FirebirdGatewayError(
        "Resposta inválida do Gateway Firebird.",
        "FIREBIRD_GATEWAY_INVALID_RESPONSE",
      );
    }
    if (payload.truncated) {
      throw new FirebirdGatewayError(
        "O Gateway truncou o resultado da consulta.",
        "FIREBIRD_GATEWAY_TRUNCATED_RESPONSE",
      );
    }

    return payload.rows;
  } catch (error) {
    if (error instanceof FirebirdGatewayError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new FirebirdGatewayError(
        "Tempo limite ao consultar o Gateway Firebird.",
        "FIREBIRD_GATEWAY_TIMEOUT",
        504,
        { cause: error },
      );
    }
    throw new FirebirdGatewayError(
      "Falha de comunicação com o Gateway Firebird.",
      "FIREBIRD_GATEWAY_UNREACHABLE",
      503,
      { cause: error },
    );
  } finally {
    clearTimeout(timeout);
  }
}
