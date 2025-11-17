import { setupCharCounter, updateCharCount } from './charCounter.js';
import { ModeSwitch } from './modeSwitch.js';
import { Converter } from './converter.js';
import { CodeMirrorEditor } from './editorSetup.js';

document.addEventListener('DOMContentLoaded', () => {
    const inputContainer = document.getElementById('input-area');
    const outputContainer = document.getElementById('output-area');
    const inputCount = document.getElementById('input-count');
    const outputCount = document.getElementById('output-count');

    const modeSwitch = new ModeSwitch();

    // Track input stats for comparison
    let inputStats = { chars: 0, tokens: 0 };

    // Create CodeMirror editors
    const inputEditor = new CodeMirrorEditor(inputContainer, {
        readOnly: false,
        language: 'json',
        placeholder: 'Enter your input here...',
        onChange: (text) => {
            inputStats = updateCharCount(text, inputCount);
            performConversion();
        }
    });

    const outputEditor = new CodeMirrorEditor(outputContainer, {
        readOnly: true,
        language: null,
        placeholder: 'Result will appear here...'
    });

    setupCharCounter(inputEditor, inputCount);
    setupCharCounter(outputEditor, outputCount);

    const converter = new Converter(inputEditor, outputEditor);

    const performConversion = () => {
        const mode = modeSwitch.getMode();
        converter.convert(mode);
        updateCharCount(outputEditor.getValue(), outputCount, inputStats);

        // Update output editor language based on mode
        if (mode === 'json-to-ort') {
            outputEditor.setLanguage(null);
        } else {
            outputEditor.setLanguage('json');
        }
    };

    const originalSwitchMode = modeSwitch.switchMode.bind(modeSwitch);
    modeSwitch.switchMode = (mode) => {
        originalSwitchMode(mode);

        // Update input editor language based on mode
        if (mode === 'json-to-ort') {
            inputEditor.setLanguage('json');
        } else {
            inputEditor.setLanguage(null);
        }

        performConversion();
    };
});
