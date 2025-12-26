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
		// Initialize rainbow overlay if configured
		if (themeCfg.rainbowMode) {
			setRainbowMode(true);
		} else {
			setRainbowMode(false);
		}
	} catch (e) {
		// swallow
	}
}

export function setTheme(id = 'dark') {
	const root = document.documentElement;
	if (id && id !== 'dark') root.dataset.theme = id; else delete root.dataset.theme;
	window.moonshine?.updateConfig?.({ theme: { id } });
	document.dispatchEvent(new CustomEvent('theme:changed', { detail: { id } }));
}

export function setAccent(color) {
	applyAccent(color);
	window.moonshine?.updateConfig?.({ theme: { primaryColor: color } });
	document.dispatchEvent(new CustomEvent('theme:accent', { detail: { color } }));
}

export function setRainbowMode(enabled) {
	const root = document.documentElement;
	const APP_ID = 'app';
	const OVERLAY_ID = 'rainbow-overlay';
	const ensureOverlay = () => {
		let overlay = document.getElementById(OVERLAY_ID);
		if (!overlay) {
			overlay = document.createElement('div');
			overlay.id = OVERLAY_ID;
			overlay.className = 'rainbow-overlay';
			const host = document.getElementById(APP_ID) || document.body;
			host.appendChild(overlay);
		}
		return overlay;
	};

	if (enabled) {
		root.classList.add('rainbow-mode');
		ensureOverlay().style.display = '';
	} else {
		root.classList.remove('rainbow-mode');
		const overlay = document.getElementById(OVERLAY_ID);
		if (overlay) overlay.style.display = 'none';
	}
	window.moonshine?.updateConfig?.({ rainbowMode: enabled });
	document.dispatchEvent(new CustomEvent('rainbow:toggle', { detail: { enabled } }));
}
