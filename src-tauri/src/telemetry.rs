use nvml_wrapper::Nvml;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::process::Command;
use std::sync::{Arc, Mutex};
use std::time::{Instant, SystemTime, UNIX_EPOCH};
use sysinfo::{Components, Disks, Networks, System};

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CpuTelemetry {
    pub usage_percent: f64,
    pub per_core_percent: Vec<f64>,
    pub frequency_mhz: u64,
    pub temperature_c: Option<f64>,
    pub power_watts: Option<f64>,
    pub brand: String,
    pub physical_cores: usize,
    pub logical_cores: usize,
    pub process_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MemoryTelemetry {
    pub usage_percent: f64,
    pub used_gb: f64,
    pub total_gb: f64,
    pub available_gb: f64,
    pub swap_used_gb: f64,
    pub swap_total_gb: f64,
    pub swap_percent: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DiskTelemetry {
    pub id: String,
    pub index: usize,
    pub label: String,
    pub sub_label: String,
    pub model: String,
    pub mount_points: Vec<String>,
    pub is_physical: bool,
    pub active_time_percent: f64,
    pub used_space_percent: f64,
    pub read_bytes_per_sec: f64,
    pub write_bytes_per_sec: f64,
    pub used_gb: f64,
    pub total_gb: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NetworkTelemetry {
    pub id: String,
    pub label: String,
    pub interface_name: String,
    pub is_ethernet: bool,
    pub download_bytes_per_sec: f64,
    pub upload_bytes_per_sec: f64,
    pub link_speed_mbps: u64,
    pub utilization_percent: f64,
    pub auto_scale_percent: f64,
    pub download_percent: f64,
    pub upload_percent: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GpuTelemetry {
    pub id: String,
    pub index: usize,
    pub label: String,
    pub name: String,
    pub vendor: String,
    pub core_usage_percent: f64,
    pub vram_used_gb: f64,
    pub vram_total_gb: f64,
    pub vram_percent: f64,
    pub temperature_c: Option<f64>,
    pub fan_speed_percent: Option<f64>,
    pub power_watts: Option<f64>,
    pub clock_mhz: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemTelemetry {
    pub timestamp_ms: u128,
    pub cpu: CpuTelemetry,
    pub memory: MemoryTelemetry,
    pub disks: Vec<DiskTelemetry>,
    pub networks: Vec<NetworkTelemetry>,
    pub gpus: Vec<GpuTelemetry>,
}

#[derive(Debug, Clone, Default, Deserialize)]
pub struct WinPerfSidecarData {
    #[serde(default)]
    pub disks: Vec<WinPhysicalDiskPerf>,
    #[serde(default)]
    pub gpus: Vec<WinGpuPerf>,
}

#[derive(Debug, Clone, Default, Deserialize)]
pub struct WinPhysicalDiskPerf {
    pub name: String,
    pub active_pct: f64,
    pub read_bps: f64,
    pub write_bps: f64,
}

#[derive(Debug, Clone, Default, Deserialize)]
pub struct WinGpuPerf {
    #[allow(dead_code)]
    pub index: usize,
    pub name: String,
    pub usage_pct: f64,
    pub vram_used_mb: f64,
    pub vram_total_mb: f64,
}

pub struct TelemetryCollector {
    sys: System,
    disks: Disks,
    networks: Networks,
    components: Components,
    nvml: Option<Nvml>,
    last_tick: Instant,
    net_peak_bps: HashMap<String, f64>,
    win_perf_cache: Arc<Mutex<WinPerfSidecarData>>,
}

impl TelemetryCollector {
    pub fn new() -> Self {
        let mut sys = System::new_all();
        sys.refresh_all();
        let disks = Disks::new_with_refreshed_list();
        let networks = Networks::new_with_refreshed_list();
        let components = Components::new_with_refreshed_list();
        let nvml = Nvml::init().ok();

        let win_perf_cache = Arc::new(Mutex::new(WinPerfSidecarData::default()));
        spawn_windows_perf_poller(win_perf_cache.clone());

        Self {
            sys,
            disks,
            networks,
            components,
            nvml,
            last_tick: Instant::now(),
            net_peak_bps: HashMap::new(),
            win_perf_cache,
        }
    }

    pub fn sample(&mut self) -> SystemTelemetry {
        let now = Instant::now();
        let dt = now.duration_since(self.last_tick).as_secs_f64().max(0.15);
        self.last_tick = now;

        self.sys.refresh_cpu_all();
        self.sys.refresh_memory();
        self.disks.refresh(true);
        self.networks.refresh(true);
        self.components.refresh(true);

        let win_perf = self
            .win_perf_cache
            .lock()
            .map(|g| g.clone())
            .unwrap_or_default();

        let cpu = self.collect_cpu();
        let memory = self.collect_memory();
        let disks = self.collect_disks(&win_perf);
        let networks = self.collect_networks(dt);
        let gpus = self.collect_gpus(&win_perf);

        let timestamp_ms = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_millis())
            .unwrap_or(0);

        SystemTelemetry {
            timestamp_ms,
            cpu,
            memory,
            disks,
            networks,
            gpus,
        }
    }

    fn collect_cpu(&self) -> CpuTelemetry {
        let cpus = self.sys.cpus();
        let usage_percent = self.sys.global_cpu_usage() as f64;
        let per_core_percent: Vec<f64> = cpus.iter().map(|c| c.cpu_usage() as f64).collect();
        let frequency_mhz = cpus
            .first()
            .map(|c| c.frequency())
            .unwrap_or(0);
        let brand = cpus
            .first()
            .map(|c| c.brand().to_string())
            .unwrap_or_else(|| "System Processor".to_string());
        let physical_cores = self.sys.physical_core_count().unwrap_or(cpus.len());
        let logical_cores = cpus.len();
        let process_count = self.sys.processes().len();

        let mut temperature_c: Option<f64> = None;
        for comp in &self.components {
            let lbl = comp.label().to_lowercase();
            if lbl.contains("cpu") || lbl.contains("package") || lbl.contains("core") || lbl.contains("tdie") {
                if let Some(t) = comp.temperature() {
                    if t > 0.0 && t < 130.0 {
                        temperature_c = Some(t as f64);
                        break;
                    }
                }
            }
        }

        CpuTelemetry {
            usage_percent: usage_percent.clamp(0.0, 100.0),
            per_core_percent,
            frequency_mhz,
            temperature_c,
            power_watts: None,
            brand,
            physical_cores,
            logical_cores,
            process_count,
        }
    }

    fn collect_memory(&self) -> MemoryTelemetry {
        let total_bytes = self.sys.total_memory() as f64;
        let used_bytes = self.sys.used_memory() as f64;
        let avail_bytes = self.sys.available_memory() as f64;
        let swap_total = self.sys.total_swap() as f64;
        let swap_used = self.sys.used_swap() as f64;

        let gb = 1024.0 * 1024.0 * 1024.0;
        let total_gb = (total_bytes / gb).max(0.1);
        let used_gb = used_bytes / gb;
        let available_gb = avail_bytes / gb;
        let usage_percent = ((used_bytes / total_bytes.max(1.0)) * 100.0).clamp(0.0, 100.0);

        let swap_total_gb = swap_total / gb;
        let swap_used_gb = swap_used / gb;
        let swap_percent = if swap_total > 0.0 {
            ((swap_used / swap_total) * 100.0).clamp(0.0, 100.0)
        } else {
            0.0
        };

        MemoryTelemetry {
            usage_percent,
            used_gb,
            total_gb,
            available_gb,
            swap_used_gb,
            swap_total_gb,
            swap_percent,
        }
    }

    fn collect_disks(&self, win_perf: &WinPerfSidecarData) -> Vec<DiskTelemetry> {
        let gb = 1024.0 * 1024.0 * 1024.0;
        let mut results: Vec<DiskTelemetry> = Vec::new();

        // Map sysinfo disks into logical volumes first
        let mut logical_disks: Vec<DiskTelemetry> = Vec::new();
        for (idx, d) in self.disks.iter().enumerate() {
            let mount = d.mount_point().to_string_lossy().to_string();
            let clean_mount = mount.trim_end_matches('\\').to_string();
            let total_b = d.total_space() as f64;
            let avail_b = d.available_space() as f64;
            let used_b = (total_b - avail_b).max(0.0);
            let used_pct = if total_b > 0.0 {
                ((used_b / total_b) * 100.0).clamp(0.0, 100.0)
            } else {
                0.0
            };

            let disk_name = d.name().to_string_lossy().to_string();
            let model_str = if disk_name.is_empty() {
                format!("Local Volume ({})", clean_mount)
            } else {
                format!("{} ({})", disk_name, clean_mount)
            };

            logical_disks.push(DiskTelemetry {
                id: format!("vol-{}", clean_mount.replace(':', "").to_lowercase()),
                index: idx,
                label: format!("DRIVE {}", clean_mount),
                sub_label: clean_mount.clone(),
                model: model_str,
                mount_points: vec![mount],
                is_physical: false,
                active_time_percent: 0.0,
                used_space_percent: used_pct,
                read_bytes_per_sec: 0.0,
                write_bytes_per_sec: 0.0,
                used_gb: used_b / gb,
                total_gb: total_b / gb,
            });
        }

        // Build Physical Disks (DISK 0, DISK 1...) matching Windows Task Manager
        if !win_perf.disks.is_empty() {
            for (p_idx, pd) in win_perf.disks.iter().enumerate() {
                // pd.name is like "0 C:" or "1 D: E:"
                let parts: Vec<&str> = pd.name.split_whitespace().collect();
                let disk_num = parts
                    .first()
                    .and_then(|s| s.parse::<usize>().ok())
                    .unwrap_or(p_idx);
                let mounts: Vec<String> = parts.iter().skip(1).map(|s| s.to_string()).collect();
                let sub_lbl = if mounts.is_empty() {
                    format!("Physical #{}", disk_num)
                } else {
                    mounts.join(", ")
                };

                // Aggregate capacity across matching mounted partitions
                let mut total_gb = 0.0;
                let mut used_gb = 0.0;
                for m in &mounts {
                    if let Some(ld) = logical_disks.iter().find(|l| l.sub_label.eq_ignore_ascii_case(m)) {
                        total_gb += ld.total_gb;
                        used_gb += ld.used_gb;
                    }
                }
                if total_gb <= 0.0 && p_idx < logical_disks.len() {
                    total_gb = logical_disks[p_idx].total_gb;
                    used_gb = logical_disks[p_idx].used_gb;
                }
                let used_space_percent = if total_gb > 0.0 {
                    ((used_gb / total_gb) * 100.0).clamp(0.0, 100.0)
                } else {
                    0.0
                };

                results.push(DiskTelemetry {
                    id: format!("disk-{}", disk_num),
                    index: disk_num,
                    label: format!("DISK {}", disk_num),
                    sub_label: sub_lbl.clone(),
                    model: format!("Disk {} ({})", disk_num, sub_lbl),
                    mount_points: mounts,
                    is_physical: true,
                    active_time_percent: pd.active_pct.clamp(0.0, 100.0),
                    used_space_percent,
                    read_bytes_per_sec: pd.read_bps.max(0.0),
                    write_bytes_per_sec: pd.write_bps.max(0.0),
                    used_gb,
                    total_gb,
                });
            }
        } else {
            // Fallback before first WMI sample arrives: promote logical drives to DISK 0, DISK 1
            for (idx, ld) in logical_disks.iter().enumerate() {
                results.push(DiskTelemetry {
                    id: format!("disk-{}", idx),
                    index: idx,
                    label: format!("DISK {}", idx),
                    sub_label: ld.sub_label.clone(),
                    model: ld.model.clone(),
                    mount_points: ld.mount_points.clone(),
                    is_physical: true,
                    active_time_percent: 0.0,
                    used_space_percent: ld.used_space_percent,
                    read_bytes_per_sec: 0.0,
                    write_bytes_per_sec: 0.0,
                    used_gb: ld.used_gb,
                    total_gb: ld.total_gb,
                });
            }
        }

        // Append logical volumes so user can also toggle "Show Logical Volumes"
        results.extend(logical_disks);
        results
    }

    fn collect_networks(&mut self, dt: f64) -> Vec<NetworkTelemetry> {
        let mut list: Vec<NetworkTelemetry> = Vec::new();

        for (iface_name, data) in &self.networks {
            let lower = iface_name.to_lowercase();
            if lower.contains("loopback")
                || lower.contains("pseudo")
                || lower.contains("teredo")
                || lower.contains("isatap")
                || lower.contains("filter")
            {
                continue;
            }

            let rx_bps = (data.received() as f64) / dt;
            let tx_bps = (data.transmitted() as f64) / dt;
            let total_bps = rx_bps + tx_bps;

            let is_ethernet = lower.contains("ethernet")
                || lower.contains("eth")
                || lower.contains("lan")
                || (!lower.contains("wi-fi") && !lower.contains("wlan") && !lower.contains("wireless"));

            let label = if lower.contains("wi-fi") || lower.contains("wlan") || lower.contains("wireless") {
                "WI-FI".to_string()
            } else {
                "ETHERNET".to_string()
            };

            let link_speed_mbps: u64 = 1000;
            let link_max_bps = (link_speed_mbps as f64 * 1_000_000.0) / 8.0;
            let utilization_percent = ((total_bps / link_max_bps) * 100.0).clamp(0.0, 100.0);

            // Auto-scaling ceiling (minimum 5 MB/s ceiling so small traffic doesn't peg 100%, decays gently)
            let prev_peak = self
                .net_peak_bps
                .get(iface_name)
                .copied()
                .unwrap_or(5.0 * 1024.0 * 1024.0);
            let new_peak = (prev_peak * 0.985)
                .max(total_bps * 1.15)
                .max(5.0 * 1024.0 * 1024.0);
            self.net_peak_bps.insert(iface_name.clone(), new_peak);

            let auto_scale_percent = ((total_bps / new_peak) * 100.0).clamp(0.0, 100.0);
            let download_percent = ((rx_bps / new_peak) * 100.0).clamp(0.0, 100.0);
            let upload_percent = ((tx_bps / new_peak) * 100.0).clamp(0.0, 100.0);

            let sanitized_id = iface_name
                .chars()
                .map(|c| if c.is_ascii_alphanumeric() { c.to_ascii_lowercase() } else { '-' })
                .collect::<String>();

            list.push(NetworkTelemetry {
                id: format!("net-{}", sanitized_id),
                label,
                interface_name: iface_name.clone(),
                is_ethernet,
                download_bytes_per_sec: rx_bps,
                upload_bytes_per_sec: tx_bps,
                link_speed_mbps,
                utilization_percent,
                auto_scale_percent,
                download_percent,
                upload_percent,
            });
        }

        // Sort so active Ethernet interface is always first, and normalize primary id to "ethernet"
        list.sort_by(|a, b| {
            let a_score = (if a.is_ethernet { 1000.0 } else { 0.0 })
                + (a.download_bytes_per_sec + a.upload_bytes_per_sec);
            let b_score = (if b.is_ethernet { 1000.0 } else { 0.0 })
                + (b.download_bytes_per_sec + b.upload_bytes_per_sec);
            b_score
                .partial_cmp(&a_score)
                .unwrap_or(std::cmp::Ordering::Equal)
        });

        if let Some(first) = list.first_mut() {
            first.id = "ethernet".to_string();
            first.label = "ETHERNET".to_string();
        } else {
            list.push(NetworkTelemetry {
                id: "ethernet".to_string(),
                label: "ETHERNET".to_string(),
                interface_name: "Ethernet".to_string(),
                is_ethernet: true,
                download_bytes_per_sec: 0.0,
                upload_bytes_per_sec: 0.0,
                link_speed_mbps: 1000,
                utilization_percent: 0.0,
                auto_scale_percent: 0.0,
                download_percent: 0.0,
                upload_percent: 0.0,
            });
        }

        list
    }

    fn collect_gpus(&self, win_perf: &WinPerfSidecarData) -> Vec<GpuTelemetry> {
        let mut gpus: Vec<GpuTelemetry> = Vec::new();
        let gb = 1024.0 * 1024.0 * 1024.0;

        // 1. Query NVIDIA GPUs via NVML directly if available
        if let Some(ref nvml) = self.nvml {
            if let Ok(count) = nvml.device_count() {
                for idx in 0..count {
                    if let Ok(dev) = nvml.device_by_index(idx) {
                        let name = dev.name().unwrap_or_else(|_| format!("NVIDIA GPU {}", idx));
                        let util = dev
                            .utilization_rates()
                            .map(|u| u.gpu as f64)
                            .unwrap_or(0.0);
                        let (vram_used_gb, vram_total_gb, vram_percent) = dev
                            .memory_info()
                            .map(|m| {
                                let u = m.used as f64 / gb;
                                let t = (m.total as f64 / gb).max(0.1);
                                (u, t, ((u / t) * 100.0).clamp(0.0, 100.0))
                            })
                            .unwrap_or((0.0, 0.0, 0.0));
                        let temp = dev
                            .temperature(
                                nvml_wrapper::enum_wrappers::device::TemperatureSensor::Gpu,
                            )
                            .ok()
                            .map(|t| t as f64);
                        let fan = dev.fan_speed(0).ok().map(|f| f as f64);
                        let power = dev
                            .power_usage()
                            .ok()
                            .map(|mw| (mw as f64) / 1000.0);
                        let clock = dev
                            .clock_info(nvml_wrapper::enum_wrappers::device::Clock::Graphics)
                            .ok()
                            .map(|c| c as f64);

                        gpus.push(GpuTelemetry {
                            id: format!("gpu-{}", idx),
                            index: idx as usize,
                            label: format!("GPU {}", idx),
                            name,
                            vendor: "NVIDIA".to_string(),
                            core_usage_percent: util.clamp(0.0, 100.0),
                            vram_used_gb,
                            vram_total_gb,
                            vram_percent,
                            temperature_c: temp,
                            fan_speed_percent: fan,
                            power_watts: power,
                            clock_mhz: clock,
                        });
                    }
                }
            }
        }

        // 2. Merge or supplement with Windows Performance Counters (AMD, Intel, or additional GPUs)
        for wg in &win_perf.gpus {
            let already_exists = gpus.iter().any(|g| {
                g.name.to_lowercase().contains(&wg.name.to_lowercase())
                    || wg.name.to_lowercase().contains(&g.name.to_lowercase())
            });
            if !already_exists {
                let idx = gpus.len();
                let vram_used_gb = wg.vram_used_mb / 1024.0;
                let vram_total_gb = (wg.vram_total_mb / 1024.0).max(0.0);
                let vram_percent = if vram_total_gb > 0.0 {
                    ((vram_used_gb / vram_total_gb) * 100.0).clamp(0.0, 100.0)
                } else {
                    0.0
                };
                gpus.push(GpuTelemetry {
                    id: format!("gpu-{}", idx),
                    index: idx,
                    label: format!("GPU {}", idx),
                    name: wg.name.clone(),
                    vendor: "Windows DXGI".to_string(),
                    core_usage_percent: wg.usage_pct.clamp(0.0, 100.0),
                    vram_used_gb,
                    vram_total_gb,
                    vram_percent,
                    temperature_c: None,
                    fan_speed_percent: None,
                    power_watts: None,
                    clock_mhz: None,
                });
            }
        }

        if gpus.is_empty() {
            gpus.push(GpuTelemetry {
                id: "gpu-0".to_string(),
                index: 0,
                label: "GPU 0".to_string(),
                name: "System Graphics Adapter".to_string(),
                vendor: "Generic".to_string(),
                core_usage_percent: 0.0,
                vram_used_gb: 0.0,
                vram_total_gb: 0.0,
                vram_percent: 0.0,
                temperature_c: None,
                fan_speed_percent: None,
                power_watts: None,
                clock_mhz: None,
            });
        }

        gpus
    }
}

fn spawn_windows_perf_poller(cache: Arc<Mutex<WinPerfSidecarData>>) {
    std::thread::spawn(move || {
        let ps_script = r#"
$ErrorActionPreference = 'SilentlyContinue'
$disks = @(Get-CimInstance Win32_PerfFormattedData_PerfDisk_PhysicalDisk | Where-Object { $_.Name -ne '_Total' } | ForEach-Object {
    @{
        name = [string]$_.Name
        active_pct = [double]$_.PercentDiskTime
        read_bps = [double]$_.DiskReadBytesPersec
        write_bps = [double]$_.DiskWriteBytesPersec
    }
})

$gpuTotal = 0.0
$gpuEng = @(Get-CimInstance Win32_PerfFormattedData_GPUPerformanceCounters_GPUEngine | Where-Object { $_.Name -match 'engtype_3D|engtype_Compute|engtype_Copy' })
if ($gpuEng.Count -gt 0) {
    $gpuTotal = ($gpuEng | Measure-Object -Property UtilizationPercentage -Sum).Sum
    if ($gpuTotal -gt 100) { $gpuTotal = 100.0 }
}

$gpuMem = @(Get-CimInstance Win32_PerfFormattedData_GPUPerformanceCounters_GPUAdapterMemory)
$usedMb = 0.0
if ($gpuMem.Count -gt 0) {
    $usedBytes = ($gpuMem | Measure-Object -Property DedicatedUsage -Sum).Sum
    $usedMb = [math]::Round($usedBytes / 1MB, 1)
}

$vc = @(Get-CimInstance Win32_VideoController)
$gpus = @()
$idx = 0
foreach ($v in $vc) {
    $ramMb = 0.0
    if ($v.AdapterRAM -gt 0) { $ramMb = [math]::Round($v.AdapterRAM / 1MB, 1) }
    $gpus += @{
        index = $idx
        name = [string]$v.Name
        usage_pct = [double]$gpuTotal
        vram_used_mb = [double]$usedMb
        vram_total_mb = [double]$ramMb
    }
    $idx++
}

@{ disks = $disks; gpus = $gpus } | ConvertTo-Json -Compress -Depth 4
"#;

        loop {
            let mut cmd = Command::new("powershell");
            cmd.args(["-NoProfile", "-NonInteractive", "-Command", ps_script]);
            #[cfg(target_os = "windows")]
            cmd.creation_flags(CREATE_NO_WINDOW);

            if let Ok(output) = cmd.output() {
                if output.status.success() {
                    let stdout = String::from_utf8_lossy(&output.stdout);
                    if let Ok(parsed) = serde_json::from_str::<WinPerfSidecarData>(stdout.trim()) {
                        if let Ok(mut guard) = cache.lock() {
                            *guard = parsed;
                        }
                    }
                }
            }
            std::thread::sleep(std::time::Duration::from_millis(1500));
        }
    });
}


#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_telemetry_collector_sample_bounds_and_schema() {
        let mut collector = TelemetryCollector::new();
        let snap = collector.sample();

        assert!(snap.cpu.usage_percent >= 0.0 && snap.cpu.usage_percent <= 100.0);
        assert!(snap.cpu.logical_cores >= 1);
        assert!(snap.memory.total_gb > 0.0);
        assert!(snap.memory.usage_percent >= 0.0 && snap.memory.usage_percent <= 100.0);
        assert!(!snap.networks.is_empty());
        assert_eq!(snap.networks[0].id, "ethernet");
        assert!(!snap.gpus.is_empty());

        let json_val = serde_json::to_value(&snap).expect("serialize SystemTelemetry");
        assert!(json_val.get("timestampMs").is_some());
        assert!(json_val["cpu"].get("usagePercent").is_some());
        assert!(json_val["cpu"].get("perCorePercent").is_some());
        assert!(json_val["memory"].get("usagePercent").is_some());
        assert!(json_val["networks"][0].get("downloadBytesPerSec").is_some());
        assert!(json_val["gpus"][0].get("coreUsagePercent").is_some());
    }
}
