import "server-only";
import { randomBytes, randomInt } from "node:crypto";

export function newId(prefix: string) {
  return `${prefix}_${randomBytes(9).toString("base64url")}`;
}

export function newPin() {
  return String(randomInt(0, 10000)).padStart(4, "0");
}

export function newTxnRef() {
  return `LCU-ISW-${Date.now()}-${randomInt(100, 999)}`;
}

/** Per-booking gate pass for an off-campus provider entering campus. */
export function newOrderGatePass() {
  return `LCU-GP-${randomBytes(3).toString("hex").toUpperCase()}`;
}

/** Standing pass issued to a verified off-campus provider. */
export function newStoreGatePass() {
  return `LCU-PASS-${randomInt(100, 999)}${randomBytes(1).toString("hex").toUpperCase()}`;
}
