import "server-only";
import { ISW_MERCHANT_CODE, ISW_REQUERY_BASE } from "../interswitch";

const REQUERY_BASE = process.env.ISW_REQUERY_BASE_URL || ISW_REQUERY_BASE;

export interface RequeryResult {
  ok: boolean;
  reachable: boolean;
  responseCode?: string;
  responseDescription?: string;
  amountKobo?: number;
  paymentReference?: string;
}

/**
 * Asks Interswitch for the real status of a transaction. Never trust the
 * browser's onComplete callback on its own: anyone can fake it.
 */
export async function requeryTransaction(txnRef: string, amountKobo: number): Promise<RequeryResult> {
  const url = new URL("/collections/api/v1/gettransaction.json", REQUERY_BASE);
  url.searchParams.set("merchantcode", ISW_MERCHANT_CODE);
  url.searchParams.set("transactionreference", txnRef);
  url.searchParams.set("amount", String(amountKobo));

  let data: Record<string, unknown>;
  try {
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    });
    data = await res.json();
  } catch (err) {
    console.error("Interswitch requery failed", err);
    return { ok: false, reachable: false, responseDescription: "Could not reach Interswitch to confirm payment." };
  }

  const responseCode = String(data.ResponseCode ?? "");
  const amount = Number(data.Amount ?? 0);
  // Interswitch may report the amount with fees added, so it must be at least the order total.
  const ok = responseCode === "00" && amount >= amountKobo;
  return {
    ok,
    reachable: true,
    responseCode,
    responseDescription: String(data.ResponseDescription ?? (ok ? "Approved" : "Not approved")),
    amountKobo: amount,
    paymentReference: data.PaymentReference ? String(data.PaymentReference) : undefined,
  };
}
