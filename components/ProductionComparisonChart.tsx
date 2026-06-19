"use client";

import type { DraftRow } from "@/lib/types";

type Props = {
  currentRows: DraftRow[];
  lastRows: DraftRow[];
};

type MetricConfig = {
  fieldId: string;
  title: string;
  unit: string;
  currentColor: string;
  lastColor: string;
  formatter?: (value: number) => string;
};

const CHART_WIDTH = 320;
const CHART_HEIGHT = 220;
const PLOT_LEFT = 42;
const PLOT_RIGHT = 16;
const PLOT_TOP = 18;
const PLOT_BOTTOM = 36;
const GRID_STEPS = 4;

const METRICS: MetricConfig[] = [
  {
    fieldId: "reportedProratedProduction",
    title: "Reported Prorated Production",
    unit: "m3/d",
    currentColor: "var(--chart-line-current)",
    lastColor: "var(--chart-line-last)"
  },
  {
    fieldId: "reportedProration",
    title: "Reported Proration",
    unit: "%",
    currentColor: "var(--chart-line-accent-current)",
    lastColor: "var(--chart-line-accent-last)",
    formatter: (value) => `${value.toFixed(1)}%`
  },
  {
    fieldId: "opsNightLoss",
    title: "Prod Lost Ops Night Shift",
    unit: "m3/d",
    currentColor: "var(--chart-line-loss-current)",
    lastColor: "var(--chart-line-loss-last)"
  }
];

export function ProductionComparisonChart({ currentRows, lastRows }: Props) {
  const count = Math.max(currentRows.length, lastRows.length);
  if (!count) {
    return null;
  }

  const labels = Array.from({ length: count }, (_, index) => weekdayLabel(currentRows[index]?.date || lastRows[index]?.date, index));

  return (
    <section className="production-chart-card">
      <div className="production-chart-head">
        <div>
          <div className="eyebrow">Comparison graph</div>
          <h3>Current Week vs Last Week</h3>
        </div>
        <div className="production-chart-global-legend">
          <span className="production-chart-legend-item">
            <svg width="24" height="10" viewBox="0 0 24 10" aria-hidden="true">
              <line x1="1" y1="5" x2="23" y2="5" stroke="var(--chart-line-current)" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            Current week
          </span>
          <span className="production-chart-legend-item">
            <svg width="24" height="10" viewBox="0 0 24 10" aria-hidden="true">
              <line x1="1" y1="5" x2="23" y2="5" stroke="var(--chart-line-last)" strokeWidth="2.5" strokeDasharray="8 6" strokeLinecap="round" />
            </svg>
            Last week
          </span>
        </div>
      </div>

      <div className="production-chart-grid">
        {METRICS.map((metric) => (
          <MiniMetricChart
            key={metric.fieldId}
            metric={metric}
            labels={labels}
            currentValues={extractMetric(currentRows, metric.fieldId, count)}
            lastValues={extractMetric(lastRows, metric.fieldId, count)}
          />
        ))}
      </div>
    </section>
  );
}

