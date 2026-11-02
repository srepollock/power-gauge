#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod telemetry;

use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder,
};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};
use telemetry::{SystemTelemetry, TelemetryCollector};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppStateData {
    pub settings: Value,
    pub polling_interval_ms: u64,
    pub ghost_mode: bool,
    pub gauges_visible: bool,
}

pub struct SharedState {
    pub collector: Mutex<TelemetryCollector>,
    pub state: Mutex<AppStateData>,
    pub config_path: PathBuf,
}

#[tauri::command]
fn get_telemetry_snapshot(shared: tauri::State<'_, Arc<SharedState>>) -> Result<SystemTelemetry, String> {
    let mut col = shared.collector.lock().map_err(|e| e.to_string())?;
    Ok(col.sample())
}

#[tauri::command]
fn get_app_settings(shared: tauri::State<'_, Arc<SharedState>>) -> Result<Option<Value>, String> {
    let st = shared.state.lock().map_err(|e| e.to_string())?;
    if st.settings.is_null() {
        Ok(None)
    } else {
        Ok(Some(st.settings.clone()))
    }
}

#[tauri::command]
fn update_app_settings(
    app: AppHandle,
    shared: tauri::State<'_, Arc<SharedState>>,
    settings: Value,
) -> Result<(), String> {
    let mut ghost = false;
    let mut poll_ms = 1000u64;
    let mut show_in_taskbar = true;
    let mut z_order = "always-on-top".to_string();
    let mut launch_startup = false;

    if let Some(obj) = settings.as_object() {
        if let Some(g) = obj.get("ghostMode").and_then(|v| v.as_bool()) {
            ghost = g;
        }
        if let Some(p) = obj.get("pollingIntervalMs").and_then(|v| v.as_u64()) {
            poll_ms = p.clamp(200, 5000);
        }
        if let Some(tb) = obj.get("showInTaskbar").and_then(|v| v.as_bool()) {
            show_in_taskbar = tb;
        }
        if let Some(zo) = obj.get("zOrderMode").and_then(|v| v.as_str()) {
            z_order = zo.to_string();
        }
        if let Some(ls) = obj.get("launchAtStartup").and_then(|v| v.as_bool()) {
            launch_startup = ls;
        }
    }

    {
        let mut st = shared.state.lock().map_err(|e| e.to_string())?;
        st.settings = settings.clone();
        st.ghost_mode = ghost;
        st.polling_interval_ms = poll_ms;
        let _ = save_settings_to_disk(&shared.config_path, &settings);
    }

    apply_window_behaviors(&app, ghost, show_in_taskbar, &z_order);
    apply_windows_autostart(launch_startup);

    let _ = app.emit("settings-updated", settings);
    Ok(())
}

#[tauri::command]
fn set_ghost_mode(
    app: AppHandle,
    shared: tauri::State<'_, Arc<SharedState>>,
    enabled: bool,
) -> Result<(), String> {
    let updated_settings = {
        let mut st = shared.state.lock().map_err(|e| e.to_string())?;
        st.ghost_mode = enabled;
        if let Some(obj) = st.settings.as_object_mut() {
            obj.insert("ghostMode".to_string(), Value::Bool(enabled));
        }
        let _ = save_settings_to_disk(&shared.config_path, &st.settings);
        st.settings.clone()
    };

    for (label, win) in app.webview_windows() {
        if label == "main" || label.starts_with("detached-") {
            let _ = win.set_ignore_cursor_events(enabled);
        }
    }

    let _ = app.emit("settings-updated", updated_settings);
    Ok(())
}

#[tauri::command]
fn detach_gauge_window(
    app: AppHandle,
    shared: tauri::State<'_, Arc<SharedState>>,
    gauge_id: String,
    title: String,
) -> Result<(), String> {
    let win_label = format!("detached-{}", gauge_id);
    if let Some(existing) = app.get_webview_window(&win_label) {
        let _ = existing.show();
        let _ = existing.set_focus();
        return Ok(());
    }

    let url = format!("index.html?window=detached&gaugeId={}", gauge_id);
    let win = WebviewWindowBuilder::new(&app, &win_label, WebviewUrl::App(url.into()))
        .title(format!("PowerGauge - {}", title))
        .inner_size(210.0, 255.0)
        .min_inner_size(150.0, 165.0)
        .decorations(false)
        .transparent(true)
        .always_on_top(true)
        .skip_taskbar(true)
        .resizable(true)
        .shadow(false)
        .build()
        .map_err(|e| e.to_string())?;

    if let Ok(st) = shared.state.lock() {
        let _ = win.set_ignore_cursor_events(st.ghost_mode);
    }

    Ok(())
}

