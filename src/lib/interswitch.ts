// Interswitch Payment Gateway (IPG) Web Checkout settings shared by client and server.
//
// One switch: NEXT_PUBLIC_ISW_MODE=TEST | LIVE
//   TEST → sandbox, Interswitch docs test merchant MX19329 (card option works with test cards).
//   LIVE → hackathon merchant; real cards / transfers only (from ₦10).
// NEXT_PUBLIC_ISW_MERCHANT_CODE / NEXT_PUBLIC_ISW_PAY_ITEM_ID override the profile if set.

export const ISW_MODE: "TEST" | "LIVE" = process.env.NEXT_PUBLIC_ISW_MODE === "LIVE" ? "LIVE" : "TEST";

const PROFILES = {
  TEST: {
    merchantCode: "MX19329", // Interswitch docs test merchant: card payments enabled
    payItemId: "Default_Payable_MX19329",
    scriptUrl: "https://newwebpay-sandbox.interswitchng.com/inline-checkout.js",
    requeryBase: "https://sandbox.interswitchng.com",
  },
  LIVE: {
    // Hackathon merchant. Team 20 shares "Hackathon Team 10" (pay item 9381029).
    merchantCode: "MX153376",
    payItemId: "9381029",
    scriptUrl: "https://newwebpay.interswitchng.com/inline-checkout.js",
    requeryBase: "https://webpay.interswitchng.com",
  },
} as const;

const profile = PROFILES[ISW_MODE];

export const ISW_MERCHANT_CODE = process.env.NEXT_PUBLIC_ISW_MERCHANT_CODE || profile.merchantCode;
export const ISW_PAY_ITEM_ID = process.env.NEXT_PUBLIC_ISW_PAY_ITEM_ID || profile.payItemId;
export const ISW_SCRIPT_URL = profile.scriptUrl;
export const ISW_REQUERY_BASE = profile.requeryBase;
export const ISW_CURRENCY = 566; // ISO 4217 numeric code for NGN

/** Shape of the object Interswitch passes to `onComplete`. */
export interface IswInlineResponse {
  resp?: string;
  desc?: string;
  txnref?: string;
  payRef?: string;
  retRef?: string;
  amount?: number;
  apprAmt?: number;
}
