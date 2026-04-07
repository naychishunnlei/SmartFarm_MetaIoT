// Analytics panel — historical sensor chart with Excel export
import { getSensorHistory } from './apiService.js';

let chartInstance = null;
let _lastFarmLogs = [];
let _lastZoneLogs = [];
let _lastIntervals = [];

// Range config: dropdown value → { label, fetchMultiplier, intervalMs, tickFormat }
const RANGE_CONFIG = {
    120: { label: 'Last 3 hours',  intervalMs:  5 * 60 * 1000, tickFmt: 'time' },
    240: { label: 'Last 6 hours',  intervalMs: 10 * 60 * 1000, tickFmt: 'time' },
    480: { label: 'Last 12 hours', intervalMs: 30 * 60 * 1000, tickFmt: 'time' },
    960: { label: 'Last 24 hours', intervalMs: 60 * 60 * 1000, tickFmt: 'datetime' },
};

export function initAnalyticsPanel() {
    if (!document.getElementById('analytics-refresh-btn')) return;

    document.getElementById('analytics-refresh-btn').addEventListener('click', loadAnalytics);
    document.getElementById('analytics-limit').addEventListener('change', loadAnalytics);
    document.getElementById('analytics-excel-btn').addEventListener('click', exportExcel);

    loadAnalytics();
}

async function loadAnalytics() {
    const farmId = localStorage.getItem('selectedFarmId');
    const limitVal = Number(document.getElementById('analytics-limit')?.value || 240);
    const cfg = RANGE_CONFIG[limitVal] || RANGE_CONFIG[240];
    const statusEl = document.getElementById('analytics-status');
    if (statusEl) statusEl.textContent = 'Loading…';

    try {
        // Fetch raw rows — multiply limit so we have enough data to fill intervals
        const { farm_logs, zone_logs } = await getSensorHistory(farmId, limitVal * 3);
        _lastFarmLogs = farm_logs || [];
        _lastZoneLogs = zone_logs || [];
        _lastIntervals = groupByInterval(_lastFarmLogs, _lastZoneLogs, cfg.intervalMs);
        renderChart(_lastIntervals, cfg);
        if (statusEl) statusEl.textContent = `${cfg.label} · ${_lastIntervals.length} intervals · ${_lastFarmLogs.length} raw readings`;
    } catch (e) {
        console.error('[Analytics] Failed to load data:', e);
        if (statusEl) statusEl.textContent = 'Failed to load data.';
    }
}

// ── GROUP RAW ROWS INTO FIXED-WIDTH INTERVALS ─────────────────────────────────
function groupByInterval(farmLogs, zoneLogs, intervalMs) {
    const map = new Map();

    const bucket = (time) => Math.floor(time / intervalMs) * intervalMs;

    farmLogs.forEach(row => {
        const key = bucket(new Date(row.recorded_at).getTime());
        if (!map.has(key)) map.set(key, { timestamp: key, temps: [], hums: [], fans: [], lights: [], zones: {} });
        const b = map.get(key);
        if (row.temperature != null) b.temps.push(Number(row.temperature));
        if (row.humidity    != null) b.hums.push(Number(row.humidity));
        b.fans.push(row.fan   ? 1 : 0);
        b.lights.push(row.light ? 1 : 0);
    });

    zoneLogs.forEach(row => {
        const key = bucket(new Date(row.recorded_at).getTime());
        if (!map.has(key)) map.set(key, { timestamp: key, temps: [], hums: [], fans: [], lights: [], zones: {} });
        const b = map.get(key);
        if (!b.zones[row.zone_id]) b.zones[row.zone_id] = { zone_name: row.zone_name, readings: [] };
        if (row.moisture_1 != null) b.zones[row.zone_id].readings.push(Number(row.moisture_1));
    });

    const avg = arr => arr.length ? arr.reduce((a, c) => a + c, 0) / arr.length : null;

    return Array.from(map.values())
        .sort((a, b) => a.timestamp - b.timestamp)
        .map(b => ({
            timestamp:   b.timestamp,
            temperature: avg(b.temps),
            humidity:    avg(b.hums),
            fan:  b.fans.length  ? Math.round(avg(b.fans))   : null,
            light: b.lights.length ? Math.round(avg(b.lights)) : null,
            zones: Object.fromEntries(
                Object.entries(b.zones).map(([zId, z]) => [zId, {
                    zone_name:    z.zone_name,
                    moisture_avg: avg(z.readings)
                }])
            )
        }));
}

