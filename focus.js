// Enlarge the existing player without resetting playback or annotations.
export function setupFocus() {
  const shell = document.querySelector('.shell');
  const button = document.querySelector('#focus');
  let previousScroll = 0;
  function setFocus(active) {
    if (active) previousScroll = window.scrollY;
    shell.classList.toggle('focusView', active);
    button.setAttribute('aria-pressed', String(active));
    button.textContent = active ? '↙ Exit focus' : '⛶ Focus view';
    if (!active) window.scrollTo(0, previousScroll);
    button.focus();
  }
  button.onclick = () => setFocus(!shell.classList.contains('focusView'));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && shell.classList.contains('focusView')) {
      setFocus(false);
    }
  });
}
