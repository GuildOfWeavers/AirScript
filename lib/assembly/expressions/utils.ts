// LOAD SOURCE
// ================================================================================================
export type LoadSource = 'const' | 'trace' | 'static' | 'input' | 'local';
const sources: { [index: string]: LoadSource } = {
    'load.const'    : 'const',
    'load.trace'    : 'trace',
    'load.static'   : 'static',
    'load.input'    : 'input',
    'load.local'    : 'local',
};

export function getLoadSource(operation: string): LoadSource {
    const source = sources[operation];
    if (!source) {
        throw new Error(`${operation} is not a valid load operation`);
    }
    return source;
}

// STORE TARGET
// ================================================================================================
export type StoreTarget = 'local';
const targets: { [index: string]: StoreTarget } = {
    'store.local': 'local'
};

export function getStoreTarget(operation: string): StoreTarget {
    const target = targets[operation];
    if (!target) {
        throw new Error(`${operation} is not a valid store operation`);
    }
    return target;
}