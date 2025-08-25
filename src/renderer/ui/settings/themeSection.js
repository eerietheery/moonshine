import { setTheme, themes } from '../../../theme.js';

function createThemeSection(showColorModal, modal, teardown) {
  const themeSection = document.createElement('div');
  const themeTitle = document.createElement('div');
  themeTitle.textContent = 'Theme';
  themeTitle.style.fontWeight = '600';
  themeTitle.style.margin = '8px 0';
  themeTitle.style.color = '#fff';
  themeSection.appendChild(themeTitle);

  // Theme chooser (styled select)
  const themeRow = document.createElement('div');
  themeRow.style.display = 'flex';
  themeRow.style.alignItems = 'center';
  themeRow.style.gap = '10px';
  themeRow.style.marginBottom = '8px';

  const themeLabel = document.createElement('label');
  themeLabel.textContent = 'Style:';
  themeLabel.style.color = '#ddd';
  themeLabel.style.fontSize = '0.95rem';

  const select = document.createElement('select');
  select.style.background = '#282828';
  select.style.color = '#eee';
  select.style.border = '1px solid #444';
  select.style.borderRadius = '6px';
  select.style.padding = '8px 10px';
  select.style.cursor = 'pointer';

  const opts = Object.values(themes);
  for (const t of opts) {
    const o = document.createElement('option');
    o.value = t.id;
    o.textContent = t.label;
    select.appendChild(o);
  }

  // Initialize from current DOM attribute if present
  const currentId = document.documentElement.dataset.theme || 'dark';
  select.value = currentId;

  const onThemeChange = () => {
    const id = select.value;
    setTheme(id);
  };
  select.addEventListener('change', onThemeChange);

  themeRow.append(themeLabel, select);
  themeSection.appendChild(themeRow);

  const changeColor = document.createElement('button');
  changeColor.textContent = 'Change Color…';
  changeColor.style.background = '#444';
  changeColor.style.border = 'none';
  changeColor.style.color = '#fff';
  changeColor.style.padding = '10px 14px';
  changeColor.style.borderRadius = '6px';
  changeColor.style.cursor = 'pointer';
  changeColor.addEventListener('click', () => {
    modal.remove();
    if (typeof teardown === 'function') teardown();
    showColorModal();
  });

  themeSection.appendChild(changeColor);

  const themeTeardown = () => {
    select.removeEventListener('change', onThemeChange);
  };

  return { element: themeSection, teardown: themeTeardown };
}

export { createThemeSection };