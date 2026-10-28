import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildNormalizedGauges,
  DEFAULT_SETTINGS,
  formatBytesPerSec,
  formatNetworkSpeed,
  getOrCreateGaugeConfig,
} from "./telemetryAdapter.ts";
import type { SystemTelemetry } from "../types.ts";

const sampleTelemetry: SystemTelemetry = {
  timestampMs: 1700000000000,
  cpu: {
    usagePercent: 45.6,
    perCorePercent: [40, 50, 45, 47],
    frequencyMhz: 4800,
    temperatureC: 62,
    powerWatts: 75,
    brand: "Intel(R) Core(TM) i7-14700K CPU",
    physicalCores: 8,
    logicalCores: 16,
    processCount: 210,
  },
  memory: {
    usagePercent: 50.0,
    usedGb: 16.0,
    totalGb: 32.0,
    availableGb: 16.0,
    swapUsedGb: 2.0,
    swapTotalGb: 8.0,
    swapPercent: 25.0,
  },
  disks: [
    {
      id: "disk-0",
      index: 0,
      label: "DISK 0",
      subLabel: "C:",
      model: "NVMe SSD (C:)",
      mountPoints: ["C:\\"],
      isPhysical: true,
      activeTimePercent: 32.0,
      usedSpacePercent: 70.0,
      readBytesPerSec: 12 * 1024 * 1024,
      writeBytesPerSec: 4 * 1024 * 1024,
      usedGb: 700,
      totalGb: 1000,
    },
    {
      id: "vol-c",
      index: 0,
      label: "DRIVE C:",
      subLabel: "C:",
      model: "Local Disk (C:)",
      mountPoints: ["C:\\"],
      isPhysical: false,
      activeTimePercent: 0,
      usedSpacePercent: 70.0,
      readBytesPerSec: 0,
      writeBytesPerSec: 0,
      usedGb: 700,
      totalGb: 1000,
    },
  ],
  networks: [
    {
      id: "ethernet",
      label: "ETHERNET",
      interfaceName: "Ethernet",
      isEthernet: true,
      downloadBytesPerSec: 12.5 * 1024 * 1024, // ~104.8 Mbps
      uploadBytesPerSec: 2.5 * 1024 * 1024,
      linkSpeedMbps: 1000,
      utilizationPercent: 12.5,
      autoScalePercent: 60.0,
      downloadPercent: 50.0,
      uploadPercent: 10.0,
    },
  ],
  gpus: [
    {
      id: "gpu-0",
      index: 0,
      label: "GPU 0",
      name: "NVIDIA GeForce RTX 4080",
      vendor: "NVIDIA",
      coreUsagePercent: 78.0,
      vramUsedGb: 8.0,
      vramTotalGb: 16.0,
      vramPercent: 50.0,
      temperatureC: 68,
      fanSpeedPercent: 55,
      powerWatts: 220,
      clockMhz: 2650,
    },
  ],
};

describe("telemetryAdapter utilities", () => {
  it("formats bytes per second across KB/s, MB/s, and GB/s", () => {
    assert.equal(formatBytesPerSec(0), "0 KB/s");
    assert.equal(formatBytesPerSec(512 * 1024), "512 KB/s");
    assert.equal(formatBytesPerSec(5.5 * 1024 * 1024), "5.50 MB/s");
    assert.equal(formatBytesPerSec(2 * 1024 * 1024 * 1024), "2.00 GB/s");
  });

  it("formats network speeds in both Mbps and MB/s units", () => {
    const mbps = formatNetworkSpeed(12.5 * 1000 * 1000, "Mbps"); // 100 Mbps
    assert.equal(mbps.unitLabel, "Mbps");
    assert.equal(mbps.value, "100.0");

    const mbs = formatNetworkSpeed(10 * 1024 * 1024, "MB/s");
    assert.equal(mbs.unitLabel, "MB/s");
    assert.equal(mbs.value, "10.0");
  });

  it("builds normalized gauges for CPU, MEMORY, DISK 0, ETHERNET, and GPU 0", () => {
    const gauges = buildNormalizedGauges(
      sampleTelemetry,
      DEFAULT_SETTINGS,
      { cpu: 88 },
      { cpu: [30, 40, 45.6] }
    );

    assert.equal(gauges.length, 5);
    assert.deepEqual(
      gauges.map((g) => g.id),
      ["cpu", "memory", "disk-0", "ethernet", "gpu-0"]
    );

    const cpu = gauges[0];
    assert.equal(cpu.title, "CPU");
    assert.equal(cpu.primaryPercent, 45.6);
    assert.equal(cpu.peakPercent, 88);
    assert.equal(cpu.subtitle, "Intel Core i7-14700K");

    const disk = gauges[2];
    assert.equal(disk.title, "DISK 0");
    assert.equal(disk.primaryPercent, 32.0); // active-time mode by default
    assert.equal(disk.secondaryPercent, 70.0); // used space % on secondary ring
  });

  it("switches DISK N primary dial when diskMode is set to used-space or split", () => {
    const customSettings = {
      ...DEFAULT_SETTINGS,
      showLogicalVolumes: true,
      gauges: {
        "disk-0": {
          ...getOrCreateGaugeConfig(DEFAULT_SETTINGS, "disk-0"),
          diskMode: "used-space" as const,
        },
      },
    };

    const gauges = buildNormalizedGauges(sampleTelemetry, customSettings, {}, {});
    // With showLogicalVolumes: true, both disk-0 and vol-c appear
    assert.equal(gauges.length, 6);
    const disk0 = gauges.find((g) => g.id === "disk-0")!;
    assert.equal(disk0.primaryPercent, 70.0);
    assert.equal(disk0.secondaryPercent, 32.0);
  });

  it("supports dual-needle mode on ETHERNET gauge", () => {
    const customSettings = {
      ...DEFAULT_SETTINGS,
      gauges: {
        ethernet: {
          ...getOrCreateGaugeConfig(DEFAULT_SETTINGS, "ethernet"),
          netScaleMode: "dual-needle" as const,
        },
      },
    };

    const gauges = buildNormalizedGauges(sampleTelemetry, customSettings, {}, {});
    const net = gauges.find((g) => g.id === "ethernet")!;
    assert.equal(net.isDualMode, true);
    assert.equal(net.primaryPercent, 50.0);
    assert.equal(net.secondaryPercent, 10.0);
  });
});
