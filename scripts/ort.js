// ORT Library for Browser
// Simplified version from ort-ts package

class OrtValue {
    constructor(value) {
        this._value = this.normalize(value);
    }

    normalize(value) {
        if (value === null || value === undefined) {
            return null;
        } else if (typeof value === 'boolean') {
            return value;
        } else if (typeof value === 'number') {
            return value;
        } else if (typeof value === 'string') {
            return value;
        } else if (Array.isArray(value)) {
            return value.map(v => new OrtValue(v)._value);
        } else if (typeof value === 'object') {
            if (value instanceof OrtValue) {
                return value._value;
            }
            const result = {};
            for (const [k, v] of Object.entries(value)) {
                result[k] = new OrtValue(v)._value;
            }
            return result;
        } else {
            throw new TypeError(`Unsupported type for OrtValue: ${typeof value}`);
        }
    }

    isNull() { return this._value === null; }
    isBool() { return typeof this._value === 'boolean'; }
    isNumber() { return typeof this._value === 'number'; }
    isString() { return typeof this._value === 'string'; }
    isArray() { return Array.isArray(this._value); }
    isObject() { return this._value !== null && typeof this._value === 'object' && !Array.isArray(this._value); }

    asArray() {
        if (Array.isArray(this._value)) {
            return this._value.map(v => new OrtValue(v));
        }
        return null;
    }

    asObject() {
        if (this.isObject()) {
            const result = {};
            for (const [k, v] of Object.entries(this._value)) {
                result[k] = new OrtValue(v);
            }
            return result;
        }
        return null;
    }

    toNative() {
        if (this._value === null) {
            return null;
        } else if (typeof this._value === 'boolean' || typeof this._value === 'number' || typeof this._value === 'string') {
            return this._value;
        } else if (Array.isArray(this._value)) {
            return this._value.map(v => new OrtValue(v).toNative());
        } else if (typeof this._value === 'object') {
            const result = {};
            for (const [k, v] of Object.entries(this._value)) {
                result[k] = new OrtValue(v).toNative();
            }
            return result;
        }
        return this._value;
    }

    get length() {
        if (Array.isArray(this._value)) {
            return this._value.length;
        } else if (this.isObject()) {
            return Object.keys(this._value).length;
        }
        throw new TypeError(`Object of type ${typeof this._value} has no length`);
    }
}

function createOrtValue(value) {
    return new OrtValue(value);
}

class OrtParseError extends Error {
    constructor(lineNum, line, message) {
        super(`Line ${lineNum}: ${message}\n  ${line}`);
        this.lineNum = lineNum;
        this.line = line;
        this.name = 'OrtParseError';
    }
}

function createField(name, nestedFields = []) {
    return { name, nestedFields };
}

function isNestedField(field) {
    return field.nestedFields.length > 0;
}

function parseOrt(content) {
    const lines = content.split('\n');
    let lineIdx = 0;
    const result = {};

    while (lineIdx < lines.length) {
        const line = lines[lineIdx].trim();

        if (!line || line.startsWith('#')) {
            lineIdx++;
            continue;
        }

        if (line.includes(':')) {
            const { key, fields, dataLines } = parseSection(lines, lineIdx);

            if (key !== null) {
                const values = parseDataLines(lines, lineIdx + 1, fields, dataLines);
                result[key] = values.toNative();
                lineIdx += dataLines + 1;
            } else {
                const values = parseDataLines(lines, lineIdx + 1, fields, dataLines);

                if (fields.length > 0 && dataLines === 1) {
                    if (values.isArray()) {
                        const arr = values.asArray();
                        if (arr && arr.length === 1) {
                            return arr[0];
                        }
                    }
                }
                return values;
            }
        } else {
            lineIdx++;
        }
    }

    return createOrtValue(result);
}

function parseSection(lines, startIdx) {
    const line = lines[startIdx].trim();
    const lineNum = startIdx + 1;

    let dataLines = 0;
    for (let i = startIdx + 1; i < lines.length; i++) {
        const l = lines[i].trim();
        if (!l || l.startsWith('#')) continue;
        if (l.includes(':') && isHeader(l)) break;
        dataLines++;
    }

    const { key, fieldsStr } = parseHeader(line, lineNum);
    const fields = parseFields(fieldsStr, line, lineNum);

    return { key, fields, dataLines };
}

