"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chevrotain_1 = require("chevrotain");
const parser_1 = require("./parser");
const lexer_1 = require("./lexer");
const ExecutionLane_1 = require("./ExecutionLane");
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
        const registers = Number(ctx.stateRegisterCount[0].image);
        const constraints = Number(ctx.constraintCount[0].image);
        const exLane = this.visit(ctx.transitionFunction);
        const context = new ModuleContext_1.ModuleContext(moduleName, modulus, registers, constraints, exLane);
        // parse constants
        if (ctx.moduleConstants) {
            ctx.moduleConstants.forEach((element) => this.visit(element, context));
        }
        // parse input and static registers
        this.visit(ctx.inputRegisters, context);
        this.visit(ctx.staticRegisters, context);
        // parse transition function
        const exc = context.createExecutionContext('transition');
        const segments = [];
        const inits = [];
        exLane.inputs.forEach(input => inits.push(this.visit(input.initializer, exc)));
        exLane.segments.forEach(segment => segments.push(this.visit(segment.body, exc)));
        context.setTransitionFunction(exc, inits, segments);
        /*
        specs.setTransitionConstraints(this.visit(ctx.transitionConstraints, specs));
        */
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
    inputRegisters(ctx, exc) {
        const registerNames = new Set();
        ctx.registers.forEach((declaration) => {
            let registerName = this.visit(declaration, exc);
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
    inputRegisterDefinition(ctx, exc) {
        const scope = ctx.scope[0].image;
        const registerName = ctx.name[0].image;
        const binary = ctx.binary ? true : false;
        exc.addInput(registerName, scope, binary, ctx.parent);
        return registerName;
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
        const regCount = Number(ctx.registerCount[0].image);
        if (regCount !== registerNames.size) {
            throw new Error(`expected ${regCount} static registers, but ${registerNames.size} registers were defined`);
        }
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
        const lane = new ExecutionLane_1.ExecutionLane();
        this.visit(ctx.inputBlock, lane);
        return lane;
    }
    transitionConstraints(ctx, exc) {
        /*
        const exc = new ExecutionContext(specs);
        let root: Expression;
        if (ctx.allStepBlock) {
            root = this.visit(ctx.allStepBlock, exc);
        }
        else {
            root = this.visit(ctx.inputBlock, exc);
        }
        return new TransitionConstraintsBody(root, specs.inputBlock);
        */
    }
    // LOOPS
    // --------------------------------------------------------------------------------------------
    inputBlock(ctx, lane) {
        const registers = ctx.registers.map((register) => register.image);
        lane.addInputs(registers, ctx.initExpression);
        // parse body expression
        if (ctx.inputBlock) {
            this.visit(ctx.inputBlock, lane);
        }
        else {
            ctx.segmentLoops.map((loop) => this.visit(loop, lane));
        }
    }
    transitionInit(ctx, exc) {
        return this.visit(ctx.expression, exc);
    }
    segmentLoop(ctx, lane) {
        const intervals = ctx.ranges.map((range) => this.visit(range));
        lane.addSegment(intervals, ctx.body);
    }
    // STATEMENTS
    // --------------------------------------------------------------------------------------------
    statementBlock(ctx, exc) {
        exc.enterBlock();
        let statements = [];
        if (ctx.statements) {
            ctx.statements.forEach((stmt) => statements.push(this.visit(stmt, exc)));
        }
        let out = this.visit(ctx.expression, exc);
        /*
        TODO
        if (ctx.constraint) {
            if (exc.inTransitionFunction) {
                throw new Error('comparison operator cannot be used in transition function');
            }
            const constraint: Expression = this.visit(ctx.constraint, exc);
            out = expressions.BinaryOperation.sub(constraint, out);
        }
        */
        statements.push(exc.setVariableAssignment(`block${exc.currentBlock.id}_result`, out));
        exc.exitBlock();
        return statements;
    }
    statement(ctx, exc) {
        const expression = this.visit(ctx.expression, exc);
        return exc.setVariableAssignment(ctx.variableName[0].image, expression);
    }
    assignableExpression(ctx, exc) {
        return this.visit(ctx.expression, exc);
    }
    // WHEN...ELSE EXPRESSION
    // --------------------------------------------------------------------------------------------
    whenExpression(ctx, exc) {
        /*
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
        */
        return undefined; // TODO
    }
    whenCondition(ctx, exc) {
        /*
        const registerName: string = ctx.register[0].image;
        const registerRef = exc.getSymbolReference(registerName);

        // make sure the condition register holds only binary values
        if (!exc.isBinaryRegister(registerName)) {
            throw new Error(`conditional expression must be based on a binary register`);
        }

        return registerRef;
        */
        return undefined; // TODO
    }
    // TRANSITION CALL EXPRESSION
    // --------------------------------------------------------------------------------------------
    transitionCall(ctx, exc) {
        const registers = ctx.registers[0].image;
        if (registers !== '$r') {
            throw new Error(`expected transition function to be invoked with $r parameter, but received ${registers} parameter`);
        }
        return undefined; // TODO
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