"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chevrotain_1 = require("chevrotain");
const parser_1 = require("./parser");
const lexer_1 = require("./lexer");
const TransitionSpecs_1 = require("./TransitionSpecs");
const ModuleContext_1 = require("./ModuleContext");
// MODULE VARIABLES
// ================================================================================================
const BaseCstVisitor = parser_1.parser.getBaseCstVisitorConstructor();
class AirVisitor extends BaseCstVisitor {
    constructor() {
        super();
        this.validateVisitor();
    }
    // ENTRY POINT
    // --------------------------------------------------------------------------------------------
    script(ctx) {
        const moduleName = ctx.starkName[0].image;
        validateScriptSections(ctx);
        // build execution context
        const modulus = this.visit(ctx.fieldDeclaration);
        const inputRegisterCount = Number(ctx.inputRegisterCount[0].image);
        const staticRegisters = Number(ctx.staticRegisterCount[0].image);
        const traceRegisters = Number(ctx.traceRegisterCount[0].image);
        const constraints = Number(ctx.constraintCount[0].image);
        const tSpecs = this.visit(ctx.transitionFunction);
        // parse input registers
        this.visit(ctx.inputRegisters, tSpecs);
        const context = new ModuleContext_1.ModuleContext(moduleName, modulus, traceRegisters, staticRegisters, constraints, tSpecs);
        // parse constants
        if (ctx.moduleConstants) {
            ctx.moduleConstants.forEach((element) => this.visit(element, context));
        }
        // parse static registers
        this.visit(ctx.staticRegisters, context);
        // parse transition function
        const exc = context.createExecutionContext('transition');
        const inits = tSpecs.loops.map(loop => this.visit(loop.init, exc));
        const segments = tSpecs.segments.map(segment => this.visit(segment.body, exc));
        context.setTransitionFunction(exc, inits, segments);
        // parse constraint evaluator
        this.visit(ctx.transitionConstraints, context);
        // finalize schema and return
        context.schema.addComponent(context.component);
        return context.schema;
    }
    // FINITE FIELD
    // --------------------------------------------------------------------------------------------
    fieldDeclaration(ctx) {
        const modulus = this.visit(ctx.modulus);
        return BigInt(modulus);
    }
    // MODULE CONSTANTS
    // --------------------------------------------------------------------------------------------
    constantDeclaration(ctx, exc) {
        const name = ctx.constantName[0].image;
        let value;
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
    literalVector(ctx, field) {
        const vector = new Array(ctx.elements.length);
        for (let i = 0; i < ctx.elements.length; i++) {
            let element = this.visit(ctx.elements[i], field);
            vector[i] = element;
        }
        return vector;
    }
    literalMatrix(ctx, field) {
        let colCount = 0;
        const rowCount = ctx.rows.length;
        const matrix = new Array(rowCount);
        for (let i = 0; i < rowCount; i++) {
            let row = this.visit(ctx.rows[i], field);
            if (colCount === 0) {
                colCount = row.length;
            }
            else if (colCount !== row.length) {
                throw new Error('All matrix rows must have the same number of columns');
            }
            matrix[i] = row;
        }
        return matrix;
    }
    literalMatrixRow(ctx, field) {
        const row = new Array(ctx.elements.length);
        for (let i = 0; i < ctx.elements.length; i++) {
            let element = this.visit(ctx.elements[i], field);
            row[i] = element;
        }
        return row;
    }
    // INPUT REGISTERS
    // --------------------------------------------------------------------------------------------
    inputRegisters(ctx, specs) {
        ctx.registers.forEach((declaration) => this.visit(declaration, specs));
        /*
        const regCount = Number(ctx.registerCount[0].image);
        if (regCount !== registerNames.size) {
            throw new Error(`expected ${regCount} input registers, but ${registerNames.size} registers were defined`);
        }
        */
    }
    inputRegisterDefinition(ctx, specs) {
        const scope = ctx.scope[0].image;
        const registerName = ctx.name[0].image;
        const binary = ctx.binary ? true : false;
        specs.addInput(registerName, scope, binary);
    }
    // STATIC REGISTERS
    // --------------------------------------------------------------------------------------------
    staticRegisters(ctx, exc) {
        const registerNames = new Set();
        if (ctx.registers) {
            ctx.registers.forEach((declaration) => {
                let registerName = this.visit(declaration, exc);
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
        /*
        TODO
        const regCount = Number(ctx.registerCount[0].image);
        if (regCount !== registerNames.size) {
            throw new Error(`expected ${regCount} static registers, but ${registerNames.size} registers were defined`);
        }
        */
    }
    staticRegisterDefinition(ctx, exc) {
        const registerName = ctx.name[0].image;
        const values = this.visit(ctx.values);
        // TODO: handle parsing of PRNG sequences
        exc.addStatic(registerName, values);
        return registerName;
    }
    // TRANSITION FUNCTION AND CONSTRAINTS
    // --------------------------------------------------------------------------------------------
    transitionFunction(ctx) {
        const specs = new TransitionSpecs_1.TransitionSpecs();
        this.visit(ctx.inputBlock, specs);
        return specs;
    }
    transitionConstraints(ctx, context) {
        if (ctx.allStepBlock) {
            const exc = context.createExecutionContext('evaluation');
            const result = this.visit(ctx.allStepBlock, exc);
            context.setConstraintEvaluator2(exc, result);
        }
        else {
            const specs = new TransitionSpecs_1.TransitionSpecs();
            this.visit(ctx.inputBlock, specs);
            const exc = context.createExecutionContext('evaluation');
            const inits = specs.loops.map(loop => this.visit(loop.init, exc));
            const segments = specs.segments.map(segment => this.visit(segment.body, exc));
            context.setConstraintEvaluator(exc, inits, segments);
        }
    }
    // LOOPS
    // --------------------------------------------------------------------------------------------
    inputBlock(ctx, specs) {
        const registers = ctx.registers.map((register) => register.image);
        specs.addLoop(registers, ctx.initExpression);
        // parse body expression
        if (ctx.inputBlock) {
            this.visit(ctx.inputBlock, specs);
        }
        else {
            ctx.segmentLoops.map((loop) => this.visit(loop, specs));
        }
    }
    transitionInit(ctx, exc) {
        return this.visit(ctx.expression, exc);
    }
    segmentLoop(ctx, specs) {
        const intervals = ctx.ranges.map((range) => this.visit(range));
        specs.addSegment(intervals, ctx.body);
    }
    // STATEMENTS
    // --------------------------------------------------------------------------------------------
    statementBlock(ctx, exc) {
        exc.enterBlock();
        if (ctx.statements) {
            ctx.statements.forEach((stmt) => this.visit(stmt, exc));
        }
        let result = this.visit(ctx.expression, exc);
        if (ctx.constraint) {
            const constraint = this.visit(ctx.constraint, exc);
            result = exc.buildBinaryOperation('sub', result, constraint);
        }
        exc.exitBlock();
        return result;
    }
    statement(ctx, exc) {
        const expression = this.visit(ctx.expression, exc);
        exc.setVariableAssignment(ctx.variableName[0].image, expression);
    }
    assignableExpression(ctx, exc) {
        return this.visit(ctx.expression, exc);
    }
    // CONDITIONAL EXPRESSION
    // --------------------------------------------------------------------------------------------
    whenExpression(ctx, exc) {
        const condition = this.visit(ctx.condition, exc);
        const tBlock = this.visit(ctx.tExpression, exc);
        const fBlock = this.visit(ctx.fExpression, exc);
        return exc.buildConditionalExpression(condition, tBlock, fBlock);
    }
    whenCondition(ctx, exc) {
        const registerName = ctx.register[0].image;
        const registerRef = exc.getSymbolReference(registerName);
        return registerRef;
    }
    // TRANSITION CALL EXPRESSION
    // --------------------------------------------------------------------------------------------
    transitionCall(ctx, exc) {
        const registers = ctx.registers[0].image;
        if (registers !== '$r') {
            throw new Error(`expected transition function to be invoked with $r parameter, but received ${registers} parameter`);
        }
        // TODO: build without relying on base context
        const rParam = exc.base.buildLoadExpression('load.param', '$r');
        const kParam = exc.base.buildLoadExpression('load.param', '$k');
        return exc.buildFunctionCall('$MiMC_transition', [rParam, kParam]);
    }
    // VECTORS AND MATRIXES
    // --------------------------------------------------------------------------------------------
    vector(ctx, exc) {
        const elements = ctx.elements.map((e) => this.visit(e, exc));
        return exc.buildMakeVectorExpression(elements);
    }
    vectorDestructuring(ctx, exc) {
        const vector = this.visit(ctx.vector, exc);
        return vector;
    }
    matrix(ctx, exc) {
        const elements = ctx.rows.map((r) => this.visit(r, exc));
        return exc.buildMakeMatrixExpression(elements);
    }
    matrixRow(ctx, exc) {
        return ctx.elements.map((e) => this.visit(e, exc));
    }
    // EXPRESSIONS
    // --------------------------------------------------------------------------------------------
    expression(ctx, exc) {
        let result = this.visit(ctx.lhs, exc);
        if (ctx.rhs) {
            ctx.rhs.forEach((rhsOperand, i) => {
                let rhs = this.visit(rhsOperand, exc);
                let opToken = ctx.AddOp[i];
                if (chevrotain_1.tokenMatcher(opToken, lexer_1.Plus)) {
                    result = exc.buildBinaryOperation('add', result, rhs);
                }
                else if (chevrotain_1.tokenMatcher(opToken, lexer_1.Minus)) {
                    result = exc.buildBinaryOperation('sub', result, rhs);
                }
                else {
                    throw new Error(`Invalid operator '${opToken.image}'`);
                }
            });
        }
        return result;
    }
    mulExpression(ctx, exc) {
        let result = this.visit(ctx.lhs, exc);
        if (ctx.rhs) {
            ctx.rhs.forEach((rhsOperand, i) => {
                let rhs = this.visit(rhsOperand, exc);
                let opToken = ctx.MulOp[i];
                if (chevrotain_1.tokenMatcher(opToken, lexer_1.Star)) {
                    result = exc.buildBinaryOperation('mul', result, rhs);
                }
                else if (chevrotain_1.tokenMatcher(opToken, lexer_1.Slash)) {
                    result = exc.buildBinaryOperation('div', result, rhs);
                }
                else if (chevrotain_1.tokenMatcher(opToken, lexer_1.Pound)) {
                    result = exc.buildBinaryOperation('prod', result, rhs);
                }
                else {
                    throw new Error(`Invalid operator '${opToken.image}'`);
                }
            });
        }
        return result;
    }
    expExpression(ctx, exc) {
        let result = this.visit(ctx.base, exc);
        if (ctx.exponent) {
            ctx.exponent.forEach((expOperand, i) => {
                let exponent = this.visit(expOperand, exc);
                result = exc.buildBinaryOperation('exp', result, exponent);
            });
        }
        return result;
    }
    vectorExpression(ctx, exc) {
        let result = this.visit(ctx.expression, exc);
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
    atomicExpression(ctx, exc) {
        let result;
        if (ctx.expression) {
            result = this.visit(ctx.expression, exc);
        }
        else if (ctx.symbol) {
            const symbol = ctx.symbol[0].image;
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
    literalExpression(ctx, field) {
        let result = this.visit(ctx.lhs, field);
        if (ctx.rhs) {
            ctx.rhs.forEach((rhsOperand, i) => {
                let rhsValue = this.visit(rhsOperand, field);
                let operator = ctx.AddOp[i];
                if (chevrotain_1.tokenMatcher(operator, lexer_1.Plus)) {
                    result = field ? field.add(result, rhsValue) : (result + rhsValue);
                }
                else if (chevrotain_1.tokenMatcher(operator, lexer_1.Minus)) {
                    result = field ? field.sub(result, rhsValue) : (result - rhsValue);
                }
            });
        }
        return result;
    }
    literalMulExpression(ctx, field) {
        let result = this.visit(ctx.lhs, field);
        if (ctx.rhs) {
            ctx.rhs.forEach((rhsOperand, i) => {
                let rhsValue = this.visit(rhsOperand, field);
                let operator = ctx.MulOp[i];
                if (chevrotain_1.tokenMatcher(operator, lexer_1.Star)) {
                    result = field ? field.mul(result, rhsValue) : (result * rhsValue);
                }
                else if (chevrotain_1.tokenMatcher(operator, lexer_1.Slash)) {
                    result = field ? field.div(result, rhsValue) : (result / rhsValue);
                }
                else if (chevrotain_1.tokenMatcher(operator, lexer_1.Pound)) {
                    throw new Error('Matrix multiplication is supported for literal expressions');
                }
            });
        }
        return result;
    }
    literalExpExpression(ctx, field) {
        let result = this.visit(ctx.base, field);
        if (ctx.exponent) {
            ctx.exponent.forEach((expOperand) => {
                let expValue = this.visit(expOperand, field);
                result = field ? field.exp(result, expValue) : (result ** expValue);
            });
        }
        return result;
    }
    literalAtomicExpression(ctx, field) {
        let result;
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
    literalRangeExpression(ctx) {
        let start = Number.parseInt(ctx.start[0].image, 10);
        let end = ctx.end ? Number.parseInt(ctx.end[0].image, 10) : start;
        return [start, end];
    }
}
// EXPORT VISITOR INSTANCE
// ================================================================================================
exports.visitor = new AirVisitor();
// HELPER FUNCTIONS
// ================================================================================================
function validateScriptSections(ctx) {
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
//# sourceMappingURL=visitor.js.map