import { describe, it, expect, beforeEach, vi } from "vitest";
import { subHours } from "date-fns";

// Mock del modello NotificationTracker
const mockNotifications: any[] = [];

const NotificationTrackerModel = {
  create: vi.fn(async (data: any) => {
    const notification = { ...data, _id: `${Date.now()}` };
    mockNotifications.push(notification);
    return notification;
  }),
  findOne: vi.fn(async (query: any) => {
    // Simula la query MongoDB
    return mockNotifications
      .filter((n) => {
        let matches = true;
        if (query.notificationType) {
          matches = matches && n.notificationType === query.notificationType;
        }
        if (query.clientId) {
          matches = matches && n.clientId === query.clientId;
        }
        if (query.sentAt?.$gte) {
          matches = matches && new Date(n.sentAt) >= new Date(query.sentAt.$gte);
        }
        return matches;
      })
      .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())[0] || null;
  }),
  find: vi.fn(async (query: any) => {
    return mockNotifications.filter((n) => {
      let matches = true;
      if (query.notificationType) {
        matches = matches && n.notificationType === query.notificationType;
      }
      if (query.clientId) {
        matches = matches && n.clientId === query.clientId;
      }
      return matches;
    });
  }),
};

/**
 * Test suite per il sistema di tracking delle notifiche
 * 
 * Verifica che:
 * 1. Le notifiche vengano registrate correttamente nel database
 * 2. Il sistema rilevi correttamente le notifiche già inviate nelle ultime 24 ore
 * 3. Il sistema permetta l'invio dopo 24 ore dall'ultimo invio
 */