// ── RENDER CHART ─────────────────────────────────────────────────────────────
function renderChart(intervals, cfg) {
    if (typeof Chart === 'undefined') { console.warn('[Analytics] Chart.js not ready'); return; }
    const ctx = document.getElementById('analytics-chart')?.getContext('2d');
    if (!ctx) return;

    if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
    if (!intervals.length) return;

    // Build x-axis tick labels — show date when the range crosses midnight
    const firstDay = new Date(intervals[0].timestamp).toDateString();
    const labels = intervals.map(iv => {
        const d = new Date(iv.timestamp);
        const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        if (cfg.tickFmt === 'datetime' || d.toDateString() !== firstDay) {
            return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + timeStr;
        }
        return timeStr;
    });

    // Zone moisture datasets — use real zone name from _zoneNameMap if available
    const zoneIds = new Set();
    intervals.forEach(iv => Object.keys(iv.zones).forEach(id => zoneIds.add(id)));
    const moistureColors = ['#44ff88', '#ffaa44', '#44aaff', '#ff44aa'];

    const moistureDatasets = Array.from(zoneIds).map((zoneId, idx) => {
        const zoneNameMap = window._zoneNameMap;
        const dbName = intervals.find(iv => iv.zones[zoneId])?.zones[zoneId]?.zone_name;
        const zoneName = zoneNameMap?.get(Number(zoneId)) ?? dbName ?? `Zone ${zoneId}`;

        return {
            label: `${zoneName} Moisture (%)`,
            data: intervals.map(iv => {
                const z = iv.zones[zoneId];
                if (!z || z.moisture_avg == null) return null;
                return +(Math.max(0, Math.min(100, 100 - (z.moisture_avg / 4095) * 100)).toFixed(1));
            }),
            borderColor: moistureColors[idx % moistureColors.length],
            backgroundColor: 'transparent',
            tension: 0.3,
            yAxisID: 'yRight',
            spanGaps: true,
            pointRadius: 2,
            pointHoverRadius: 4,
            borderWidth: 2
        };
    });

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Temperature (°C)',
                    data: intervals.map(r => r.temperature != null ? +r.temperature.toFixed(1) : null),
                    borderColor: '#ff6b6b',
                    backgroundColor: 'rgba(255,107,107,0.08)',
                    tension: 0.3,
                    yAxisID: 'yLeft',
                    fill: true,
                    spanGaps: true,
                    pointRadius: 2,
                    pointHoverRadius: 4,
                    borderWidth: 2
                },
                {
                    label: 'Humidity (%)',
                    data: intervals.map(r => r.humidity != null ? +r.humidity.toFixed(1) : null),
                    borderColor: '#4da6ff',
                    backgroundColor: 'rgba(77,166,255,0.06)',
                    tension: 0.3,
                    yAxisID: 'yRight',
                    fill: true,
                    spanGaps: true,
                    pointRadius: 2,
                    pointHoverRadius: 4,
                    borderWidth: 2
                },
                ...moistureDatasets
            ]
        },
        options: {
            responsive: true,
            animation: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: {
                    labels: { color: '#ccc', font: { size: 10 }, boxWidth: 12, padding: 8 }
                },
                tooltip: {
                    backgroundColor: 'rgba(20,20,35,0.95)',
                    titleColor: '#aaa',
                    bodyColor: '#fff',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1,
                    callbacks: {
                        title: (items) => {
                            const d = new Date(intervals[items[0].dataIndex].timestamp);
                            return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: { color: '#888', maxTicksLimit: 8, font: { size: 10 }, maxRotation: 30 },
                    grid: { color: 'rgba(255,255,255,0.04)' }
                },
                yLeft: {
                    type: 'linear',
                    position: 'left',
                    ticks: { color: '#ff6b6b', font: { size: 10 } },
                    grid: { color: 'rgba(255,255,255,0.04)' },
                    title: { display: true, text: '°C', color: '#ff6b6b', font: { size: 10 } }
                },
                yRight: {
                    type: 'linear',
                    position: 'right',
                    min: 0,
                    max: 100,
                    ticks: { color: '#4da6ff', font: { size: 10 } },
                    grid: { drawOnChartArea: false },
                    title: { display: true, text: '%', color: '#4da6ff', font: { size: 10 } }
                }
            }
        }
    });
}

