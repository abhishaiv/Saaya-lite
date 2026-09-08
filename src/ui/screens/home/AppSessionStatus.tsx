import { StatusPill, type StatusPillLabels } from "../../components/StatusPill";
import type { M4Copy } from "../../copy/strings";
import type { HomeEngineView } from "./homeEngineBridge";

export interface AppSessionStatusProps {
  readonly inline?: boolean;
  readonly copy: M4Copy;
  readonly showIdle: boolean;
  readonly view: HomeEngineView;
}

/** App-shell session truth: active state stays visible above every route and sheet. */
export function AppSessionStatus({
  inline = false,
  copy,
  showIdle,
  view,
}: AppSessionStatusProps) {
  if (view.state === "RESOLVED") return null;
  if (view.state === "IDLE" && !showIdle) return null;

  const labels: StatusPillLabels = {
    checkIn1: copy.statusCheckin1,
    checkIn2: copy.statusCheckin2,
    checkIn3: copy.statusCheckin3,
    family: copy.statusFamily,
    idle: copy.statusIdle,
    shadowAuto: copy.statusShadowAuto,
    shadowManual: copy.statusShadowManual,
    sos: copy.statusSos,
  };

  const pill =
    view.state === "IDLE" ? (
      <StatusPill icon="shield" labels={labels} state="IDLE" />
    ) : view.state === "SHADOW" ? (
      <StatusPill armMode={view.armMode} labels={labels} state="SHADOW" />
    ) : (
      <StatusPill labels={labels} state={view.state} />
    );

  return (
    <div className="app-session-status" data-inline={inline || undefined}>
      {pill}

      <style jsx>{`
        .app-session-status {
          position: fixed;
          z-index: 11; /* GROUNDED-EXEMPT: active session truth stays above every route and sheet. */
          inset-block: 0;
          inset-inline: var(--screen-padding);
          inset-inline-end: calc(var(--screen-padding) + var(--minimum-touch-target) + var(--space-12));
          pointer-events: none;
        }

        .app-session-status[data-inline] {
          position: static;
          grid-column: 1 / -1;
          min-inline-size: 0;
        }

        .app-session-status[data-inline] :global(.status-pill) {
          position: static;
        }
      `}</style>
    </div>
  );
}
