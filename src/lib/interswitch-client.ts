"use client";
import {
  ISW_CURRENCY,
  ISW_MERCHANT_CODE,
  ISW_MODE,
  ISW_PAY_ITEM_ID,
  ISW_SCRIPT_URL,
  type IswInlineResponse,
} from "./interswitch";

declare global {
  interface Window {
    webpayCheckout?: (options: Record<string, unknown>) => void;
  }
}

let loading: Promise<void> | null = null;

/** Loads Interswitch's inline checkout script once. */
export function loadInterswitch(): Promise<void> {
  if (typeof window !== "undefined" && typeof window.webpayCheckout === "function") return Promise.resolve();
  loading ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = ISW_SCRIPT_URL;
    script.async = true;
    script.onload = () =>
      typeof window.webpayCheckout === "function"
        ? resolve()
        : reject(new Error("Interswitch loaded but checkout isn't available."));
    script.onerror = () => {
      loading = null;
      reject(new Error("Couldn't load Interswitch. Check your internet connection and try again."));
    };
    document.body.appendChild(script);
  });
  return loading;
}

/**
 * Opens the Interswitch Web Checkout popup. Resolves when the popup reports back.
 * The result is only a hint: the server must confirm the payment with Interswitch.
 */
export async function openInterswitchCheckout(opts: {
  txnRef: string;
  amountKobo: number;
  customerName?: string;
  customerId?: string;
  redirectUrl: string;
}): Promise<IswInlineResponse> {
  await loadInterswitch();
  return new Promise((resolve) => {
    window.webpayCheckout!({
      merchant_code: ISW_MERCHANT_CODE,
      pay_item_id: ISW_PAY_ITEM_ID,
      txn_ref: opts.txnRef,
      amount: opts.amountKobo,
      currency: ISW_CURRENCY,
      site_redirect_url: opts.redirectUrl,
      // Exactly the fields used in the organisers' sample checkout.
      onComplete: (response: IswInlineResponse) => resolve(response ?? {}),
      mode: ISW_MODE,
    });
  });
}
