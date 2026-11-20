"use client";
import { useState } from "react";
import { Check, Share2 } from "./icons";

/** WhatsApp-to-web bridge: vendors share their storefront link on status and group chats. */
export function ShareStore({ name, slug, tagline, className = "" }: { name: string; slug: string; tagline: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = `${location.origin}/store/${slug}`;
    const text = `${name} is on Lead Shop: ${tagline}. Order and pay safely here:`;
    if (navigator.share) {
      try {
        await navigator.share({ title: name, text, url });
        return;
      } catch {
        /* cancelled: fall back to copying */
      }
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      prompt("Copy your store link:", url);
    }
  }

  return (
    <button onClick={share} className={`btn-secondary ${className}`}>
      {copied ? <Check /> : <Share2 />}
      {copied ? "Link copied" : "Share store"}
    </button>
  );
}
