import { encode } from 'https://esm.sh/gpt-tokenizer';

function formatNumber(num) {
    return num.toLocaleString();
}

function formatDiff(diff) {
    if (diff === 0) return '';
    const sign = diff > 0 ? '↑' : '↓';
    return ` (${formatNumber(Math.abs(diff))} ${sign})`;
}

export function updateCharCount(text, countElement, baseline = null) {
    const charCount = text.length;
    const tokens = encode(text);
    const tokenCount = tokens.length;

    if (baseline) {
        // Output mode: show comparison with baseline
        const charDiff = charCount - baseline.chars;
        const tokenDiff = tokenCount - baseline.tokens;

        countElement.textContent = `${formatNumber(charCount)} chars${formatDiff(charDiff)} | ${formatNumber(tokenCount)} tokens${formatDiff(tokenDiff)}`;

        // Apply color based on comparison
        countElement.classList.remove('stat-success', 'stat-error');
        if (charCount < baseline.chars || tokenCount < baseline.tokens) {
            countElement.classList.add('stat-success');
        } else if (charCount > baseline.chars || tokenCount > baseline.tokens) {
            countElement.classList.add('stat-error');
        }
    } else {
        // Input mode: simple display
        countElement.textContent = `${formatNumber(charCount)} chars | ${formatNumber(tokenCount)} tokens`;
        countElement.classList.remove('stat-success', 'stat-error');
    }

    return { chars: charCount, tokens: tokenCount };
}

export function setupCharCounter(editor, countElement) {
    const updateCount = () => {
        return updateCharCount(editor.getValue(), countElement);
    };

    // Initial update
    updateCount();

    // CodeMirror doesn't use traditional event listeners
    // The editor setup will handle change callbacks
    return updateCount;
}
