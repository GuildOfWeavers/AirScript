"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sources = {
    'load.const': 'const',
    'load.trace': 'trace',
    'load.static': 'static',
    'load.input': 'input',
    'load.local': 'local',
};
function getLoadSource(operation) {
    const source = sources[operation];
    if (!source) {
        throw new Error(`${operation} is not a valid load operation`);
    }
    return source;
}
exports.getLoadSource = getLoadSource;
const targets = {
    'store.local': 'local'
};
function getStoreTarget(operation) {
    const target = targets[operation];
    if (!target) {
        throw new Error(`${operation} is not a valid store operation`);
    }
    return target;
}
exports.getStoreTarget = getStoreTarget;
//# sourceMappingURL=utils.js.map