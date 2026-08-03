import { create } from "zustand";
import type { BookableService } from "@/lib/data-client";

export type BookingState = {
  service: BookableService | null;
  startTime: string | null;
  windowLabel: string | null;
  location: string;
  bookingId: string | null;
  setService: (service: BookableService) => void;
  setWindow: (startTime: string, label: string) => void;
  setLocation: (location: string) => void;
  setBookingId: (bookingId: string) => void;
  reset: () => void;
};

const initialState = {
  service: null,
  startTime: null,
  windowLabel: null,
  location: "",
  bookingId: null,
};

export const useBookingStore = create<BookingState>((set) => ({
  ...initialState,
  setService: (service) =>
    set({ service, startTime: null, windowLabel: null, bookingId: null }),
  setWindow: (startTime, windowLabel) => set({ startTime, windowLabel }),
  setLocation: (location) => set({ location }),
  setBookingId: (bookingId) => set({ bookingId }),
  reset: () => set({ ...initialState }),
}));