function isHeader(line) {
    const trimmed = line.trim();
    if (trimmed.startsWith(':')) return true;
    const parts = trimmed.split(':');
    if (parts.length >= 2 && parts[parts.length - 1] === '') return true;
    return false;
}

function parseHeader(line, lineNum) {
    if (line.startsWith(':')) {
        const content = line.substring(1).replace(/:$/, '');
        return { key: null, fieldsStr: content };
    } else {
        const colonIndex = line.indexOf(':');
        if (colonIndex === -1) {
            throw new OrtParseError(lineNum, line, 'Invalid header format');
        }
        const key = line.substring(0, colonIndex).trim();
        const fields = line.substring(colonIndex + 1).replace(/:$/, '').trim();
        return { key, fieldsStr: fields };
    }
}

function parseFields(fieldsStr, line, lineNum) {
    if (!fieldsStr) return [];

    const result = [];
    let current = [];
    let depth = 0;
    const chars = fieldsStr.split('');
    let i = 0;

    while (i < chars.length) {
        const ch = chars[i];

        if (ch === '(') {
            if (depth === 0) {
                const fieldName = current.join('').trim();
                current = [];
                i++;

                const nestedStr = [];
                let nestedDepth = 1;

                while (i < chars.length && nestedDepth > 0) {
                    if (chars[i] === '(') nestedDepth++;
                    else if (chars[i] === ')') nestedDepth--;
                    if (nestedDepth > 0) nestedStr.push(chars[i]);
                    i++;
                }

                const nestedFields = parseFields(nestedStr.join(''), line, lineNum);
                result.push(createField(fieldName, nestedFields));
                continue;
            } else {
                depth++;
                current.push(ch);
            }
        } else if (ch === ')') {
            depth--;
            if (depth < 0) {
                throw new OrtParseError(lineNum, line, 'Unmatched closing parenthesis');
            }
            current.push(ch);
        } else if (ch === ',') {
            if (depth === 0) {
                const field = current.join('').trim();
                if (field) result.push(createField(field));
                current = [];
            } else {
                current.push(ch);
            }
        } else {
            current.push(ch);
        }

        i++;
    }

    const field = current.join('').trim();
    if (field) result.push(createField(field));

    return result;
}

function parseDataLines(lines, startIdx, fields, count) {
    const result = [];
    let processed = 0;

    for (let i = startIdx; i < lines.length; i++) {
        if (processed >= count) break;

        const line = lines[i].trim();
        if (!line || line.startsWith('#')) continue;

        const lineNum = i + 1;

        if (fields.length === 0) {
            const value = parseValue(line, line, lineNum);
            return value;
        }

        const values = parseDataValues(line, lineNum);

        if (values.length !== fields.length) {
            throw new OrtParseError(lineNum, line, `Expected ${fields.length} values but got ${values.length}`);
        }

        const obj = {};
        for (let j = 0; j < fields.length; j++) {
            const field = fields[j];
            const valueStr = values[j];
            const value = parseFieldValue(field, valueStr, line, lineNum);
            obj[field.name] = value.toNative();
        }

        result.push(obj);
        processed++;
    }

    return createOrtValue(result);
}

function parseDataValues(line, lineNum) {
    const values = [];
    let current = [];
    let escaped = false;
    let depth = 0;
    let bracketDepth = 0;

    for (const ch of line) {
        if (escaped) {
            current.push(ch);
            escaped = false;
            continue;
        }

        if (ch === '\\') {
            escaped = true;
            current.push('\\');
        } else if (ch === '(') {
            depth++;
            current.push(ch);
        } else if (ch === ')') {
            depth--;
            current.push(ch);
        } else if (ch === '[') {
            bracketDepth++;
            current.push(ch);
        } else if (ch === ']') {
            bracketDepth--;
            current.push(ch);
        } else if (ch === ',') {
            if (depth === 0 && bracketDepth === 0) {
                values.push(current.join(''));
                current = [];
            } else {
                current.push(ch);
            }
        } else {
            current.push(ch);
        }
    }

    values.push(current.join(''));
    return values;
}

