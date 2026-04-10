const CSS = `
*,
*::before,
*::after {
	margin: 0;
	padding: 0;
	box-sizing: border-box;
}

html, body {
	width: 100%;
	height: 100%;
	overflow: hidden;
	background: #0d1117;
	color: #c9d1d9;
	font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
}

#app {
	display: flex;
	width: 100%;
	height: 100%;
}

#ascii-output {
	flex: 1;
	background: #000;
	color: #e0e0e0;
	font-family: "Courier New", Consolas, Monaco, monospace;
	line-height: 1.0;
	letter-spacing: 0;
	white-space: pre;
	overflow: hidden;
	display: flex;
	align-items: center;
	justify-content: center;
	user-select: text;
	padding: 8px;
}

#controls {
	width: 260px;
	min-width: 260px;
	background: #161b22;
	padding: 16px;
	display: flex;
	flex-direction: column;
	gap: 12px;
	overflow-y: auto;
	border-left: 1px solid #30363d;
}

#controls h1 {
	font-size: 18px;
	font-weight: 600;
	color: #f0f6fc;
	margin-bottom: 4px;
}

.control-group {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.control-group label {
	font-size: 12px;
	color: #8b949e;
	text-transform: uppercase;
	letter-spacing: 0.5px;
}

.control-group input[type="range"] {
	width: 100%;
	accent-color: #238636;
}

.control-group select {
	width: 100%;
	padding: 6px 8px;
	background: #0d1117;
	color: #c9d1d9;
	border: 1px solid #30363d;
	border-radius: 6px;
	font-size: 13px;
}

.control-group .value-display {
	font-size: 12px;
	color: #58a6ff;
	text-align: right;
}

#btn-toggle {
	padding: 10px;
	background: #238636;
	color: #fff;
	border: none;
	border-radius: 6px;
	font-size: 14px;
	font-weight: 600;
	cursor: pointer;
	transition: background 0.15s;
}

#btn-toggle:hover {
	background: #2ea043;
}

#btn-toggle.active {
	background: #da3633;
}

#btn-toggle.active:hover {
	background: #f85149;
}

#fps-display {
	font-size: 13px;
	color: #58a6ff;
	text-align: center;
	font-variant-numeric: tabular-nums;
}

.checkbox-group {
	display: flex;
	align-items: center;
	gap: 8px;
	font-size: 13px;
}

.checkbox-group input[type="checkbox"] {
	accent-color: #238636;
}

#error-banner {
	display: none;
	padding: 12px 16px;
	background: #da3633;
	color: #fff;
	font-size: 13px;
	text-align: center;
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	z-index: 100;
}

#video-capture {
	display: none;
}

@media (max-width: 768px) {
	#app {
		flex-direction: column-reverse;
	}

	#controls {
		width: 100%;
		min-width: unset;
		flex-direction: row;
		flex-wrap: wrap;
		gap: 8px;
		padding: 8px 12px;
		border-left: none;
		border-top: 1px solid #30363d;
		max-height: 160px;
		overflow-y: auto;
	}

	#controls h1 {
		width: 100%;
		font-size: 14px;
		margin-bottom: 0;
	}

	.control-group {
		flex: 1;
		min-width: 120px;
	}
}
`;

export function injectStyles(): void {
	if (document.getElementById("camera2ascii-styles")) return;

	const style = document.createElement("style");
	style.id = "camera2ascii-styles";
	style.textContent = CSS;
	document.head.appendChild(style);
}
