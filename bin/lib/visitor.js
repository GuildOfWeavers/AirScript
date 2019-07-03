"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const galois_1 = require("@guildofweavers/galois");
const chevrotain_1 = require("chevrotain");
const parser_1 = require("./parser");
const lexer_1 = require("./lexer");
const ScriptSpecs_1 = require("./ScriptSpecs");
const StatementContext_1 = require("./StatementContext");
const operations_1 = require("./operations");
const utils_1 = require("./utils");
// MODULE VARIABLES
// ================================================================================================
const BaseCstVisitor = parser_1.parser.getBaseCstVisitorConstructor();
class AirVisitor extends BaseCstVisitor {
    constructor() {
        super();
        this.validateVisitor();
    }
    script(ctx, limits) {
        const starkName = ctx.starkName[0].image;
        // set up the field
        const field = this.visit(ctx.fieldDeclaration);
        // build global constants
        const globalConstants = {};
        const globalConstantMap = new Map();
        if (ctx.globalConstants) {
            for (let i = 0; i < ctx.globalConstants.length; i++) {
                let constant = this.visit(ctx.globalConstants[i]);
                if (globalConstantMap.has(constant.name)) {
                    throw new Error(`Global constant '${constant.name}' is defined more than once`);
                }
                globalConstants[constant.name] = constant.value;
                globalConstantMap.set(constant.name, constant.dimensions);
            }
        }
        // build script specs
        const specs = new ScriptSpecs_1.ScriptSpecs(limits);
        specs.setField(field);
        specs.setSteps(this.visit(ctx.steps));
        specs.setMutableRegisterCount(this.visit(ctx.mutableRegisterCount));
        specs.setReadonlyRegisterCount(this.visit(ctx.readonlyRegisterCount));
        specs.setConstraintCount(this.visit(ctx.constraintCount));
        specs.setMaxConstraintDegree(this.visit(ctx.maxConstraintDegree));
        specs.setGlobalConstants(globalConstantMap);
        // build transition function
        validateTransitionFunction(ctx.transitionFunction);
        const tFunction = this.visit(ctx.transitionFunction, specs);
        // build transition constraint evaluator
        validateTransitionConstraints(ctx.transitionConstraints);
        const tConstraintEvaluator = this.visit(ctx.transitionConstraints, specs);
        // build readonly registers
        let readonlyRegisters = [];
        if (specs.readonlyRegisterCount > 0) {
            validateReadonlyRegisterDefinitions(ctx.readonlyRegisters);
            readonlyRegisters = this.visit(ctx.readonlyRegisters, specs);
        }
        // build and return stark config
        return {
            name: starkName,
            field: field,
            steps: specs.steps,
            mutableRegisterCount: specs.mutableRegisterCount,
            constraintCount: specs.constraintCount,
            transitionFunction: tFunction.bind(field),
            constraintEvaluator: tConstraintEvaluator.bind(field),
            maxConstraintDegree: specs.maxConstraintDegree,
            readonlyRegisters: readonlyRegisters,
            globalConstants: globalConstants
        };
    }
    // FINITE FIELD
    // --------------------------------------------------------------------------------------------
    fieldDeclaration(ctx) {
        const modulus = this.visit(ctx.modulus);
        return new galois_1.PrimeField(modulus);
    }
    // GLOBAL CONSTANTS
    // --------------------------------------------------------------------------------------------
    constantDeclaration(ctx) {
        const name = ctx.constantName[0].image;
        let value;
        let dimensions;
        if (ctx.value) {
            value = this.visit(ctx.value);
            dimensions = [0, 0];
        }
        else if (ctx.vector) {
            value = this.visit(ctx.vector);
            dimensions = [value.length, 0];
        }
        else if (ctx.matrix) {
            value = this.visit(ctx.matrix);
            dimensions = [value.length, value[0].length];
        }
        else {
            throw new Error(`Failed to parse the value of global constant '${name}'`);
        }
        utils_1.validateVariableName(name, dimensions);
        return { name, value, dimensions };
    }
    literalVector(ctx) {
        const vector = new Array(ctx.elements.length);
        for (let i = 0; i < ctx.elements.length; i++) {
            let element = this.visit(ctx.elements[i]);
            vector[i] = element;
        }
        return vector;
    }
    literalMatrix(ctx) {
        let colCount = 0;
        const rowCount = ctx.rows.length;
        const matrix = new Array(rowCount);
        for (let i = 0; i < rowCount; i++) {
            let row = this.visit(ctx.rows[i]);
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
    literalMatrixRow(ctx) {
        const row = new Array(ctx.elements.length);
        for (let i = 0; i < ctx.elements.length; i++) {
            let element = this.visit(ctx.elements[i]);
            row[i] = element;
        }
        return row;
    }
    // READONLY REGISTERS
    // --------------------------------------------------------------------------------------------
    readonlyRegisters(ctx, specs) {
        if (ctx.registers.length > specs.readonlyRegisterCount) {
            throw new Error(`Too many readonly register definitions: exactly ${specs.readonlyRegisterCount} registers must be defined`);
        }
        else if (ctx.registers.length < specs.readonlyRegisterCount) {
            throw new Error(`Missing readonly register definitions: exactly ${specs.readonlyRegisterCount} registers must be defined`);
        }
        const registers = [];
        const registerNames = new Set();
        for (let i = 0; i < ctx.registers.length; i++) {
            let register = this.visit(ctx.registers[i], specs);
            if (registerNames.has(register.name)) {
                throw new Error(`Readonly register ${register.name} is defined more than once`);
            }
            registerNames.add(register.name);
            let registerIndex = Number.parseInt(register.name.slice(2), 10);
            registers[registerIndex] = { pattern: register.pattern, values: register.values };
        }
        return registers;
    }
    readonlyRegisterDefinition(ctx, specs) {
        const registerName = ctx.name[0].image;
        const registerIndex = Number.parseInt(registerName.slice(2), 10);
        if (registerIndex >= specs.readonlyRegisterCount) {
            throw new Error(`Invalid readonly register definition ${registerName}: register index must be smaller than ${specs.readonlyRegisterCount}`);
        }
        const pattern = ctx.pattern[0].image;
        const values = this.visit(ctx.values);
        if (specs.steps % values.length !== 0) {
            throw new Error(`Invalid definition for readonly register ${registerName}: number of values must evenly divide the number of steps (${specs.steps})`);
        }
        return { name: registerName, pattern, values };
    }
    // TRANSITION FUNCTION AND CONSTRAINTS
    // --------------------------------------------------------------------------------------------
    transitionFunction(ctx, specs) {
        const sc = new StatementContext_1.StatementContext(specs.globalConstants, specs.mutableRegisterCount, specs.readonlyRegisterCount, false);
        const statements = this.visit(ctx.statements, sc);
        if (statements.outputSize !== sc.mutableRegisterCount) {
            if (sc.mutableRegisterCount === 1) {
                throw new Error(`Transition function must evaluate to exactly 1 value`);
            }
            else {
                throw new Error(`Transition function must evaluate to a vector of exactly ${sc.mutableRegisterCount} values`);
            }
        }
        return new Function('r', 'k', 'g', 'out', statements.code);
    }
    transitionConstraints(ctx, specs) {
        const sc = new StatementContext_1.StatementContext(specs.globalConstants, specs.mutableRegisterCount, specs.readonlyRegisterCount, true);
        const statements = this.visit(ctx.statements, sc);
        if (statements.outputSize !== specs.constraintCount) {
            if (specs.constraintCount === 1) {
                throw new Error(`Transition constraints must evaluate to exactly 1 value`);
            }
            else {
                throw new Error(`Transition constraints must evaluate to a vector of exactly ${specs.constraintCount} values`);
            }
        }
        return new Function('r', 'n', 'k', 'g', 'out', statements.code);
    }
    // STATEMENTS
    // --------------------------------------------------------------------------------------------
    statementBlock(ctx, sc) {
        let code = '';
        if (ctx.statements) {
            for (let i = 0; i < ctx.statements.length; i++) {
                let statement = this.visit(ctx.statements[i], sc);
                let expression = statement.expression;
                let variable = sc.buildVariableAssignment(statement.variable, expression.dimensions);
                code += `${variable.code} = ${expression.code};\n`;
            }
        }
        const out = this.visit(ctx.outStatement, sc);
        code += out.code;
        return { code, outputSize: out.dimensions[0] };
    }
    statement(ctx, sc) {
        const variable = ctx.variableName[0].image;
        const expression = this.visit(ctx.expression, sc);
        return { variable, expression };
    }
    outStatement(ctx, sc) {
        let code = '', dimensions;
        if (ctx.expression) {
            const expression = this.visit(ctx.expression, sc);
            if (utils_1.isScalar(expression.dimensions)) {
                code = `out[0] = ${expression.code};\n`;
                dimensions = [1, 0];
            }
            else if (utils_1.isVector(expression.dimensions)) {
                dimensions = expression.dimensions;
                code = `_out = ${expression.code};\n`;
                for (let i = 0; i < dimensions[0]; i++) {
                    code += `out[${i}] = _out[${i}];\n`;
                }
            }
            else {
                throw new Error('Out statement must evaluate either to a scalar or to a vector');
            }
        }
        else {
            dimensions = [ctx.expressions.length, 0];
            for (let i = 0; i < ctx.expressions.length; i++) {
                let expression = this.visit(ctx.expressions[i], sc);
                if (!utils_1.isScalar(expression.dimensions)) {
                    throw new Error(`Out vector elements must be scalars`);
                }
                code += `out[${i}] = ${expression.code};\n`;
            }
        }
        return { code, dimensions };
    }
    // VECTORS AND MATRIXES
    // --------------------------------------------------------------------------------------------
    vector(ctx, sc) {
        const dimensions = [ctx.elements.length, 0];
        let code = `[`;
        for (let i = 0; i < ctx.elements.length; i++) {
            let element = this.visit(ctx.elements[i], sc);
            if (!utils_1.isScalar(element.dimensions)) {
                if (utils_1.isVector(element.dimensions) && element.destructured) {
                    dimensions[0] += (element.dimensions[0] - 1);
                }
                else {
                    throw new Error('Vector elements must be scalars');
                }
            }
            code += `${element.code}, `;
        }
        code = code.slice(0, -2) + ']';
        return { dimensions, code };
    }
    vectorDestructuring(ctx, sc) {
        const variableName = ctx.vectorName[0].image;
        const element = sc.buildVariableReference(variableName);
        if (utils_1.isScalar(element.dimensions)) {
            throw new Error(`Cannot expand scalar variable '${variableName}'`);
        }
        else if (utils_1.isMatrix(element.dimensions)) {
            throw new Error(`Cannot expand matrix variable '${variableName}'`);
        }
        return {
            code: `...${element.code}`,
            dimensions: element.dimensions,
            destructured: true
        };
    }
    matrix(ctx, sc) {
        const rowCount = ctx.rows.length;
        let colCount = 0;
        let code = `[`;
        for (let i = 0; i < rowCount; i++) {
            let row = this.visit(ctx.rows[i], sc);
            if (colCount === 0) {
                colCount = row.dimensions[0];
            }
            else if (colCount !== row.dimensions[0]) {
                throw new Error('All matrix rows must have the same number of columns');
            }
            code += `${row.code}, `;
        }
        code = code.slice(0, -2) + ']';
        return { dimensions: [rowCount, colCount], code };
    }
    matrixRow(ctx, sc) {
        const dimensions = [ctx.elements.length, 0];
        let code = `[`;
        for (let i = 0; i < ctx.elements.length; i++) {
            let element = this.visit(ctx.elements[i], sc);
            if (!utils_1.isScalar(element.dimensions))
                throw new Error('Matrix elements must be scalars');
            code += `${element.code}, `;
        }
        code = code.slice(0, -2) + ']';
        return { dimensions, code };
    }
    // EXPRESSIONS
    // --------------------------------------------------------------------------------------------
    expression(ctx, sc) {
        return this.visit(ctx.addExpression, sc);
    }
    addExpression(ctx, sc) {
        let result = this.visit(ctx.lhs, sc);
        if (ctx.rhs) {
            ctx.rhs.forEach((rhsOperand, i) => {
                let rhs = this.visit(rhsOperand, sc);
                let opHandler = operations_1.getOperationHandler(ctx.AddOp[i]);
                let dimensions = opHandler.getDimensions(result.dimensions, rhs.dimensions);
                let code = opHandler.getCode(result, rhs);
                result = { code, dimensions };
            });
        }
        return result;
    }
    mulExpression(ctx, sc) {
        let result = this.visit(ctx.lhs, sc);
        if (ctx.rhs) {
            ctx.rhs.forEach((rhsOperand, i) => {
                let rhs = this.visit(rhsOperand, sc);
                let opHandler = operations_1.getOperationHandler(ctx.MulOp[i]);
                let dimensions = opHandler.getDimensions(result.dimensions, rhs.dimensions);
                let code = opHandler.getCode(result, rhs);
                result = { code, dimensions };
            });
        }
        return result;
    }
    expExpression(ctx, sc) {
        let result = this.visit(ctx.lhs, sc);
        if (ctx.rhs) {
            ctx.rhs.forEach((rhsOperand, i) => {
                let rhs = this.visit(rhsOperand, sc);
                let opHandler = operations_1.getOperationHandler(ctx.ExpOp[i]);
                let dimensions = opHandler.getDimensions(result.dimensions, rhs.dimensions);
                let code = opHandler.getCode(result, rhs);
                result = { code, dimensions };
            });
        }
        return result;
    }
    atomicExpression(ctx, sc) {
        if (ctx.parenExpression) {
            return this.visit(ctx.parenExpression, sc);
        }
        else if (ctx.conditionalExpression) {
            return this.visit(ctx.conditionalExpression, sc);
        }
        else if (ctx.Identifier) {
            const variable = ctx.Identifier[0].image;
            return sc.buildVariableReference(variable);
        }
        else if (ctx.MutableRegister) {
            const register = ctx.MutableRegister[0].image;
            return { code: sc.buildRegisterReference(register), dimensions: [0, 0] };
        }
        else if (ctx.ReadonlyRegister) {
            const register = ctx.ReadonlyRegister[0].image;
            return { code: sc.buildRegisterReference(register), dimensions: [0, 0] };
        }
        else if (ctx.IntegerLiteral) {
            const value = ctx.IntegerLiteral[0].image;
            return { code: `${value}n`, dimensions: [0, 0] };
        }
        else {
            throw new Error('Invalid expression syntax');
        }
    }
    parenExpression(ctx, sc) {
        return this.visit(ctx.expression, sc);
    }
    conditionalExpression(ctx, sc) {
        const registerName = ctx.register[0].image;
        const registerRef = sc.buildRegisterReference(registerName);
        // TODO: check if the register is binary?
        // create expressions for k and for (1 - k)
        const scalarDim = [0, 0];
        const regExpression = { code: registerRef, dimensions: scalarDim };
        const oneExpression = { code: 'this.one', dimensions: scalarDim };
        const oneMinusReg = {
            code: operations_1.subtraction.getCode(oneExpression, regExpression),
            dimensions: scalarDim
        };
        // get expressions for true and false options
        const tExpression = this.visit(ctx.tExpression, sc);
        const dimensions = tExpression.dimensions;
        const fExpression = this.visit(ctx.fExpression, sc);
        if (!utils_1.areSameDimension(dimensions, fExpression.dimensions)) {
            throw new Error('Conditional expression options must have the same dimensions');
        }
        // compute tExpression * k + fExpression * (1 - k)
        const tCode = operations_1.multiplication.getCode(tExpression, regExpression);
        const fCode = operations_1.multiplication.getCode(fExpression, oneMinusReg);
        const code = operations_1.addition.getCode({ code: tCode, dimensions }, { code: fCode, dimensions });
        return { dimensions, code };
    }
    // LITERAL EXPRESSIONS
    // --------------------------------------------------------------------------------------------
    literalExpression(ctx) {
        return this.visit(ctx.literalAddExpression);
    }
    literalAddExpression(ctx) {
        let result = this.visit(ctx.lhs);
        if (ctx.rhs) {
            ctx.rhs.forEach((rhsOperand, i) => {
                let rhsValue = this.visit(rhsOperand);
                let operator = ctx.AddOp[i];
                if (chevrotain_1.tokenMatcher(operator, lexer_1.Plus)) {
                    result = result + rhsValue;
                }
                else if (chevrotain_1.tokenMatcher(operator, lexer_1.Minus)) {
                    result = result - rhsValue;
                }
            });
        }
        return result;
    }
    literalMulExpression(ctx) {
        let result = this.visit(ctx.lhs);
        if (ctx.rhs) {
            ctx.rhs.forEach((rhsOperand, i) => {
                let rhsValue = this.visit(rhsOperand);
                let operator = ctx.MulOp[i];
                if (chevrotain_1.tokenMatcher(operator, lexer_1.Star)) {
                    result = result * rhsValue;
                }
                else if (chevrotain_1.tokenMatcher(operator, lexer_1.Slash)) {
                    result = result / rhsValue;
                }
                else if (chevrotain_1.tokenMatcher(operator, lexer_1.Pound)) {
                    throw new Error('Matrix multiplication is supported for literal expressions');
                }
            });
        }
        return result;
    }
    literalExpExpression(ctx) {
        let result = this.visit(ctx.lhs);
        if (ctx.rhs) {
            ctx.rhs.forEach((rhsOperand) => {
                let rhsValue = this.visit(rhsOperand);
                result = result ** rhsValue;
            });
        }
        return result;
    }
    literalAtomicExpression(ctx) {
        if (ctx.literalParenExpression) {
            return this.visit(ctx.literalParenExpression);
        }
        else if (ctx.IntegerLiteral) {
            return BigInt(ctx.IntegerLiteral[0].image);
        }
        else {
            throw new Error('Invalid expression syntax');
        }
    }
    literalParenExpression(ctx) {
        return this.visit(ctx.literalExpression);
    }
}
// EXPORT VISITOR INSTANCE
// ================================================================================================
exports.visitor = new AirVisitor();
// HELPER FUNCTIONS
// ================================================================================================
function validateTransitionFunction(value) {
    if (!value || value.length === 0) {
        throw new Error('Transition function is not defined');
    }
    else if (value.length > 1) {
        throw new Error('Transition function is defined more than once');
    }
}
function validateTransitionConstraints(value) {
    if (!value || value.length === 0) {
        throw new Error('Transition constraints are not defined');
    }
    else if (value.length > 1) {
        throw new Error('Transition constraints are defined more than once');
    }
}
function validateReadonlyRegisterDefinitions(value) {
    if (value.length > 1) {
        throw new Error('Readonly registers are defined more than once');
    }
}
//# sourceMappingURL=visitor.js.map