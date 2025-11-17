import { encode, decode } from 'https://esm.sh/gpt-tokenizer';

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

export function visualizeTokens(text, visualizationElement) {
    if (!text) {
        visualizationElement.innerHTML = '<div class="token-empty">No text to tokenize</div>';
        return;
    }

    const tokens = encode(text);

    // Clear previous visualization
    visualizationElement.innerHTML = '';

    // Create a container for tokens
    const tokensContainer = document.createElement('div');
    tokensContainer.className = 'tokens-container';

    // Process each token
    tokens.forEach((tokenId, index) => {
        const tokenText = decode([tokenId]);

        const tokenSpan = document.createElement('span');
        tokenSpan.className = 'token-item';
        tokenSpan.setAttribute('data-token-id', tokenId);
        tokenSpan.setAttribute('data-token-index', index);

        // Handle special characters for display
        let displayText = tokenText;
        if (tokenText === '\n') {
            displayText = '↵';
            tokenSpan.classList.add('token-newline');
        } else if (tokenText === '\t') {
            displayText = '→';
            tokenSpan.classList.add('token-tab');
        } else if (tokenText === ' ') {
            displayText = '·';
            tokenSpan.classList.add('token-space');
        } else if (tokenText.trim() === '') {
            displayText = '⎵';
            tokenSpan.classList.add('token-whitespace');
        }

        tokenSpan.textContent = displayText;

        // Add tooltip with token info
        const tooltip = document.createElement('span');
        tooltip.className = 'token-tooltip';
        tooltip.textContent = `Token #${index + 1}\nID: ${tokenId}\nText: "${tokenText}"`;
        tokenSpan.appendChild(tooltip);

        tokensContainer.appendChild(tokenSpan);
    });

    visualizationElement.appendChild(tokensContainer);

    // Add summary
    const summary = document.createElement('div');
    summary.className = 'token-summary';
    summary.textContent = `Total: ${tokens.length} tokens`;
    visualizationElement.appendChild(summary);
}
