// Helpers para disparar eventos do Meta Pixel (id 774559251517975, inicializado no index.html)
declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
  }
}

export const fbTrack = (event: string, params?: Record<string, any>) => {
  if (typeof window !== "undefined" && typeof window.fbq === "function") {
    window.fbq("track", event, params);
  }
};

export const trackSignUp = () => fbTrack("CompleteRegistration");

export const trackPurchase = (value?: number, currency: string = "BRL") =>
  fbTrack("Purchase", { value: value ?? 0, currency });
