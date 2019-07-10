"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const galois_1 = require("@guildofweavers/galois");
const chevrotain_1 = require("chevrotain");
const parser_1 = require("./parser");
const lexer_1 = require("./lexer");
const ScriptSpecs_1 = require("./ScriptSpecs");
const ExecutionContext_1 = require("./ExecutionContext");
const Expression_1 = require("./expressions/Expression");
const StaticExpression_1 = require("./expressions/StaticExpression");
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
        // build script specs
        const specs = new ScriptSpecs_1.ScriptSpecs(limits);
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
        // build transition function
        validateTransitionFunction(ctx.transitionFunction);
        const tFunction = this.visit(ctx.transitionFunction, specs);
        // build transition constraint evaluator
        validateTransitionConstraints(ctx.transitionConstraints);
        const tConstraints = this.visit(ctx.transitionConstraints, specs);
        const constraintSpecs = new Array(specs.constraintCount);
        for (let i = 0; i < constraintSpecs.length; i++) {
            constraintSpecs[i] = { degree: tConstraints.degrees[i] };
        }
        // build and return stark config
        return {
            name: starkName,
            field: field,
            steps: specs.steps,
            stateWidth: specs.mutableRegisterCount,
            secretInputs: readonlyRegisters.secretRegisters,
            publicInputs: readonlyRegisters.publicRegisters,
            staticRegisters: readonlyRegisters.staticRegisters,
            constraints: constraintSpecs,
            transitionFunction: tFunction.buildFunction(field, specs.constantBindings),
            constraintEvaluator: tConstraints.buildEvaluator(field, specs.constantBindings)
        };
    }
    // FINITE FIELD
    // --------------------------------------------------------------------------------------------
    fieldDeclaration(ctx) {
        const modulus = this.visit(ctx.modulus);
        return new galois_1.PrimeField(modulus);
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
        if (ctx.staticRegisters) {
            for (let i = 0; i < ctx.staticRegisters.length; i++) {
                let register = this.visit(ctx.staticRegisters[i], specs);
                if (registerNames.has(register.name)) {
                    throw new Error(`Readonly register ${register.name} is defined more than once`);
                }
                else if (register.index !== i) {
                    throw new Error(`Readonly register ${register.name} is declared out of order`);
                }
                registerNames.add(register.name);
                let registerIndex = Number.parseInt(register.name.slice(2), 10);
                staticRegisters[registerIndex] = { pattern: register.pattern, values: register.values, binary: register.binary };
            }
        }
        const secretRegisters = [];
        if (ctx.secretRegisters) {
            for (let i = 0; i < ctx.secretRegisters.length; i++) {
                let register = this.visit(ctx.secretRegisters[i], specs);
                if (registerNames.has(register.name)) {
                    throw new Error(`Readonly register ${register.name} is defined more than once`);
                }
                else if (register.index !== i) {
                    throw new Error(`Readonly register ${register.name} is declared out of order`);
                }
                registerNames.add(register.name);
                let registerIndex = Number.parseInt(register.name.slice(2), 10);
                secretRegisters[registerIndex] = { pattern: register.pattern, binary: register.binary };
            }
        }
        const publicRegisters = [];
        if (ctx.publicRegisters) {
            for (let i = 0; i < ctx.publicRegisters.length; i++) {
                let register = this.visit(ctx.publicRegisters[i], specs);
                if (registerNames.has(register.name)) {
                    throw new Error(`Readonly register ${register.name} is defined more than once`);
                }
                else if (register.index !== i) {
                    throw new Error(`Readonly register ${register.name} is declared out of order`);
                }
                registerNames.add(register.name);
                let registerIndex = Number.parseInt(register.name.slice(2), 10);
                publicRegisters[registerIndex] = { pattern: register.pattern, binary: register.binary };
            }
        }
        return { staticRegisters, secretRegisters, publicRegisters };
    }
    staticRegisterDefinition(ctx, specs) {
        const registerName = ctx.name[0].image;
        const registerIndex = Number.parseInt(registerName.slice(2), 10);
        const pattern = ctx.pattern[0].image;
        const values = this.visit(ctx.values);
        const binary = ctx.binary ? true : false;
        if (specs.steps % values.length !== 0) {
            throw new Error(`Invalid definition for readonly register ${registerName}: number of values must evenly divide the number of steps (${specs.steps})`);
        }
        if (binary) {
            for (let value of values) {
                if (value !== specs.field.zero && value !== specs.field.one) {
                    throw new Error(`Invalid definition for readonly register ${registerName}: the register can contain only binary values`);
                }
            }
        }
        return { name: registerName, index: registerIndex, pattern, binary, values };
    }
    secretRegisterDefinition(ctx, specs) {
        const registerName = ctx.name[0].image;
        const registerIndex = Number.parseInt(registerName.slice(2), 10);
        const pattern = ctx.pattern[0].image;
        const binary = ctx.binary ? true : false;
        return { name: registerName, index: registerIndex, binary, pattern };
    }
    publicRegisterDefinition(ctx, specs) {
        const registerName = ctx.name[0].image;
        const registerIndex = Number.parseInt(registerName.slice(2), 10);
        const pattern = ctx.pattern[0].image;
        const binary = ctx.binary ? true : false;
        return { name: registerName, index: registerIndex, binary, pattern };
    }
    // TRANSITION FUNCTION AND CONSTRAINTS
    // --------------------------------------------------------------------------------------------
    transitionFunction(ctx, specs) {
        const exc = new ExecutionContext_1.ExecutionContext(specs, false);
        const statements = this.visit(ctx.statements, exc);
        if (statements.outputSize !== exc.mutableRegisterCount) {
            if (exc.mutableRegisterCount === 1) {
                throw new Error(`Transition function must evaluate to exactly 1 value`);
            }
            else {
                throw new Error(`Transition function must evaluate to a vector of exactly ${exc.mutableRegisterCount} values`);
            }
        }
        // generate code that can build a transition function
        let functionBuilderCode = `'use strict';\n\n`;
        for (let subCode of exc.subroutines.values()) {
            functionBuilderCode += `${subCode}\n`;
        }
        functionBuilderCode += `return function (r, k, s, p, out) {\n${statements.code}}`;
        return {
            buildFunction: new Function('f', 'g', functionBuilderCode)
        };
    }
    transitionConstraints(ctx, specs) {
        const exc = new ExecutionContext_1.ExecutionContext(specs, true);
        const statements = this.visit(ctx.statements, exc);
        if (statements.outputSize !== specs.constraintCount) {
            if (specs.constraintCount === 1) {
                throw new Error(`Transition constraints must evaluate to exactly 1 value`);
            }
            else {
                throw new Error(`Transition constraints must evaluate to a vector of exactly ${specs.constraintCount} values`);
            }
        }
        // generate code that can build a constraint evaluator
        let evaluatorBuilderCode = `'use strict';\n\n`;
        for (let subCode of exc.subroutines.values()) {
            evaluatorBuilderCode += `${subCode}\n`;
        }
        evaluatorBuilderCode += `return function (r, n, k, s, p, out) {\n${statements.code}}`;
        // convert bigint degrees to numbers
        const degrees = [];
        for (let degree of statements.outputDegrees) {
            degrees.push(specs.validateConstraintDegree(degree));
        }
        return {
            buildEvaluator: new Function('f', 'g', evaluatorBuilderCode),
            degrees: degrees
        };
    }
    // STATEMENTS
    // --------------------------------------------------------------------------------------------
    statementBlock(ctx, exc) {
        let code = '';
        if (ctx.statements) {
            for (let i = 0; i < ctx.statements.length; i++) {
                let statement = this.visit(ctx.statements[i], exc);
                let expression = statement.expression;
                let variable = exc.setVariableAssignment(statement.variable, expression);
                code += `${variable.code} = ${expression.code};\n`;
            }
        }
        const out = this.visit(ctx.outStatement, exc);
        code += out.code;
        const outputDegrees = out.degree;
        return { code, outputSize: out.dimensions[0], outputDegrees };
    }
    statement(ctx, exc) {
        const variable = ctx.variableName[0].image;
        const expression = this.visit(ctx.expression, exc);
        return { variable, expression };
    }
    outStatement(ctx, exc) {
        let code = '', dimensions, degree;
        if (ctx.expression) {
            const expression = this.visit(ctx.expression, exc);
            if (expression.isScalar) {
                code = `out[0] = ${expression.code};\n`;
                dimensions = [1, 0];
                degree = [expression.degree];
            }
            else if (expression.isVector) {
                dimensions = expression.dimensions;
                code = `let _out = ${expression.code};\n`;
                for (let i = 0; i < dimensions[0]; i++) {
                    code += `out[${i}] = _out[${i}];\n`;
                }
                degree = expression.degree;
            }
            else {
                throw new Error('Out statement must evaluate either to a scalar or to a vector');
            }
        }
        else {
            // out statement was defined as a vector
            const expression = this.visit(ctx.vector, exc);
            dimensions = expression.dimensions;
            code = `let _out = ${expression.code};\n`;
            for (let i = 0; i < dimensions[0]; i++) {
                code += `out[${i}] = _out[${i}];\n`;
            }
            degree = expression.degree;
        }
        return new Expression_1.Expression(code, dimensions, degree);
    }
    // WHEN STATEMENT
    // --------------------------------------------------------------------------------------------
    whenStatement(ctx, exc) {
        const registerName = ctx.condition[0].image;
        // make sure the condition register holds only binary values
        if (!exc.isBinaryRegister(registerName)) {
            throw new Error(`when...else statement condition must be based on a binary register`);
        }
        // create expressions for k and for (1 - k)
        const registerRef = exc.getRegisterReference(registerName);
        const oneMinusReg = Expression_1.Expression.one.sub(registerRef);
        // build subroutines for true and false conditions
        exc.createNewVariableFrame();
        const tBlock = this.visit(ctx.tBlock, exc);
        exc.destroyVariableFrame();
        exc.createNewVariableFrame();
        const fBlock = this.visit(ctx.fBlock, exc);
        exc.destroyVariableFrame();
        // make sure the output vectors of both subroutines are the same length
        const outputSize = tBlock.outputSize;
        if (outputSize !== fBlock.outputSize) {
            throw new Error(`when...else statement branches must evaluate to values of same dimensions`);
        }
        const resultDim = [outputSize, 0];
        // add both subroutines to statement context
        const tSubroutine = exc.addSubroutine(tBlock.code);
        const fSubroutine = exc.addSubroutine(fBlock.code);
        // compute expressions for true and false branches
        const tExpression = new Expression_1.Expression('tOut', resultDim, tBlock.outputDegrees);
        const fExpression = new Expression_1.Expression('fOut', resultDim, fBlock.outputDegrees);
        const tBranch = tExpression.mul(registerRef);
        const fBranch = fExpression.mul(oneMinusReg);
        // generate code for the main function
        let code = `let tOut = new Array(${outputSize}), fOut = new Array(${outputSize});\n`;
        code += exc.callSubroutine(tSubroutine, 'tOut');
        code += exc.callSubroutine(fSubroutine, 'fOut');
        code += `tOut = ${tBranch.code};\n`;
        code += `fOut = ${fBranch.code};\n`;
        for (let i = 0; i < outputSize; i++) {
            code += `out[${i}] = f.add(tOut[${i}], fOut[${i}]);\n`;
        }
        // compute out expression to get the degree of the output
        const outExpression = tBranch.add(fBranch);
        const outputDegrees = outExpression.degree;
        return { code, outputSize, outputDegrees };
    }
    // VECTORS AND MATRIXES
    // --------------------------------------------------------------------------------------------
    vector(ctx, exc) {
        const dimensions = [ctx.elements.length, 0], degree = [];
        let code = `[`;
        for (let i = 0; i < ctx.elements.length; i++) {
            let element = this.visit(ctx.elements[i], exc);
            if (!utils_1.isScalar(element.dimensions)) {
                if (utils_1.isVector(element.dimensions) && element.destructured) {
                    dimensions[0] += (element.dimensions[0] - 1);
                    for (let cd of element.degree) {
                        degree.push(cd);
                    }
                }
                else {
                    throw new Error('Vector elements must be scalars');
                }
            }
            else {
                degree.push(element.degree);
            }
            code += `${element.code}, `;
        }
        code = code.slice(0, -2) + ']';
        return new Expression_1.Expression(code, dimensions, degree);
    }
    vectorDestructuring(ctx, exc) {
        const variableName = ctx.vectorName[0].image;
        const element = exc.getVariableReference(variableName);
        if (utils_1.isScalar(element.dimensions)) {
            throw new Error(`Cannot expand scalar variable '${variableName}'`);
        }
        else if (utils_1.isMatrix(element.dimensions)) {
            throw new Error(`Cannot expand matrix variable '${variableName}'`);
        }
        return new Expression_1.Expression(`...${element.code}`, element.dimensions, element.degree, true);
    }
    matrix(ctx, exc) {
        const degree = [];
        const rowCount = ctx.rows.length;
        let colCount = 0;
        let code = `[`;
        for (let i = 0; i < rowCount; i++) {
            let row = this.visit(ctx.rows[i], exc);
            if (colCount === 0) {
                colCount = row.dimensions[0];
            }
            else if (colCount !== row.dimensions[0]) {
                throw new Error('All matrix rows must have the same number of columns');
            }
            code += `${row.code}, `;
            degree.push(row.degree);
        }
        code = code.slice(0, -2) + ']';
        return new Expression_1.Expression(code, [rowCount, colCount], degree);
    }
    matrixRow(ctx, exc) {
        const dimensions = [ctx.elements.length, 0], degree = [];
        let code = `[`;
        for (let i = 0; i < ctx.elements.length; i++) {
            let element = this.visit(ctx.elements[i], exc);
            if (!utils_1.isScalar(element.dimensions))
                throw new Error('Matrix elements must be scalars');
            code += `${element.code}, `;
            degree.push(element.degree);
        }
        code = code.slice(0, -2) + ']';
        return new Expression_1.Expression(code, dimensions, degree);
    }
    // EXPRESSIONS
    // --------------------------------------------------------------------------------------------
    expression(ctx, exc) {
        return this.visit(ctx.addExpression, exc);
    }
    addExpression(ctx, exc) {
        let result = this.visit(ctx.lhs, exc);
        if (ctx.rhs) {
            ctx.rhs.forEach((rhsOperand, i) => {
                let rhs = this.visit(rhsOperand, exc);
                let opToken = ctx.AddOp[i];
                if (chevrotain_1.tokenMatcher(opToken, lexer_1.Plus)) {
                    result = result.add(rhs);
                }
                else if (chevrotain_1.tokenMatcher(opToken, lexer_1.Minus)) {
                    result = result.sub(rhs);
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
                    result = result.mul(rhs);
                }
                else if (chevrotain_1.tokenMatcher(opToken, lexer_1.Slash)) {
                    result = result.div(rhs);
                }
                else if (chevrotain_1.tokenMatcher(opToken, lexer_1.Pound)) {
                    result = result.prod(rhs);
                }
                else {
                    throw new Error(`Invalid operator '${opToken.image}'`);
                }
            });
        }
        return result;
    }
    expExpression(ctx, exc) {
        let result = this.visit(ctx.lhs, exc);
        if (ctx.rhs) {
            ctx.rhs.forEach((rhsOperand, i) => {
                let rhs = this.visit(rhsOperand, exc);
                result = result.exp(rhs);
            });
        }
        return result;
    }
    atomicExpression(ctx, exc) {
        if (ctx.parenExpression) {
            return this.visit(ctx.parenExpression, exc);
        }
        else if (ctx.conditionalExpression) {
            return this.visit(ctx.conditionalExpression, exc);
        }
        else if (ctx.Identifier) {
            const variable = ctx.Identifier[0].image;
            return exc.getVariableReference(variable);
        }
        else if (ctx.MutableRegister) {
            const register = ctx.MutableRegister[0].image;
            return exc.getRegisterReference(register);
        }
        else if (ctx.StaticRegister) {
            const register = ctx.StaticRegister[0].image;
            return exc.getRegisterReference(register);
        }
        else if (ctx.SecretRegister) {
            const register = ctx.SecretRegister[0].image;
            return exc.getRegisterReference(register);
        }
        else if (ctx.PublicRegister) {
            const register = ctx.PublicRegister[0].image;
            return exc.getRegisterReference(register);
        }
        else if (ctx.IntegerLiteral) {
            const value = ctx.IntegerLiteral[0].image;
            return new StaticExpression_1.StaticExpression(value);
        }
        else {
            throw new Error('Invalid expression syntax');
        }
    }
    parenExpression(ctx, exc) {
        return this.visit(ctx.expression, exc);
    }
    conditionalExpression(ctx, exc) {
        const registerName = ctx.register[0].image;
        if (!exc.isBinaryRegister(registerName)) {
            throw new Error('Conditional expression can be based only on binary registers');
        }
        // create expressions for k and for (1 - k)
        const registerRef = exc.getRegisterReference(registerName);
        const oneMinusReg = Expression_1.Expression.one.sub(registerRef);
        // get expressions for true and false options
        const tExpression = this.visit(ctx.tExpression, exc);
        const fExpression = this.visit(ctx.fExpression, exc);
        if (!tExpression.isSameDimensions(fExpression)) {
            throw new Error('Conditional expression branches must evaluate to values of same dimensions');
        }
        // compute tExpression * k + fExpression * (1 - k)
        return tExpression.mul(registerRef).add(fExpression.mul(oneMinusReg));
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