function parseFieldValue(field, valueStr, line, lineNum) {
    if (!isNestedField(field)) {
        return parseValue(valueStr, line, lineNum);
    }

    const trimmed = valueStr.trim();

    if (!trimmed) return createOrtValue(null);
    if (trimmed === '()') return createOrtValue({});

    if (!trimmed.startsWith('(') || !trimmed.endsWith(')')) {
        throw new OrtParseError(lineNum, line, `Expected nested object in parentheses, got: ${trimmed}`);
    }

    const inner = trimmed.substring(1, trimmed.length - 1);
    const values = parseDataValues(inner, lineNum);

    if (values.length !== field.nestedFields.length) {
        throw new OrtParseError(lineNum, line, `Expected ${field.nestedFields.length} nested values but got ${values.length}`);
    }

    const obj = {};
    for (let i = 0; i < field.nestedFields.length; i++) {
        const nestedField = field.nestedFields[i];
        const valueStr = values[i];
        const value = parseFieldValue(nestedField, valueStr, line, lineNum);
        obj[nestedField.name] = value.toNative();
    }

    return createOrtValue(obj);
}

function parseValue(s, line, lineNum) {
    const trimmed = s.trim();

    if (!trimmed) return createOrtValue(null);
    if (trimmed === '[]') return createOrtValue([]);
    if (trimmed === '()') return createOrtValue({});

    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        return parseArray(trimmed.substring(1, trimmed.length - 1), line, lineNum);
    }

    if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
        return parseInlineObject(trimmed.substring(1, trimmed.length - 1), line, lineNum);
    }

    const unescaped = unescape(trimmed);
    const num = Number(unescaped);
    if (!isNaN(num)) return createOrtValue(num);
    if (unescaped === 'true') return createOrtValue(true);
    if (unescaped === 'false') return createOrtValue(false);

    return createOrtValue(unescaped);
}

function parseArray(s, line, lineNum) {
    if (!s.trim()) return createOrtValue([]);

    const result = [];
    let current = [];
    let escaped = false;
    let depth = 0;
    let bracketDepth = 0;

    for (const ch of s) {
        if (escaped) {
            current.push(ch);
            escaped = false;
            continue;
        }

        if (ch === '\\') {
            escaped = true;
            current.push('\\');
        } else if (ch === '(') {
            depth++;
            current.push(ch);
        } else if (ch === ')') {
            depth--;
            current.push(ch);
        } else if (ch === '[') {
            bracketDepth++;
            current.push(ch);
        } else if (ch === ']') {
            bracketDepth--;
            current.push(ch);
        } else if (ch === ',') {
            if (depth === 0 && bracketDepth === 0) {
                const value = parseValue(current.join(''), line, lineNum);
                result.push(value.toNative());
                current = [];
            } else {
                current.push(ch);
            }
        } else {
            current.push(ch);
        }
    }

    const currentStr = current.join('').trim();
    if (currentStr) {
        const value = parseValue(currentStr, line, lineNum);
        result.push(value.toNative());
    }

    return createOrtValue(result);
}

function parseInlineObject(s, line, lineNum) {
    if (!s.trim()) return createOrtValue({});

    const obj = {};
    const pairs = splitPairs(s);

    for (const pair of pairs) {
        const colonIndex = pair.indexOf(':');
        if (colonIndex !== -1) {
            const key = pair.substring(0, colonIndex).trim();
            const valueStr = pair.substring(colonIndex + 1).trim();
            const value = parseValue(valueStr, line, lineNum);
            obj[key] = value.toNative();
        }
    }

    return createOrtValue(obj);
}

