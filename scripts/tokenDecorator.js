import { encode, decode } from 'https://esm.sh/gpt-tokenizer';
import { StateField, StateEffect } from 'https://esm.sh/@codemirror/state';
import { Decoration, EditorView } from 'https://esm.sh/@codemirror/view';

// Effect to toggle token visualization
export const toggleTokenVisualization = StateEffect.define();

// Number of token colors (defined in root.css)
const TOKEN_COLOR_COUNT = 10;

// Create decoration marks for each color (colors defined in CSS variables)
const tokenMarks = Array.from({ length: TOKEN_COLOR_COUNT }, (_, index) =>
    Decoration.mark({
        class: `cm-token-boundary cm-token-color-${index}`,
        attributes: { 'data-token': 'true' }
    })
);

const tokenSpaceMark = Decoration.mark({
    class: 'cm-token-boundary cm-token-space',
    attributes: { 'data-token': 'space' }
});

// Calculate token positions in the text
function calculateTokenPositions(text) {
    if (!text) return [];

    try {
        const tokens = encode(text);
        const positions = [];
        let currentPos = 0;

        tokens.forEach((tokenId, index) => {
            const tokenText = decode([tokenId]);
            const tokenLength = tokenText.length;

            const startPos = currentPos;
            const endPos = currentPos + tokenLength;

            // Determine if this is a whitespace token
            const isWhitespace = tokenText.trim() === '';

            positions.push({
                from: startPos,
                to: endPos,
                tokenId,
                tokenText,
                tokenIndex: index,
                isWhitespace
            });

            currentPos = endPos;
        });

        return positions;
    } catch (error) {
        console.error('Token calculation error:', error);
        return [];
    }
}

// Create decorations from token positions
function createTokenDecorations(state, enabled) {
    if (!enabled) {
        return Decoration.none;
    }

    const text = state.doc.toString();
    const positions = calculateTokenPositions(text);
    const decorations = [];

    positions.forEach(pos => {
        // Ensure positions are within document bounds
        if (pos.from < 0 || pos.to > text.length || pos.from >= pos.to) {
            return;
        }

        // Choose mark based on token type and index
        let mark;
        if (pos.isWhitespace) {
            mark = tokenSpaceMark;
        } else {
            // Cycle through color palette based on token index
            const colorIndex = pos.tokenIndex % tokenMarks.length;
            mark = tokenMarks[colorIndex];
        }

        decorations.push(mark.range(pos.from, pos.to));
    });

    return Decoration.set(decorations, true);
}

// State field to manage token decorations
export const tokenVisualizationField = StateField.define({
    create(state) {
        return {
            decorations: Decoration.none,
            enabled: false
        };
    },
    update(value, tr) {
        let { decorations, enabled } = value;

        // Check for toggle effect
        for (let effect of tr.effects) {
            if (effect.is(toggleTokenVisualization)) {
                enabled = effect.value;
                // Immediately rebuild decorations when toggled
                decorations = createTokenDecorations(tr.state, enabled);
                return { decorations, enabled };
            }
        }

        // Rebuild decorations if document changed and enabled
        if (tr.docChanged && enabled) {
            decorations = createTokenDecorations(tr.state, enabled);
        }

        return { decorations, enabled };
    },
    provide(field) {
        return EditorView.decorations.from(field, value => value.decorations);
    }
});

// Theme for token boundaries
const tokenThemeStyles = {
    '.cm-token-boundary': {
        borderLeft: '1.5px solid',
        borderRight: '1.5px solid',
        borderTop: '1.5px solid',
        borderBottom: '1.5px solid',
        marginLeft: '1px',
        marginRight: '1px',
        paddingLeft: '2px',
        paddingRight: '2px'
    },
    '.cm-token-boundary.cm-token-space': {
        borderColor: 'var(--token-space-border)',
        backgroundColor: 'var(--token-space-bg)'
    }
};

// Add styles for each color using CSS variables
for (let i = 0; i < TOKEN_COLOR_COUNT; i++) {
    tokenThemeStyles[`.cm-token-boundary.cm-token-color-${i}`] = {
        borderColor: `var(--token-color-${i}-border)`,
        backgroundColor: `var(--token-color-${i}-bg)`
    };
}

export const tokenVisualizationTheme = EditorView.baseTheme(tokenThemeStyles);
