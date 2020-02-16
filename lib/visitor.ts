// IMPORTS
// ================================================================================================
import { Interval } from '@guildofweavers/air-script';
import { AirSchema, Expression, PrngSequence } from '@guildofweavers/air-assembly';
import { FiniteField } from '@guildofweavers/galois';
import { tokenMatcher } from 'chevrotain';
import { parser } from './parser';
import { Plus, Star, Slash, Pound, Minus } from './lexer';
import { Module, ImportMember, ModuleOptions } from './Module';
import { Component } from './Component';
import { ExecutionContext, LoopBaseContext, LoopBlockContext, LoopContext } from './contexts';
import { LoopTemplate, LoopBaseTemplate } from './templates';
import { DelegateTemplate } from './templates/DelegateTemplate';

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
    script(ctx: any, options: ModuleOptions): AirSchema {

        validateScriptSections(ctx);

        // build module
        const moduleName: string = ctx.starkName[0].image;
        const modulus: bigint = this.visit(ctx.fieldDeclaration);
        const traceRegisterCount = Number(ctx.traceRegisterCount[0].image);
        const constraintCount = Number(ctx.constraintCount[0].image);
        const aModule = new Module(moduleName, options.basedir, modulus, traceRegisterCount, constraintCount);

        // parse imports
        if (ctx.imports) {
            ctx.imports.forEach((imp: any) => this.visit(imp, aModule));
        }

        // parse and add constants, inputs, and static registers to the module
        if (ctx.moduleConstants) {
            ctx.moduleConstants.forEach((element: any) => this.visit(element, aModule));
        }
        if (ctx.staticRegisters) {
            ctx.staticRegisters.forEach((element: any) => this.visit(element, aModule));
        }
        ctx.inputRegisters.forEach((element: any) => this.visit(element, aModule));

        // determine transition function structure and use it to create a component object
        const component: Component = this.visit(ctx.transitionFunction, aModule);

        // parse transition function and constraint evaluator
        this.visit(ctx.transitionFunction, component);
        this.visit(ctx.transitionConstraints, component);

        // finalize the component and return the schema
        aModule.setComponent(component, options.name);
        return aModule.schema;
    }

    // FINITE FIELD
    // --------------------------------------------------------------------------------------------
    fieldDeclaration(ctx: any): bigint {
        const modulus = this.visit(ctx.modulus);
        return BigInt(modulus)
    }

    // MODULE CONSTANTS
    // --------------------------------------------------------------------------------------------
    constantDeclaration(ctx: any, aModule: Module): void {
        const name = ctx.constantName[0].image;
        let value: bigint | bigint[] | bigint[][];

        if (ctx.value) {
            value = this.visit(ctx.value, aModule.schema.field);
        }
        else if (ctx.vector) {
            value = this.visit(ctx.vector, aModule.schema.field);
        }
        else if (ctx.matrix) {
            value = this.visit(ctx.matrix, aModule.schema.field);
        }
        else {
            throw new Error(`Failed to parse the value of module constant '${name}'`);
        }
        aModule.addConstant(name, value);
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

    // INPUT AND STATIC REGISTERS
    // --------------------------------------------------------------------------------------------
    inputDeclaration(ctx: any, aModule: Module): void {
        const scope = ctx.scope[0].image;
        const inputName = ctx.name[0].image;
        const registerCount = Number(ctx.width[0].image);
        const inputRank = ctx.rank ? Number(ctx.rank[0].image) : 0;
        const binary = ctx.boolean ? true : false;
        aModule.addInput(inputName, registerCount, inputRank, scope, binary);
    }

    staticDeclaration(ctx: any, aModule: Module): void {
        const staticName = ctx.name[0].image;
        const registers: (bigint[] | PrngSequence)[] = ctx.registers.map((r: any) => this.visit(r));
        
        aModule.addStatic(staticName, registers);
    }

    staticRegister(ctx: any, aModule: Module): bigint[] | PrngSequence {
        if (ctx.values) {
            return this.visit(ctx.values, aModule) as bigint[];
        }
        else {
            return this.visit(ctx.sequence, aModule) as PrngSequence;
        }
    }

    prngSequence(ctx: any, aModule: Module): PrngSequence {
        const method: string = ctx.method[0].image;
        const seed = BigInt(ctx.seed[0].image);
        const count = Number(ctx.count[0].image);
        return new PrngSequence(method, seed, count);
    }

    // TRANSITION FUNCTION AND CONSTRAINTS
    // --------------------------------------------------------------------------------------------
    transitionFunction(ctx: any, mOrC: Module | Component): Component | void {
        if (mOrC instanceof Module) {
            const rootTemplate = new LoopTemplate([0, mOrC.traceWidth - 1]);
            this.visit(ctx.traceLoop, rootTemplate);
            return mOrC.createComponent(rootTemplate);
        }
        else {
            const exc = mOrC.createExecutionContext('transition');
            const result = this.visit(ctx.traceLoop, exc);
            mOrC.setTransitionFunction(exc, result);
        }
    }

    transitionConstraints(ctx: any, component: Component): void {
        // TODO: validate execution template
        const exc = component.createExecutionContext('evaluation');
        if (ctx.allStepBlock) {
            const result: Expression = this.visit(ctx.allStepBlock, exc);
            component.setConstraintEvaluator(exc, result);
        }
        else {
            const result = this.visit(ctx.traceLoop, exc);
            component.setConstraintEvaluator(exc, result);
        }
    }

    // LOOPS
    // --------------------------------------------------------------------------------------------
    traceLoop(ctx: any, templateOrParent: LoopTemplate | ExecutionContext): void | Expression {

        // parse inputs
        const inputs: string[] = ctx.inputs.map((input: any) => input.image);

        // parse loop body
        if (templateOrParent instanceof LoopTemplate) {
            templateOrParent.setInputs(inputs);
            ctx.blocks.forEach((b: any) => this.visit(b, templateOrParent));
        }
        else {
            // create a new context for the loop
            const loopContext = new LoopContext(templateOrParent, inputs);

            // parse outer statements
            if (ctx.statements) {
                ctx.statements.forEach((s: any) => this.visit(s, loopContext));
            }

            ctx.blocks.forEach((b: any) => this.visit(b, loopContext));
            return loopContext.result;
        }
    }

    loopBlock(ctx: any, parent: LoopTemplate | LoopContext): void {
        const domain: Interval = (ctx.domain ? this.visit(ctx.domain) : parent.domain);

        if (parent instanceof LoopTemplate) {
            if (ctx.traceLoop) {
                const template = new LoopTemplate(domain, parent);
                this.visit(ctx.traceLoop, template);
                parent.addBlock(template);
            }
            else if (ctx.traceSegments) {
                const template = new LoopBaseTemplate(domain);
                ctx.traceSegments.forEach((segment: any) => template.addSegment(this.visit(segment)));
                parent.addBlock(template);
            }
            else {
                const template = new DelegateTemplate(domain, this.visit(ctx.delegateCall));
                parent.addBlock(template);
            }
        }
        else if (parent instanceof LoopContext) {
            if (ctx.traceLoop) {
                const blockContext = new LoopBlockContext(parent, domain);
                const initResult: Expression = this.visit(ctx.initExpression, blockContext);
                const loopResult: Expression = this.visit(ctx.traceLoop, blockContext);
                const result = blockContext.buildResult(initResult, loopResult);
                parent.addBlock(result);
            }
            else if (ctx.traceSegments) {
                const blockContext = new LoopBaseContext(parent, domain);
                const initResult: Expression = this.visit(ctx.initExpression, blockContext);
                const segmentResults: Expression[] = ctx.traceSegments.map((loop: any) => this.visit(loop, blockContext));
                const result = blockContext.buildResult(initResult, segmentResults);
                parent.addBlock(result);
            }
            else {
                // TODO: process delegate call
                throw new Error('delegate parsing not implemented');
            }
        }
        else {
            throw new Error('invalid parent');
        }
    }

    traceSegment(ctx: any, exc?: LoopBaseContext): Expression | Interval[] {
        if (exc) return this.visit(ctx.body, exc);
        else return ctx.ranges.map((range: any) => this.visit(range));
    }

    traceDomain(ctx: any): Interval {
        return this.visit(ctx.range);
    }

    // STATEMENTS
    // --------------------------------------------------------------------------------------------
    statementBlock(ctx: any, exc: ExecutionContext): Expression {
        const blockContext = new ExecutionContext(exc);
        if (ctx.statements) {
            ctx.statements.forEach((stmt: any) => this.visit(stmt, blockContext));
        }

        let result: Expression = this.visit(ctx.expression, blockContext);
        if (ctx.constraint) {
            const constraint: Expression = this.visit(ctx.constraint, blockContext);
            result = blockContext.buildBinaryOperation('sub', result, constraint);
        }

        return result;
    }

    statement(ctx: any, exc: ExecutionContext): void {
        const expression = this.visit(ctx.expression, exc);
        exc.setVariableAssignment(ctx.variableName[0].image, expression);
    }

    assignableExpression(ctx: any, exc: ExecutionContext): Expression {
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
        const symbol: string = ctx.value[0].image;
        const result = exc.getSymbolReference(symbol);
        return result;
    }

    // FUNCTION CALLS
    // --------------------------------------------------------------------------------------------
    transitionCall(ctx: any, exc: ExecutionContext): Expression {
        const registers = ctx.registers[0].image;
        if (registers !== '$r') {
            throw new Error(`expected transition function to be invoked with $r parameter, but received ${registers} parameter`);
        }
        return exc.buildTransitionCall();
    }

    delegateCall(ctx: any, exc?: LoopBaseContext): string | void {
        if (!exc) {
            return ctx.delegate[0].image;
        }

        const registers = ctx.registers[0].image;
        if (registers !== '$r') {
            throw new Error(`functions must be invoked over $r domain, but ${registers} domain was specified`);
        }
        const range: [number, number] = this.visit(ctx.range); // TODO
        const funcName = ctx.funcName[0].image;
        const params = ctx.parameters.map((p: any) => this.visit(p, exc));

        exc.addFunctionCall(funcName, params, range);
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

    literalRangeExpression(ctx: any): Interval {
        let start = Number.parseInt(ctx.start[0].image, 10);
        let end = ctx.end ? Number.parseInt(ctx.end[0].image, 10) : start;
        return [start, end];
    }

    // IMPORTS
    // --------------------------------------------------------------------------------------------
    importExpression(ctx: any, aModule: Module): void {
        const members: ImportMember[] = ctx.members.map((member: any) => this.visit(member));
        let path: string = ctx.path[0].image;
        path = path.substring(1, path.length - 1);
        aModule.addImport(path, members);
    }

    importMember(ctx: any): ImportMember {
        const member = ctx.member[0].image;
        const alias = ctx.alias ? ctx.alias[0].image : undefined;
        return { member, alias };
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
        throw new Error('at least one input must be declared');
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
}