function splitPairs(s) {
    const pairs = [];
    let current = [];
    let escaped = false;
    let depth = 0;
    let bracketDepth = 0;

    for (const ch of s) {
        if (escaped) {
            current.push(ch);
            escaped = false;
            continue;
        }

        if (ch === '\\') {
            escaped = true;
            current.push('\\');
        } else if (ch === '(') {
            depth++;
            current.push(ch);
        } else if (ch === ')') {
            depth--;
            current.push(ch);
        } else if (ch === '[') {
            bracketDepth++;
            current.push(ch);
        } else if (ch === ']') {
            bracketDepth--;
            current.push(ch);
        } else if (ch === ',') {
            if (depth === 0 && bracketDepth === 0) {
                pairs.push(current.join(''));
                current = [];
            } else {
                current.push(ch);
            }
        } else {
            current.push(ch);
        }
    }

    const currentStr = current.join('').trim();
    if (currentStr) pairs.push(currentStr);

    return pairs;
}

function unescape(s) {
    const result = [];
    let escaped = false;

    for (const ch of s) {
        if (escaped) {
            if (ch === 'n') result.push('\n');
            else if (ch === 't') result.push('\t');
            else if (ch === 'r') result.push('\r');
            else result.push(ch);
            escaped = false;
        } else if (ch === '\\') {
            escaped = true;
        } else {
            result.push(ch);
        }
    }

    return result.join('');
}

function generateOrt(value) {
    const ortValue = createOrtValue(value);
    if (ortValue.isObject()) {
        const obj = ortValue.asObject();
        if (obj) {
            const objNative = ortValue.toNative();

            if (Object.keys(objNative).length > 1 || Object.keys(objNative).length === 0) {
                return generateMultiObject(objNative);
            } else if (Object.keys(objNative).length === 1) {
                const [key, val] = Object.entries(objNative)[0];
                const valOrt = new OrtValue(val);
                if (valOrt.isArray()) {
                    const arr = valOrt.asArray();
                    if (!arr || arr.length === 0) {
                        return `${key}:\n[]\n`;
                    } else {
                        const arrList = arr.map(v => v.toNative());
                        if (isUniformObjectArray(arrList)) {
                            return generateObjectArray(key, arrList);
                        } else {
                            return generateSimpleArray(key, arrList);
                        }
                    }
                } else {
                    return `${key}:\n${generateValue(val, false)}\n`;
                }
            }
        }
        return '';
    } else if (ortValue.isArray()) {
        const arr = ortValue.asArray();
        if (arr) {
            const arrList = arr.map(v => v.toNative());
            if (isUniformObjectArray(arrList)) {
                return generateTopLevelObjectArray(arrList);
            } else {
                return `:${generateArrayContent(arrList, false)}\n`;
            }
        }
        return ':[]\n';
    } else {
        return generateValue(ortValue.toNative(), false);
    }
}

function generateMultiObject(obj) {
    const result = [];

    for (const [key, val] of Object.entries(obj)) {
        const valOrt = new OrtValue(val);
        if (valOrt.isArray()) {
            const arr = valOrt.asArray();
            if (!arr || arr.length === 0) {
                result.push(`${key}:\n[]\n`);
            } else {
                const arrList = arr.map(v => v.toNative());
                if (isUniformObjectArray(arrList)) {
                    result.push(generateObjectArray(key, arrList));
                } else {
                    result.push(generateSimpleArray(key, arrList));
                }
            }
        } else {
            result.push(`${key}:\n${generateValue(val, false)}\n`);
        }
        result.push('\n');
    }

    return result.join('');
}

function isUniformObjectArray(arr) {
    if (arr.length === 0) return false;

    if (typeof arr[0] !== 'object' || arr[0] === null || Array.isArray(arr[0])) {
        return false;
    }

    const firstKeys = Object.keys(arr[0]).sort();

    for (let i = 1; i < arr.length; i++) {
        const item = arr[i];
        if (typeof item !== 'object' || item === null || Array.isArray(item)) {
            return false;
        }
        const keys = Object.keys(item).sort();
        if (JSON.stringify(keys) !== JSON.stringify(firstKeys)) {
            return false;
        }
    }

    return true;
}

