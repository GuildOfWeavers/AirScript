"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chevrotain_1 = require("chevrotain");
const parser_1 = require("./parser");
const lexer_1 = require("./lexer");
const Module_1 = require("./Module");
const ExecutionTemplate_1 = require("./ExecutionTemplate");
const utils_1 = require("./utils");
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
    script(ctx, componentName = 'default') {
        validateScriptSections(ctx);
        // build module
        const moduleName = ctx.starkName[0].image;
        const modulus = this.visit(ctx.fieldDeclaration);
        const traceRegisterCount = Number(ctx.traceRegisterCount[0].image);
        const constraintCount = Number(ctx.constraintCount[0].image);
        const aModule = new Module_1.Module(moduleName, modulus, traceRegisterCount, constraintCount);
        // parse and add constants, inputs, and static registers to the module
        if (ctx.moduleConstants) {
            ctx.moduleConstants.forEach((element) => this.visit(element, aModule));
        }
        if (ctx.staticRegisters) {
            ctx.staticRegisters.forEach((element) => this.visit(element, aModule));
        }
        ctx.inputRegisters.forEach((element) => this.visit(element, aModule));
        // determine transition function structure and use it to create a component object
        const template = this.visit(ctx.transitionFunction, aModule);
        const component = aModule.createComponent(template);
        // parse transition function
        const exc = component.createExecutionContext('transition');
        const inits = template.loops.map(loop => this.visit(loop.init, exc));
        const segments = template.segments.map(segment => this.visit(segment.body, exc));
        component.setTransitionFunction(exc, inits, segments);
        // parse constraint evaluator
        this.visit(ctx.transitionConstraints, component);
        // finalize the component and return the schema
        aModule.setComponent(component, componentName);
        return aModule.schema;
    }
    // FINITE FIELD
    // --------------------------------------------------------------------------------------------
    fieldDeclaration(ctx) {
        const modulus = this.visit(ctx.modulus);
        return BigInt(modulus);
    }
    // MODULE CONSTANTS
    // --------------------------------------------------------------------------------------------
    constantDeclaration(ctx, aModule) {
        const name = ctx.constantName[0].image;
        let value;
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
    // INPUT AND STATIC REGISTERS
    // --------------------------------------------------------------------------------------------
    inputDeclaration(ctx, aModule) {
        const scope = ctx.scope[0].image;
        const inputName = ctx.name[0].image;
        const registerCount = Number(ctx.width[0].image);
        const inputRank = ctx.rank ? Number(ctx.rank[0].image) : 0;
        const binary = ctx.boolean ? true : false;
        aModule.addInput(inputName, registerCount, inputRank, scope, binary);
    }
    staticDeclaration(ctx, aModule) {
        const registerName = ctx.name[0].image;
        const values = ctx.values.map((v) => this.visit(v));
        // TODO: handle parsing of PRNG sequences
        aModule.addStatic(registerName, values);
    }
    // TRANSITION FUNCTION AND CONSTRAINTS
    // --------------------------------------------------------------------------------------------
    transitionFunction(ctx, aModule) {
        const template = new ExecutionTemplate_1.ExecutionTemplate(aModule.field);
        this.visit(ctx.inputBlock, template);
        return template;
    }
    transitionConstraints(ctx, component) {
        if (ctx.allStepBlock) {
            const exc = component.createExecutionContext('evaluation');
            const result = this.visit(ctx.allStepBlock, exc);
            component.setConstraintEvaluator(exc, result);
        }
        else {
            const template = new ExecutionTemplate_1.ExecutionTemplate(component.field);
            this.visit(ctx.inputBlock, template);
            const exc = component.createExecutionContext('evaluation');
            const inits = template.loops.map(loop => this.visit(loop.init, exc));
            const segments = template.segments.map(segment => this.visit(segment.body, exc));
            component.setConstraintEvaluator(exc, inits, segments);
        }
    }
    // LOOPS
    // --------------------------------------------------------------------------------------------
    inputBlock(ctx, template) {
        const inputs = ctx.inputs.map((register) => register.image);
        template.addLoop(inputs, ctx.initExpression);
        // parse body expression
        if (ctx.inputBlock) {
            this.visit(ctx.inputBlock, template);
        }
        else {
            ctx.segmentLoops.map((loop) => this.visit(loop, template));
        }
    }
    transitionInit(ctx, template) {
        return this.visit(ctx.expression, template);
    }
    segmentLoop(ctx, template) {
        const intervals = ctx.ranges.map((range) => this.visit(range));
        template.addSegment(intervals, ctx.body);
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
        const symbol = ctx.value[0].image;
        const result = exc.getSymbolReference(symbol);
        return result;
    }
    // TRANSITION CALL EXPRESSION
    // --------------------------------------------------------------------------------------------
    transitionCall(ctx, exc) {
        const registers = ctx.registers[0].image;
        if (registers !== '$r') {
            throw new Error(`expected transition function to be invoked with $r parameter, but received ${registers} parameter`);
        }
        const params = [
            exc.base.buildLoadExpression('load.param', utils_1.ProcedureParams.thisTraceRow),
            exc.base.buildLoadExpression('load.param', utils_1.ProcedureParams.staticRow)
        ];
        return exc.buildFunctionCall('transition', params);
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
//# sourceMappingURL=visitor.js.map