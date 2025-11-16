export function updateCharCount(text, countElement) {
    const count = text.length;
    countElement.textContent = `${count} chars`;
}

export function setupCharCounter(textareaElement, countElement) {
    const updateCount = () => {
        updateCharCount(textareaElement.value, countElement);
    };

    textareaElement.addEventListener('input', updateCount);
    updateCount();
}
