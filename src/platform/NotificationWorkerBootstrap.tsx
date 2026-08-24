"use client";

import { useEffect } from "react";

import { browserNotificationWorker } from "./notificationWorker";

export function NotificationWorkerBootstrap() {
  useEffect(() => {
    void browserNotificationWorker()?.register().catch(() => {
      // Notification permission and delivery remain optional. The in-page
      // ladder still works if registration is unavailable.
    });
  }, []);

  return null;
}
