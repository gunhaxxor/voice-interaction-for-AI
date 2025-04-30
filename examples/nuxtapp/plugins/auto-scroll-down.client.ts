/**
 * Auto Scroll Down - Vanilla JS
 */
function useAutoScrollDown() {
  let hadScrolledToBottom = true;
  const hasScrolledToBottom = (target: Element): boolean => {
    return (
      target.clientHeight +
        target.clientTop +
        target.scrollTop >=
      target.scrollHeight
    );
  };
  const onScrollTarget = ({ target }: Event): void => {
    if (target instanceof Element) {
      hadScrolledToBottom = hasScrolledToBottom(target);
    }
  };
  const scrollToBottomIfNeeded = (target: Element): void => {
    if (hadScrolledToBottom) {
      // target.scrollTo(0, target.scrollHeight);
      const lastChild = target.lastElementChild;
      // if(!lastChild) return;
      // lastChild?.scrollIntoView();
    }
  };
  let childrenResizeObr: ResizeObserver | undefined;
  const targetMutationObr = new MutationObserver((entries) => {
    const entry = entries[0];
    for (const node of entry.removedNodes) {
      if (node instanceof Element) {
        childrenResizeObr?.unobserve(node);
      }
    }
    for (const node of entry.addedNodes) {
      if (node instanceof Element) {
        childrenResizeObr?.observe(node);
      }
    }
  });
  const mounted = (target: Element): void => {
    console.log('scroll-down directive mounted!!!');
    childrenResizeObr = new ResizeObserver(() => {
      console.log('childrenResizeObr triggered');
      scrollToBottomIfNeeded(target);
    });
    for (const child of target.children) {
      childrenResizeObr.observe(child);
    }
    targetMutationObr.observe(target, {
      childList: true,
    });
    target.addEventListener('scroll', onScrollTarget);
  };
  const unmounted = (target: Element): void => {
    childrenResizeObr?.disconnect();
    targetMutationObr.disconnect();
    target.removeEventListener('scroll', onScrollTarget);

    childrenResizeObr = undefined;
  };
  return { mounted, unmounted };
}

/**
 * Auto Scroll Down - Vue 3 Custom Directive
 * @example
 * ```vue
 * <template>
 *   <div v-auto-scroll-down>
 *     <div v-for="(item, index) in items" :key="index">
 *   </div>
 * </template>
 * <script setup>
 *   import { vAutoScrollDown } from '...';
 * </script>
 * ```
 */
const vAutoScrollDown = useAutoScrollDown();

export default defineNuxtPlugin((nuxtapp) => {
  nuxtapp.vueApp.directive('auto-scroll-down', vAutoScrollDown);
})