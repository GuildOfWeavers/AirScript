// IMPORTS
// ================================================================================================
import { AirSchema, AirComponent } from '@guildofweavers/air-assembly';
import { FiniteField } from '@guildofweavers/galois';
import { tokenMatcher } from 'chevrotain';
import { parser } from './parser';
import { Plus, Star, Slash, Pound, Minus } from './lexer';
import { ScriptSpecs } from './ScriptSpecs';
import { ExecutionContext } from './ExecutionContext';
import {
    Expression, InputBlock, SegmentLoop, SegmentLoopBlock, StatementBlock, Statement, TransitionFunctionBody, TransitionConstraintsBody
} from './expressions';
import * as expressions from './expressions';

// INTERFACES
// ================================================================================================
export interface ConstantDeclaration {
    name            : string;
    value           : bigint | bigint [] | bigint[][];
}

// MODULE VARIABLES
// ================================================================================================
const BaseCstVisitor = parser.getBaseCstVisitorConstructor();

class AirVisitor extends BaseCstVisitor {

    constructor() {
        super()
        this.validateVisitor()
    }

    // ENTRY POINT
    // --------------------------------------------------------------------------------------------
    script(ctx: any): AirSchema {

        const starkName = ctx.starkName[0].image;
        validateScriptSections(ctx);

        // build schema object
        const modulus: bigint = this.visit(ctx.fieldDeclaration);
        const schema = new AirSchema('prime', modulus);

        // parse constants
        ctx.moduleConstants && ctx.moduleConstants.map((element: any) => {
            const constant: ConstantDeclaration = this.visit(element, schema.field);
            schema.addConstant(constant.value, `$${constant.name}`);
        });

        const registers: number = this.visit(ctx.stateRegisterCount);
        const constraints: number = this.visit(ctx.constraintCount);
        const component = schema.createComponent(starkName, registers, constraints, 64);
        
        this.visit(ctx.inputRegisters, component);
        this.visit(ctx.staticRegisters, component);

        /*
        // parse transition function and transition constraints
        specs.setTransitionFunction(this.visit(ctx.transitionFunction, specs));
        specs.setTransitionConstraints(this.visit(ctx.transitionConstraints, specs));
        */

        return schema;
    }

    // FINITE FIELD
    // --------------------------------------------------------------------------------------------
    fieldDeclaration(ctx: any): bigint {
        const modulus = this.visit(ctx.modulus);
        return BigInt(modulus)
    }

    // MODULE CONSTANTS
    // --------------------------------------------------------------------------------------------
    constantDeclaration(ctx: any, field?: FiniteField): ConstantDeclaration {
        const name = ctx.constantName[0].image;
        let value: bigint | bigint[] | bigint[][];

        if (ctx.value) {
            value = this.visit(ctx.value, field);
        }
        else if (ctx.vector) {
            value = this.visit(ctx.vector, field);
        }
        else if (ctx.matrix) {
            value = this.visit(ctx.matrix, field);
        }
        else {
            throw new Error(`Failed to parse the value of module constant '${name}'`);
        }

        //validateVariableName(name, dimensions);
        return { name, value };
    }

    literalVector(ctx: any, field?: FiniteField): bigint[] {
        const vector = new Array<bigint>(ctx.elements.length);
        for (let i = 0; i < ctx.elements.length; i++) {
            let element: bigint = this.visit(ctx.elements[i], field);
            vector[i] = element;
        }
        return vector;
    }

    literalMatrix(ctx: any, field?: FiniteField): bigint[][] {

        let colCount = 0;
        const rowCount = ctx.rows.length;
        const matrix = new Array<bigint[]>(rowCount);
        
        for (let i = 0; i < rowCount; i++) {
            let row: bigint[] = this.visit(ctx.rows[i], field);
            if (colCount === 0) {
                colCount = row.length;
            }
            else if (colCount !== row.length) {
                throw new Error('All matrix rows must have the same number of columns')
            }
            matrix[i] = row;
        }
        return matrix;
    }

