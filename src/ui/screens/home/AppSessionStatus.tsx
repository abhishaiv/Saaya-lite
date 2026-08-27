import { StatusPill, type StatusPillLabels } from "../../components/StatusPill";
import type { M4Copy } from "../../copy/strings";
import type { HomeEngineView } from "./homeEngineBridge";

export interface AppSessionStatusProps {
  readonly copy: M4Copy;
  readonly showIdle: boolean;
  readonly view: HomeEngineView;
}

/** App-shell session truth: active state stays visible above every route and sheet. */
export function AppSessionStatus({
  copy,
  showIdle,
  view,
}: AppSessionStatusProps) {
  if (view.state === "RESOLVED") return null;
  if (view.state === "IDLE" && !showIdle) return null;

  const labels: StatusPillLabels = {
    checkIn1: copy.statusCheckin1,
    checkIn2: copy.statusCheckin2,
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
    <div className="app-session-status">
      {pill}

      <style jsx>{`
        .app-session-status {
          position: fixed;
          z-index: 11; /* GROUNDED-EXEMPT: active session truth stays above every route and sheet. */
          inset-block: 0;
          inset-inline: var(--screen-padding);
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}
