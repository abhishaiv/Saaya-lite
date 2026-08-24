export interface WorkerNotificationRequest {
  readonly title: string;
  readonly options: NotificationOptions;
}

interface NotificationWorkerMessage {
  readonly type: "SHOW_NOTIFICATION";
  readonly request: WorkerNotificationRequest;
}

export class NotificationWorkerBridge {
  private registrationPromise: Promise<ServiceWorkerRegistration> | null = null;

  constructor(private readonly workers: ServiceWorkerContainer) {}

  register(): Promise<ServiceWorkerRegistration> {
    this.registrationPromise ??= this.workers.register("/saaya-sw.js");
    return this.registrationPromise;
  }

  async show(request: WorkerNotificationRequest): Promise<void> {
    await this.register();
    const registration = await this.workers.ready;
    const worker = registration.active;
    if (worker === null) {
      throw new Error("Saaya notification worker is not active");
    }
    const message: NotificationWorkerMessage = {
      type: "SHOW_NOTIFICATION",
      request,
    };
    worker.postMessage(message);
  }
}

export function browserNotificationWorker(): NotificationWorkerBridge | null {
  if (!("serviceWorker" in navigator)) return null;
  return new NotificationWorkerBridge(navigator.serviceWorker);
}
