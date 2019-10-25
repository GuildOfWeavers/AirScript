// IMPORTS
// ================================================================================================
import { Expression, JsCodeOptions } from './Expression';
import { LoadSource } from './utils';
import { ConstantValue } from './ConstantValue';
import { StoreExpression } from './StoreExpression';
import { RegisterBank } from './RegisterBank';

// INTERFACES
// ================================================================================================
type LoadBinding = RegisterBank | ConstantValue | StoreExpression;

// CLASS DEFINITION
// ================================================================================================
export class LoadExpression extends Expression {

    private _index  : number;
    readonly binding: LoadBinding;

    // CONSTRUCTORS
    // --------------------------------------------------------------------------------------------
    constructor(binding: LoadBinding, index: number) {
        super(binding.dimensions, binding.degree);
        this._index = index;
        this.binding = binding;
    }

    // ACCESSORS
    // --------------------------------------------------------------------------------------------
    get index(): number {
        return this._index;
    }

    get source(): LoadSource {
        if (this.binding instanceof ConstantValue) return 'const';
        if (this.binding instanceof StoreExpression) return 'local';
        else if (this.binding instanceof RegisterBank) return this.binding.bank;
        else throw new Error(`invalid load binding: ${this.binding}`);
    }

    // PUBLIC MEMBERS
    // --------------------------------------------------------------------------------------------
    collectLoadOperations(source: LoadSource, result: Map<Expression, Expression[]>): void {
        if (this.source === source) {
            const bindings = result.get(this.binding) || [];
            bindings.push(this);
            result.set(this.binding, bindings);
        }
    }

    updateLoadIndex(source: LoadSource, fromIdx: number, toIdx: number): void {
        if (this.source === source && this._index === fromIdx) {
            this._index = toIdx;
        }
    }

    toString(): string {
        return `(load.${this.source} ${this.index})`;
    }

    toJsCode(options: JsCodeOptions = {}): string {
        // TODO: revisit
        let code = '';
        if (this.binding instanceof ConstantValue) {
            code = `g[${this.index}]`;
        }
        else if (this.binding instanceof StoreExpression) {
            code = `v${this.index}`;
        }
        else if (this.binding instanceof RegisterBank) {
            if (this.binding.bank === 'input') {
                code = 'i';
            }
            else if (this.binding.bank === 'static') {
                code = 'k'
            }
            else if (this.binding.bank === 'trace') {
                if (this.index === 0) {
                    code = 'r'
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