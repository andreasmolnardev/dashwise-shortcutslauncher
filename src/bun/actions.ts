import { $ } from "bun";
import type { ActionResult, App, MediaAction } from "../shared/types";

// ─── Media Controls ──────────────────────────────────────────────────────────
// Uses AppleScript to send media key events via osascript

export async function mediaControl(action: MediaAction): Promise<ActionResult> {
  const scripts: Record<MediaAction, string> = {
    play: `tell application "System Events" to key code 49`,
    pause: `tell application "System Events" to key code 49`,
    stop: `tell application "System Events" to key code 49`,
    next: `tell application "System Events" to key code 124 using {command down}`,
    previous: `tell application "System Events" to key code 123 using {command down}`,
  };

  // For play/pause/stop use the media key approach
  const mediaKeyScripts: Record<string, string> = {
    play: `
      tell application "System Events"
        key code 100 -- F8 media play/pause
      end tell`,
    pause: `
      tell application "System Events"
        key code 100 -- F8 media play/pause
      end tell`,
    stop: `
      tell application "System Events"
        key code 100 -- F8 media play/pause
      end tell`,
    next: `
      tell application "System Events"
        key code 101 -- F9 next track
      end tell`,
    previous: `
      tell application "System Events"
        key code 99 -- F7 previous track
      end tell`,
  };

  // Try using NowPlaying / media keys via HID
  const hidScript = `
    set vol to get volume settings
    tell application "System Events"
      ${action === "next" ? "key code 101" : action === "previous" ? "key code 99" : "key code 100"}
    end tell`;

  try {
    await $`osascript -e ${hidScript}`.quiet();
    return { success: true, message: `Media ${action} sent` };
  } catch (err) {
    // Fallback: try controlling frontmost music app directly
    try {
      const appScript =
        action === "play" || action === "pause" || action === "stop"
          ? `
            if application "Music" is running then
              tell application "Music" to ${action === "stop" ? "stop" : "playpause"}
            else if application "Spotify" is running then
              tell application "Spotify" to ${action === "stop" ? "stop" : "playpause"}
            end if`
          : `
            if application "Music" is running then
              tell application "Music" to ${action === "next" ? "next track" : "previous track"}
            else if application "Spotify" is running then
              tell application "Spotify" to ${action === "next" ? "next track" : "previous track"}
            end if`;

      await $`osascript -e ${appScript}`.quiet();
      return { success: true, message: `Media ${action} sent` };
    } catch (e2) {
      return {
        success: false,
        message: `Media control failed: ${e2 instanceof Error ? e2.message : String(e2)}`,
      };
    }
  }
}

// ─── Brightness ───────────────────────────────────────────────────────────────

export async function getBrightness(): Promise<{ level: number }> {
  try {
    const result = await $`osascript -e "tell application \\"System Preferences\\" to get brightness of first display"`.quiet().text();
    const level = parseFloat(result.trim());
    return { level: isNaN(level) ? 0.5 : level };
  } catch {
    // Use brightness utility if available
    try {
      const result = await $`brightness -l`.quiet().text();
      const match = result.match(/brightness\s+([\d.]+)/);
      return { level: match ? parseFloat(match[1]) : 0.5 };
    } catch {
      return { level: 0.5 };
    }
  }
}

export async function setBrightness(delta: number): Promise<ActionResult> {
  // delta is +1 or -1 (step) or a raw value if |delta| > 1
  const isStep = Math.abs(delta) === 1;

  if (isStep) {
    // Use key codes for brightness up/down
    const keyCode = delta > 0 ? 144 : 145; // F2 up / F1 down
    try {
      await $`osascript -e "tell application \\"System Events\\" to key code ${keyCode}"`.quiet();
      return { success: true, message: `Brightness ${delta > 0 ? "increased" : "decreased"}` };
    } catch {
      // Fallback: use brightness CLI if installed
      try {
        const current = (await getBrightness()).level;
        const next = Math.max(0, Math.min(1, current + delta * 0.1));
        await $`brightness ${next.toFixed(2)}`.quiet();
        return { success: true, message: `Brightness set to ${Math.round(next * 100)}%` };
      } catch (e) {
        return {
          success: false,
          message: `Brightness control failed. Install 'brightness' via brew: brew install brightness`,
        };
      }
    }
  } else {
    // Set absolute value (0.0–1.0)
    const value = Math.max(0, Math.min(1, delta));
    try {
      await $`brightness ${value.toFixed(2)}`.quiet();
      return { success: true, message: `Brightness set to ${Math.round(value * 100)}%` };
    } catch (e) {
      return {
        success: false,
        message: `Brightness control requires 'brightness' CLI: brew install brightness`,
      };
    }
  }
}