    literalMatrixRow(ctx: any, field?: FiniteField): bigint[] {
        const row = new Array<bigint>(ctx.elements.length);
        for (let i = 0; i < ctx.elements.length; i++) {
            let element = this.visit(ctx.elements[i], field);
            row[i] = element;
        }
        return row;
    }

    // INPUT REGISTERS
    // --------------------------------------------------------------------------------------------
    inputRegisters(ctx: any, component: AirComponent): void {
        const registerNames = new Set<string>();
        ctx.registers.forEach((declaration: any) => {
            let registerName: string = this.visit(declaration, component);
            if (registerNames.has(registerName)) {
                throw new Error(`input register ${registerName} is defined more than once`);
            }

            const registerIndex = Number(registerName.slice(2));
            if (registerIndex !== registerNames.size) {
                throw new Error(`input register ${registerName} is defined out of order`);
            }

            registerNames.add(registerName);
        });

        const regCount = Number(ctx.registerCount[0].image);
        if (regCount !== registerNames.size) {
            throw new Error(`expected ${regCount} input registers, but ${registerNames.size} registers were defined`);
        }
    }

    inputRegisterDefinition(ctx: any, component: AirComponent): string {
        const scope = ctx.scope[0].image;
        const registerName = ctx.name[0].image;
        const binary = ctx.binary ? true : false;
        const parentIdx = ctx.parent ? Number(ctx.parent[0].image) : undefined;
        // TODO: get steps from somewhere
        component.addInputRegister(scope, binary, parentIdx, undefined, -1);
        return registerName;
    }

    // STATIC REGISTERS
    // --------------------------------------------------------------------------------------------
    staticRegisters(ctx: any, component: AirComponent): void {
        const registerNames = new Set<string>();
        if (ctx.registers) {
            ctx.registers.forEach((declaration: any) => {
                let registerName: string = this.visit(declaration, component);
                if (registerNames.has(registerName)) {
                    throw new Error(`static register ${registerName} is defined more than once`);
                }
                
                const registerIndex = Number(registerName.slice(2));
                if (registerIndex !== registerNames.size) {
                    throw new Error(`static register ${registerName} is defined out of order`);
                }
                registerNames.add(registerName);
            });
        }

        const regCount = Number(ctx.registerCount[0].image);
        if (regCount !== registerNames.size) {
            throw new Error(`expected ${regCount} static registers, but ${registerNames.size} registers were defined`);
        }
    }

    staticRegisterDefinition(ctx: any, component: AirComponent): string {
        const registerName = ctx.name[0].image;
        const values: bigint[] = this.visit(ctx.values);
        // TODO: handle parsing of PRNG sequences
        component.addCyclicRegister(values);
        return registerName;
    }

    // TRANSITION FUNCTION AND CONSTRAINTS
    // --------------------------------------------------------------------------------------------
    transitionFunction(ctx: any, specs: ScriptSpecs): TransitionFunctionBody {
        const exc = new ExecutionContext(specs);
        const inputBlock: InputBlock = this.visit(ctx.inputBlock, exc);
        const result = new TransitionFunctionBody(inputBlock);
        return result;
    }

    transitionConstraints(ctx: any, specs: ScriptSpecs): TransitionConstraintsBody {
        const exc = new ExecutionContext(specs);
        let root: Expression;
        if (ctx.allStepBlock) {
            root = this.visit(ctx.allStepBlock, exc);
        }
        else {
            root = this.visit(ctx.inputBlock, exc);
        }
        return new TransitionConstraintsBody(root, specs.inputBlock);
    }

