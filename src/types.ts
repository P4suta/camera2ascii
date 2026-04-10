export interface AppState {
	running: boolean;
	width: number;
	height: number;
	stream: MediaStream | null;
}

export interface AsciiFrame {
	chars: string[];
}

export type CharRamp = readonly string[];
