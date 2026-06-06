// Business rules for Home Needs (Muradnagar, Ghaziabad)
export const STORE = {
  name: "Home Needs",
  city: "Muradnagar, Ghaziabad",
  deliveryRadiusKm: 4,
  freeDeliveryThreshold: 500,
  deliveryFee: 30,
  pointsPerRupee: 1 / 10,
  rupeesPerPoint: 0.5,
  // Store coordinates (Muradnagar, Ghaziabad).
  lat: 28.7811,
  lng: 77.4977,
  // UPI payment details shown at checkout. Owner can update these.
  upiId: "7668859471@ptyes",
  upiPayeeName: "Home Needs",
};

export const inr = (n: number) => `₹${Math.round(n * 100) / 100}`;
export const pointsForAmount = (amount: number) => Math.floor(amount * STORE.pointsPerRupee);
export const rupeesForPoints = (points: number) => Math.round(points * STORE.rupeesPerPoint * 100) / 100;

export function phoneToEmail(phone: string) {
  const digits = phone.replace(/\D/g, "").slice(-10);
  return `u${digits}@homeneeds.in`;
}
export function isValidPhone(phone: string) {
  return /^\d{10}$/.test(phone.replace(/\D/g, "").slice(-10));
}

// Haversine distance in km
export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function upiPayUrl(amount: number, note: string) {
  const params = new URLSearchParams({
    pa: STORE.upiId,
    pn: STORE.upiPayeeName,
    am: amount.toFixed(2),
    cu: "INR",
    tn: note,
  });
  return `upi://pay?${params.toString()}`;
}
