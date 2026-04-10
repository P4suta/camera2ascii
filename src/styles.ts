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
	background: #000;
}

#display {
	display: block;
	width: 100%;
	height: 100%;
}

#prompt {
	position: fixed;
	inset: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	background: #000;
	z-index: 10;
	opacity: 1;
	transition: opacity 0.6s ease;
}

#prompt.hidden {
	opacity: 0;
	pointer-events: none;
}

#prompt span {
	font-family: "SF Mono", Menlo, Consolas, "Courier New", monospace;
	font-size: 16px;
	color: rgba(255, 255, 255, 0.5);
	letter-spacing: 0.5px;
	animation: fade-in 1s ease;
}

#toast {
	position: fixed;
	bottom: 32px;
	left: 50%;
	transform: translateX(-50%);
	font-family: "SF Mono", Menlo, Consolas, "Courier New", monospace;
	font-size: 14px;
	color: rgba(255, 255, 255, 0.5);
	background: rgba(255, 255, 255, 0.08);
	padding: 12px 24px;
	border-radius: 8px;
	z-index: 20;
	opacity: 0;
	transition: opacity 0.4s ease;
	pointer-events: none;
}

#toast.visible {
	opacity: 1;
}

#video-capture {
	display: none;
}

@keyframes fade-in {
	from { opacity: 0; }
	to { opacity: 1; }
}
`;

export function injectStyles(): void {
	if (document.getElementById("camera2ascii-styles")) return;

	const style = document.createElement("style");
	style.id = "camera2ascii-styles";
	style.textContent = CSS;
	document.head.appendChild(style);
}