function generateObjectArray(key, arr) {
    if (arr.length === 0) return `${key}:\n[]\n`;

    const first = arr[0];
    const keys = Object.keys(first);
    const header = generateHeader(keys, first);

    const result = [`${key}:${header}\n`];

    for (const item of arr) {
        const values = keys.map(k => generateObjectFieldValue(item[k], keys, k, item));
        result.push(values.join(','));
        result.push('\n');
    }

    return result.join('');
}

function generateTopLevelObjectArray(arr) {
    if (arr.length === 0) return ':[]\n';

    const first = arr[0];
    const keys = Object.keys(first);
    const header = generateHeader(keys, first);

    const result = [`:${header}\n`];

    for (const item of arr) {
        const values = keys.map(k => generateObjectFieldValue(item[k], keys, k, item));
        result.push(values.join(','));
        result.push('\n');
    }

    return result.join('');
}

function generateHeader(keys, firstObj) {
    const headerParts = [];

    for (const k of keys) {
        const value = firstObj[k];
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            const nestedKeys = Object.keys(value);
            const nestedHeader = generateHeaderFields(nestedKeys, value);
            headerParts.push(`${k}(${nestedHeader})`);
        } else {
            headerParts.push(k);
        }
    }

    return headerParts.join(',') + ':';
}

function generateHeaderFields(keys, obj) {
    const headerParts = [];

    for (const k of keys) {
        const value = obj[k];
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            const nestedKeys = Object.keys(value);
            const nestedHeader = generateHeaderFields(nestedKeys, value);
            headerParts.push(`${k}(${nestedHeader})`);
        } else {
            headerParts.push(k);
        }
    }

    return headerParts.join(',');
}

function generateObjectFieldValue(value, keys, currentKey, parent) {
    if (value === null || value === undefined) {
        return '';
    } else if (typeof value === 'object' && !Array.isArray(value)) {
        if (Object.keys(value).length === 0) {
            return '()';
        } else {
            const nestedKeys = Object.keys(value);
            const values = nestedKeys.map(k => generateObjectFieldValue(value[k], nestedKeys, k, value));
            return `(${values.join(',')})`;
        }
    } else if (Array.isArray(value)) {
        if (value.length === 0) {
            return '[]';
        } else {
            return `[${generateArrayContent(value, true)}]`;
        }
    } else {
        return generateValue(value, true);
    }
}

function generateSimpleArray(key, arr) {
    return `${key}:\n${generateArrayContent(arr, false)}\n`;
}

function generateArrayContent(arr, inline) {
    if (arr.length === 0) return '[]';

    const values = arr.map(v => generateValue(v, inline));

    if (inline) {
        return values.join(',');
    } else {
        return `[${values.join(',')}]`;
    }
}

function generateValue(value, inline) {
    if (value === null || value === undefined) {
        return '';
    } else if (typeof value === 'boolean') {
        return value ? 'true' : 'false';
    } else if (typeof value === 'number') {
        return String(value);
    } else if (typeof value === 'string') {
        return escape(value);
    } else if (Array.isArray(value)) {
        if (value.length === 0) {
            return '[]';
        } else {
            return `[${generateArrayContent(value, true)}]`;
        }
    } else if (typeof value === 'object') {
        if (Object.keys(value).length === 0) {
            return '()';
        } else {
            return generateInlineObject(value);
        }
    } else {
        return String(value);
    }
}

function generateInlineObject(obj) {
    const pairs = Object.entries(obj).map(([k, v]) => `${k}:${generateValue(v, true)}`);
    return `(${pairs.join(',')})`;
}

function escape(s) {
    const result = [];

    for (const ch of s) {
        if (ch === '(') result.push('\\(');
        else if (ch === ')') result.push('\\)');
        else if (ch === '[') result.push('\\[');
        else if (ch === ']') result.push('\\]');
        else if (ch === ',') result.push('\\,');
        else if (ch === '\\') result.push('\\\\');
        else if (ch === '\n') result.push('\\n');
        else if (ch === '\t') result.push('\\t');
        else if (ch === '\r') result.push('\\r');
        else result.push(ch);
    }

    return result.join('');
}

export { parseOrt, generateOrt, OrtParseError };
