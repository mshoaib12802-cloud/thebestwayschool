// Custom confirm utility — replaces window.confirm with a beautiful modal.
// Usage: const ok = await confirm('Delete this item?', { danger: true });
export const confirm = (message, options = {}) => {
  return new Promise((resolve) => {
    window.dispatchEvent(new CustomEvent('app:confirm', {
      detail: { message, options, resolve }
    }));
  });
};
