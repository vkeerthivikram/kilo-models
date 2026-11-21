import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";

export function renderApp(element: ReactNode) {
  return renderToStaticMarkup(
    <AppRouterContext.Provider value={{
      bfcacheId: "test", back() {}, forward() {}, refresh() {}, push() {}, replace() {}, prefetch() {},
    }}>
      {element}
    </AppRouterContext.Provider>
  );
}
