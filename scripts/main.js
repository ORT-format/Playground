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
        placeholder: 'Result will appear here...',
        enableTokenVisualization: true
    });

    setupCharCounter(inputEditor, inputCount);
    setupCharCounter(outputEditor, outputCount);

    const converter = new Converter(inputEditor, outputEditor);

    const performConversion = () => {
        const mode = modeSwitch.getMode();
        converter.convert(mode);

        // Update output editor language based on mode (this resets the editor state)
        if (mode === 'json-to-ort') {
            outputEditor.setLanguage(null);
        } else {
            outputEditor.setLanguage('json');
        }

        // Skip token calculation if there's an error
        if (outputEditor.hasError()) {
            // Clear token count display on error
            outputCount.textContent = 'Error';
            outputCount.classList.remove('stat-success', 'stat-error');
            outputCount.classList.add('stat-error');

            // Disable token visualization on error
            outputEditor.toggleTokenVisualization(false);
        } else {
            const outputText = outputEditor.getValue();
            updateCharCount(outputText, outputCount, inputStats);

            // Always enable token visualization (must be after setLanguage)
            outputEditor.toggleTokenVisualization(true);
        }
    };

    const originalSwitchMode = modeSwitch.switchMode.bind(modeSwitch);
    modeSwitch.switchMode = (mode) => {
        // Save current values before switching
        const shouldSwap = !outputEditor.hasError();
        const currentInput = inputEditor.getValue();
        const currentOutput = outputEditor.getValue();

        // Switch mode first
        originalSwitchMode(mode);

        // Update input editor language based on mode
        if (mode === 'json-to-ort') {
            inputEditor.setLanguage('json');
        } else {
            inputEditor.setLanguage(null);
        }

        // Swap input and output if conversion was successful
        if (shouldSwap && currentInput.trim() && currentOutput.trim()) {
            // setValue triggers onChange which calls performConversion automatically
            inputEditor.setValue(currentOutput);
        } else {
            // No swap, just perform conversion with existing input
            performConversion();
        }
    };
});