    // LOOPS
    // --------------------------------------------------------------------------------------------
    inputBlock(ctx: any, exc: ExecutionContext): InputBlock {

        const registers: string[] = ctx.registers.map((register: any) => register.image);
        const controlIndex = exc.addLoopFrame(registers);

        // parse init expression
        const initExpression: Expression = this.visit(ctx.initExpression, exc);

        // parse body expression
        let bodyExpression: InputBlock | SegmentLoopBlock;
        if (ctx.inputBlock) {
            bodyExpression = this.visit(ctx.inputBlock, exc);
        }
        else {
            const loops: SegmentLoop[] = ctx.segmentLoops.map((loop: any) => this.visit(loop, exc));
            bodyExpression = new SegmentLoopBlock(loops);
        }

        const indexSet = new Set(registers.map(register => Number.parseInt(register.slice(2))));
        const controller = exc.getControlReference(controlIndex);
        return new InputBlock(controlIndex, initExpression, bodyExpression, indexSet, controller);
    }

    transitionInit(ctx: any, exc: ExecutionContext): Expression {
        return this.visit(ctx.expression, exc);
    }

    segmentLoop(ctx: any, exc: ExecutionContext): SegmentLoop {
        const intervals: [number, number][] = ctx.ranges.map((range: any) => this.visit(range));
        const controlIndex = exc.addLoopFrame();
        const body: Expression = this.visit(ctx.body, exc);
        const controller = exc.getControlReference(controlIndex);
        return new SegmentLoop(body, intervals, controller);
    }

    // STATEMENTS
    // --------------------------------------------------------------------------------------------
    statementBlock(ctx: any, exc: ExecutionContext): StatementBlock {
        let statements: Statement[] | undefined;
        if (ctx.statements) {
            statements = ctx.statements.map((stmt: any) => this.visit(stmt, exc));
        }

        let out: Expression = this.visit(ctx.expression, exc);
        if (ctx.constraint) {
            if (exc.inTransitionFunction) {
                throw new Error('comparison operator cannot be used in transition function');
            }
            const constraint: Expression = this.visit(ctx.constraint, exc);
            out = expressions.BinaryOperation.sub(constraint, out);
        }

        return new StatementBlock(out, statements);
    }

    statement(ctx: any, exc: ExecutionContext): Statement {
        const expression = this.visit(ctx.expression, exc);
        const variable = exc.setVariableAssignment(ctx.variableName[0].image, expression);
        return { variable: variable.symbol, expression };
    }

    assignableExpression(ctx: any, exc: ExecutionContext): Expression {
        return this.visit(ctx.expression, exc);
    }

    // WHEN...ELSE EXPRESSION
    // --------------------------------------------------------------------------------------------
    whenExpression(ctx: any, exc: ExecutionContext): Expression {
        const id = exc.getNextConditionalBlockId();
        const condition = this.visit(ctx.condition, exc);

        // build subroutines for true and false conditions
        exc.createNewVariableFrame();
        const tBlock: StatementBlock = this.visit(ctx.tExpression, exc);
        exc.destroyVariableFrame();

        exc.createNewVariableFrame();
        const fBlock: StatementBlock = this.visit(ctx.fExpression, exc);
        exc.destroyVariableFrame();

        return new expressions.WhenExpression(id, condition, tBlock, fBlock);
    }

    whenCondition(ctx: any, exc: ExecutionContext): Expression {
        const registerName: string = ctx.register[0].image;
        const registerRef = exc.getSymbolReference(registerName);

        // make sure the condition register holds only binary values
        if (!exc.isBinaryRegister(registerName)) {
            throw new Error(`conditional expression must be based on a binary register`);
        }

        return registerRef;
    }

    // TRANSITION CALL EXPRESSION
    // --------------------------------------------------------------------------------------------
    transitionCall(ctx: any, exc: ExecutionContext): Expression {
        const registers = ctx.registers[0].image;
        if (registers !== '$r') {
            throw new Error(`expected transition function to be invoked with $r parameter, but received ${registers} parameter`);
        }
        return exc.getTransitionFunctionCall();
    }

    // VECTORS AND MATRIXES
    // --------------------------------------------------------------------------------------------
    vector(ctx: any, exc: ExecutionContext): Expression {
        const elements = ctx.elements.map((e: any) => this.visit(e, exc));
        return new expressions.CreateVector(elements);
    }

