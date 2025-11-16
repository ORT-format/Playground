import { setupCharCounter, updateCharCount } from './charCounter.js';
import { ModeSwitch } from './modeSwitch.js';
import { Converter } from './converter.js';

document.addEventListener('DOMContentLoaded', () => {
    const inputArea = document.getElementById('input-area');
    const outputArea = document.getElementById('output-area');
    const inputCount = document.getElementById('input-count');
    const outputCount = document.getElementById('output-count');

    setupCharCounter(inputArea, inputCount);
    setupCharCounter(outputArea, outputCount);

    const modeSwitch = new ModeSwitch();
    const converter = new Converter(inputArea, outputArea);

    const performConversion = () => {
        converter.convert(modeSwitch.getMode());
        updateCharCount(outputArea.value, outputCount);
    };

    inputArea.addEventListener('input', performConversion);

    const originalSwitchMode = modeSwitch.switchMode.bind(modeSwitch);
    modeSwitch.switchMode = (mode) => {
        originalSwitchMode(mode);
        performConversion();
    };
});
