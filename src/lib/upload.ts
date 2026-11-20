"use client";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { clientStorage, firebaseClientEnabled } from "./firebase/client";

/** Resizes and re-encodes an image to WebP in the browser (keeps uploads small on campus data). */
async function compress(file: File, maxSide: number, quality: number): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image (photo or screenshot).");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", quality));
  if (!blob) throw new Error("Couldn't process that image.");
  return blob;
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/**
 * Uploads an image and returns a URL to store.
 * Firebase mode: Cloud Storage under uploads/{uid}/. Demo mode: a small data URL.
 */
export async function uploadImage(file: File, uid: string, folder: "docs" | "products"): Promise<string> {
  if (!firebaseClientEnabled) {
    const blob = await compress(file, 640, 0.7);
    return blobToDataUrl(blob);
  }
  const blob = await compress(file, folder === "docs" ? 1600 : 1000, 0.8);
  const path = `uploads/${uid}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
  try {
    const snap = await uploadBytes(ref(clientStorage(), path), blob, { contentType: "image/webp" });
    return await getDownloadURL(snap.ref);
  } catch (err) {
    // Storage not enabled yet (needs the Blaze plan): fall back to a small inline image.
    // The server only accepts these while it has no service account (demo data mode).
    console.warn("Firebase Storage upload failed, using inline image", err);
    return blobToDataUrl(await compress(file, 640, 0.7));
  }
}
