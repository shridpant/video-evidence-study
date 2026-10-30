// Only the display preference is stored; annotations and responses are not.
export function setupAppearance() {
  const button = document.querySelector("#theme");
  let dark = false;
  try {
    dark = localStorage.getItem("study-theme") === "dark";
  } catch {}
  function apply() {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    button.textContent = dark ? "☀" : "☾";
    button.title =
      button.ariaLabel = `Switch to ${dark ? "light" : "dark"} theme`;
  }
  button.onclick = () => {
    dark = !dark;
    try {
      localStorage.setItem("study-theme", dark ? "dark" : "light");
    } catch {}
    apply();
  };
  apply();
}
