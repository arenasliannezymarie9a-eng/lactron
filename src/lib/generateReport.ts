import { Batch, SensorReading, BatchHistory } from "./api";
import { format } from "date-fns";

function formatDateTime(datetime: string): string {
  try {
    return format(new Date(datetime), "MMM dd, yyyy 'at' HH:mm");
  } catch {
    return datetime;
  }
}

function computeStats(readings: SensorReading[]) {
  const calc = (key: keyof Pick<SensorReading, 'ethanol' | 'ammonia' | 'h2s'>) => {
    const vals = readings.map(r => Number(r[key]) || 0);
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    return {
      avg: avg.toFixed(1),
      min: Math.min(...vals).toFixed(1),
      max: Math.max(...vals).toFixed(1),
    };
  };
  return { ethanol: calc('ethanol'), ammonia: calc('ammonia'), h2s: calc('h2s') };
}

function buildReportHTML(opts: {
  batchId: string;
  collectorName: string;
  collectionDatetime: string;
  grade: string;
  shelfLife: number;
  totalReadings: number;
  readings?: SensorReading[];
  ethanol?: number;
  ammonia?: number;
  h2s?: number;
}): string {
  const generatedAt = format(new Date(), "MMMM dd, yyyy 'at' HH:mm:ss");
  const stats = opts.readings && opts.readings.length > 0 ? computeStats(opts.readings) : null;
  const isGood = opts.grade === "GOOD";
  const gradeColor = isGood ? "#16a34a" : "#dc2626";
  const gradeBg = isGood ? "#f0fdf4" : "#fef2f2";

  let readingsTableRows = "";
  if (opts.readings && opts.readings.length > 0) {
    readingsTableRows = opts.readings
      .slice()
      .reverse()
      .map((r, i) => {
        const bg = i % 2 === 0 ? "#ffffff" : "#f9fafb";
        return `<tr style="background:${bg}">
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:12px">${i + 1}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:12px">${formatDateTime(r.created_at)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;font-family:monospace">${Number(r.ethanol).toFixed(1)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;font-family:monospace">${Number(r.ammonia).toFixed(1)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;font-family:monospace">${Number(r.h2s).toFixed(1)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center">
            <span style="padding:2px 8px;border-radius:9999px;font-size:11px;font-weight:600;background:${r.status === 'good' ? '#f0fdf4' : r.status === 'spoiled' ? '#fef2f2' : '#fffbeb'};color:${r.status === 'good' ? '#16a34a' : r.status === 'spoiled' ? '#dc2626' : '#d97706'}">${(r.status || '').toUpperCase()}</span>
          </td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;font-family:monospace">${Number(r.predicted_shelf_life).toFixed(1)}h</td>
        </tr>`;
      })
      .join("");
  }

  const statsSection = stats
    ? `<table style="width:100%;border-collapse:collapse;margin-bottom:24px">
        <thead>
          <tr style="background:#f1f5f9">
            <th style="padding:10px 12px;text-align:left;border-bottom:2px solid #cbd5e1;font-size:13px">Sensor</th>
            <th style="padding:10px 12px;text-align:center;border-bottom:2px solid #cbd5e1;font-size:13px">Average (ppm)</th>
            <th style="padding:10px 12px;text-align:center;border-bottom:2px solid #cbd5e1;font-size:13px">Min (ppm)</th>
            <th style="padding:10px 12px;text-align:center;border-bottom:2px solid #cbd5e1;font-size:13px">Max (ppm)</th>
          </tr>
        </thead>
        <tbody>
          <tr><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">Ethanol (MQ-3)</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;font-family:monospace">${stats.ethanol.avg}</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;font-family:monospace">${stats.ethanol.min}</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;font-family:monospace">${stats.ethanol.max}</td></tr>
          <tr style="background:#f9fafb"><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">Ammonia (MQ-135)</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;font-family:monospace">${stats.ammonia.avg}</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;font-family:monospace">${stats.ammonia.min}</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;font-family:monospace">${stats.ammonia.max}</td></tr>
          <tr><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">H₂S (MQ-136)</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;font-family:monospace">${stats.h2s.avg}</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;font-family:monospace">${stats.h2s.min}</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center;font-family:monospace">${stats.h2s.max}</td></tr>
        </tbody>
      </table>`
    : "";

  const readingsSection = readingsTableRows
    ? `<h2 style="font-size:16px;font-weight:700;margin:24px 0 12px;color:#1e293b">Individual Sensor Readings</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
        <thead>
          <tr style="background:#f1f5f9">
            <th style="padding:10px 12px;text-align:center;border-bottom:2px solid #cbd5e1;font-size:12px">#</th>
            <th style="padding:10px 12px;text-align:left;border-bottom:2px solid #cbd5e1;font-size:12px">Timestamp</th>
            <th style="padding:10px 12px;text-align:center;border-bottom:2px solid #cbd5e1;font-size:12px">Ethanol</th>
            <th style="padding:10px 12px;text-align:center;border-bottom:2px solid #cbd5e1;font-size:12px">Ammonia</th>
            <th style="padding:10px 12px;text-align:center;border-bottom:2px solid #cbd5e1;font-size:12px">H₂S</th>
            <th style="padding:10px 12px;text-align:center;border-bottom:2px solid #cbd5e1;font-size:12px">Status</th>
            <th style="padding:10px 12px;text-align:center;border-bottom:2px solid #cbd5e1;font-size:12px">Shelf Life</th>
          </tr>
        </thead>
        <tbody>${readingsTableRows}</tbody>
      </table>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>LACTRON Report - ${opts.batchId}</title>
  <style>
    @page { size: A4; margin: 20mm 15mm; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b; line-height: 1.5; padding: 0; }
  </style>
</head>
<body>
  <div style="max-width:210mm;margin:0 auto;padding:20px">
    <!-- Header -->
    <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #0f172a;padding-bottom:16px;margin-bottom:24px">
      <div>
        <h1 style="font-size:24px;font-weight:800;letter-spacing:-0.5px;color:#0f172a">LACTRON</h1>
        <p style="font-size:11px;color:#64748b;margin-top:2px">Solar-Powered IoT Smart System for Milk Quality Monitoring</p>
      </div>
      <div style="text-align:right">
        <p style="font-size:14px;font-weight:700;color:#0f172a">Milk Quality Analysis Report</p>
        <p style="font-size:11px;color:#64748b">Generated: ${generatedAt}</p>
      </div>
    </div>

    <!-- Batch Information -->
    <h2 style="font-size:16px;font-weight:700;margin-bottom:12px;color:#1e293b">Batch Information</h2>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
      <tbody>
        <tr style="background:#f9fafb">
          <td style="padding:10px 12px;font-weight:600;width:200px;border-bottom:1px solid #e5e7eb;font-size:13px">Batch ID</td>
          <td style="padding:10px 12px;font-family:monospace;border-bottom:1px solid #e5e7eb;font-size:13px">${opts.batchId}</td>
        </tr>
        <tr>
          <td style="padding:10px 12px;font-weight:600;border-bottom:1px solid #e5e7eb;font-size:13px">Collector Name</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:13px">${opts.collectorName}</td>
        </tr>
        <tr style="background:#f9fafb">
          <td style="padding:10px 12px;font-weight:600;border-bottom:1px solid #e5e7eb;font-size:13px">Time of Collection</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:13px">${formatDateTime(opts.collectionDatetime)}</td>
        </tr>
        <tr>
          <td style="padding:10px 12px;font-weight:600;border-bottom:1px solid #e5e7eb;font-size:13px">Total Readings</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:13px">${opts.totalReadings}</td>
        </tr>
      </tbody>
    </table>

    <!-- Classification Result -->
    <div style="display:flex;gap:16px;margin-bottom:24px">
      <div style="flex:1;padding:20px;border-radius:12px;background:${gradeBg};border:2px solid ${gradeColor}20;text-align:center">
        <p style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#64748b;margin-bottom:8px">Classification</p>
        <p style="font-size:28px;font-weight:800;color:${gradeColor}">${opts.grade}</p>
      </div>
      <div style="flex:1;padding:20px;border-radius:12px;background:#f0f9ff;border:2px solid #bfdbfe;text-align:center">
        <p style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#64748b;margin-bottom:8px">Estimated Shelf Life</p>
        <p style="font-size:28px;font-weight:800;color:#0369a1">${opts.shelfLife.toFixed(1)} <span style="font-size:14px;color:#64748b">Hours</span></p>
      </div>
    </div>

    <!-- Sensor Summary -->
    ${stats ? '<h2 style="font-size:16px;font-weight:700;margin-bottom:12px;color:#1e293b">Sensor Summary (Avg / Min / Max)</h2>' : ''}
    ${statsSection}

    <!-- Individual Readings -->
    ${readingsSection}

    <!-- Footer -->
    <div style="border-top:2px solid #e2e8f0;padding-top:16px;margin-top:32px;text-align:center">
      <p style="font-size:11px;color:#64748b;font-weight:600">LACTRON — Solar-Powered IoT Smart System for Milk Quality Monitoring</p>
      <p style="font-size:10px;color:#94a3b8;margin-top:4px">AI-Driven Spoilage Prediction using Scikit-learn Regression Model</p>
    </div>
  </div>

  <script>window.onload = function() { setTimeout(function() { window.print(); }, 500); };</script>
</body>
</html>`;
}

export function generateReport(
  batch: Batch,
  readings: SensorReading[],
  grade: string,
  shelfLife: number
): void {
  const html = buildReportHTML({
    batchId: batch.batch_id,
    collectorName: batch.collector_name,
    collectionDatetime: batch.collection_datetime,
    grade,
    shelfLife,
    totalReadings: readings.length,
    readings,
  });

  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}

export function generateHistoryReport(batch: BatchHistory): void {
  const html = buildReportHTML({
    batchId: batch.batch_id,
    collectorName: batch.collector_name,
    collectionDatetime: batch.collection_datetime,
    grade: batch.grade,
    shelfLife: batch.shelf_life,
    totalReadings: 1,
    ethanol: batch.ethanol,
    ammonia: batch.ammonia,
    h2s: batch.h2s,
  });

  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}
