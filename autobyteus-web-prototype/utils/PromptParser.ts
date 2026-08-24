export function getPlaceholders(template: string): string[] {
    const regex = /\{([^\}]+)\}/g;
    const placeholders: string[] = [];

    let match;
    while ((match = regex.exec(template)) !== null) {
        placeholders.push(match[1]);
    }

    return placeholders;
}