#[tauri::command]
fn dock_gauge_window(app: AppHandle, gauge_id: String) -> Result<(), String> {
    let win_label = format!("detached-{}", gauge_id);
    if let Some(win) = app.get_webview_window(&win_label) {
        let _ = win.close();
    }
    Ok(())
}

#[tauri::command]
fn dock_all_gauges(
    app: AppHandle,
    shared: tauri::State<'_, Arc<SharedState>>,
) -> Result<(), String> {
    for (label, win) in app.webview_windows() {
        if label.starts_with("detached-") {
            let _ = win.close();
        }
    }

    let updated = {
        let mut st = shared.state.lock().map_err(|e| e.to_string())?;
        if let Some(gauges_obj) = st
            .settings
            .as_object_mut()
            .and_then(|o| o.get_mut("gauges"))
            .and_then(|g| g.as_object_mut())
        {
            for (_, g_cfg) in gauges_obj.iter_mut() {
                if let Some(cfg_obj) = g_cfg.as_object_mut() {
                    cfg_obj.insert("detached".to_string(), Value::Bool(false));
                }
            }
        }
        let _ = save_settings_to_disk(&shared.config_path, &st.settings);
        st.settings.clone()
    };

    if !updated.is_null() {
        let _ = app.emit("settings-updated", updated);
    }
    Ok(())
}

#[tauri::command]
fn open_settings_window(app: AppHandle) -> Result<(), String> {
    if let Some(win) = app.get_webview_window("settings") {
        let _ = win.show();
        let _ = win.unminimize();
        let _ = win.set_focus();
        return Ok(());
    }

    WebviewWindowBuilder::new(
        &app,
        "settings",
        WebviewUrl::App("index.html?window=settings".into()),
    )
    .title("PowerGauge HUD — Control Center & Settings")
    .inner_size(1140.0, 740.0)
    .min_inner_size(840.0, 560.0)
    .decorations(true)
    .transparent(false)
    .resizable(true)
    .center()
    .build()
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
fn open_full_app_window(app: AppHandle) -> Result<(), String> {
    if let Some(win) = app.get_webview_window("app") {
        let _ = win.show();
        let _ = win.unminimize();
        let _ = win.set_focus();
        return Ok(());
    }

    WebviewWindowBuilder::new(
        &app,
        "app",
        WebviewUrl::App("index.html?window=app".into()),
    )
    .title("PowerGauge Desktop Telemetry Suite")
    .inner_size(1200.0, 780.0)
    .min_inner_size(880.0, 580.0)
    .decorations(true)
    .transparent(false)
    .resizable(true)
    .center()
    .build()
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
fn toggle_floating_dock(
    app: AppHandle,
    shared: tauri::State<'_, Arc<SharedState>>,
) -> Result<bool, String> {
    let next_vis = {
        let mut st = shared.state.lock().map_err(|e| e.to_string())?;
        st.gauges_visible = !st.gauges_visible;
        st.gauges_visible
    };

    if let Some(win) = app.get_webview_window("main") {
        if next_vis {
            let _ = win.show();
        } else {
            let _ = win.hide();
        }
    }

    Ok(next_vis)
}

fn apply_window_behaviors(
    app: &AppHandle,
    ghost_mode: bool,
    show_in_taskbar: bool,
    z_order: &str,
) {
    for (label, win) in app.webview_windows() {
        if label == "main" || label.starts_with("detached-") {
            let _ = win.set_ignore_cursor_events(ghost_mode);
            if z_order == "always-on-top" {
                let _ = win.set_always_on_bottom(false);
                let _ = win.set_always_on_top(true);
            } else if z_order == "desktop-widget" {
                let _ = win.set_always_on_top(false);
                let _ = win.set_always_on_bottom(true);
            } else {
                let _ = win.set_always_on_top(false);
                let _ = win.set_always_on_bottom(false);
            }
        }
        if label == "main" {
            let _ = win.set_skip_taskbar(!show_in_taskbar);
        }
    }
}

fn apply_windows_autostart(enable: bool) {
    #[cfg(target_os = "windows")]
    {
        use winreg::enums::*;
        use winreg::RegKey;
        if let Ok(exe_path) = std::env::current_exe() {
            let hkcu = RegKey::predef(HKEY_CURRENT_USER);
            if let Ok((run_key, _)) =
                hkcu.create_subkey("Software\\Microsoft\\Windows\\CurrentVersion\\Run")
            {
                if enable {
                    let path_str = format!("\"{}\"", exe_path.to_string_lossy());
                    let _ = run_key.set_value("PowerGaugeHUD", &path_str);
                } else {
                    let _ = run_key.delete_value("PowerGaugeHUD");
                }
            }
        }
    }
}

fn toggle_all_gauges_visibility(app: &AppHandle, shared: &Arc<SharedState>) {
    let new_vis = {
        let mut st = match shared.state.lock() {
            Ok(g) => g,
            Err(_) => return,
        };
        st.gauges_visible = !st.gauges_visible;
        st.gauges_visible
    };

    for (label, win) in app.webview_windows() {
        if label == "main" || label.starts_with("detached-") {
            if new_vis {
                let _ = win.show();
            } else {
                let _ = win.hide();
            }
        }
    }
}

fn toggle_ghost_mode_shortcut(app: &AppHandle, shared: &Arc<SharedState>) {
    let (next_ghost, updated_settings) = {
        let mut st = match shared.state.lock() {
            Ok(g) => g,
            Err(_) => return,
        };
        st.ghost_mode = !st.ghost_mode;
        let ng = st.ghost_mode;
        if let Some(obj) = st.settings.as_object_mut() {
            obj.insert("ghostMode".to_string(), Value::Bool(ng));
        }
        let _ = save_settings_to_disk(&shared.config_path, &st.settings);
        (ng, st.settings.clone())
    };

    for (label, win) in app.webview_windows() {
        if label == "main" || label.starts_with("detached-") {
            let _ = win.set_ignore_cursor_events(next_ghost);
        }
    }

    if !updated_settings.is_null() {
        let _ = app.emit("settings-updated", updated_settings);
    }
}

fn cycle_style_from_tray(app: &AppHandle, shared: &Arc<SharedState>) {
    let styles = ["radial", "tachometer", "ring", "led-bar"];
    let updated = {
        let mut st = match shared.state.lock() {
            Ok(g) => g,
            Err(_) => return,
        };
        if let Some(obj) = st.settings.as_object_mut() {
            let cur = obj
                .get("globalStyle")
                .and_then(|v| v.as_str())
                .unwrap_or("radial");
            let idx = styles.iter().position(|&s| s == cur).unwrap_or(0);
            let next = styles[(idx + 1) % styles.len()];
            obj.insert("globalStyle".to_string(), Value::String(next.to_string()));
        }
        let _ = save_settings_to_disk(&shared.config_path, &st.settings);
        st.settings.clone()
    };

    if !updated.is_null() {
        let _ = app.emit("settings-updated", updated);
    }
}

fn load_settings_from_disk(path: &PathBuf) -> Value {
    if let Ok(raw) = fs::read_to_string(path) {
        if let Ok(val) = serde_json::from_str::<Value>(&raw) {
            return val;
        }
    }
    Value::Null
}

fn save_settings_to_disk(path: &PathBuf, settings: &Value) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        let _ = fs::create_dir_all(parent);
    }
    let json = serde_json::to_string_pretty(settings).map_err(|e| e.to_string())?;
    fs::write(path, json).map_err(|e| e.to_string())
}

