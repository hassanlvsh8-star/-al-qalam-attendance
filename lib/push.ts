import webpush from 'web-push';

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

export async function sendPushNotification(subscriptionJson: string, payload: object) {
  try {
    const subscription = JSON.parse(subscriptionJson);
    await webpush.sendNotification(subscription, JSON.stringify(payload));
  } catch (err: unknown) {
    // Subscription expired or invalid — caller should clean it up
    const status = (err as { statusCode?: number }).statusCode;
    if (status === 410 || status === 404) {
      throw new Error('SUBSCRIPTION_EXPIRED');
    }
    console.error('Push send error:', err);
  }
}
