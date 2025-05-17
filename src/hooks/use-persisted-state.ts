// src/hooks/use-persisted-state.ts
"use client";

import type { Dispatch, SetStateAction} from 'react';
import { useState, useEffect } from 'react';

function usePersistedState<S>(
  key: string,
  initialState: S | (() => S)
): [S, Dispatch<SetStateAction<S>>, boolean] {
  const [hydrated, setHydrated] = useState(false);
  const [state, setState] = useState<S>(initialState);

  useEffect(() => {
    // This effect runs once on the client after hydration
    let valueFromStorage: S | null = null;
    try {
      const item = localStorage.getItem(key);
      if (item) {
        valueFromStorage = JSON.parse(item);
      }
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      // Fallback: if localStorage is corrupted, ensure it's reset with initial/current state later
    }

    if (valueFromStorage !== null) {
      setState(valueFromStorage);
    }
    // else, state is already initialState

    setHydrated(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]); // Only key as dependency, initialState is handled by useState initializer

  useEffect(() => {
    // Update localStorage when state changes, but only after hydration
    // and if the state is not the initial placeholder (if one was used before hydration)
    if (hydrated) {
      try {
        localStorage.setItem(key, JSON.stringify(state));
      } catch (error) {
        console.error(`Error setting localStorage key "${key}":`, error);
      }
    }
  }, [key, state, hydrated]);

  return [state, setState, hydrated];
}

export { usePersistedState };