function MiniMetricChart({
  metric,
  labels,
  currentValues,
  lastValues
}: {
  metric: MetricConfig;
  labels: string[];
  currentValues: Array<number | null>;
  lastValues: Array<number | null>;
}) {
  const count = labels.length;
  const range = buildRange([...currentValues, ...lastValues], 0.12);
  const plotWidth = CHART_WIDTH - PLOT_LEFT - PLOT_RIGHT;
  const plotHeight = CHART_HEIGHT - PLOT_TOP - PLOT_BOTTOM;

  const xForIndex = (index: number) => PLOT_LEFT + (plotWidth * (count <= 1 ? 0.5 : index / (count - 1)));
  const yForValue = (value: number | null) => {
    if (value === null) return null;
    const ratio = (value - range.min) / (range.max - range.min || 1);
    return PLOT_TOP + plotHeight - ratio * plotHeight;
  };

  const currentPoints = currentValues.map((value, index) => [xForIndex(index), yForValue(value)] as const);
  const lastPoints = lastValues.map((value, index) => [xForIndex(index), yForValue(value)] as const);

  return (
    <div className="production-mini-chart">
      <div className="production-mini-chart-head">
        <div>
          <strong>{metric.title}</strong>
          <span>{metric.unit}</span>
        </div>
      </div>

      <svg className="production-chart-svg" viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} role="img" aria-label={metric.title}>
        <rect x={PLOT_LEFT} y={PLOT_TOP} width={plotWidth} height={plotHeight} fill="var(--chart-plot-bg)" rx="8" />

        {Array.from({ length: GRID_STEPS }, (_, step) => {
          const y = PLOT_TOP + (plotHeight * step) / (GRID_STEPS - 1);
          const tick = tickValue(range, step, GRID_STEPS);
          return (
            <g key={step}>
              <line x1={PLOT_LEFT} y1={y} x2={CHART_WIDTH - PLOT_RIGHT} y2={y} stroke="var(--chart-grid)" strokeWidth="1" />
              <text x="8" y={y + 4} fill="var(--chart-axis-text)" fontSize="10">
                {formatMetricTick(tick, metric)}
              </text>
            </g>
          );
        })}

        {labels.map((label, index) => (
          <text
            key={label + index}
            x={xForIndex(index)}
            y={CHART_HEIGHT - 12}
            fill="var(--chart-axis-text)"
            fontSize="10"
            textAnchor="middle"
          >
            {label}
          </text>
        ))}

        <polyline
          fill="none"
          stroke={metric.currentColor}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={currentPoints.filter(([, y]) => y !== null).map(([x, y]) => `${x},${y}`).join(" ")}
        />
        <polyline
          fill="none"
          stroke={metric.lastColor}
          strokeWidth="2.5"
          strokeDasharray="8 6"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={lastPoints.filter(([, y]) => y !== null).map(([x, y]) => `${x},${y}`).join(" ")}
        />

        {currentPoints.map(([x, y], index) => y === null ? null : (
          <circle key={`c-${index}`} cx={x} cy={y} r="3" fill={metric.currentColor} />
        ))}
        {lastPoints.map(([x, y], index) => y === null ? null : (
          <circle key={`l-${index}`} cx={x} cy={y} r="3" fill={metric.lastColor} />
        ))}
      </svg>
    </div>
  );
}

type AxisRange = {
  min: number;
  max: number;
};

function extractMetric(rows: DraftRow[], fieldId: string, count: number) {
  return Array.from({ length: count }, (_, index) => parseMetric(rows[index]?.[fieldId]));
}

function parseMetric(value: string | undefined) {
  if (!value) return null;
  const numeric = Number.parseFloat(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function buildRange(values: Array<number | null>, paddingRatio: number): AxisRange {
  const usable = values.filter((value): value is number => value !== null);
  if (!usable.length) {
    return { min: 0, max: 1 };
  }

  const min = Math.min(...usable);
  const max = Math.max(...usable);
  if (min === max) {
    const delta = min === 0 ? 1 : Math.abs(min) * 0.08;
    return { min: Math.max(0, min - delta), max: max + delta };
  }

  const padding = (max - min) * paddingRatio;
  return {
    min: Math.max(0, min - padding),
    max: max + padding
  };
}

function tickValue(range: AxisRange, index: number, steps: number) {
  const ratio = 1 - index / (steps - 1);
  return range.min + (range.max - range.min) * ratio;
}

function formatMetricTick(value: number, metric: MetricConfig) {
  if (metric.formatter) {
    return metric.formatter(value);
  }
  return value >= 100 ? value.toFixed(0) : value.toFixed(1).replace(/\.0$/, "");
}

function weekdayLabel(rawDate: string | undefined, index: number) {
  const parsed = parseDate(rawDate);
  if (!parsed) {
    return `D${index + 1}`;
  }
  return parsed.toLocaleDateString("en-US", { weekday: "short" });
}

function parseDate(rawDate: string | undefined) {
  if (!rawDate) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
    const [year, month, day] = rawDate.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  const slash = rawDate.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (slash) {
    return new Date(Number(slash[3]), Number(slash[2]) - 1, Number(slash[1]));
  }

  return null;
}
