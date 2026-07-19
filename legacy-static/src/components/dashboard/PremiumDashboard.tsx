import type { CSSProperties, ReactNode } from "react";
import { Link } from "react-router-dom";

import type { IconName } from "../ui/Icon";
import { Icon } from "../ui/Icon";

export function PremiumPage({ children }: { children: ReactNode }) {
  return <div className="premium-dashboard-page">{children}</div>;
}

export function PremiumGreeting({
  action,
  eyebrow,
  subtitle,
  title,
}: {
  action?: ReactNode;
  eyebrow?: string;
  subtitle: string;
  title: string;
}) {
  return (
    <header className="premium-greeting">
      <div>
        {eyebrow && <p className="premium-eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {action && <div>{action}</div>}
    </header>
  );
}

export function PremiumMetric({
  detail,
  icon,
  label,
  tone = "blue",
  value,
}: {
  detail?: string;
  icon: IconName;
  label: string;
  tone?: "blue" | "green" | "amber" | "violet";
  value: ReactNode;
}) {
  return (
    <article className="premium-metric glass-panel">
      <span className={`premium-metric-icon premium-metric-icon-${tone}`}>
        <Icon name={icon} size={17} />
      </span>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        {detail && <small>{detail}</small>}
      </div>
    </article>
  );
}

export function PremiumPanel({
  action,
  children,
  className = "",
  subtitle,
  title,
}: {
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  subtitle?: string;
  title: string;
}) {
  return (
    <section className={`premium-panel glass-panel ${className}`.trim()}>
      <header className="premium-panel-header">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

export function PanelLink({
  children,
  to,
}: {
  children: ReactNode;
  to: string;
}) {
  return (
    <Link className="premium-panel-link" to={to}>
      {children}
      <span aria-hidden="true">→</span>
    </Link>
  );
}

export function DonutChart({
  centerLabel,
  centerValue,
  segments,
}: {
  centerLabel: string;
  centerValue: ReactNode;
  segments: Array<{ label: string; tone: string; value: number }>;
}) {
  const total = Math.max(
    segments.reduce((sum, item) => sum + item.value, 0),
    1,
  );
  let offset = 0;
  const stops: string[] = [];
  const palette: Record<string, string> = {
    amber: "#f3a43b",
    blue: "#2878ff",
    green: "#38c89b",
    gray: "#c9d2df",
    red: "#f36f73",
    violet: "#806bff",
  };
  segments.forEach((segment) => {
    const start = (offset / total) * 360;
    offset += segment.value;
    const end = (offset / total) * 360;
    stops.push(
      `${palette[segment.tone] ?? palette.blue} ${start}deg ${end}deg`,
    );
  });
  const style = {
    "--donut-gradient": `conic-gradient(${stops.join(",")})`,
  } as CSSProperties;

  return (
    <div className="premium-donut-block">
      <div className="premium-donut" style={style}>
        <div>
          <strong>{centerValue}</strong>
          <span>{centerLabel}</span>
        </div>
      </div>
      <div className="premium-legend">
        {segments.map((segment) => (
          <div key={segment.label}>
            <span className={`legend-dot legend-${segment.tone}`} />
            <span>{segment.label}</span>
            <strong>{segment.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Sparkline({ values }: { values: number[] }) {
  const safe = values.length > 1 ? values : [0, values[0] ?? 0];
  const max = Math.max(...safe, 1);
  const min = Math.min(...safe, 0);
  const range = Math.max(max - min, 1);
  const points = safe
    .map((value, index) => {
      const x = (index / (safe.length - 1)) * 100;
      const y = 42 - ((value - min) / range) * 34;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg
      aria-label="Trend"
      className="premium-sparkline"
      role="img"
      viewBox="0 0 100 48"
    >
      <path d={`M0 44 L100 44`} />
      <polyline points={points} />
    </svg>
  );
}

export function MiniBars({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  return (
    <div className="premium-mini-bars" aria-label="Bar chart">
      {values.map((value, index) => (
        <span
          key={`${value}-${index}`}
          style={{ height: `${Math.max(12, (value / max) * 100)}%` }}
        />
      ))}
    </div>
  );
}

export function EmptyDashboardState({ message }: { message: string }) {
  return <p className="premium-empty-state">{message}</p>;
}

export function StatusPill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "danger" | "info" | "neutral" | "success" | "warning";
}) {
  return (
    <span className={`premium-status premium-status-${tone}`}>{children}</span>
  );
}
