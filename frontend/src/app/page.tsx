"use client";

import { ChangeEvent, useEffect, useState } from "react";

type TestKey = "HbA1c" | "Fasting Glucose";
type ReportValues = Record<TestKey, number>;
type ReportItem = {
  id: string;
  fileName: string;
  fileUrl: string;
  date: string;
  values: ReportValues;
  demo?: boolean;
};
type ScreenState = "ready" | "loading" | "error";
type DashboardView = "overview" | "trends";

const TESTS: TestKey[] = ["HbA1c", "Fasting Glucose"];
const TEST_META: Record<
  TestKey,
  { unit: string; normalRange: [number, number]; color: string; digits: number }
> = {
  HbA1c: {
    unit: "%",
    normalRange: [4.8, 5.6],
    color: "#5b65e8",
    digits: 1,
  },
  "Fasting Glucose": {
    unit: "mg/dL",
    normalRange: [70, 99],
    color: "#14977e",
    digits: 0,
  },
};
const PROGRESS_STEPS = [
  "Reading report",
  "Checking values",
  "Comparing with earlier reports",
  "Writing summary",
];
const DEMO_VALUES: ReportValues[] = [
  { HbA1c: 7.2, "Fasting Glucose": 158 },
  { HbA1c: 7.0, "Fasting Glucose": 151 },
  { HbA1c: 6.8, "Fasting Glucose": 146 },
  { HbA1c: 6.7, "Fasting Glucose": 139 },
  { HbA1c: 6.5, "Fasting Glucose": 133 },
  { HbA1c: 6.4, "Fasting Glucose": 128 },
];

function createDemoReports(): ReportItem[] {
  const today = new Date();
  return DEMO_VALUES.map((values, index) => {
    const date = new Date(today);
    date.setMonth(today.getMonth() - (DEMO_VALUES.length - 1 - index) * 2);
    date.setDate(12);
    return {
      id: `demo-${index}`,
      fileName: `Lab report ${date.toLocaleDateString("en-US", { month: "short", year: "numeric" })}`,
      fileUrl: "",
      date: date.toISOString(),
      values,
      demo: true,
    };
  });
}

function formatDate(value: string, options?: Intl.DateTimeFormatOptions) {
  return new Date(value).toLocaleDateString(
    "en-US",
    options ?? { month: "short", day: "numeric", year: "numeric" },
  );
}

function formatValue(value: number, test: TestKey) {
  return value.toFixed(TEST_META[test].digits);
}

function getDirection(delta: number, test: TestKey) {
  const threshold = test === "HbA1c" ? 0.05 : 2;
  return delta > threshold ? "rising" : delta < -threshold ? "falling" : "stable";
}

function createUploadedReport(previous: ReportItem | undefined, file: File): ReportItem {
  const fallback = DEMO_VALUES[DEMO_VALUES.length - 1];
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    fileName: file.name,
    fileUrl: URL.createObjectURL(file),
    date: new Date().toISOString(),
    values: {
      HbA1c: Number(
        ((previous?.values.HbA1c ?? fallback.HbA1c) + (Math.random() - 0.65) * 0.4).toFixed(1),
      ),
      "Fasting Glucose": Math.max(
        75,
        Math.round((previous?.values["Fasting Glucose"] ?? fallback["Fasting Glucose"]) + (Math.random() - 0.6) * 24),
      ),
    },
  };
}

