import { invoke } from "@tauri-apps/api/core";
import { listen, emit } from "@tauri-apps/api/event";
import { AppSettings, SystemTelemetry } from "../types";
import { DEFAULT_SETTINGS as DEF_SET } from "./telemetryAdapter";

export function isTauriEnv(): boolean {
  return (
    typeof window !== "undefined" &&
    ("__TAURI_INTERNALS__" in window || "__TAURI__" in window)
  );
}

export async function fetchSystemTelemetry(): Promise<SystemTelemetry> {
  if (isTauriEnv()) {
    return await invoke<SystemTelemetry>("get_telemetry_snapshot");
  }
  return generateMockTelemetry();
}

export async function loadSettingsFromBackend(): Promise<AppSettings> {
  if (isTauriEnv()) {
    try {
      const saved = await invoke<AppSettings | null>("get_app_settings");
      if (saved) {
        return { ...DEF_SET, ...saved };
      }
    } catch (e) {
      console.warn("Failed to load settings from backend:", e);
    }
  }
  const local = localStorage.getItem("power_gauge_hud_settings");
  if (local) {
    try {
      return { ...DEF_SET, ...JSON.parse(local) };
    } catch {
      // ignore
    }
  }
  return DEF_SET;
}

export async function saveSettingsToBackend(
  settings: AppSettings
): Promise<void> {
  localStorage.setItem("power_gauge_hud_settings", JSON.stringify(settings));
  if (isTauriEnv()) {
    try {
      await invoke("update_app_settings", { settings });
    } catch (e) {
      console.warn("Failed to update settings in backend:", e);
    }
  }
}

export async function detachGaugeWindow(
  gaugeId: string,
  title: string
): Promise<void> {
  if (isTauriEnv()) {
    await invoke("detach_gauge_window", { gaugeId, title });
  }
}

export async function dockGaugeWindow(gaugeId: string): Promise<void> {
  if (isTauriEnv()) {
    await invoke("dock_gauge_window", { gaugeId });
  }
}

export async function dockAllGaugeWindows(): Promise<void> {
  if (isTauriEnv()) {
    await invoke("dock_all_gauges");
  }
}

export async function openSettingsHub(): Promise<void> {
  if (isTauriEnv()) {
    await invoke("open_settings_window");
  }
}

export async function openFullDesktopApp(): Promise<void> {
  if (isTauriEnv()) {
    await invoke("open_full_app_window");
  }
}

export async function toggleFloatingHudDock(): Promise<boolean> {
  if (isTauriEnv()) {
    return await invoke<boolean>("toggle_floating_dock");
  }
  return true;
}

export async function setGhostModeBackend(enabled: boolean): Promise<void> {
  if (isTauriEnv()) {
    await invoke("set_ghost_mode", { enabled });
  }
}

export async function startWindowDrag(): Promise<void> {
  if (isTauriEnv()) {
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      await getCurrentWindow().startDragging();
    } catch (e) {
      console.warn("Drag failed:", e);
    }
  }
}

export async function subscribeTelemetry(
  cb: (telemetry: SystemTelemetry) => void
): Promise<() => void> {
  if (isTauriEnv()) {
    const unlisten = await listen<SystemTelemetry>("telemetry-tick", (ev) => {
      cb(ev.payload);
    });
    return unlisten;
  }
  const timer = window.setInterval(() => {
    cb(generateMockTelemetry());
  }, 1000);
  return () => window.clearInterval(timer);
}

export async function subscribeSettingsChanged(
  cb: (settings: AppSettings) => void
): Promise<() => void> {
  if (isTauriEnv()) {
    const unlisten = await listen<AppSettings>("settings-updated", (ev) => {
      cb({ ...DEF_SET, ...ev.payload });
    });
    return unlisten;
  }
  const handler = (e: StorageEvent) => {
    if (e.key === "power_gauge_hud_settings" && e.newValue) {
      try {
        cb({ ...DEF_SET, ...JSON.parse(e.newValue) });
      } catch {
        // ignore
      }
    }
  };
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}

export async function subscribePeakReset(cb: () => void): Promise<() => void> {
  if (isTauriEnv()) {
    const unlisten = await listen("reset-peaks", () => {
      cb();
    });
    return unlisten;
  }
  return () => {};
}

export async function triggerPeakResetGlobal(): Promise<void> {
  if (isTauriEnv()) {
    await emit("reset-peaks", {});
  }
}