// ─── Do Not Disturb ──────────────────────────────────────────────────────────

export async function setDoNotDisturb(enabled: boolean): Promise<ActionResult> {
  // macOS 12+ uses Focus modes, older uses DND toggle
  const script = enabled
    ? `
      tell application "System Events"
        tell process "ControlCenter"
          -- Try to enable Focus/DND via shortcuts
        end tell
      end tell`
    : ``;

  // Use defaults write for older macOS
  try {
    if (enabled) {
      await $`defaults -currentHost write ~/Library/Preferences/ByHost/com.apple.notificationcenterui doNotDisturb -boolean true`.quiet();
      await $`defaults -currentHost write ~/Library/Preferences/ByHost/com.apple.notificationcenterui doNotDisturbDate -date "$(date -u +"%Y-%m-%d %H:%M:%S +0000")"`.quiet();
    } else {
      await $`defaults -currentHost write ~/Library/Preferences/ByHost/com.apple.notificationcenterui doNotDisturb -boolean false`.quiet();
    }
    await $`killall NotificationCenter`.quiet().nothrow();
    return {
      success: true,
      message: `Do Not Disturb ${enabled ? "enabled" : "disabled"}`,
    };
  } catch {
    // macOS 12+ Focus mode via shortcuts
    try {
      const focusScript = enabled
        ? `do shell script "shortcuts run 'Focus'"` 
        : `do shell script "shortcuts run 'Focus Off'"`;
      await $`osascript -e ${focusScript}`.quiet();
      return {
        success: true,
        message: `Focus mode ${enabled ? "enabled" : "disabled"} (Shortcuts)`,
      };
    } catch (e) {
      return {
        success: false,
        message: `DND toggle requires macOS permissions or a Focus shortcut named 'Focus'`,
      };
    }
  }
}

// ─── App Listing ─────────────────────────────────────────────────────────────

const APP_DIRS = [
  "/Applications",
  `${process.env.HOME}/Applications`,
  "/System/Applications",
  "/System/Applications/Utilities",
];

export async function listApps(): Promise<App[]> {
  const apps: App[] = [];
  const seen = new Set<string>();

  for (const dir of APP_DIRS) {
    try {
      const result = await $`find ${dir} -maxdepth 1 -name "*.app" -type d`.quiet().text();
      const paths = result
        .split("\n")
        .map((p) => p.trim())
        .filter(Boolean);

      for (const path of paths) {
        const name = path.split("/").pop()?.replace(".app", "") ?? "";
        if (!seen.has(name)) {
          seen.add(name);
          apps.push({ name, path });
        }
      }
    } catch {
      // dir may not exist on all systems
    }
  }

  return apps.sort((a, b) => a.name.localeCompare(b.name));
}

export async function searchApps(query: string): Promise<App[]> {
  const all = await listApps();
  const q = query.toLowerCase();
  return all.filter(
    (a) => a.name.toLowerCase().includes(q) || a.path.toLowerCase().includes(q)
  );
}

export async function launchApp(path: string): Promise<ActionResult> {
  try {
    await $`open ${path}`.quiet();
    return { success: true, message: `Launched ${path.split("/").pop()?.replace(".app", "")}` };
  } catch (e) {
    return {
      success: false,
      message: `Failed to launch: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

// ─── Raycast ─────────────────────────────────────────────────────────────────

const RAYCAST_PATH = "/Applications/Raycast.app";

export async function isRaycastInstalled(): Promise<boolean> {
  try {
    await $`test -d ${RAYCAST_PATH}`.quiet();
    return true;
  } catch {
    return false;
  }
}

export async function launchRaycast(query?: string): Promise<ActionResult> {
  const installed = await isRaycastInstalled();
  if (!installed) {
    return { success: false, message: "Raycast is not installed" };
  }

  try {
    if (query) {
      // Open Raycast with a prefilled search query via URL scheme
      const encoded = encodeURIComponent(query);
      await $`open "raycast://extensions/search?query=${encoded}"`.quiet().nothrow();
      // Fallback: just open Raycast
      await $`open ${RAYCAST_PATH}`.quiet();
    } else {
      await $`open ${RAYCAST_PATH}`.quiet();
    }
    return { success: true, message: "Raycast launched" };
  } catch (e) {
    return {
      success: false,
      message: `Failed to launch Raycast: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}
