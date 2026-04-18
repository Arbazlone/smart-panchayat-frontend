// Dark Mode Toggle with localStorage
class DarkMode {
  constructor() {
    this.theme = localStorage.getItem('theme') || 'light';
    this.init();
  }

  init() {
    this.applyTheme(this.theme);
    this.createToggle();
  }

  applyTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }

  createToggle() {
    const toggle = document.createElement('button');
    toggle.id = 'darkModeToggle';
    toggle.innerHTML = this.theme === 'dark' ? '☀️' : '🌙';
    toggle.style.cssText = `
      background: transparent;
      border: none;
      font-size: 20px;
      cursor: pointer;
      padding: 8px;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s;
    `;

    toggle.addEventListener('click', () => {
      this.theme = this.theme === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme', this.theme);
      this.applyTheme(this.theme);
      toggle.innerHTML = this.theme === 'dark' ? '☀️' : '🌙';
    });

    // Add to header/navbar
    const header = document.querySelector('header, nav, .navbar, .top-bar');
    if (header) {
      header.appendChild(toggle);
    } else {
      document.body.appendChild(toggle);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new DarkMode();
});