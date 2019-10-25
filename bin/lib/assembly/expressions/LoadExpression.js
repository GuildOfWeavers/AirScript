"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// IMPORTS
// ================================================================================================
const Expression_1 = require("./Expression");
const ConstantValue_1 = require("./ConstantValue");
const StoreExpression_1 = require("./StoreExpression");
const RegisterBank_1 = require("./RegisterBank");
// CLASS DEFINITION
// ================================================================================================
class LoadExpression extends Expression_1.Expression {
    // CONSTRUCTORS
    // --------------------------------------------------------------------------------------------
    constructor(binding, index) {
        super(binding.dimensions, binding.degree);
        this._index = index;
        this.binding = binding;
    }
    // ACCESSORS
    // --------------------------------------------------------------------------------------------
    get index() {
        return this._index;
    }
    get source() {
        if (this.binding instanceof ConstantValue_1.ConstantValue)
            return 'const';
        if (this.binding instanceof StoreExpression_1.StoreExpression)
            return 'local';
        else if (this.binding instanceof RegisterBank_1.RegisterBank)
            return this.binding.bank;
        else
            throw new Error(`invalid load binding: ${this.binding}`);
    }
    // PUBLIC MEMBERS
    // --------------------------------------------------------------------------------------------
    collectLoadOperations(source, result) {
        if (this.source === source) {
            const bindings = result.get(this.binding) || [];
            bindings.push(this);
            result.set(this.binding, bindings);
        }
    }
    updateLoadStoreIndex(source, fromIdx, toIdx) {
        if (this.source === source && this._index === fromIdx) {
            this._index = toIdx;
        }
    }
    toString() {
        return `(load.${this.source} ${this.index})`;
    }
    toJsCode(options = {}) {
        // TODO: revisit
        let code = '';
        if (this.binding instanceof ConstantValue_1.ConstantValue) {
            code = `g[${this.index}]`;
        }
        else if (this.binding instanceof StoreExpression_1.StoreExpression) {
            code = `v${this.index}`;
        }
        else if (this.binding instanceof RegisterBank_1.RegisterBank) {
            if (this.binding.bank === 'input') {
                code = 'i';
            }
            else if (this.binding.bank === 'static') {
                code = 'k';
            }
            else if (this.binding.bank === 'trace') {
                if (this.index === 0) {
                    code = 'r';
                }
                else if (this.index === 1) {
                    code = 'n';
                }
            }
        }
        if (this.isVector && options.vectorAsArray) {
            code = `${code}.toValues()`;
        }
        return code;
    }
}
exports.LoadExpression = LoadExpression;
//# sourceMappingURL=LoadExpression.js.map