fn main() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, shortcut, event| {
                    if event.state() == ShortcutState::Pressed {
                        let shared = app.state::<Arc<SharedState>>();
                        let ghost_sc =
                            Shortcut::new(Some(Modifiers::CONTROL | Modifiers::ALT), Code::KeyG);
                        let vis_sc =
                            Shortcut::new(Some(Modifiers::CONTROL | Modifiers::ALT), Code::KeyM);
                        if shortcut == &ghost_sc {
                            toggle_ghost_mode_shortcut(app, &shared);
                        } else if shortcut == &vis_sc {
                            toggle_all_gauges_visibility(app, &shared);
                        }
                    }
                })
                .build(),
        )
        .setup(|app| {
            let config_dir = app
                .path()
                .app_config_dir()
                .unwrap_or_else(|_| PathBuf::from("."));
            let config_path = config_dir.join("power_gauge_settings.json");
            let saved_settings = load_settings_from_disk(&config_path);

            let shared = Arc::new(SharedState {
                collector: Mutex::new(TelemetryCollector::new()?),
                state: Mutex::new(AppStateData {
                    settings: saved_settings.clone(),
                    polling_interval_ms: 1000,
                    ghost_mode: false,
                    gauges_visible: true,
                }),
                config_path,
            });

            app.manage(shared.clone());

            // Register Global Hotkeys: Ctrl+Alt+G (Ghost Click-Through) & Ctrl+Alt+M (Show/Hide)
            let ghost_sc = Shortcut::new(Some(Modifiers::CONTROL | Modifiers::ALT), Code::KeyG);
            let vis_sc = Shortcut::new(Some(Modifiers::CONTROL | Modifiers::ALT), Code::KeyM);
            let _ = app.global_shortcut().register(ghost_sc);
            let _ = app.global_shortcut().register(vis_sc);

            // Re-spawn any previously detached gauge windows from saved settings
            if let Some(gauges_obj) = saved_settings
                .as_object()
                .and_then(|o| o.get("gauges"))
                .and_then(|g| g.as_object())
            {
                for (g_id, g_cfg) in gauges_obj {
                    let is_detached = g_cfg
                        .as_object()
                        .and_then(|o| o.get("detached"))
                        .and_then(|v| v.as_bool())
                        .unwrap_or(false);
                    if is_detached {
                        let _ = detach_gauge_window(
                            app.handle().clone(),
                            app.state::<Arc<SharedState>>(),
                            g_id.clone(),
                            g_id.to_uppercase(),
                        );
                    }
                }
            }

            // Build Windows System Tray Menu
            let show_hide_item = MenuItem::with_id(
                app,
                "toggle_vis",
                "Show / Hide All Gauges (Ctrl+Alt+M)",
                true,
                None::<&str>,
            )?;
            let ghost_item = MenuItem::with_id(
                app,
                "toggle_ghost",
                "Toggle Click-Through Ghost Mode (Ctrl+Alt+G)",
                true,
                None::<&str>,
            )?;
            let cycle_style_item = MenuItem::with_id(
                app,
                "cycle_style",
                "Cycle Gauge Style (Radial / Tach / Ring / LED)",
                true,
                None::<&str>,
            )?;
            let dock_all_item = MenuItem::with_id(
                app,
                "dock_all",
                "Dock All Torn-Off Gauges",
                true,
                None::<&str>,
            )?;
            let reset_peaks_item = MenuItem::with_id(
                app,
                "reset_peaks",
                "Reset Peak-Hold Markers",
                true,
                None::<&str>,
            )?;
            let full_app_item = MenuItem::with_id(
                app,
                "open_full_app",
                "Open Full Desktop Application...",
                true,
                None::<&str>,
            )?;
            let settings_item = MenuItem::with_id(
                app,
                "open_settings",
                "Open Control Center & Settings...",
                true,
                None::<&str>,
            )?;
            let sep1 = PredefinedMenuItem::separator(app)?;
            let sep2 = PredefinedMenuItem::separator(app)?;
            let quit_item = MenuItem::with_id(
                app,
                "quit",
                "Quit PowerGauge HUD",
                true,
                None::<&str>,
            )?;

            let tray_menu = Menu::with_items(
                app,
                &[
                    &full_app_item,
                    &settings_item,
                    &sep1,
                    &show_hide_item,
                    &ghost_item,
                    &cycle_style_item,
                    &dock_all_item,
                    &reset_peaks_item,
                    &sep2,
                    &quit_item,
                ],
            )?;

            let mut tray_builder = TrayIconBuilder::new()
                .menu(&tray_menu)
                .tooltip("PowerGauge HUD — System Performance Monitor")
                .on_menu_event(|app, event| {
                    let shared = app.state::<Arc<SharedState>>();
                    match event.id.as_ref() {
                        "open_full_app" => {
                            let _ = open_full_app_window(app.clone());
                        }
                        "toggle_vis" => toggle_all_gauges_visibility(app, &shared),
                        "toggle_ghost" => toggle_ghost_mode_shortcut(app, &shared),
                        "cycle_style" => cycle_style_from_tray(app, &shared),
                        "dock_all" => {
                            let _ = dock_all_gauges(app.clone(), shared);
                        }
                        "reset_peaks" => {
                            let _ = app.emit("reset-peaks", HashMap::<String, String>::new());
                        }
                        "open_settings" => {
                            let _ = open_settings_window(app.clone());
                        }
                        "quit" => {
                            app.exit(0);
                        }
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        let _ = open_full_app_window(app.clone());
                    }
                });

            if let Some(icon) = app.default_window_icon() {
                tray_builder = tray_builder.icon(icon.clone());
            }
            let _tray = tray_builder.build(app)?;

            // Open the Full Desktop Application Suite window alongside the Floating HUD Dock
            let _ = open_full_app_window(app.handle().clone());

            // Spawn background telemetry emitter loop
            let app_handle = app.handle().clone();
            let shared_for_loop = shared.clone();
            std::thread::spawn(move || loop {
                let poll_ms = {
                    shared_for_loop
                        .state
                        .lock()
                        .map(|s| s.polling_interval_ms)
                        .unwrap_or(1000)
                };

                if let Ok(mut col) = shared_for_loop.collector.lock() {
                    let snap = col.sample();
                    let _ = app_handle.emit("telemetry-tick", snap);
                }

                std::thread::sleep(Duration::from_millis(poll_ms.clamp(200, 5000)));
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_telemetry_snapshot,
            get_app_settings,
            update_app_settings,
            set_ghost_mode,
            detach_gauge_window,
            dock_gauge_window,
            dock_all_gauges,
            open_settings_window,
            open_full_app_window,
            toggle_floating_dock,
        ])
        .run(tauri::generate_context!())
        .expect("error while running PowerGauge HUD application");
}