    vectorDestructuring(ctx: any, exc: ExecutionContext): Expression {
        const vector = this.visit(ctx.vector, exc);
        return new expressions.DestructureVector(vector);
    }

    matrix(ctx: any, exc: ExecutionContext): Expression {
        const elements = ctx.rows.map((r: any) => this.visit(r, exc));
        return new expressions.CreateMatrix(elements);
    }

    matrixRow(ctx: any, exc: ExecutionContext): Expression[] {
        return ctx.elements.map((e: any) => this.visit(e, exc));
    }

    // EXPRESSIONS
    // --------------------------------------------------------------------------------------------
    expression(ctx: any, exc: ExecutionContext): Expression {
        let result: Expression = this.visit(ctx.lhs, exc);
        if (ctx.rhs) {
            ctx.rhs.forEach((rhsOperand: any, i: number) => {
                let rhs: Expression = this.visit(rhsOperand, exc);
                let opToken = ctx.AddOp[i];
                if (tokenMatcher(opToken, Plus)) {
                    result = expressions.BinaryOperation.add(result, rhs);
                }
                else if (tokenMatcher(opToken, Minus)) {
                    result = expressions.BinaryOperation.sub(result, rhs);
                }
                else {
                    throw new Error(`Invalid operator '${opToken.image}'`);
                }
            });
        }
        return result;
    }

    mulExpression(ctx: any, exc: ExecutionContext): Expression {
        let result: Expression = this.visit(ctx.lhs, exc);
        if (ctx.rhs) {
            ctx.rhs.forEach((rhsOperand: any, i: number) => {
                let rhs: Expression = this.visit(rhsOperand, exc);
                let opToken = ctx.MulOp[i];
                if (tokenMatcher(opToken, Star)) {
                    result = expressions.BinaryOperation.mul(result, rhs);
                }
                else if (tokenMatcher(opToken, Slash)) {
                    result = expressions.BinaryOperation.div(result, rhs);
                }
                else if (tokenMatcher(opToken, Pound)) {
                    result = expressions.BinaryOperation.prod(result, rhs);
                }
                else {
                    throw new Error(`Invalid operator '${opToken.image}'`);
                }
            });
        }
        return result;
    }

    expExpression(ctx: any, exc: ExecutionContext): Expression {
        let result: Expression = this.visit(ctx.base, exc);
        if (ctx.exponent) {
            ctx.exponent.forEach((expOperand: any, i: number) => {
                let exponent: Expression = this.visit(expOperand, exc);
                result = expressions.BinaryOperation.exp(result, exponent);
            });
        }
        return result;
    }

    vectorExpression(ctx: any, exc: ExecutionContext): Expression {
        let result: Expression = this.visit(ctx.expression, exc);
        if (ctx.rangeStart) {
            const rangeStart = Number.parseInt(ctx.rangeStart[0].image, 10);
            const rangeEnd = Number.parseInt(ctx.rangeEnd[0].image, 10);
            result = new expressions.SliceVector(result, rangeStart, rangeEnd);
        }
        else if (ctx.index) {
            const index = Number.parseInt(ctx.index[0].image, 10);
            result = new expressions.ExtractVectorElement(result, index);
        }
        return result;
    }

    atomicExpression(ctx: any, exc: ExecutionContext): Expression {
        let result: Expression;
        if (ctx.expression) {
            result = this.visit(ctx.expression, exc);
        }
        else if (ctx.symbol) {
            const symbol: string = ctx.symbol[0].image;
            result = exc.getSymbolReference(symbol);
        }
        else if (ctx.literal) {
            const value: string = ctx.literal[0].image;
            result = new expressions.LiteralExpression(value);
        }
        else {
            throw new Error('Invalid expression syntax');
        }

        if (ctx.neg) {
            result = expressions.UnaryOperation.neg(result);
        }

        if (ctx.inv) {
            result = expressions.UnaryOperation.inv(result);
        }

        return result;
    }

