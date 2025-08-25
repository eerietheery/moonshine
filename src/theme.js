// Theme Manager: apply theme id (data-theme) and accent color; emit events for listeners

export const themes = {
	dark: { id: 'dark', label: 'Dark (Default)' },
	neumorphic: { id: 'neumorphic', label: 'Neumorphic' },
	win98: { id: 'win98', label: 'Windows 98' },
	// darkNeumorphic: { id: 'dark-neumorphic', label: 'Dark Neumorphic' },
    
};

function applyAccent(color) {
	const root = document.documentElement;
	root.style.setProperty('--accent', color);
	// Back-compat: keep --primary-color in sync
	root.style.setProperty('--primary-color', color);
}

export function initTheme(themeCfg = {}) {
	try {
		const root = document.documentElement;
		const id = themeCfg.id || 'dark';
		if (id && id !== 'dark') {
			root.dataset.theme = id;
		} else {
			delete root.dataset.theme;
		}
		if (themeCfg.primaryColor) applyAccent(themeCfg.primaryColor);
	} catch (e) {
		// swallow
	}
}

export function setTheme(id = 'dark') {
	const root = document.documentElement;
	if (id && id !== 'dark') root.dataset.theme = id; else delete root.dataset.theme;
	window.etune?.updateConfig?.({ theme: { id } });
	document.dispatchEvent(new CustomEvent('theme:changed', { detail: { id } }));
}

export function setAccent(color) {
	applyAccent(color);
	window.etune?.updateConfig?.({ theme: { primaryColor: color } });
	document.dispatchEvent(new CustomEvent('theme:accent', { detail: { color } }));
}