let simPhase = 0;
function generateMockTelemetry(): SystemTelemetry {
  simPhase += 0.18;
  const cpuPct = 28 + 22 * Math.sin(simPhase) + 12 * Math.cos(simPhase * 2.3);
  const memPct = 54 + 4 * Math.sin(simPhase * 0.3);
  const disk0Active = Math.max(
    1,
    18 + 25 * Math.sin(simPhase * 1.4) + 15 * Math.cos(simPhase * 3.1)
  );
  const netDown = Math.max(
    12_000,
    (8.5 + 7.2 * Math.sin(simPhase * 1.7)) * 1024 * 1024
  );
  const netUp = Math.max(
    4_000,
    (1.8 + 1.4 * Math.cos(simPhase * 1.3)) * 1024 * 1024
  );
  const gpu0Pct = Math.max(
    4,
    42 + 30 * Math.sin(simPhase * 0.9) + 10 * Math.cos(simPhase * 2.1)
  );

  return {
    timestampMs: Date.now(),
    cpu: {
      usagePercent: Math.max(2, Math.min(99, cpuPct)),
      perCorePercent: [35, 48, 22, 19, 44, 31, 25, 18],
      frequencyMhz: 4650 + Math.round(250 * Math.sin(simPhase)),
      temperatureC: 56 + Math.round(9 * Math.sin(simPhase * 0.7)),
      powerWatts: 68 + Math.round(22 * Math.sin(simPhase)),
      brand: "AMD Ryzen / Intel Core Processor",
      physicalCores: 8,
      logicalCores: 16,
      processCount: 248,
    },
    memory: {
      usagePercent: memPct,
      usedGb: Number(((32 * memPct) / 100).toFixed(1)),
      totalGb: 32.0,
      availableGb: Number((32 - (32 * memPct) / 100).toFixed(1)),
      swapUsedGb: 2.4,
      swapTotalGb: 16.0,
      swapPercent: 15.0,
    },
    disks: [
      {
        id: "disk-0",
        index: 0,
        label: "DISK 0",
        subLabel: "C:",
        model: "NVMe System SSD (C:)",
        mountPoints: ["C:\\"],
        isPhysical: true,
        activeTimePercent: disk0Active,
        usedSpacePercent: 64.2,
        readBytesPerSec: disk0Active * 4.2 * 1024 * 1024,
        writeBytesPerSec: disk0Active * 1.8 * 1024 * 1024,
        usedGb: 642,
        totalGb: 1000,
      },
      {
        id: "disk-1",
        index: 1,
        label: "DISK 1",
        subLabel: "D:",
        model: "NVMe Data SSD (D:)",
        mountPoints: ["D:\\"],
        isPhysical: true,
        activeTimePercent: Math.max(0, disk0Active * 0.35),
        usedSpacePercent: 41.8,
        readBytesPerSec: disk0Active * 0.9 * 1024 * 1024,
        writeBytesPerSec: disk0Active * 0.4 * 1024 * 1024,
        usedGb: 836,
        totalGb: 2000,
      },
    ],
    networks: [
      {
        id: "ethernet",
        label: "ETHERNET",
        interfaceName: "Ethernet",
        isEthernet: true,
        downloadBytesPerSec: netDown,
        uploadBytesPerSec: netUp,
        linkSpeedMbps: 1000,
        utilizationPercent: ((netDown + netUp) * 8) / (1000 * 1_000_000) * 100,
        autoScalePercent: Math.min(100, ((netDown + netUp) / (25 * 1024 * 1024)) * 100),
        downloadPercent: Math.min(100, (netDown / (20 * 1024 * 1024)) * 100),
        uploadPercent: Math.min(100, (netUp / (20 * 1024 * 1024)) * 100),
      },
    ],
    gpus: [
      {
        id: "gpu-0",
        index: 0,
        label: "GPU 0",
        name: "NVIDIA GeForce RTX",
        vendor: "NVIDIA",
        coreUsagePercent: gpu0Pct,
        vramUsedGb: 5.8,
        vramTotalGb: 12.0,
        vramPercent: (5.8 / 12.0) * 100,
        temperatureC: 61 + Math.round(7 * Math.sin(simPhase * 0.5)),
        fanSpeedPercent: 45,
        powerWatts: 145 + Math.round(35 * Math.sin(simPhase * 0.8)),
        clockMhz: 2520,
      },
    ],
  };
}
