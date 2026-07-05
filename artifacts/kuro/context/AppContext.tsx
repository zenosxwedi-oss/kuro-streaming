import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface BookmarkItem {
  animeId: string;
  title: string;
  poster: string;
  savedAt: number;
}

export interface HistoryItem {
  episodeId: string;
  animeId: string;
  animeTitle: string;
  poster: string;
  episodeTitle: string;
  watchedAt: number;
}

interface AppContextType {
  bookmarks: BookmarkItem[];
  history: HistoryItem[];
  addBookmark: (item: Omit<BookmarkItem, 'savedAt'>) => void;
  removeBookmark: (animeId: string) => void;
  isBookmarked: (animeId: string) => boolean;
  addHistory: (item: Omit<HistoryItem, 'watchedAt'>) => void;
  clearHistory: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

const BOOKMARKS_KEY = '@kuro_bookmarks';
const HISTORY_KEY = '@kuro_history';

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(BOOKMARKS_KEY).then((v) => {
      if (v) setBookmarks(JSON.parse(v));
    });
    AsyncStorage.getItem(HISTORY_KEY).then((v) => {
      if (v) setHistory(JSON.parse(v));
    });
  }, []);

  const addBookmark = useCallback((item: Omit<BookmarkItem, 'savedAt'>) => {
    setBookmarks((prev) => {
      if (prev.find((b) => b.animeId === item.animeId)) return prev;
      const updated = [{ ...item, savedAt: Date.now() }, ...prev];
      AsyncStorage.setItem(BOOKMARKS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const removeBookmark = useCallback((animeId: string) => {
    setBookmarks((prev) => {
      const updated = prev.filter((b) => b.animeId !== animeId);
      AsyncStorage.setItem(BOOKMARKS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const isBookmarked = useCallback(
    (animeId: string) => bookmarks.some((b) => b.animeId === animeId),
    [bookmarks]
  );

  const addHistory = useCallback((item: Omit<HistoryItem, 'watchedAt'>) => {
    setHistory((prev) => {
      const filtered = prev.filter((h) => h.episodeId !== item.episodeId);
      const updated = [{ ...item, watchedAt: Date.now() }, ...filtered].slice(0, 60);
      AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    AsyncStorage.setItem(HISTORY_KEY, JSON.stringify([]));
  }, []);

  return (
    <AppContext.Provider
      value={{ bookmarks, history, addBookmark, removeBookmark, isBookmarked, addHistory, clearHistory }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
