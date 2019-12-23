"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// IMPORTS
// ================================================================================================
const air_assembly_1 = require("@guildofweavers/air-assembly");
const chevrotain_1 = require("chevrotain");
const parser_1 = require("./parser");
const lexer_1 = require("./lexer");
const ExecutionContext_1 = require("./ExecutionContext");
const expressions_1 = require("./expressions");
const expressions = require("./expressions");
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
    script(ctx) {
        const starkName = ctx.starkName[0].image;
        validateScriptSections(ctx);
        // build schema object
        const modulus = this.visit(ctx.fieldDeclaration);
        const schema = new air_assembly_1.AirSchema('prime', modulus);
        // parse constants
        ctx.moduleConstants && ctx.moduleConstants.map((element) => {
            const constant = this.visit(element, schema.field);
            schema.addConstant(constant.value, `$${constant.name}`);
        });
        const registers = this.visit(ctx.stateRegisterCount);
        const constraints = this.visit(ctx.constraintCount);
        const component = schema.createComponent(starkName, registers, constraints, 64);
        /*
        // build script specs
        const specs = new ScriptSpecs(starkName, field, config.limits);
        specs.setInputRegisterCount(this.visit(ctx.inputRegisterCount));
        specs.setStaticRegisterCount(this.visit(ctx.staticRegisterCount));

        // build input and static registers
        specs.setInputRegisters(this.visit(ctx.inputRegisters) || []);
        specs.setStaticRegisters(this.visit(ctx.staticRegisters, specs) || []);

        // parse transition function and transition constraints
        specs.setTransitionFunction(this.visit(ctx.transitionFunction, specs));
        specs.setTransitionConstraints(this.visit(ctx.transitionConstraints, specs));
        */
        return schema;
    }
    // FINITE FIELD
    // --------------------------------------------------------------------------------------------
    fieldDeclaration(ctx) {
        const modulus = this.visit(ctx.modulus);
        return BigInt(modulus);
    }
    // MODULE CONSTANTS
    // --------------------------------------------------------------------------------------------
    constantDeclaration(ctx, field) {
        const name = ctx.constantName[0].image;
        let value;
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
        const registerNames = new Set();
        const registers = [];
        ctx.registers.forEach((declaration) => {
            let register = this.visit(declaration, specs);
            if (registerNames.has(register.name)) {
                throw new Error(`input register ${register.name} is defined more than once`);
            }
            registerNames.add(register.name);
            if (register.index !== registers.length) {
                throw new Error(`input register ${register.name} is defined out of order`);
            }
            registers.push(register);
        });
        return registers;
    }
    inputRegisterDefinition(ctx) {
        const registerName = ctx.name[0].image;
        const registerIndex = Number.parseInt(registerName.slice(2), 10);
        const pattern = ctx.pattern[0].image;
        const binary = ctx.binary ? true : false;
        const rank = Number.parseInt(ctx.rank[0].image, 10);
        return { name: registerName, index: registerIndex, pattern, binary, rank, secret: true }; // TODO
    }
    // STATIC REGISTERS
    // --------------------------------------------------------------------------------------------
    staticRegisters(ctx, specs) {
        const registerNames = new Set();
        const registers = [];
        if (ctx.registers) {
            ctx.registers.forEach((declaration) => {
                let register = this.visit(declaration, specs);
                if (registerNames.has(register.name)) {
                    throw new Error(`static register ${register.name} is defined more than once`);
                }
                registerNames.add(register.name);
                if (register.index !== registers.length) {
                    throw new Error(`static register ${register.name} is defined out of order`);
                }
                registers.push(register);
            });
        }
        return registers;
    }
    staticRegisterDefinition(ctx, specs) {
        const registerName = ctx.name[0].image;
        const registerIndex = Number.parseInt(registerName.slice(2), 10);
        const pattern = ctx.pattern[0].image;
        const binary = ctx.binary ? true : false;
        const values = this.visit(ctx.values);
        if (!utils_1.isPowerOf2(values.length)) {
            throw new Error(`invalid definition for static register ${registerName}: number of values must be a power of 2`);
        }
        if (binary) {
            for (let value of values) {
                if (value !== specs.field.zero && value !== specs.field.one) {
                    throw new Error(`invalid definition for static register ${registerName}: the register cannot contain non-binary values`);
                }
            }
        }
        return { name: registerName, index: registerIndex, pattern, binary, values, secret: false };
    }
    // TRANSITION FUNCTION AND CONSTRAINTS
    // --------------------------------------------------------------------------------------------
    transitionFunction(ctx, specs) {
        const exc = new ExecutionContext_1.ExecutionContext(specs);
        const inputBlock = this.visit(ctx.inputBlock, exc);
        const result = new expressions_1.TransitionFunctionBody(inputBlock);
        return result;
    }
    transitionConstraints(ctx, specs) {
        const exc = new ExecutionContext_1.ExecutionContext(specs);
        let root;
        if (ctx.allStepBlock) {
            root = this.visit(ctx.allStepBlock, exc);
        }
        else {
            root = this.visit(ctx.inputBlock, exc);
        }
        return new expressions_1.TransitionConstraintsBody(root, specs.inputBlock);
    }
    // LOOPS
    // --------------------------------------------------------------------------------------------
    inputBlock(ctx, exc) {
        const registers = ctx.registers.map((register) => register.image);
        const controlIndex = exc.addLoopFrame(registers);
        // parse init expression
        const initExpression = this.visit(ctx.initExpression, exc);
        // parse body expression
        let bodyExpression;
        if (ctx.inputBlock) {
            bodyExpression = this.visit(ctx.inputBlock, exc);
        }
        else {
            const loops = ctx.segmentLoops.map((loop) => this.visit(loop, exc));
            bodyExpression = new expressions_1.SegmentLoopBlock(loops);
        }
        const indexSet = new Set(registers.map(register => Number.parseInt(register.slice(2))));
        const controller = exc.getControlReference(controlIndex);
        return new expressions_1.InputBlock(controlIndex, initExpression, bodyExpression, indexSet, controller);
    }
    transitionInit(ctx, exc) {
        return this.visit(ctx.expression, exc);
    }
    segmentLoop(ctx, exc) {
        const intervals = ctx.ranges.map((range) => this.visit(range));
        const controlIndex = exc.addLoopFrame();
        const body = this.visit(ctx.body, exc);
        const controller = exc.getControlReference(controlIndex);
        return new expressions_1.SegmentLoop(body, intervals, controller);
    }
    // STATEMENTS
    // --------------------------------------------------------------------------------------------
    statementBlock(ctx, exc) {
        let statements;
        if (ctx.statements) {
            statements = ctx.statements.map((stmt) => this.visit(stmt, exc));
        }
        let out = this.visit(ctx.expression, exc);
        if (ctx.constraint) {
            if (exc.inTransitionFunction) {
                throw new Error('comparison operator cannot be used in transition function');
            }
            const constraint = this.visit(ctx.constraint, exc);
            out = expressions.BinaryOperation.sub(constraint, out);
        }
        return new expressions_1.StatementBlock(out, statements);
    }
    statement(ctx, exc) {
        const expression = this.visit(ctx.expression, exc);
        const variable = exc.setVariableAssignment(ctx.variableName[0].image, expression);
        return { variable: variable.symbol, expression };
    }
    assignableExpression(ctx, exc) {
        return this.visit(ctx.expression, exc);
    }
    // WHEN...ELSE EXPRESSION
    // --------------------------------------------------------------------------------------------
    whenExpression(ctx, exc) {
        const id = exc.getNextConditionalBlockId();
        const condition = this.visit(ctx.condition, exc);
        // build subroutines for true and false conditions
        exc.createNewVariableFrame();
        const tBlock = this.visit(ctx.tExpression, exc);
        exc.destroyVariableFrame();
        exc.createNewVariableFrame();
        const fBlock = this.visit(ctx.fExpression, exc);
        exc.destroyVariableFrame();
        return new expressions.WhenExpression(id, condition, tBlock, fBlock);
    }
    whenCondition(ctx, exc) {
        const registerName = ctx.register[0].image;
        const registerRef = exc.getSymbolReference(registerName);
        // make sure the condition register holds only binary values
        if (!exc.isBinaryRegister(registerName)) {
            throw new Error(`conditional expression must be based on a binary register`);
        }
        return registerRef;
    }
    // TRANSITION CALL EXPRESSION
    // --------------------------------------------------------------------------------------------
    transitionCall(ctx, exc) {
        const registers = ctx.registers[0].image;
        if (registers !== '$r') {
            throw new Error(`expected transition function to be invoked with $r parameter, but received ${registers} parameter`);
        }
        return exc.getTransitionFunctionCall();
    }
    // VECTORS AND MATRIXES
    // --------------------------------------------------------------------------------------------
    vector(ctx, exc) {
        const elements = ctx.elements.map((e) => this.visit(e, exc));
        return new expressions.CreateVector(elements);
    }
    vectorDestructuring(ctx, exc) {
        const vector = this.visit(ctx.vector, exc);
        return new expressions.DestructureVector(vector);
    }
    matrix(ctx, exc) {
        const elements = ctx.rows.map((r) => this.visit(r, exc));
        return new expressions.CreateMatrix(elements);
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
                    result = expressions.BinaryOperation.add(result, rhs);
                }
                else if (chevrotain_1.tokenMatcher(opToken, lexer_1.Minus)) {
                    result = expressions.BinaryOperation.sub(result, rhs);
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
                    result = expressions.BinaryOperation.mul(result, rhs);
                }
                else if (chevrotain_1.tokenMatcher(opToken, lexer_1.Slash)) {
                    result = expressions.BinaryOperation.div(result, rhs);
                }
                else if (chevrotain_1.tokenMatcher(opToken, lexer_1.Pound)) {
                    result = expressions.BinaryOperation.prod(result, rhs);
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
                result = expressions.BinaryOperation.exp(result, exponent);
            });
        }
        return result;
    }
    vectorExpression(ctx, exc) {
        let result = this.visit(ctx.expression, exc);
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
            const value = ctx.literal[0].image;
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