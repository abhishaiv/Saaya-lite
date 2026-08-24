self.addEventListener("message", (event) => {
  const message = event.data;
  if (message?.type !== "SHOW_NOTIFICATION") return;
  const request = message.request;
  if (
    typeof request?.title !== "string" ||
    request?.options === null ||
    typeof request?.options !== "object"
  ) {
    return;
  }
  event.waitUntil(
    self.registration.showNotification(request.title, request.options),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windows) => {
        const existingWindow = windows.find(
          (client) =>
            "focus" in client && new URL(client.url).pathname === "/",
        );
        if (existingWindow) return existingWindow.focus();
        return self.clients.openWindow("/");
      }),
  );
});
