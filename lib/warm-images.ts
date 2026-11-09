import {getImageProps} from "next/image";

// Pictures that were fetched ahead of time are kept here so the browser does not throw their decoded
// form away before the visitor swipes to them.
const kept: HTMLImageElement[] = [];

// Fetches and decodes a set of photographs one after another, using exactly the sizes the page will ask
// for (so the copy the page shows is already in the browser's cache, and already decoded). Used by the
// swipeable strips so that going round the loop never waits on a picture. Returns a function that stops it.
export function warmImages(sources: string[], sizes: string, quality?: number): () => void {
  let stopped = false;
  const run = async () => {
    for (const src of sources) {
      if (stopped) return;
      try {
        const {props} = getImageProps({src, alt: "", fill: true, sizes, quality});
        const image = new window.Image();
        image.sizes = sizes;
        if (props.srcSet) image.srcset = props.srcSet;
        image.src = props.src as string;
        kept.push(image);
        if (kept.length > 60) kept.shift();
        await Promise.race([image.decode().catch(() => undefined), new Promise((resolve) => window.setTimeout(resolve, 8000))]);
      } catch {
        // A picture that cannot be fetched early is simply loaded when it is needed.
      }
    }
  };
  const timer = window.setTimeout(() => void run(), 700);
  return () => {
    stopped = true;
    window.clearTimeout(timer);
  };
}
