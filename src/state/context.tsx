import React, { createContext, useContext, useReducer, type ReactNode } from 'react';
import { reduce, initialState, type AppState, type Action } from './store.js';

type Ctx = { state: AppState; dispatch: React.Dispatch<Action> };
const AppCtx = createContext<Ctx | null>(null);

export function AppProvider({
  init,
  children,
}: {
  init: Parameters<typeof initialState>[0];
  children: ReactNode;
}): JSX.Element {
  const [state, dispatch] = useReducer(reduce, init, initialState);
  return <AppCtx.Provider value={{ state, dispatch }}>{children}</AppCtx.Provider>;
}

export function useAppState(): Ctx {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error('useAppState must be used inside AppProvider');
  return ctx;
}