export default function Home() {
  const [patient, setPatient] = useState("Ava Patel");
  const [reports, setReports] = useState<ReportItem[]>(() => createDemoReports());
  const [screenState, setScreenState] = useState<ScreenState>("ready");
  const [currentStep, setCurrentStep] = useState(-1);
  const [selectedTest, setSelectedTest] = useState<TestKey>("HbA1c");
  const [activeView, setActiveView] = useState<DashboardView>("overview");
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  useEffect(() => {
    if (screenState !== "loading" || !pendingFile) return;

    let step = 0;
    const timer = window.setInterval(() => {
      setCurrentStep(step);
      step += 1;

      if (step > PROGRESS_STEPS.length) {
        window.clearInterval(timer);
        setReports((current) => [
          ...current,
          createUploadedReport(current[current.length - 1], pendingFile),
        ]);
        setPendingFile(null);
        setCurrentStep(-1);
        setScreenState("ready");
      }
    }, 750);

    return () => window.clearInterval(timer);
  }, [screenState, pendingFile]);

  const latest = reports[reports.length - 1];
  const previous = reports[reports.length - 2];

  const handleUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const validType = ["image/jpeg", "image/png", "application/pdf"].includes(file.type);
    if (!validType || file.size > 10 * 1024 * 1024) {
      setScreenState("error");
      event.target.value = "";
      return;
    }
    setPendingFile(file);
    setCurrentStep(-1);
    setScreenState("loading");
    event.target.value = "";
  };

  return (
    <main className="dashboard">
      <header className="app-header">
        <a className="brand" href="#" aria-label="Clearwell home">
          <span className="brand-mark">+</span>
          <span>clearwell</span>
        </a>
        <div className="header-actions">
          <label className="patient-picker">
            <span className="avatar">{patient.split(" ").map((part) => part[0]).join("")}</span>
            <select value={patient} onChange={(event) => setPatient(event.target.value)} aria-label="Choose patient">
              <option>Ava Patel</option>
              <option>Ethan Ross</option>
              <option>Mila Chen</option>
            </select>
            <span className="chevron">⌄</span>
          </label>
          <label className="upload-button">
            <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={handleUpload} />
            <span aria-hidden="true">＋</span> Add report
          </label>
        </div>
      </header>

      <div className="workspace">
        <aside className="side-nav">
          <span className="nav-label">DASHBOARD</span>
          <button
            type="button"
            className={`nav-item ${activeView === "overview" ? "active" : ""}`}
            onClick={() => setActiveView("overview")}
          >
            <span className="nav-icon">▦</span> Overall summary
          </button>
          <button
            type="button"
            className={`nav-item ${activeView === "trends" ? "active" : ""}`}
            onClick={() => setActiveView("trends")}
          >
            <span className="nav-icon">⌁</span> Trends &amp; vitals
          </button>
        </aside>

        <div className="dashboard-content">
          <section className="page-heading">
            <div>
              <div className="heading-kicker"><span className="live-dot" /> PATIENT DASHBOARD</div>
              <h1>{activeView === "overview" ? "Overall summary" : "Trends & vitals"}</h1>
              <p>{activeView === "overview" ? `A clear view of ${patient.split(" ")[0]}’s latest results and changes.` : "See how your results have changed over time."}</p>
            </div>
            <div className="last-updated">
              <span className="eyebrow">LATEST REPORT</span>
              <strong>{latest ? formatDate(latest.date) : "—"}</strong>
            </div>
          </section>

          {screenState === "error" && (
            <div className="error-banner" role="alert">
              <span className="error-symbol">!</span>
              <span>We couldn&apos;t read this report. Try a clearer photo or a JPG, PNG, or PDF under 10 MB.</span>
              <button type="button" aria-label="Dismiss error" onClick={() => setScreenState("ready")}>×</button>
            </div>
          )}

          {screenState === "loading" ? (
            <section className="processing-card" aria-live="polite">
              <div className="processing-heading">
                <span className="spinner" />
                <div><span className="eyebrow">REPORT PROCESSING</span><h2>Loading your results…</h2></div>
              </div>
              <div className="progress-steps">
                {PROGRESS_STEPS.map((step, index) => (
                  <div className={`progress-step ${index < currentStep ? "done" : index === currentStep ? "active" : ""}`} key={step}>
                    <span className="step-marker">{index < currentStep ? "✓" : String(index + 1).padStart(2, "0")}</span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </section>
          ) : activeView === "overview" ? (
            <>
              <section className="summary-intro">
                <div className="summary-symbol">✳</div>
                <div>
                  <span className="eyebrow">AT A GLANCE</span>
                  <h2>Your results, compared</h2>
                  <p>Here’s how your latest values compare with your previous report.</p>
                </div>
              </section>
              <section className="comparison-card" aria-label="Results comparison">
                <div className="comparison-heading">
                  <div><span className="eyebrow">RESULT COMPARISON</span><h2>What changed</h2></div>
                  <span className="pending-badge"><span /> Pending doctor review</span>
                </div>
                <div className="table-scroll">
                  <table className="comparison-table">
                    <thead>
                      <tr>
                        <th>Test</th>
                        <th>Previous · {previous ? formatDate(previous.date) : "—"}</th>
                        <th>Latest · {latest ? formatDate(latest.date) : "—"}</th>
                        <th>Change</th>
                        <th>Direction</th>
                      </tr>
                    </thead>
                    <tbody>
                      {TESTS.map((test) => {
                        const current = latest?.values[test] ?? 0;
                        const prior = previous?.values[test] ?? current;
                        const delta = current - prior;
                        const direction = getDirection(delta, test);
                        const arrow = direction === "rising" ? "↑" : direction === "falling" ? "↓" : "→";
                        return (
                          <tr key={test}>
                            <td><span className="table-test"><i style={{ background: TEST_META[test].color }} />{test}</span></td>
                            <td>{formatValue(prior, test)} <span className="table-unit">{TEST_META[test].unit}</span></td>
                            <td className="latest-cell">{formatValue(current, test)} <span className="table-unit">{TEST_META[test].unit}</span></td>
                            <td><span className={`table-change ${direction}`}>{arrow} {formatValue(Math.abs(delta), test)} {TEST_META[test].unit}</span></td>
                            <td><span className={`direction-label ${direction}`}>{direction}</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="table-footnote">Changes compare the two most recent reports. Values are mock data for demonstration only.</p>
              </section>
              <section className="summary-note">
                <span className="note-icon">i</span>
                <p>This summary describes changes in the reported values only. It is not a diagnosis or medical advice. Please discuss with your doctor.</p>
              </section>
            </>
          ) : (
            <>
              <section className="metric-grid" aria-label="Latest results">
                {TESTS.map((test) => {
                  const current = latest?.values[test] ?? 0;
                  const prior = previous?.values[test] ?? current;
                  const delta = current - prior;
                  const direction = getDirection(delta, test);
                  const arrow = direction === "rising" ? "↑" : direction === "falling" ? "↓" : "→";
                  const meta = TEST_META[test];
                  const points = reports.slice(-6).map((report) => report.values[test]);
                  return (
                    <article className="metric-card" key={test}>
                      <div className="metric-topline">
                        <span className="metric-icon" style={{ color: meta.color, background: `${meta.color}15` }}>{test === "HbA1c" ? "◉" : "◌"}</span>
                        <span className="pending-badge"><span /> Pending review</span>
                      </div>
                      <p className="metric-name">{test}</p>
                      <div className="metric-value">{formatValue(current, test)}<span>{meta.unit}</span></div>
                      <div className="metric-bottom">
                        <span className={`change-pill ${direction}`}>{arrow} {formatValue(Math.abs(delta), test)} {meta.unit}</span>
                        <span className="change-caption">vs. previous report</span>
                        <Sparkline values={points} color={meta.color} />
                      </div>
                    </article>
                  );
                })}
              </section>
              <section className="charts-section">
                <div className="section-title">
                  <div><span className="eyebrow">YOUR RESULTS</span><h2>Trends over time</h2></div>
                  <span className="range-key"><i /> Reference range</span>
                </div>
                <div className="chart-grid">
                  {TESTS.map((test) => (
                    <TrendChart
                      key={test}
                      test={test}
                      reports={reports}
                      active={selectedTest === test}
                      onSelect={() => setSelectedTest(test)}
                    />
                  ))}
                </div>
              </section>
              <p className="disclaimer">Mock data is shown for demonstration until your report results are connected.</p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const width = 76;
  const height = 32;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const points = values.map((value, index) => {
    const x = (index * (width - 4)) / Math.max(values.length - 1, 1) + 2;
    const y = height - 3 - ((value - min) / (max - min || 1)) * (height - 8);
    return `${x},${y}`;
  });
  return <svg className="sparkline" viewBox={`0 0 ${width} ${height}`} aria-hidden="true"><polyline points={points.join(" ")} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function TrendChart({
  test,
  reports,
  active,
  onSelect,
}: {
  test: TestKey;
  reports: ReportItem[];
  active: boolean;
  onSelect: () => void;
}) {
  const meta = TEST_META[test];
  const width = 540;
  const height = 240;
  const left = 38;
  const right = 18;
  const top = 18;
  const bottom = 36;
  const data = reports.slice(-6);
  const values = data.map((report) => report.values[test]);
  const minValue = Math.min(...values, meta.normalRange[0]) - (test === "HbA1c" ? 0.4 : 15);
  const maxValue = Math.max(...values, meta.normalRange[1]) + (test === "HbA1c" ? 0.4 : 15);
  const plotHeight = height - top - bottom;
  const plotWidth = width - left - right;
  const yFor = (value: number) => top + plotHeight - ((value - minValue) / (maxValue - minValue || 1)) * plotHeight;
  const points = data.map((report, index) => ({
    x: left + (index * plotWidth) / Math.max(data.length - 1, 1),
    y: yFor(report.values[test]),
    value: report.values[test],
    date: report.date,
  }));
  const linePath = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const bandTop = yFor(meta.normalRange[1]);
  const bandBottom = yFor(meta.normalRange[0]);

  return (
    <button type="button" onClick={onSelect} className={`trend-chart-card ${active ? "selected" : ""}`} aria-pressed={active}>
      <div className="chart-card-heading">
        <div><span className="chart-indicator" style={{ background: meta.color }} /><div><strong>{test}</strong><span>Last 12 months</span></div></div>
        <span className="chart-current">{formatValue(points[points.length - 1]?.value ?? 0, test)} <small>{meta.unit}</small></span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="trend-svg" role="img" aria-label={`${test} values over time with reference range`}>
        <rect x={left} y={Math.min(bandTop, bandBottom)} width={plotWidth} height={Math.max(0, Math.abs(bandBottom - bandTop))} fill={meta.color} opacity="0.09" />
        {[0, 1, 2, 3].map((tick) => {
          const y = top + (tick * plotHeight) / 3;
          return <line key={tick} x1={left} x2={width - right} y1={y} y2={y} className="grid-line" />;
        })}
        <path d={linePath} fill="none" stroke={meta.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point, index) => (
          <g key={`${point.date}-${index}`}>
            <circle cx={point.x} cy={point.y} r="5" fill="white" stroke={meta.color} strokeWidth="2.5" />
            <text x={point.x} y={height - 8} textAnchor="middle" className="axis-label">{formatDate(point.date, { month: "short" })}</text>
          </g>
        ))}
      </svg>
      <span className="chart-footnote">Shaded area indicates the reference range</span>
    </button>
  );
}
