import { CanvasEntity } from "../types/vtt.js";
import { sessionManager } from "../network/sessionManager.js";

/**
 * Returns true if the current user is permitted to select (and interact with) the given locked entity,
 * according to their personal vtt_allow_locked_image_selection setting:
 * - "none" (or "false"): Can't select any locked images
 * - "own" (or "true" or default when not set): Can only select locked images that I locked
 * - "all": Can select any locked images
 */
export function canSelectLockedImage(ent: CanvasEntity): boolean {
  if (ent.type !== "image" || !ent.locked) {
    return true;
  }
  const setting = localStorage.getItem("vtt_allow_locked_image_selection") || "own";
  if (setting === "none" || setting === "false") {
    return false;
  }
  if (setting === "all") {
    return true;
  }
  // setting === "own" (or legacy "true" which now defaults to "own" behavior per user request)
  const myPeerId = sessionManager.myPeerId || "local";
  const locker = (ent as any).lockedBy || ent.lastModifiedBy;
  if (!locker) {
    return false;
  }
  return locker === myPeerId;
}
