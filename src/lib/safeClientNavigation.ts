import { startTransition } from "react";

type RouterNav = {
  replace: (href: string) => void;
  push: (href: string) => void;
  refresh: () => void;
};

function transitionRefresh(router: Pick<RouterNav, "refresh">) {
  setTimeout(() => {
    startTransition(() => {
      router.refresh();
    });
  }, 0);
}

/**
 * Pushes a URL then refreshes RSC. Split across tasks to avoid tripping the App
 * Router action queue (Next 15+ "Router action dispatched before initialization").
 */
export function pushThenRefresh(router: RouterNav, href: string) {
  startTransition(() => {
    router.push(href);
  });
  transitionRefresh(router);
}

/**
 * Replaces the URL then refreshes RSC (same queuing as pushThenRefresh).
 */
export function replaceThenRefresh(router: RouterNav, href: string) {
  startTransition(() => {
    router.replace(href);
  });
  transitionRefresh(router);
}
