// IMPORTS
// ================================================================================================
import { AirSchema, Expression } from '@guildofweavers/air-assembly';
import { FiniteField } from '@guildofweavers/galois';
import { tokenMatcher } from 'chevrotain';
import { parser } from './parser';
import { Plus, Star, Slash, Pound, Minus } from './lexer';
import { TransitionSpecs } from './TransitionSpecs';
import { ExecutionContext } from './ExecutionContext';
import { ModuleContext } from './ModuleContext';

// MODULE VARIABLES
// ================================================================================================
const BaseCstVisitor = parser.getBaseCstVisitorConstructor();

class AirVisitor extends BaseCstVisitor {

    constructor() {
        super();
        this.validateVisitor()
    }

    // ENTRY POINT
    // --------------------------------------------------------------------------------------------
    script(ctx: any): AirSchema {

        const moduleName = ctx.starkName[0].image;
        validateScriptSections(ctx);

        // build execution context
        const modulus: bigint = this.visit(ctx.fieldDeclaration);
        const registers = Number(ctx.stateRegisterCount[0].image);
        const constraints = Number(ctx.constraintCount[0].image);
        const tSpecs: TransitionSpecs = this.visit(ctx.transitionFunction);
        this.visit(ctx.inputRegisters, tSpecs);

        const context = new ModuleContext(moduleName, modulus, registers, constraints, tSpecs);

        // parse constants
        if (ctx.moduleConstants) {
            ctx.moduleConstants.forEach((element: any) => this.visit(element, context));
        }
        
        // parse static registers
        this.visit(ctx.staticRegisters, context);

        // parse transition function
        const exc = context.createExecutionContext('transition');
        const inits: Expression[] = tSpecs.loops.map(loop => this.visit(loop.init, exc));
        const segments: Expression[] = tSpecs.segments.map(segment => this.visit(segment.body, exc));
        context.setTransitionFunction(exc, inits, segments);

        // parse constraint evaluator
        this.visit(ctx.transitionConstraints, context);

        // finalize schema and return
        context.schema.addComponent(context.component);
        return context.schema;
    }

    // FINITE FIELD
    // --------------------------------------------------------------------------------------------
    fieldDeclaration(ctx: any): bigint {
        const modulus = this.visit(ctx.modulus);
        return BigInt(modulus)
    }

    // MODULE CONSTANTS
    // --------------------------------------------------------------------------------------------
    constantDeclaration(ctx: any, exc: ModuleContext): void {
        const name = ctx.constantName[0].image;
        let value: bigint | bigint[] | bigint[][];

        if (ctx.value) {
            value = this.visit(ctx.value, exc.schema.field);
        }
        else if (ctx.vector) {
            value = this.visit(ctx.vector, exc.schema.field);
        }
        else if (ctx.matrix) {
            value = this.visit(ctx.matrix, exc.schema.field);
        }
        else {
            throw new Error(`Failed to parse the value of module constant '${name}'`);
        }
        exc.addConstant(name, value);
    }

    literalVector(ctx: any, field: FiniteField): bigint[] {
        const vector = new Array<bigint>(ctx.elements.length);
        for (let i = 0; i < ctx.elements.length; i++) {
            let element: bigint = this.visit(ctx.elements[i], field);
            vector[i] = element;
        }
        return vector;
    }