// ── EXCEL EXPORT ──────────────────────────────────────────────────────────────
// Always exports at 15-min intervals — the agricultural IoT standard.
// One row = one 15-min window = max 96 rows per day. Clean, comparable, Excel-friendly.
function exportExcel() {
    if (!_lastFarmLogs.length) {
        alert('No data to export. Click Refresh first.');
        return;
    }
    if (typeof XLSX === 'undefined') {
        alert('Excel library is still loading. Please wait a moment and try again.');
        return;
    }

    const INTERVAL_MS = 15 * 60 * 1000; // always 15 minutes
    const intervals15 = groupByInterval(_lastFarmLogs, _lastZoneLogs, INTERVAL_MS);

    const wb = XLSX.utils.book_new();
    const zoneNameMap = window._zoneNameMap;

    const farmName = (() => {
        try { return JSON.parse(localStorage.getItem('selectedFarm'))?.name || 'Farm'; }
        catch { return 'Farm'; }
    })();

    // Collect zone IDs and resolve real names
    const zoneIds = new Set();
    intervals15.forEach(iv => Object.keys(iv.zones).forEach(id => zoneIds.add(id)));
    const zoneIdList = Array.from(zoneIds);
    const zoneLabels = zoneIdList.map(id => {
        const dbName = intervals15.find(iv => iv.zones[id])?.zones[id]?.zone_name;
        return zoneNameMap?.get(Number(id)) ?? dbName ?? `Zone ${id}`;
    });

    // ── Sheet 1: Sensor Readings (15-min) — the main operational sheet ────────
    // This is the equivalent of a SCADA historian export or a weather station log.
    const readingsHeader = [
        'Timestamp',
        'Temp Avg (°C)', 'Temp Min (°C)', 'Temp Max (°C)',
        'Humidity Avg (%)',
        'Fan Active',
        'Light Active',
        ...zoneLabels.flatMap(n => [`${n} Moisture Avg (%)`, `${n} Moisture Min (%)`, `${n} Moisture Max (%)`, `${n} Pump Active`])
    ];

    // Re-group with min/max too — need a richer aggregation for this sheet
    const richIntervals = groupByIntervalRich(_lastFarmLogs, _lastZoneLogs, INTERVAL_MS);

    const readingsRows = richIntervals.map(iv => {
        const zoneValues = zoneIdList.flatMap(id => {
            const z = iv.zones[id];
            if (!z) return ['', '', '', ''];
            const toMoisturePct = adc => adc != null ? +(Math.max(0, Math.min(100, 100 - (adc / 4095) * 100)).toFixed(1)) : '';
            return [
                toMoisturePct(z.moisture_avg),
                toMoisturePct(z.moisture_min),
                toMoisturePct(z.moisture_max),
                z.pump_pct != null ? `${Math.round(z.pump_pct * 100)}%` : ''
            ];
        });
        return [
            new Date(iv.timestamp).toLocaleString(),
            iv.temp_avg  != null ? +iv.temp_avg.toFixed(1)  : '',
            iv.temp_min  != null ? +iv.temp_min.toFixed(1)  : '',
            iv.temp_max  != null ? +iv.temp_max.toFixed(1)  : '',
            iv.hum_avg   != null ? +iv.hum_avg.toFixed(1)   : '',
            iv.fan_pct   != null ? `${Math.round(iv.fan_pct * 100)}%` : '',
            iv.light_pct != null ? `${Math.round(iv.light_pct * 100)}%` : '',
            ...zoneValues
        ];
    });

    const wsR = XLSX.utils.aoa_to_sheet([readingsHeader, ...readingsRows]);
    wsR['!cols'] = [
        { wch: 22 },
        { wch: 14 }, { wch: 12 }, { wch: 12 },
        { wch: 16 },
        { wch: 12 }, { wch: 12 },
        ...zoneIdList.flatMap(() => [{ wch: 22 }, { wch: 22 }, { wch: 22 }, { wch: 14 }])
    ];
    XLSX.utils.book_append_sheet(wb, wsR, 'Sensor Readings (15-min)');

    // ── Sheet 2: Daily Summary ────────────────────────────────────────────────
    // Groups all 15-min intervals into calendar days — useful for weekly review.
    const dayMap = new Map();
    richIntervals.forEach(iv => {
        const d = new Date(iv.timestamp);
        const dayKey = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        if (!dayMap.has(dayKey)) dayMap.set(dayKey, []);
        dayMap.get(dayKey).push(iv);
    });

    const summaryHeader = [
        'Date', 'Readings',
        'Temp Avg (°C)', 'Temp Min (°C)', 'Temp Max (°C)',
        'Humidity Avg (%)',
        'Fan On (% of day)', 'Light On (% of day)',
        ...zoneLabels.flatMap(n => [`${n} Moisture Avg (%)`, `${n} Moisture Min (%)`, `${n} Pump On (% of day)`])
    ];

    const summaryRows = Array.from(dayMap.entries()).map(([day, ivs]) => {
        const temps = ivs.map(iv => iv.temp_avg).filter(v => v != null);
        const hums  = ivs.map(iv => iv.hum_avg).filter(v => v != null);
        const fans  = ivs.map(iv => iv.fan_pct).filter(v => v != null);
        const lights = ivs.map(iv => iv.light_pct).filter(v => v != null);

        const dayAvg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
        const fmt1 = v => v != null ? +v.toFixed(1) : '';
        const fmtPct = v => v != null ? `${Math.round(v * 100)}%` : '';

        const zoneValues = zoneIdList.flatMap(id => {
            const moistures = ivs.map(iv => iv.zones[id]?.moisture_avg).filter(v => v != null);
            const pumps     = ivs.map(iv => iv.zones[id]?.pump_pct).filter(v => v != null);
            const toMoisturePct = adc => +(Math.max(0, Math.min(100, 100 - (adc / 4095) * 100)).toFixed(1));
            const avgMoisture = moistures.length ? dayAvg(moistures) : null;
            const minMoisture = moistures.length ? Math.min(...moistures) : null;
            return [
                avgMoisture != null ? toMoisturePct(avgMoisture) : '',
                minMoisture != null ? toMoisturePct(minMoisture) : '',
                fmtPct(pumps.length ? dayAvg(pumps) : null)
            ];
        });

        return [
            day, ivs.length,
            fmt1(dayAvg(temps)),
            temps.length ? +Math.min(...temps).toFixed(1) : '',
            temps.length ? +Math.max(...temps).toFixed(1) : '',
            fmt1(dayAvg(hums)),
            fmtPct(dayAvg(fans)),
            fmtPct(dayAvg(lights)),
            ...zoneValues
        ];
    });

    const wsS = XLSX.utils.aoa_to_sheet([summaryHeader, ...summaryRows]);
    wsS['!cols'] = [{ wch: 12 }, { wch: 10 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 16 }, { wch: 18 }, { wch: 18 },
        ...zoneIdList.flatMap(() => [{ wch: 22 }, { wch: 22 }, { wch: 20 }])];
    XLSX.utils.book_append_sheet(wb, wsS, 'Daily Summary');

    // ── Sheet 3: Export Metadata ──────────────────────────────────────────────
    const exportedRange = richIntervals.length
        ? `${new Date(richIntervals[0].timestamp).toLocaleString()} → ${new Date(richIntervals[richIntervals.length-1].timestamp).toLocaleString()}`
        : 'N/A';

    const metaRows = [
        ['Farm Analytics Export'],
        [],
        ['Farm',           farmName],
        ['Farm ID',        localStorage.getItem('selectedFarmId') || ''],
        ['Exported At',    new Date().toLocaleString()],
        ['Period',         exportedRange],
        ['Interval',       '15 minutes'],
        ['Total Intervals', richIntervals.length],
        ['Raw Readings',   _lastFarmLogs.length],
        ['Zones',          zoneLabels.join(', ') || 'None'],
        [],
        ['Notes'],
        ['- Each row in "Sensor Readings" covers one 15-minute window'],
        ['- Temp Min/Max = lowest and highest reading within that window'],
        ['- Fan/Light/Pump Active = % of readings within window where device was ON'],
        ['- Moisture % is converted from raw ADC (0-4095): 0 ADC = 100% wet, 4095 ADC = 0% wet'],
    ];
    const wsMeta = XLSX.utils.aoa_to_sheet(metaRows);
    wsMeta['!cols'] = [{ wch: 20 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(wb, wsMeta, 'Export Info');

    XLSX.writeFile(wb, `${farmName}-analytics-${datestamp()}.xlsx`);
}

// ── RICH INTERVAL GROUPING (with min/max/pump_pct) ───────────────────────────
function groupByIntervalRich(farmLogs, zoneLogs, intervalMs) {
    const map = new Map();
    const bucket = t => Math.floor(t / intervalMs) * intervalMs;

    farmLogs.forEach(row => {
        const key = bucket(new Date(row.recorded_at).getTime());
        if (!map.has(key)) map.set(key, { timestamp: key, temps: [], hums: [], fans: [], lights: [], zones: {} });
        const b = map.get(key);
        if (row.temperature != null) b.temps.push(Number(row.temperature));
        if (row.humidity    != null) b.hums.push(Number(row.humidity));
        b.fans.push(row.fan   ? 1 : 0);
        b.lights.push(row.light ? 1 : 0);
    });

    zoneLogs.forEach(row => {
        const key = bucket(new Date(row.recorded_at).getTime());
        if (!map.has(key)) map.set(key, { timestamp: key, temps: [], hums: [], fans: [], lights: [], zones: {} });
        const b = map.get(key);
        if (!b.zones[row.zone_id]) b.zones[row.zone_id] = { zone_name: row.zone_name, moistures: [], pumps: [] };
        if (row.moisture_1 != null) b.zones[row.zone_id].moistures.push(Number(row.moisture_1));
        b.zones[row.zone_id].pumps.push(row.pump ? 1 : 0);
    });

    const avg = arr => arr.length ? arr.reduce((a, c) => a + c, 0) / arr.length : null;

    return Array.from(map.values())
        .sort((a, b) => a.timestamp - b.timestamp)
        .map(b => ({
            timestamp: b.timestamp,
            temp_avg:  avg(b.temps),
            temp_min:  b.temps.length ? Math.min(...b.temps) : null,
            temp_max:  b.temps.length ? Math.max(...b.temps) : null,
            hum_avg:   avg(b.hums),
            fan_pct:   avg(b.fans),
            light_pct: avg(b.lights),
            zones: Object.fromEntries(
                Object.entries(b.zones).map(([zId, z]) => [zId, {
                    zone_name:    z.zone_name,
                    moisture_avg: avg(z.moistures),
                    moisture_min: z.moistures.length ? Math.min(...z.moistures) : null,
                    moisture_max: z.moistures.length ? Math.max(...z.moistures) : null,
                    pump_pct:     avg(z.pumps)
                }])
            )
        }));
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function datestamp() {
    return new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
}