    // LITERAL EXPRESSIONS
    // --------------------------------------------------------------------------------------------
    literalExpression(ctx: any, field?: FiniteField): bigint {
        let result: bigint = this.visit(ctx.lhs, field);
        if (ctx.rhs) {
            ctx.rhs.forEach((rhsOperand: any, i: number) => {
                let rhsValue: bigint = this.visit(rhsOperand, field);
                let operator = ctx.AddOp[i];

                if (tokenMatcher(operator, Plus)) {
                    result = field ? field.add(result, rhsValue) : (result + rhsValue);
                }
                else if (tokenMatcher(operator, Minus)) {
                    result = field ? field.sub(result, rhsValue) : (result - rhsValue);
                }
            });
        }
        return result;
    }

    literalMulExpression(ctx: any, field?: FiniteField): bigint {
        let result: bigint = this.visit(ctx.lhs, field);
        if (ctx.rhs) {
            ctx.rhs.forEach((rhsOperand: any, i: number) => {
                let rhsValue: bigint = this.visit(rhsOperand, field);
                let operator = ctx.MulOp[i];

                if (tokenMatcher(operator, Star)) {
                    result = field ? field.mul(result, rhsValue) : (result * rhsValue);
                }
                else if (tokenMatcher(operator, Slash)) {
                    result = field ? field.div(result, rhsValue) : (result / rhsValue);
                }
                else if (tokenMatcher(operator, Pound)) {
                    throw new Error('Matrix multiplication is supported for literal expressions')
                }
            });
        }
        return result;
    }

    literalExpExpression(ctx: any, field?: FiniteField): bigint {
        let result: bigint = this.visit(ctx.base, field);
        if (ctx.exponent) {
            ctx.exponent.forEach((expOperand: any) => {
                let expValue: bigint = this.visit(expOperand, field);
                result = field ? field.exp(result, expValue) : (result ** expValue);
            });
        }
        return result;
    }

    literalAtomicExpression(ctx: any, field?: FiniteField): bigint {
        let result: bigint;
        if (ctx.expression) {
            result = this.visit(ctx.expression, field);
        }
        else if (ctx.literal) {
            result = BigInt(ctx.literal[0].image);
        }
        else {
            throw new Error('Invalid expression syntax');
        }

        if (ctx.neg) {
            result = field ? field.neg(result) : (-result);
        }

        if (ctx.inv) {
            result = field ? field.inv(result) : (1n / result);
        }

        return result;
    }

    literalRangeExpression(ctx: any): [number, number] {
        let start = Number.parseInt(ctx.start[0].image, 10);
        let end = ctx.end ? Number.parseInt(ctx.end[0].image, 10) : start;
        return [start, end];
    }
}

// EXPORT VISITOR INSTANCE
// ================================================================================================
export const visitor = new AirVisitor();

// HELPER FUNCTIONS
// ================================================================================================
function validateScriptSections(ctx: any) {
    // make sure exactly one input register section is present
    if (!ctx.inputRegisters || ctx.inputRegisters.length === 0) {
        throw new Error('input registers section is missing');
    }
    else if (ctx.inputRegisters.length > 1) {
        throw new Error('input registers section is defined more than once');
    }

    // make sure exactly one transition function is present
    if (!ctx.transitionFunction || ctx.transitionFunction.length === 0) {
        throw new Error('transition function section is missing');
    }
    else if (ctx.transitionFunction.length > 1) {
        throw new Error('transition function section is defined more than once');
    }

    // make sure exactly one transition constraints section is present
    if (!ctx.transitionConstraints || ctx.transitionConstraints.length === 0) {
        throw new Error('transition constraints section is missing');
    }
    else if (ctx.transitionConstraints.length > 1) {
        throw new Error('transition constraints section is defined more than once');
    }

    // make sure at most one static register section is present
    if (ctx.staticRegisters) {
        if (ctx.staticRegisters.length > 1) {
            throw new Error('static registers section is defined more than once');
        }
    }
}