    literalMatrix(ctx: any, field: FiniteField): bigint[][] {

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

    literalMatrixRow(ctx: any, field: FiniteField): bigint[] {
        const row = new Array<bigint>(ctx.elements.length);
        for (let i = 0; i < ctx.elements.length; i++) {
            let element = this.visit(ctx.elements[i], field);
            row[i] = element;
        }
        return row;
    }

    // INPUT REGISTERS
    // --------------------------------------------------------------------------------------------
    inputRegisters(ctx: any, specs: TransitionSpecs): void {
        ctx.registers.forEach((declaration: any) => this.visit(declaration, specs));

        /*
        const regCount = Number(ctx.registerCount[0].image);
        if (regCount !== registerNames.size) {
            throw new Error(`expected ${regCount} input registers, but ${registerNames.size} registers were defined`);
        }
        */
    }

    inputRegisterDefinition(ctx: any, specs: TransitionSpecs): void {
        const scope = ctx.scope[0].image;
        const registerName = ctx.name[0].image;
        const binary = ctx.binary ? true : false;
        specs.addInput(registerName, scope, binary);
    }

    // STATIC REGISTERS
    // --------------------------------------------------------------------------------------------
    staticRegisters(ctx: any, exc: ModuleContext): void {
        const registerNames = new Set<string>();
        if (ctx.registers) {
            ctx.registers.forEach((declaration: any) => {
                let registerName: string = this.visit(declaration, exc);
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

    staticRegisterDefinition(ctx: any, exc: ModuleContext): string {
        const registerName = ctx.name[0].image;
        const values: bigint[] = this.visit(ctx.values);
        // TODO: handle parsing of PRNG sequences
        exc.addStatic(registerName, values);
        return registerName;
    }

    // TRANSITION FUNCTION AND CONSTRAINTS
    // --------------------------------------------------------------------------------------------
    transitionFunction(ctx: any): TransitionSpecs {
        const specs = new TransitionSpecs();
        this.visit(ctx.inputBlock, specs);
        return specs;
    }

    transitionConstraints(ctx: any, context: ModuleContext): void {
        
        if (ctx.allStepBlock) {
            const exc = context.createExecutionContext('evaluation');
            const result: Expression = this.visit(ctx.allStepBlock, exc);
            context.setConstraintEvaluator2(exc, result);
        }
        else {
            const specs = new TransitionSpecs();
            this.visit(ctx.inputBlock, specs);

            const exc = context.createExecutionContext('evaluation');
            const inits: Expression[] = specs.loops.map(loop => this.visit(loop.init, exc));
            const segments: Expression[] = specs.segments.map(segment => this.visit(segment.body, exc));
            context.setConstraintEvaluator(exc, inits, segments);
        }
    }

    // LOOPS
    // --------------------------------------------------------------------------------------------
    inputBlock(ctx: any, specs: TransitionSpecs): void {

        const registers: string[] = ctx.registers.map((register: any) => register.image);
        specs.addLoop(registers, ctx.initExpression);

        // parse body expression
        if (ctx.inputBlock) {
            this.visit(ctx.inputBlock, specs);
        }
        else {
            ctx.segmentLoops.map((loop: any) => this.visit(loop, specs));
        }
    }

    transitionInit(ctx: any, exc: ModuleContext): Expression {
        return this.visit(ctx.expression, exc);
    }

    segmentLoop(ctx: any, specs: TransitionSpecs): void {
        const intervals: [number, number][] = ctx.ranges.map((range: any) => this.visit(range));
        specs.addSegment(intervals, ctx.body);
    }

    // STATEMENTS
    // --------------------------------------------------------------------------------------------
    statementBlock(ctx: any, exc: ExecutionContext): Expression {
        exc.enterBlock();
        if (ctx.statements) {
            ctx.statements.forEach((stmt: any) => this.visit(stmt, exc));
        }

        let result: Expression = this.visit(ctx.expression, exc);
        if (ctx.constraint) {
            const constraint: Expression = this.visit(ctx.constraint, exc);
            result = exc.buildBinaryOperation('sub', result, constraint);
        }

        exc.exitBlock();
        return result;
    }

    statement(ctx: any, exc: ExecutionContext): void {
        const expression = this.visit(ctx.expression, exc);
        exc.setVariableAssignment(ctx.variableName[0].image, expression);
    }

    assignableExpression(ctx: any, exc: ModuleContext): Expression {
        return this.visit(ctx.expression, exc);
    }

    // CONDITIONAL EXPRESSION
    // --------------------------------------------------------------------------------------------
    whenExpression(ctx: any, exc: ExecutionContext): Expression {
        const condition: Expression = this.visit(ctx.condition, exc);
        const tBlock: Expression = this.visit(ctx.tExpression, exc);
        const fBlock: Expression = this.visit(ctx.fExpression, exc);
        return exc.buildConditionalExpression(condition, tBlock, fBlock);
    }

    whenCondition(ctx: any, exc: ExecutionContext): Expression {
        const registerName: string = ctx.register[0].image;
        const registerRef = exc.getSymbolReference(registerName);
        return registerRef;
    }

    // TRANSITION CALL EXPRESSION
    // --------------------------------------------------------------------------------------------
    transitionCall(ctx: any, exc: ExecutionContext): Expression {
        const registers = ctx.registers[0].image;
        if (registers !== '$r') {
            throw new Error(`expected transition function to be invoked with $r parameter, but received ${registers} parameter`);
        }
        return exc.buildTransitionCallExpression();
    }

    // VECTORS AND MATRIXES
    // --------------------------------------------------------------------------------------------
    vector(ctx: any, exc: ExecutionContext): Expression {
        const elements: Expression[] = ctx.elements.map((e: any) => this.visit(e, exc));
        return exc.buildMakeVectorExpression(elements);
    }

    vectorDestructuring(ctx: any, exc: ExecutionContext): Expression {
        const vector: Expression = this.visit(ctx.vector, exc);
        return vector;
    }

    matrix(ctx: any, exc: ExecutionContext): Expression {
        const elements: Expression[][] = ctx.rows.map((r: any) => this.visit(r, exc));
        return exc.buildMakeMatrixExpression(elements);
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
                    result = exc.buildBinaryOperation('add', result, rhs);
                }
                else if (tokenMatcher(opToken, Minus)) {
                    result = exc.buildBinaryOperation('sub', result, rhs);
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
                    result = exc.buildBinaryOperation('mul', result, rhs);
                }
                else if (tokenMatcher(opToken, Slash)) {
                    result = exc.buildBinaryOperation('div', result, rhs);
                }
                else if (tokenMatcher(opToken, Pound)) {
                    result = exc.buildBinaryOperation('prod', result, rhs);
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
                result = exc.buildBinaryOperation('exp', result, exponent);
            });
        }
        return result;
    }

    vectorExpression(ctx: any, exc: ExecutionContext): Expression {
        let result: Expression = this.visit(ctx.expression, exc);
        if (ctx.rangeStart) {
            const rangeStart = Number(ctx.rangeStart[0].image);
            const rangeEnd = Number(ctx.rangeEnd[0].image);
            result = exc.buildSliceVectorExpression(result, rangeStart, rangeEnd);
        }
        else if (ctx.index) {
            const index = Number(ctx.index[0].image);
            result = exc.buildGetVectorElementExpression(result, index);
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
            const value = BigInt(ctx.literal[0].image);
            result = exc.buildLiteralValue(value);
        }
        else {
            throw new Error('Invalid expression syntax');
        }

        if (ctx.neg) {
            result = exc.buildUnaryOperation('neg', result);
        }

        if (ctx.inv) {
            result = exc.buildUnaryOperation('inv', result);
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