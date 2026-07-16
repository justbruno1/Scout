import { create } from "zustand";
import type { ChatMessage } from "@/lib/types";

interface ScoutState {
  recentQueries: string[];
  addRecentQuery: (q: string) => void;

  chatByToken: Record<string, ChatMessage[]>;
  addChatMessage: (tokenId: string, message: ChatMessage) => void;
  clearChat: (tokenId: string) => void;
}

export const useScoutStore = create<ScoutState>((set) => ({
  recentQueries: [],
  addRecentQuery: (q) =>
    set((state) => ({
      recentQueries: [q, ...state.recentQueries.filter((r) => r !== q)].slice(0, 8),
    })),

  chatByToken: {},
  addChatMessage: (tokenId, message) =>
    set((state) => ({
      chatByToken: {
        ...state.chatByToken,
        [tokenId]: [...(state.chatByToken[tokenId] ?? []), message],
      },
    })),
  clearChat: (tokenId) =>
    set((state) => {
      const next = { ...state.chatByToken };
      delete next[tokenId];
      return { chatByToken: next };
    }),
}));
