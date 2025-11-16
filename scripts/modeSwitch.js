export class ModeSwitch {
    constructor() {
        this.currentMode = 'json-to-ort';
        this.jsonToOrtBtn = document.getElementById('mode-json-to-ort');
        this.ortToJsonBtn = document.getElementById('mode-ort-to-json');
        this.inputLabel = document.getElementById('input-label');
        this.outputLabel = document.getElementById('output-label');

        this.setupEventListeners();
    }

    setupEventListeners() {
        this.jsonToOrtBtn.addEventListener('click', () => this.switchMode('json-to-ort'));
        this.ortToJsonBtn.addEventListener('click', () => this.switchMode('ort-to-json'));
    }

    switchMode(mode) {
        if (this.currentMode === mode) return;

        this.currentMode = mode;

        if (mode === 'json-to-ort') {
            this.jsonToOrtBtn.classList.add('active');
            this.ortToJsonBtn.classList.remove('active');
            this.inputLabel.textContent = 'JSON Input';
            this.outputLabel.textContent = 'ORT Output';
        } else {
            this.ortToJsonBtn.classList.add('active');
            this.jsonToOrtBtn.classList.remove('active');
            this.inputLabel.textContent = 'ORT Input';
            this.outputLabel.textContent = 'JSON Output';
        }
    }

    getMode() {
        return this.currentMode;
    }
}
