"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const LoopContext_1 = require("./LoopContext");
const LoopBlockContext_1 = require("./LoopBlockContext");
const LoopBaseContext_1 = require("./LoopBaseContext");
const ExprBlockContext_1 = require("./ExprBlockContext");
// RE-EXPORTS
// ================================================================================================
var Context_1 = require("./Context");
exports.ExecutionContext = Context_1.ExecutionContext;
var LoopContext_2 = require("./LoopContext");
exports.LoopContext = LoopContext_2.LoopContext;
var LoopBlockContext_2 = require("./LoopBlockContext");
exports.LoopBlockContext = LoopBlockContext_2.LoopBlockContext;
var LoopBaseContext_2 = require("./LoopBaseContext");
exports.LoopBaseContext = LoopBaseContext_2.LoopBaseContext;
var ExprBlockContext_2 = require("./ExprBlockContext");
exports.ExprBlockContext = ExprBlockContext_2.ExprBlockContext;
var RootContext_1 = require("./RootContext");
exports.RootContext = RootContext_1.RootContext;
// PUBLIC FUNCTIONS
// ================================================================================================
function createExecutionContext(type, parent) {
    if (type === 'loop') {
        return new LoopContext_1.LoopContext(parent);
    }
    else if (type === 'loopBlock') {
        return new LoopBlockContext_1.LoopBlockContext(parent);
    }
    else if (type === 'loopBase') {
        return new LoopBaseContext_1.LoopBaseContext(parent);
    }
    else {
        return new ExprBlockContext_1.ExprBlockContext(parent);
    }
}
exports.createExecutionContext = createExecutionContext;
function closeExecutionContext(context) {
    const parent = context.parent;
    if (context instanceof LoopBaseContext_1.LoopBaseContext || context instanceof LoopBlockContext_1.LoopBlockContext) {
        parent.addBlock(context.result);
    }
    else if (context instanceof LoopContext_1.LoopContext && parent !== undefined) {
        parent.setLoopResult(context.result);
    }
}
exports.closeExecutionContext = closeExecutionContext;
//# sourceMappingURL=index.js.map