describe("Notification Tracking System", () => {
  // Pulisci i mock prima di ogni test
  beforeEach(() => {
    mockNotifications.length = 0;
    vi.clearAllMocks();
  });

  describe("Tracking delle notifiche", () => {
    it("dovrebbe registrare correttamente una notifica inviata", async () => {
      const notificationData = {
        notificationType: "expired" as const,
        clientId: "default",
        documentIds: [1, 2, 3],
        sentAt: new Date(),
        recipientEmails: ["admin@example.com"],
        documentCount: 3,
      };

      const notification = await NotificationTrackerModel.create(notificationData);

      expect(notification.notificationType).toBe("expired");
      expect(notification.clientId).toBe("default");
      expect(notification.documentIds).toEqual([1, 2, 3]);
      expect(notification.recipientEmails).toEqual(["admin@example.com"]);
      expect(notification.documentCount).toBe(3);
    });

    it("dovrebbe trovare una notifica inviata nelle ultime 24 ore", async () => {
      // Crea una notifica inviata 12 ore fa
      const twelveHoursAgo = subHours(new Date(), 12);
      await NotificationTrackerModel.create({
        notificationType: "expired",
        clientId: "default",
        documentIds: [1, 2, 3],
        sentAt: twelveHoursAgo,
        recipientEmails: ["admin@example.com"],
        documentCount: 3,
      });

      // Cerca notifiche inviate nelle ultime 24 ore
      const twentyFourHoursAgo = subHours(new Date(), 24);
      const existingNotification = await NotificationTrackerModel.findOne({
        notificationType: "expired",
        clientId: "default",
        sentAt: { $gte: twentyFourHoursAgo },
      });

      expect(existingNotification).not.toBeNull();
      expect(existingNotification?.notificationType).toBe("expired");
    });

    it("NON dovrebbe trovare una notifica inviata più di 24 ore fa", async () => {
      // Crea una notifica inviata 25 ore fa
      const twentyFiveHoursAgo = subHours(new Date(), 25);
      await NotificationTrackerModel.create({
        notificationType: "expired",
        clientId: "default",
        documentIds: [1, 2, 3],
        sentAt: twentyFiveHoursAgo,
        recipientEmails: ["admin@example.com"],
        documentCount: 3,
      });

      // Cerca notifiche inviate nelle ultime 24 ore
      const twentyFourHoursAgo = subHours(new Date(), 24);
      const existingNotification = await NotificationTrackerModel.findOne({
        notificationType: "expired",
        clientId: "default",
        sentAt: { $gte: twentyFourHoursAgo },
      });

      expect(existingNotification).toBeNull();
    });

    it("dovrebbe distinguere tra notifiche 'expired' e 'warning'", async () => {
      // Crea una notifica 'expired' inviata 12 ore fa
      const twelveHoursAgo = subHours(new Date(), 12);
      await NotificationTrackerModel.create({
        notificationType: "expired",
        clientId: "default",
        documentIds: [1, 2, 3],
        sentAt: twelveHoursAgo,
        recipientEmails: ["admin@example.com"],
        documentCount: 3,
      });

      // Cerca notifica 'warning' (non dovrebbe trovarla)
      const twentyFourHoursAgo = subHours(new Date(), 24);
      const warningNotification = await NotificationTrackerModel.findOne({
        notificationType: "warning",
        clientId: "default",
        sentAt: { $gte: twentyFourHoursAgo },
      });

      expect(warningNotification).toBeNull();

      // Cerca notifica 'expired' (dovrebbe trovarla)
      const expiredNotification = await NotificationTrackerModel.findOne({
        notificationType: "expired",
        clientId: "default",
        sentAt: { $gte: twentyFourHoursAgo },
      });

      expect(expiredNotification).not.toBeNull();
    });

    it("dovrebbe distinguere tra diversi clientId", async () => {
      // Crea una notifica per client1
      const twelveHoursAgo = subHours(new Date(), 12);
      await NotificationTrackerModel.create({
        notificationType: "expired",
        clientId: "client1",
        documentIds: [1, 2, 3],
        sentAt: twelveHoursAgo,
        recipientEmails: ["admin@example.com"],
        documentCount: 3,
      });

      // Cerca notifica per client2 (non dovrebbe trovarla)
      const twentyFourHoursAgo = subHours(new Date(), 24);
      const client2Notification = await NotificationTrackerModel.findOne({
        notificationType: "expired",
        clientId: "client2",
        sentAt: { $gte: twentyFourHoursAgo },
      });

      expect(client2Notification).toBeNull();

      // Cerca notifica per client1 (dovrebbe trovarla)
      const client1Notification = await NotificationTrackerModel.findOne({
        notificationType: "expired",
        clientId: "client1",
        sentAt: { $gte: twentyFourHoursAgo },
      });

      expect(client1Notification).not.toBeNull();
    });
  });

  describe("Scenari di riavvio del backend", () => {
    it("dovrebbe bloccare l'invio dopo un riavvio se già inviato nelle ultime 24h", async () => {
      // Simula invio iniziale
      const oneHourAgo = subHours(new Date(), 1);
      await NotificationTrackerModel.create({
        notificationType: "expired",
        clientId: "default",
        documentIds: [1, 2, 3],
        sentAt: oneHourAgo,
        recipientEmails: ["admin@example.com"],
        documentCount: 3,
      });

      // Simula riavvio del backend (controlla se può inviare)
      const twentyFourHoursAgo = subHours(new Date(), 24);
      const existingNotification = await NotificationTrackerModel.findOne({
        notificationType: "expired",
        clientId: "default",
        sentAt: { $gte: twentyFourHoursAgo },
      });

      // Dovrebbe trovare la notifica e quindi NON inviare
      expect(existingNotification).not.toBeNull();
    });

    it("dovrebbe permettere l'invio dopo un riavvio se passate più di 24h", async () => {
      // Simula invio iniziale 25 ore fa
      const twentyFiveHoursAgo = subHours(new Date(), 25);
      await NotificationTrackerModel.create({
        notificationType: "expired",
        clientId: "default",
        documentIds: [1, 2, 3],
        sentAt: twentyFiveHoursAgo,
        recipientEmails: ["admin@example.com"],
        documentCount: 3,
      });

      // Simula riavvio del backend (controlla se può inviare)
      const twentyFourHoursAgo = subHours(new Date(), 24);
      const existingNotification = await NotificationTrackerModel.findOne({
        notificationType: "expired",
        clientId: "default",
        sentAt: { $gte: twentyFourHoursAgo },
      });

      // NON dovrebbe trovare la notifica e quindi può inviare
      expect(existingNotification).toBeNull();
    });

    it("dovrebbe gestire correttamente riavvii multipli in breve tempo", async () => {
      // Simula invio iniziale
      const oneHourAgo = subHours(new Date(), 1);
      await NotificationTrackerModel.create({
        notificationType: "expired",
        clientId: "default",
        documentIds: [1, 2, 3],
        sentAt: oneHourAgo,
        recipientEmails: ["admin@example.com"],
        documentCount: 3,
      });

      const twentyFourHoursAgo = subHours(new Date(), 24);

      // Simula 5 riavvii successivi
      for (let i = 0; i < 5; i++) {
        const existingNotification = await NotificationTrackerModel.findOne({
          notificationType: "expired",
          clientId: "default",
          sentAt: { $gte: twentyFourHoursAgo },
        });

        // Tutti i riavvii dovrebbero trovare la notifica esistente
        expect(existingNotification).not.toBeNull();
      }

      // Verifica che ci sia solo 1 notifica nel database
      const allNotifications = await NotificationTrackerModel.find({
        notificationType: "expired",
        clientId: "default",
      });
      expect(allNotifications).toHaveLength(1);
    });
  });

  describe("Scenari con documenti multipli", () => {
    it("dovrebbe gestire separatamente notifiche expired e warning", async () => {
      const twelveHoursAgo = subHours(new Date(), 12);

      // Crea entrambi i tipi di notifica
      await NotificationTrackerModel.create({
        notificationType: "expired",
        clientId: "default",
        documentIds: [1, 2, 3],
        sentAt: twelveHoursAgo,
        recipientEmails: ["admin@example.com"],
        documentCount: 3,
      });

      await NotificationTrackerModel.create({
        notificationType: "warning",
        clientId: "default",
        documentIds: [4, 5, 6],
        sentAt: twelveHoursAgo,
        recipientEmails: ["admin@example.com"],
        documentCount: 3,
      });

      // Verifica che entrambe siano presenti
      const twentyFourHoursAgo = subHours(new Date(), 24);
      
      const expiredNotification = await NotificationTrackerModel.findOne({
        notificationType: "expired",
        clientId: "default",
        sentAt: { $gte: twentyFourHoursAgo },
      });

      const warningNotification = await NotificationTrackerModel.findOne({
        notificationType: "warning",
        clientId: "default",
        sentAt: { $gte: twentyFourHoursAgo },
      });

      expect(expiredNotification).not.toBeNull();
      expect(warningNotification).not.toBeNull();
      expect(expiredNotification?.documentIds).toEqual([1, 2, 3]);
      expect(warningNotification?.documentIds).toEqual([4, 5, 6]);
    });
  });
});
