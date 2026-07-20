let batteryWarningShown = false;

export async function setupBatteryIndicator(): Promise<void> {
  const container = document.getElementById("battery-indicator-container");
  if (!container) return;

  const isMobileOrTouch = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    window.matchMedia("(max-width: 1024px), (pointer: coarse)").matches;

  if (!("getBattery" in navigator && typeof (navigator as any).getBattery === "function")) {
    return;
  }

  try {
    const battery = await (navigator as any).getBattery();
    
    // Display on mobile devices or touch screens
    if (!isMobileOrTouch && battery.charging && battery.level > 0.95) {
      return;
    }

    container.style.display = "flex";

    const updateBatteryUI = () => {
      const levelPercent = Math.round(battery.level * 100);
      const charging = battery.charging;

      let icon = "🔋";
      let color = "#4ade80";
      if (charging) {
        icon = "⚡";
        color = "#38bdf8";
      } else if (levelPercent <= 20) {
        icon = "🪫";
        color = "#f43f5e";
      } else if (levelPercent <= 40) {
        icon = "🪫";
        color = "#fbbf24";
      }

      container.innerHTML = `
        <button id="btn-battery-indicator" class="btn-glass" data-tooltip="Battery: ${levelPercent}% ${charging ? '(Charging)' : '(Discharging)'}. Click for FPS Saver options." style="padding: 4px 8px; font-size: 12px; font-weight: 700; color: ${color}; display: flex; align-items: center; gap: 4px; border: 1px solid ${color}40; border-radius: 8px; cursor: pointer;">
          <span>${icon}</span>
          <span>${levelPercent}%</span>
        </button>
      `;

      const btn = container.querySelector("#btn-battery-indicator");
      if (btn) {
        btn.addEventListener("click", () => {
          showBatterySaverWindow(battery.level, battery.charging);
        });
      }

      // Check if below 40% and not charging
      if (battery.level < 0.40 && !charging && !batteryWarningShown && !sessionStorage.getItem("vtt_battery_warned")) {
        batteryWarningShown = true;
        sessionStorage.setItem("vtt_battery_warned", "true");
        showBatterySaverWindow(battery.level, battery.charging);
      }
    };

    battery.addEventListener("levelchange", updateBatteryUI);
    battery.addEventListener("chargingchange", updateBatteryUI);
    updateBatteryUI();
  } catch (err) {
    console.warn("[batteryUI] Could not initialize battery monitor:", err);
  }
}

export function showBatterySaverWindow(level: number, charging: boolean): void {
  if (document.getElementById("battery-saver-modal")) return;

  const levelPercent = Math.round(level * 100);
  const currentFps = localStorage.getItem("vtt_fps_limit") || "0";

  const modal = document.createElement("div");
  modal.id = "battery-saver-modal";
  modal.style.cssText = `
    position: fixed;
    top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(0, 0, 0, 0.65);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 99999;
  `;

  modal.innerHTML = `
    <div style="background: rgba(15, 23, 42, 0.95); border: 1px solid rgba(251, 191, 36, 0.6); border-radius: 16px; padding: 24px; max-width: 360px; width: 90%; box-shadow: 0 20px 50px rgba(0,0,0,0.85); display: flex; flex-direction: column; gap: 16px; text-align: center; color: #f8fafc; font-family: Outfit, sans-serif;">
      <div style="font-size: 38px; margin: 0 auto;">🪫</div>
      <h3 style="margin: 0; font-size: 18px; font-weight: 700; color: #fbbf24;">Low Battery Alert (${levelPercent}%)</h3>
      <p style="margin: 0; font-size: 13px; color: #cbd5e1; line-height: 1.5;">
        ${charging ? "Your device is charging, but current battery level is low." : "Your battery is below 40%."} Running the virtual tabletop at high frame rates can consume extra power. Would you like to lower the FPS limit right now to conserve battery?
      </p>
      <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 4px;">
        <button id="btn-battery-fps-30" class="btn-glass ${currentFps === '30' ? 'btn-primary' : ''}" style="padding: 10px; border-radius: 10px; font-size: 13px; font-weight: 700; cursor: pointer; border: 1px solid #38bdf8; color: #38bdf8; background: rgba(56, 189, 248, 0.15);">
          ⚡ Switch to 30 FPS (Battery Saver)
        </button>
        <button id="btn-battery-fps-20" class="btn-glass ${currentFps === '20' ? 'btn-primary' : ''}" style="padding: 10px; border-radius: 10px; font-size: 13px; font-weight: 700; cursor: pointer; border: 1px solid #c084fc; color: #c084fc; background: rgba(192, 132, 252, 0.15);">
          🔋 Switch to 20 FPS (Maximum Saver)
        </button>
        <button id="btn-battery-dismiss" class="btn-glass" style="padding: 8px; border-radius: 10px; font-size: 12px; color: #94a3b8; cursor: pointer; margin-top: 4px;">
          Dismiss / Keep ${currentFps === '0' || !currentFps ? '60' : currentFps} FPS
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const applyFps = (fpsVal: string) => {
    localStorage.setItem("vtt_fps_limit", fpsVal);
    modal.remove();
  };

  modal.querySelector("#btn-battery-fps-30")!.addEventListener("click", () => applyFps("30"));
  modal.querySelector("#btn-battery-fps-20")!.addEventListener("click", () => applyFps("20"));
  modal.querySelector("#btn-battery-dismiss")!.addEventListener("click", () => modal.remove());
}
