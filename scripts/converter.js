import { parseOrt, generateOrt, OrtParseError } from './ort.js';

export class Converter {
    constructor(inputArea, outputArea) {
        this.inputArea = inputArea;
        this.outputArea = outputArea;
    }

    jsonToOrt() {
        try {
            const input = this.inputArea.value.trim();
            if (!input) {
                this.outputArea.value = '';
                return;
            }

            const json = JSON.parse(input);
            const ort = generateOrt(json);
            this.outputArea.value = ort;
        } catch (error) {
            this.outputArea.value = `Error: ${error.message}`;
        }
    }

    ortToJson() {
        try {
            const input = this.inputArea.value.trim();
            if (!input) {
                this.outputArea.value = '';
                return;
            }

            const ortValue = parseOrt(input);
            const json = ortValue.toNative();
            this.outputArea.value = JSON.stringify(json, null, 2);
        } catch (error) {
            if (error instanceof OrtParseError) {
                this.outputArea.value = `Parse Error at line ${error.lineNum}:\n${error.message}`;
            } else {
                this.outputArea.value = `Error: ${error.message}`;
            }
        }
    }

    convert(mode) {
        if (mode === 'json-to-ort') {
            this.jsonToOrt();
        } else {
            this.ortToJson();
        }
    }
}
