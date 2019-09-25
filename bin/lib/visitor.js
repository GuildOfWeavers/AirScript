"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const galois_1 = require("@guildofweavers/galois");
const chevrotain_1 = require("chevrotain");
const parser_1 = require("./parser");
const lexer_1 = require("./lexer");
const ScriptSpecs_1 = require("./ScriptSpecs");
const contexts_1 = require("./contexts");
const expressions_1 = require("./expressions");
const expressions = require("./expressions");
const utils_1 = require("./utils");
const generator_1 = require("./generator");
// MODULE VARIABLES
// ================================================================================================
const BaseCstVisitor = parser_1.parser.getBaseCstVisitorConstructor();
class AirVisitor extends BaseCstVisitor {
    constructor() {
        super();
        this.validateVisitor();
    }
    script(ctx, config) {
        const starkName = ctx.starkName[0].image;
        // set up the field
        const field = this.visit(ctx.fieldDeclaration, config.wasmOptions);
        // build script specs
        const specs = new ScriptSpecs_1.ScriptSpecs(config.limits);
        specs.setField(field);
        specs.setSteps(this.visit(ctx.steps));
        specs.setMutableRegisterCount(this.visit(ctx.mutableRegisterCount));
        specs.setReadonlyRegisterCount(this.visit(ctx.readonlyRegisterCount));
        specs.setConstraintCount(this.visit(ctx.constraintCount));
        if (ctx.staticConstants) {
            specs.setStaticConstants(ctx.staticConstants.map((element) => this.visit(element)));
        }
        // build readonly registers
        let readonlyRegisters;
        if (specs.readonlyRegisterCount > 0) {
            validateReadonlyRegisterDefinitions(ctx.readonlyRegisters);
            readonlyRegisters = this.visit(ctx.readonlyRegisters, specs);
        }
        else {
            readonlyRegisters = { staticRegisters: [], secretRegisters: [], publicRegisters: [] };
        }
        specs.setReadonlyRegisterCounts(readonlyRegisters);
        // instantiate code generator
        const generator = new generator_1.CodeGenerator(specs);
        // build transition function
        validateTransitionFunction(ctx.transitionFunction);
        const tFunctionBody = this.visit(ctx.transitionFunction, specs);
        const tFunction = generator.generateTransitionFunction(tFunctionBody);
        // build transition constraint evaluator
        validateTransitionConstraints(ctx.transitionConstraints);
        const tConstraintsBody = this.visit(ctx.transitionConstraints, specs);
        const tConstraints = generator.generateConstraintEvaluator(tConstraintsBody);
        // validate constraint valuator degrees
        const constraintSpecs = new Array(specs.constraintCount);
        for (let i = 0; i < constraintSpecs.length; i++) {
            let degree = typeof tConstraintsBody.degree === 'bigint'
                ? tConstraintsBody.degree
                : tConstraintsBody.degree[i];
            constraintSpecs[i] = { degree: specs.validateConstraintDegree(degree) };
        }
        // build and return AIR config
        return {
            name: starkName,
            field: field,
            steps: specs.steps,
            stateWidth: specs.mutableRegisterCount,
            secretInputs: readonlyRegisters.secretRegisters,
            publicInputs: readonlyRegisters.publicRegisters,
            staticRegisters: readonlyRegisters.staticRegisters,
            constraints: constraintSpecs,
            transitionFunction: tFunction,
            constraintEvaluator: tConstraints
        };
    }
    // FINITE FIELD
    // --------------------------------------------------------------------------------------------
    fieldDeclaration(ctx, wasmOptions) {
        const modulus = this.visit(ctx.modulus);
        return galois_1.createPrimeField(modulus, wasmOptions);
    }
    // STATIC CONSTANTS
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
            throw new Error(`Failed to parse the value of static constant '${name}'`);
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
        const registerNames = new Set();
        const staticRegisters = [];
        const secretRegisters = [];
        const publicRegisters = [];
        if (ctx.registers) {
            ctx.registers.forEach((declaration) => {
                let register = this.visit(declaration, specs);
                if (registerNames.has(register.name)) {
                    throw new Error(`readonly register ${register.name} is defined more than once`);
                }
                registerNames.add(register.name);
                let insertIndex;
                if (register.type === 'k') {
                    staticRegisters.push({ pattern: register.pattern, values: register.values, binary: register.binary });
                    insertIndex = staticRegisters.length - 1;
                }
                else if (register.type === 'p') {
                    publicRegisters.push({ pattern: register.pattern, binary: register.binary });
                    insertIndex = publicRegisters.length - 1;
                }
                else if (register.type === 's') {
                    secretRegisters.push({ pattern: register.pattern, binary: register.binary });
                    insertIndex = secretRegisters.length - 1;
                }
                if (register.index !== insertIndex) {
                    throw new Error(`readonly register ${register.name} is declared out of order`);
                }
            });
        }
        return { staticRegisters, secretRegisters, publicRegisters };
    }
    readonlyRegisterDefinition(ctx, specs) {
        const registerName = ctx.name[0].image;
        const registerType = registerName.slice(1, 2);
        const registerIndex = Number.parseInt(registerName.slice(2), 10);
        const pattern = ctx.pattern[0].image;
        const binary = ctx.binary ? true : false;
        let values;
        if (registerType === 'k') {
            // parse values for static registers
            if (!ctx.values)
                throw new Error(`invalid definition for static register ${registerName}: static values must be provided for the register`);
            values = this.visit(ctx.values);
            if (specs.steps % values.length !== 0) {
                throw new Error(`invalid definition for static register ${registerName}: number of values must evenly divide the number of steps (${specs.steps})`);
            }
            if (binary) {
                for (let value of values) {
                    if (value !== specs.field.zero && value !== specs.field.one) {
                        throw new Error(`invalid definition for binary readonly register ${registerName}: the register contains non-binary values`);
                    }
                }
            }
        }
        else if (registerType === 'p' || registerType === 's') {
            if (ctx.values)
                throw new Error(`invalid definition for input register ${registerName}: static values cannot be provided for the register`);
        }
        else {
            throw new Error(`invalid readonly register definition: register name ${registerName} is invalid`);
        }
        return { name: registerName, type: registerType, index: registerIndex, pattern, binary, values };
    }
    // TRANSITION FUNCTION AND CONSTRAINTS
    // --------------------------------------------------------------------------------------------
    transitionFunction(ctx, specs) {
        const exc = new contexts_1.ExecutionContext(specs, false);
        const statements = this.visit(ctx.statements, exc);
        return statements;
    }
    transitionConstraints(ctx, specs) {
        const exc = new contexts_1.ExecutionContext(specs, true);
        const statements = this.visit(ctx.statements, exc);
        return statements;
    }
    // STATEMENTS
    // --------------------------------------------------------------------------------------------
    statementBlock(ctx, exc) {
        let statements;
        if (ctx.statements) {
            statements = ctx.statements.map((stmt) => this.visit(stmt, exc));
        }
        const out = this.visit(ctx.expression, exc);
        return new expressions_1.StatementBlock(out, statements);
    }
    statement(ctx, exc) {
        const expression = this.visit(ctx.expression, exc);
        const variable = exc.setVariableAssignment(ctx.variableName[0].image, expression);
        return { variable: variable.symbol, expression };
    }
    // WHEN...ELSE EXPRESSION
    // --------------------------------------------------------------------------------------------
    whenExpression(ctx, exc) {
        const registerName = ctx.condition[0].image;
        const registerRef = exc.getSymbolReference(registerName);
        // make sure the condition register holds only binary values
        if (!exc.isBinaryRegister(registerName)) {
            throw new Error(`when...else expression condition must be based on a binary register`);
        }
        // build subroutines for true and false conditions
        exc.createNewVariableFrame();
        const tBlock = this.visit(ctx.tBlock, exc);
        exc.destroyVariableFrame();
        exc.createNewVariableFrame();
        const fBlock = this.visit(ctx.fBlock, exc);
        exc.destroyVariableFrame();
        return new expressions.WhenExpression(registerRef, tBlock, fBlock);
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
        if (ctx.expression) {
            return this.visit(ctx.expression, exc);
        }
        else if (ctx.symbol) {
            const symbol = ctx.symbol[0].image;
            return exc.getSymbolReference(symbol);
        }
        else if (ctx.literal) {
            const value = ctx.literal[0].image;
            return new expressions.LiteralExpression(value);
        }
        else {
            throw new Error('Invalid expression syntax');
        }
    }
    // LITERAL EXPRESSIONS
    // --------------------------------------------------------------------------------------------
    literalExpression(ctx) {
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
        let result = this.visit(ctx.base);
        if (ctx.exponent) {
            ctx.exponent.forEach((expOperand) => {
                let expValue = this.visit(expOperand);
                result = result ** expValue;
            });
        }
        return result;
    }
    literalAtomicExpression(ctx) {
        if (ctx.expression)
            return this.visit(ctx.expression);
        else if (ctx.literal)
            return BigInt(ctx.literal[0].image);
        else
            throw new Error('Invalid expression syntax');
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